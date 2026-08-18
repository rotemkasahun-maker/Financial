import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ImportPipeline
} from '../src/shared/importPipeline.js';

import {
  ReceiptIngestionService
} from '../backend/receiptIngestionService.ts';

function setup({
  transactions = []
} = {}) {
  const receipts = [];

  const dataService = {
    async getTransactions() {
      return structuredClone(
        transactions
      );
    },

    async saveReceipt(
      receipt,
      linkedId
    ) {
      const saved = {
        ...receipt,
        id: 'saved-receipt',
        linkedTransactionId:
          linkedId || null
      };

      receipts.push(saved);

      return structuredClone(
        saved
      );
    }
  };

  const importPipeline =
    new ImportPipeline({
      extractor: null,
      dataService
    });

  const service =
    new ReceiptIngestionService({
      importPipeline
    });

  return {
    service,
    receipts
  };
}

const evidence = {
  messageId: 'gmail-message-1',
  threadId: 'thread-1',
  subject: 'הקבלה שלך',
  from: 'store@example.test',
  receivedAt:
    '2026-08-18T10:00:00Z'
};

const processing = {
  status: 'processed',

  attachmentId:
    'attachment-1',

  filename:
    'receipt.pdf',

  receipt: {
    extraction: {
      merchant: 'KSP',
      purchaseDate:
        '2026-03-22',
      total: '204.00',
      currency: 'ILS',
      confidence: 0.97,
      warnings: [],
      items: []
    },

    validation: {
      valid: true,
      safeForAutomaticSave:
        true,
      requiresReview:
        false
    }
  }
};

test(
  'high-confidence transaction match links receipt automatically',
  async () => {
    const {
      service,
      receipts
    } = setup({
      transactions: [
        {
          id:
            'transaction-ksp',
          date:
            '2026-03-22',
          merchant: 'KSP',
          amount: 204,
          financialType:
            'expense'
        }
      ]
    });

    const result =
      await service.ingest({
        connection: {
          id: 'primary',
          email:
            'family@example.test'
        },

        evidence,
        processing
      });

    assert.equal(
      result.status,
      'linked_automatically'
    );

    assert.equal(
      result.transactionId,
      'transaction-ksp'
    );

    assert.equal(
      receipts.length,
      1
    );

    assert.equal(
      receipts[0]
        .linkedTransactionId,
      'transaction-ksp'
    );

    assert.equal(
      receipts[0]
        .sourceMetadata
        .sourceType,
      'gmail'
    );

    assert.equal(
      receipts[0]
        .sourceMetadata
        .externalSourceId,
      'gmail-message-1'
    );
  }
);

test(
  'unmatched receipt requires review and is not saved automatically',
  async () => {
    const {
      service,
      receipts
    } = setup({
      transactions: []
    });

    const result =
      await service.ingest({
        connection: {
          id: 'primary',
          email:
            'family@example.test'
        },

        evidence,
        processing
      });

    assert.equal(
      result.status,
      'review_required'
    );

    assert.equal(
      result.reason,
      'no_high_confidence_transaction_match'
    );

    assert.equal(
      receipts.length,
      0
    );
  }
);

test(
  'receipt that did not pass processing cannot enter financial storage',
  async () => {
    const {
      service,
      receipts
    } = setup();

    const result =
      await service.ingest({
        connection: {
          id: 'primary'
        },

        evidence,

        processing: {
          status:
            'review_required'
        }
      });

    assert.equal(
      result.status,
      'review_required'
    );

    assert.equal(
      receipts.length,
      0
    );
  }
);