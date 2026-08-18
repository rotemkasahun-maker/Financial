import { processReceiptPdf } from './receiptProcessingService.ts';

const SUPPORTED_AUTOMATIC_TYPES = new Set([
  'application/pdf'
]);

export type GmailReceiptAttachment = {
  id: string;
  mimeType?: string | null;
  filename?: string | null;
};

export type GmailReceiptEvidence = {
  messageId: string;
  threadId?: string | null;
  subject?: string | null;
  from?: string | null;
  receivedAt?: string | null;
  attachmentIds?: GmailReceiptAttachment[];
  documentUrls?: string[];
};

export type GmailReceiptProcessingResult =
  | {
      status: 'processed';
      attachmentId: string;
      filename: string;
      receipt: Awaited<ReturnType<typeof processReceiptPdf>>;
    }
  | {
      status: 'review_required';
      reason: string;
      attachmentId?: string;
      filename?: string;
      receipt?: Awaited<ReturnType<typeof processReceiptPdf>>;
    }
  | {
      status: 'no_automatic_document';
      reason: string;
    };

type GmailReceiptProcessorOptions = {
  gmail: {
    getAttachment: (
      connection: unknown,
      messageId: string,
      attachmentId: string
    ) => Promise<any>;
  };

  processPdf?: typeof processReceiptPdf;
};

export class GmailReceiptProcessor {
  gmail: GmailReceiptProcessorOptions['gmail'];
  processPdf: typeof processReceiptPdf;

  constructor({
    gmail,
    processPdf = processReceiptPdf
  }: GmailReceiptProcessorOptions) {
    this.gmail = gmail;
    this.processPdf = processPdf;
  }

  async process(
    connection: any,
    evidence: GmailReceiptEvidence
  ): Promise<GmailReceiptProcessingResult> {
    if (!connection) {
      throw new TypeError(
        'GmailReceiptProcessor requires a Gmail connection'
      );
    }

    if (!evidence?.messageId) {
      throw new TypeError(
        'GmailReceiptProcessor requires a messageId'
      );
    }

    const attachments =
      evidence.attachmentIds ?? [];

    /*
     * For the first automatic version we process PDFs only.
     *
     * Gmail images remain available in staging and are NOT
     * discarded. We will add image OCR / vision separately.
     */
    const attachment = attachments.find(item =>
      SUPPORTED_AUTOMATIC_TYPES.has(
        String(item.mimeType || '')
          .split(';')[0]
          .trim()
          .toLowerCase()
      )
    );

    if (!attachment) {
      return {
        status: 'no_automatic_document',
        reason: attachments.length
          ? 'automatic_image_processing_not_enabled'
          : evidence.documentUrls?.length
            ? 'linked_document_requires_separate_flow'
            : 'no_supported_attachment'
      };
    }

    let attachmentResult: any;

    try {
      attachmentResult =
        await this.gmail.getAttachment(
          connection,
          evidence.messageId,
          attachment.id
        );
    } catch {
      return {
        status: 'review_required',
        reason: 'attachment_download_failed',
        attachmentId: attachment.id,
        filename:
          attachment.filename ||
          'gmail-receipt.pdf'
      };
    }

    /*
     * Gmail's API returns attachment bytes as base64url.
     */
    const encoded =
      attachmentResult?.response?.data || '';

    if (!encoded) {
      return {
        status: 'review_required',
        reason: 'empty_attachment',
        attachmentId: attachment.id,
        filename:
          attachment.filename ||
          'gmail-receipt.pdf'
      };
    }

    let bytes: Uint8Array;

    try {
      bytes = new Uint8Array(
        Buffer.from(encoded, 'base64url')
      );
    } catch {
      return {
        status: 'review_required',
        reason: 'invalid_attachment_encoding',
        attachmentId: attachment.id,
        filename:
          attachment.filename ||
          'gmail-receipt.pdf'
      };
    }

    if (bytes.length === 0) {
      return {
        status: 'review_required',
        reason: 'empty_attachment',
        attachmentId: attachment.id,
        filename:
          attachment.filename ||
          'gmail-receipt.pdf'
      };
    }

    const receipt =
      await this.processPdf(bytes);

    const filename =
      attachment.filename ||
      'gmail-receipt.pdf';

    /*
     * The AI/validation pipeline itself decides whether the
     * extracted receipt is safe enough for automatic handling.
     */
    if (
      receipt.status !==
      'ready_for_automatic_save'
    ) {
      return {
        status: 'review_required',
        reason:
          receipt.status ===
          'processing_failed'
            ? 'receipt_processing_failed'
            : 'receipt_validation_required',
        attachmentId: attachment.id,
        filename,
        receipt
      };
    }

    return {
      status: 'processed',
      attachmentId: attachment.id,
      filename,
      receipt
    };
  }
}