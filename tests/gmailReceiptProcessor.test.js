import test from 'node:test';
import assert from 'node:assert/strict';

import {
  GmailReceiptProcessor
} from '../backend/gmailReceiptProcessor.ts';

const connection = {
  id: 'primary',
  email: 'family@example.com'
};

const pdfEvidence = {
  messageId: 'message-123',
  subject: 'חשבונית',
  attachmentIds: [
    {
      id: 'attachment-456',
      mimeType: 'application/pdf',
      filename: 'receipt.pdf'
    }
  ],
  documentUrls: []
};

const successfulReceipt = {
  status: 'ready_for_automatic_save',
  extraction: {
    merchant: 'Test Store',
    total: '100.00',
    confidence: 0.97
  },
  validation: {
    valid: true,
    safeForAutomaticSave: true,
    requiresReview: false
  },
  document: {
    pageCount: 1,
    hasTextLayer: true,
    usedOcr: false,
    textLength: 100
  },
  error: null
};

test(
  'downloads Gmail PDF and processes it exactly once',
  async () => {
    let downloadCalls = 0;
    let processCalls = 0;
    let receivedBytes = null;

    const gmail = {
      async getAttachment(
        receivedConnection,
        messageId,
        attachmentId
      ) {
        downloadCalls += 1;

        assert.equal(
          receivedConnection,
          connection
        );
        assert.equal(messageId, 'message-123');
        assert.equal(
          attachmentId,
          'attachment-456'
        );

        return {
          response: {
            data: Buffer.from(
              '%PDF-test'
            ).toString('base64url')
          }
        };
      }
    };

    const processPdf = async bytes => {
      processCalls += 1;
      receivedBytes = bytes;
      return successfulReceipt;
    };

    const processor =
      new GmailReceiptProcessor({
        gmail,
        processPdf
      });

    const result = await processor.process(
      connection,
      pdfEvidence
    );

    assert.equal(downloadCalls, 1);
    assert.equal(processCalls, 1);

    assert.ok(
      receivedBytes instanceof Uint8Array
    );

    assert.equal(
      Buffer.from(receivedBytes).toString(),
      '%PDF-test'
    );

    assert.equal(result.status, 'processed');
    assert.equal(
      result.attachmentId,
      'attachment-456'
    );
    assert.equal(
      result.filename,
      'receipt.pdf'
    );
    assert.equal(
      result.receipt,
      successfulReceipt
    );
  }
);

test(
  'AI validation review result is not treated as automatically processed',
  async () => {
    let processCalls = 0;

    const gmail = {
      async getAttachment() {
        return {
          response: {
            data: Buffer.from(
              '%PDF-review'
            ).toString('base64url')
          }
        };
      }
    };

    const reviewReceipt = {
      ...successfulReceipt,
      status: 'review_required',
      validation: {
        valid: true,
        safeForAutomaticSave: false,
        requiresReview: true
      }
    };

    const processor =
      new GmailReceiptProcessor({
        gmail,
        processPdf: async () => {
          processCalls += 1;
          return reviewReceipt;
        }
      });

    const result = await processor.process(
      connection,
      pdfEvidence
    );

    assert.equal(processCalls, 1);
    assert.equal(
      result.status,
      'review_required'
    );
    assert.equal(
      result.reason,
      'receipt_validation_required'
    );
    assert.equal(
      result.receipt,
      reviewReceipt
    );
  }
);

test(
  'receipt processing failure requires review',
  async () => {
    const gmail = {
      async getAttachment() {
        return {
          response: {
            data: Buffer.from(
              '%PDF-broken'
            ).toString('base64url')
          }
        };
      }
    };

    const failedReceipt = {
      status: 'processing_failed',
      extraction: null,
      validation: null,
      document: null,
      error: 'Could not extract receipt'
    };

    const processor =
      new GmailReceiptProcessor({
        gmail,
        processPdf: async () =>
          failedReceipt
      });

    const result = await processor.process(
      connection,
      pdfEvidence
    );

    assert.equal(
      result.status,
      'review_required'
    );
    assert.equal(
      result.reason,
      'receipt_processing_failed'
    );
  }
);

test(
  'image attachment stays available for review without calling AI',
  async () => {
    let downloadCalls = 0;
    let processCalls = 0;

    const gmail = {
      async getAttachment() {
        downloadCalls += 1;
        throw new Error(
          'Image should not be downloaded'
        );
      }
    };

    const processor =
      new GmailReceiptProcessor({
        gmail,
        processPdf: async () => {
          processCalls += 1;
          return successfulReceipt;
        }
      });

    const evidence = {
      ...pdfEvidence,
      attachmentIds: [
        {
          id: 'image-1',
          mimeType: 'image/jpeg',
          filename: 'receipt.jpg'
        }
      ]
    };

    const result = await processor.process(
      connection,
      evidence
    );

    assert.equal(
      result.status,
      'no_automatic_document'
    );
    assert.equal(
      result.reason,
      'automatic_image_processing_not_enabled'
    );

    assert.equal(downloadCalls, 0);
    assert.equal(processCalls, 0);
  }
);

test(
  'linked receipt remains in separate flow without calling AI',
  async () => {
    let processCalls = 0;

    const gmail = {
      async getAttachment() {
        throw new Error(
          'No attachment should be downloaded'
        );
      }
    };

    const processor =
      new GmailReceiptProcessor({
        gmail,
        processPdf: async () => {
          processCalls += 1;
          return successfulReceipt;
        }
      });

    const evidence = {
      messageId: 'linked-message',
      attachmentIds: [],
      documentUrls: [
        'https://example.com/receipt.pdf'
      ]
    };

    const result = await processor.process(
      connection,
      evidence
    );

    assert.equal(
      result.status,
      'no_automatic_document'
    );
    assert.equal(
      result.reason,
      'linked_document_requires_separate_flow'
    );
    assert.equal(processCalls, 0);
  }
);

test(
  'attachment download failure requires review and does not call AI',
  async () => {
    let processCalls = 0;

    const gmail = {
      async getAttachment() {
        throw new Error(
          'Temporary Gmail failure'
        );
      }
    };

    const processor =
      new GmailReceiptProcessor({
        gmail,
        processPdf: async () => {
          processCalls += 1;
          return successfulReceipt;
        }
      });

    const result = await processor.process(
      connection,
      pdfEvidence
    );

    assert.equal(
      result.status,
      'review_required'
    );
    assert.equal(
      result.reason,
      'attachment_download_failed'
    );
    assert.equal(processCalls, 0);
  }
);