import { extractPdfText } from './pdfTextExtractor.ts';
import { extractImageText } from './imageTextExtractor.ts';
import {
  extractReceiptWithAi,
  type AiReceiptExtraction
} from './aiReceiptExtractor.ts';
import {
  validateReceiptExtraction,
  type ReceiptValidationResult
} from './receiptValidator.ts';
import {
  buildReceiptAnalyzeDiagnostics,
  type ReceiptAnalyzeDiagnostics,
  type ProcessingTimingsMs
} from './receiptDiagnostics.ts';
import {
  applyItemVisionFallback,
  type ItemVisionFallbackDeps
} from './receiptItemVisionFallback.ts';

export type ReceiptImageProcessingDeps = {
  extractImageTextFn?: typeof extractImageText;
  extractReceiptWithAiFn?: typeof extractReceiptWithAi;
  validateReceiptExtractionFn?: typeof validateReceiptExtraction;
  extractReceiptFromImageWithAiFn?: ItemVisionFallbackDeps['extractReceiptFromImageWithAiFn'];
  visionTimeoutMs?: number;
};

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

  diagnostics: ReceiptAnalyzeDiagnostics | null;
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
        error: 'No readable text could be extracted from receipt',
        diagnostics: null
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

      error: null,
      diagnostics: null
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
          : 'Unknown receipt processing error',
      diagnostics: null
    };
  }
}

export async function processReceiptImage(
  imageBytes: Uint8Array,
  deps: ReceiptImageProcessingDeps = {}
): Promise<ReceiptProcessingResult> {
  const extractImageTextFn =
    deps.extractImageTextFn ?? extractImageText;
  const extractReceiptWithAiFn =
    deps.extractReceiptWithAiFn ?? extractReceiptWithAi;
  const validateReceiptExtractionFn =
    deps.validateReceiptExtractionFn ?? validateReceiptExtraction;

  const startedAt = performance.now();
  const timingsMs: ProcessingTimingsMs = {};
  let rawText = '';

  try {
    if (!(imageBytes instanceof Uint8Array) || imageBytes.length === 0) {
      throw new TypeError(
        'processReceiptImage expects non-empty image bytes'
      );
    }

    const ocrStartedAt = performance.now();
    const textResult = await extractImageTextFn(imageBytes);
    timingsMs.ocr = performance.now() - ocrStartedAt;
    rawText = textResult.rawText?.trim() ?? '';

    if (!rawText) {
      timingsMs.total = performance.now() - startedAt;

      return {
        status: 'processing_failed',
        extraction: null,
        validation: null,
        document: {
          pageCount: 1,
          hasTextLayer: false,
          usedOcr: true,
          textLength: 0
        },
        error: 'No readable text could be extracted from image',
        diagnostics: buildReceiptAnalyzeDiagnostics({
          rawText: '',
          usedOcr: true,
          extraction: null,
          validation: null,
          timingsMs
        })
      };
    }

    const aiStartedAt = performance.now();
    const ocrExtraction = await extractReceiptWithAiFn(rawText);
    timingsMs.ai = performance.now() - aiStartedAt;

    const fallback = await applyItemVisionFallback(ocrExtraction, imageBytes, {
      extractReceiptFromImageWithAiFn: deps.extractReceiptFromImageWithAiFn,
      timeoutMs: deps.visionTimeoutMs
    });
    const extraction = fallback.extraction;

    const validationStartedAt = performance.now();
    let validation = validateReceiptExtractionFn(extraction);
    if (fallback.forceReview) {
      validation = {
        ...validation,
        safeForAutomaticSave: false,
        requiresReview: true
      };
    }
    timingsMs.validation = performance.now() - validationStartedAt;
    timingsMs.total = performance.now() - startedAt;

    return {
      status:
        fallback.forceReview || !validation.safeForAutomaticSave
          ? 'review_required'
          : 'ready_for_automatic_save',
      extraction,
      validation,
      document: {
        pageCount: 1,
        hasTextLayer: false,
        usedOcr: true,
        textLength: rawText.length
      },
      error: null,
      diagnostics: buildReceiptAnalyzeDiagnostics({
        rawText,
        usedOcr: true,
        extraction,
        validation,
        timingsMs
      })
    };
  } catch (error) {
    timingsMs.total = performance.now() - startedAt;

    return {
      status: 'processing_failed',
      extraction: null,
      validation: null,
      document: null,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown image processing error',
      diagnostics: rawText
        ? buildReceiptAnalyzeDiagnostics({
            rawText,
            usedOcr: true,
            extraction: null,
            validation: null,
            timingsMs
          })
        : null
    };
  }
}