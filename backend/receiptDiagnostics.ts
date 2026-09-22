import type { AiReceiptExtraction } from './aiReceiptExtractor.ts';
import type { ReceiptValidationResult } from './receiptValidator.ts';

export type OcrTextMetadata = {
  textLength: number;
  nonWhitespaceCharCount: number;
  lineCount: number;
  hebrewCharCount: number;
  latinCharCount: number;
  digitCount: number;
  usedOcr: boolean;
  dateLikePatternCandidateCount: number;
  decimalPriceLikeCandidateCount: number;
  integerNumericCandidateCount: number;
  currencyTokenPresent: boolean;
  mixedLetterDigitLineCount: number;
  noiseHeavyLineCount: number;
  maxLineLength: number;
  alphanumericCharacterRatio: number;
  plausibleDatePresent: boolean;
  plausibleAmountPresent: boolean;
};

export type ExtractionDiagnosticMetadata = {
  confidence: number | null;
  populatedCoreFieldCount: number;
  populatedCoreFields: {
    merchant: boolean;
    purchaseDate: boolean;
    total: boolean;
  };
  itemCount: number;
  validationIssueCodes: string[];
};

export type ProcessingTimingsMs = {
  ocr?: number;
  ai?: number;
  validation?: number;
  total?: number;
};

export type ReceiptAnalyzeDiagnostics = {
  ocr: OcrTextMetadata;
  extraction: ExtractionDiagnosticMetadata;
  timingsMs?: ProcessingTimingsMs;
};

export function deriveOcrTextMetadata(
  rawText: string,
  usedOcr: boolean
): OcrTextMetadata {
  const text = rawText ?? '';
  const nonWhitespace = text.replace(/\s/g, '');
  const nonEmptyLines = text
    .split(/\r?\n/)
    .filter(line => line.trim().length > 0);

  let hebrewCharCount = 0;
  let latinCharCount = 0;
  let digitCount = 0;
  let alphanumericCount = 0;

  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    const isHebrew = code >= 0x0590 && code <= 0x05ff;
    const isLatin =
      (code >= 0x0041 && code <= 0x005a) ||
      (code >= 0x0061 && code <= 0x007a);
    const isDigit = code >= 0x0030 && code <= 0x0039;

    if (!/\s/.test(ch) && isHebrew) hebrewCharCount += 1;
    if (!/\s/.test(ch) && isLatin) latinCharCount += 1;
    if (!/\s/.test(ch) && isDigit) digitCount += 1;
    if (isHebrew || isLatin || isDigit) alphanumericCount += 1;
  }

  const dateLikeMatches =
    text.match(/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}-\d{2}-\d{2}/g) ??
    [];
  const dateLikePatternCandidateCount = dateLikeMatches.length;

  const textWithoutDates = text.replace(
    /\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}-\d{2}-\d{2}/g,
    ' '
  );

  const decimalPriceLikeCandidateCount = (
    textWithoutDates.match(/\d{1,6}[.,]\d{2}/g) ?? []
  ).length;

  const integerNumericCandidateCount = (
    textWithoutDates.match(/(?<![\d.,])\d{1,6}(?![\d.,])/g) ?? []
  ).length;

  let mixedLetterDigitLineCount = 0;
  let noiseHeavyLineCount = 0;
  let maxLineLength = 0;

  for (const line of nonEmptyLines) {
    maxLineLength = Math.max(maxLineLength, line.length);

    const hasLetter = /[A-Za-z\u0590-\u05FF]/.test(line);
    const hasDigit = /\d/.test(line);
    if (hasLetter && hasDigit) mixedLetterDigitLineCount += 1;

    const lineAlnum = (line.match(/[A-Za-z0-9\u0590-\u05FF]/g) ?? [])
      .length;
    if (lineAlnum / line.length < 0.4) noiseHeavyLineCount += 1;
  }

  return {
    textLength: text.length,
    nonWhitespaceCharCount: nonWhitespace.length,
    lineCount: nonEmptyLines.length,
    hebrewCharCount,
    latinCharCount,
    digitCount,
    usedOcr,
    dateLikePatternCandidateCount,
    decimalPriceLikeCandidateCount,
    integerNumericCandidateCount,
    currencyTokenPresent: /₪|ש["״]?ח|ILS|NIS/i.test(text),
    mixedLetterDigitLineCount,
    noiseHeavyLineCount,
    maxLineLength,
    alphanumericCharacterRatio: text.length
      ? Number((alphanumericCount / text.length).toFixed(4))
      : 0,
    plausibleDatePresent: dateLikePatternCandidateCount > 0,
    plausibleAmountPresent: decimalPriceLikeCandidateCount > 0
  };
}

export function buildExtractionDiagnostics(
  extraction: AiReceiptExtraction | null,
  validation: ReceiptValidationResult | null
): ExtractionDiagnosticMetadata {
  const merchantPopulated = Boolean(
    extraction?.merchant?.trim() || extraction?.rawMerchant?.trim()
  );
  const purchaseDatePopulated = Boolean(
    extraction?.purchaseDate?.trim()
  );
  const totalPopulated = Boolean(extraction?.total?.trim());

  const populatedCoreFields = {
    merchant: merchantPopulated,
    purchaseDate: purchaseDatePopulated,
    total: totalPopulated
  };

  return {
    confidence:
      typeof extraction?.confidence === 'number'
        ? extraction.confidence
        : null,
    populatedCoreFieldCount: [
      merchantPopulated,
      purchaseDatePopulated,
      totalPopulated
    ].filter(Boolean).length,
    populatedCoreFields,
    itemCount: Array.isArray(extraction?.items)
      ? extraction.items.length
      : 0,
    validationIssueCodes: (validation?.issues ?? []).map(
      issue => issue.code
    )
  };
}

export function buildReceiptAnalyzeDiagnostics(input: {
  rawText: string;
  usedOcr: boolean;
  extraction: AiReceiptExtraction | null;
  validation: ReceiptValidationResult | null;
  timingsMs?: ProcessingTimingsMs;
}): ReceiptAnalyzeDiagnostics {
  return {
    ocr: deriveOcrTextMetadata(input.rawText, input.usedOcr),
    extraction: buildExtractionDiagnostics(
      input.extraction,
      input.validation
    ),
    ...(input.timingsMs ? { timingsMs: input.timingsMs } : {})
  };
}

export function logReceiptAnalyzeDiagnostics(
  diagnostics: ReceiptAnalyzeDiagnostics | null | undefined
): void {
  if (!diagnostics) {
    return;
  }

  console.info(
    '[receipt-analyze-diagnostics]',
    JSON.stringify(diagnostics)
  );
}
