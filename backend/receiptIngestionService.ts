export class ReceiptIngestionService {
  constructor({ importPipeline }) {
    this.importPipeline = importPipeline;
  }

  async ingest({
    connection,
    evidence,
    processing
  }) {
    if (
      processing?.status !== 'processed' ||
      !processing.receipt?.extraction
    ) {
      return {
        status: 'review_required',
        reason: 'receipt_not_ready_for_ingestion'
      };
    }

    const extraction =
      processing.receipt.extraction;

    const envelope = {
      id: `gmail:${evidence.messageId}`,
      householdId: 'demo-household',
      userId: 'demo-member-a',
      deviceId: 'gmail-connector',

      sourceType: 'gmail',

      sourceAccount:
        connection?.email ||
        connection?.id ||
        null,

      externalSourceId:
        evidence.messageId,

      metadata: {
        email: {
          messageId:
            evidence.messageId,

          threadId:
            evidence.threadId || null,

          subject:
            evidence.subject || null,

          from:
            evidence.from || null,

          receivedAt:
            evidence.receivedAt || null,

          attachmentId:
            processing.attachmentId ||
            null,

          filename:
            processing.filename ||
            null
        },

        aiValidation:
          processing.receipt.validation ||
          null
      },

      importedAt:
        new Date().toISOString(),

      status: 'received',

      payload: {
        fileName:
          processing.filename ||
          'gmail-receipt.pdf',

        fileType:
          'application/pdf'
      }
    };

    const prepared =
      await this.importPipeline.prepareExtracted(
        envelope,
        extraction
      );

    const highMatch =
      prepared.matches.find(
        item =>
          item.confidence === 'high'
      );

    /*
     * Safety rule:
     * automatically save only when the receipt
     * matches an existing financial transaction
     * with high confidence.
     *
     * Unmatched receipts stay in review and do not
     * create a new expense automatically.
     */
    if (!highMatch) {
      return {
        status: 'review_required',
        reason:
          'no_high_confidence_transaction_match',
        prepared
      };
    }

    const saved =
      await this.importPipeline.commit(
        prepared,
        highMatch.id
      );

    return {
      status: 'linked_automatically',
      transactionId:
        highMatch.id,
      saved,
      prepared
    };
  }
}