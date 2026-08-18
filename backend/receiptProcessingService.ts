import { extractPdfText } from './pdfTextExtractor.ts';
import {
  extractReceiptWithAi,
  type AiReceiptExtraction
} from './aiReceiptExtractor.ts';
import {
  validateReceiptExtraction,
  type ReceiptValidationResult
} from './receiptValidator.ts';

export type ReceiptProcessingResult = {
  status:
    | 'ready_for_automatic_save'
    | 'review_required'
    | 'processing_failed';

  extraction: AiReceiptExtraction | null;
  validation: ReceiptValidationResult | null;

  document: {
    pageCount: number;
    hasTextLayer: boolean;
    usedOcr: boolean;
    textLength: number;
  } | null;

  error: string | null;
};

export async function processReceiptPdf(
  pdfBytes: Uint8Array
): Promise<ReceiptProcessingResult> {
  try {
    if (!(pdfBytes instanceof Uint8Array) || pdfBytes.length === 0) {
      throw new TypeError(
        'processReceiptPdf expects non-empty PDF bytes'
      );
    }

    // Step 1:
    // Extract text locally first.
    // This avoids sending the original PDF to AI when text/OCR is enough.
    const document = await extractPdfText(pdfBytes);

    const rawText = document.rawText?.trim() ?? '';

    if (!rawText) {
      return {
        status: 'processing_failed',
        extraction: null,
        validation: null,
        document: {
          pageCount: document.pageCount,
          hasTextLayer: document.hasTextLayer,
          usedOcr: document.usedOcr,
          textLength: 0
        },
        error: 'No readable text could be extracted from receipt'
      };
    }

    // Step 2:
    // AI understands the receipt structure.
    const extraction = await extractReceiptWithAi(rawText);

    // Step 3:
    // Deterministic code decides whether the AI result is safe.
    const validation = validateReceiptExtraction(extraction);

    return {
      status: validation.safeForAutomaticSave
        ? 'ready_for_automatic_save'
        : 'review_required',

      extraction,
      validation,

      document: {
        pageCount: document.pageCount,
        hasTextLayer: document.hasTextLayer,
        usedOcr: document.usedOcr,
        textLength: rawText.length
      },

      error: null
    };
  } catch (error) {
    return {
      status: 'processing_failed',
      extraction: null,
      validation: null,
      document: null,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown receipt processing error'
    };
  }
}