import test from 'node:test';
import assert from 'node:assert/strict';

import {
  deriveOcrTextMetadata,
  buildExtractionDiagnostics,
  buildReceiptAnalyzeDiagnostics,
  logReceiptAnalyzeDiagnostics
} from '../backend/receiptDiagnostics.ts';
import { processReceiptPdf } from '../backend/receiptProcessingService.ts';
import { validateReceiptExtraction } from '../backend/receiptValidator.ts';
import {
  SYNTHETIC_NOISY_RECEIPT_OCR,
  SYNTHETIC_NOISE_ONLY_OCR
} from './helpers/syntheticNoisyReceiptOcr.js';

const SAMPLE_OCR_TEXT =
  'סופר ירוק\n2026-09-11\nTOTAL 42.50\nמוצר אחד';

test('deriveOcrTextMetadata counts aggregate OCR quality fields', () => {
  const metadata = deriveOcrTextMetadata(SAMPLE_OCR_TEXT, true);

  assert.equal(metadata.usedOcr, true);
  assert.equal(metadata.textLength, SAMPLE_OCR_TEXT.length);
  assert.ok(metadata.nonWhitespaceCharCount > 0);
  assert.equal(metadata.lineCount, 4);
  assert.ok(metadata.hebrewCharCount > 0);
  assert.ok(metadata.latinCharCount > 0);
  assert.ok(metadata.digitCount >= 4);
  assert.equal(metadata.dateLikePatternCandidateCount, 1);
  assert.equal(metadata.decimalPriceLikeCandidateCount, 1);
  assert.equal(metadata.plausibleDatePresent, true);
  assert.equal(metadata.plausibleAmountPresent, true);
});

test('deriveOcrTextMetadata counts structural patterns without leaking matches', () => {
  const metadata = deriveOcrTextMetadata(SYNTHETIC_NOISY_RECEIPT_OCR, true);
  const serialized = JSON.stringify(metadata);

  assert.equal(metadata.dateLikePatternCandidateCount, 1);
  assert.equal(metadata.decimalPriceLikeCandidateCount, 4);
  assert.ok(metadata.integerNumericCandidateCount > 0);
  assert.equal(metadata.currencyTokenPresent, true);
  assert.ok(metadata.mixedLetterDigitLineCount > 0);
  assert.ok(metadata.noiseHeavyLineCount >= 1);
  assert.ok(metadata.maxLineLength > 0);
  assert.ok(metadata.alphanumericCharacterRatio > 0);
  assert.ok(metadata.alphanumericCharacterRatio <= 1);
  assert.equal(metadata.plausibleDatePresent, true);
  assert.equal(metadata.plausibleAmountPresent, true);
  assert.equal(typeof metadata.currencyTokenPresent, 'boolean');
  assert.doesNotMatch(serialized, /11\.09\.2026/);
  assert.doesNotMatch(serialized, /27\.80/);
  assert.doesNotMatch(serialized, /8\.90/);
  assert.doesNotMatch(serialized, /S0PER MART/);
  assert.doesNotMatch(serialized, /סופר מארט/);
});

test('deriveOcrTextMetadata treats noise-only text as weak receipt structure', () => {
  const metadata = deriveOcrTextMetadata(SYNTHETIC_NOISE_ONLY_OCR, true);

  assert.equal(metadata.dateLikePatternCandidateCount, 0);
  assert.equal(metadata.decimalPriceLikeCandidateCount, 0);
  assert.equal(metadata.currencyTokenPresent, false);
  assert.equal(metadata.plausibleDatePresent, false);
  assert.equal(metadata.plausibleAmountPresent, false);
  assert.ok(metadata.noiseHeavyLineCount >= 2);
});

test('buildExtractionDiagnostics reports populated core fields and issue codes only', () => {
  const extraction = {
    merchant: 'Example Store',
    rawMerchant: 'Example Store',
    purchaseDate: '2026-09-11',
    purchaseTime: null,
    total: '42.50',
    currency: 'ILS',
    invoiceNumber: null,
    receiptNumber: null,
    paymentMethod: null,
    cardLast4: null,
    vat: null,
    subtotalBeforeVat: null,
    items: [{ name: 'Item', quantity: 1, unitPrice: '42.50', totalPrice: '42.50', discount: null }],
    confidence: 0.82,
    warnings: ['Needs review']
  };

  const validation = validateReceiptExtraction(extraction);
  const diagnostics = buildExtractionDiagnostics(extraction, validation);

  assert.equal(diagnostics.confidence, 0.82);
  assert.equal(diagnostics.populatedCoreFieldCount, 3);
  assert.deepEqual(diagnostics.populatedCoreFields, {
    merchant: true,
    purchaseDate: true,
    total: true
  });
  assert.equal(diagnostics.itemCount, 1);
  assert.ok(diagnostics.validationIssueCodes.includes('review_confidence'));
  assert.ok(
    diagnostics.validationIssueCodes.every(code => typeof code === 'string')
  );
  assert.equal(
    diagnostics.validationIssueCodes.some(code => code.includes('review because')),
    false
  );
});

test('buildReceiptAnalyzeDiagnostics does not expose raw OCR text or financial values', () => {
  const secretText =
    'SECRET MERCHANT NAME\n2026-09-11\nTOTAL 999.99\nHidden item text';

  const diagnostics = buildReceiptAnalyzeDiagnostics({
    rawText: secretText,
    usedOcr: true,
    extraction: {
      merchant: 'SECRET MERCHANT NAME',
      rawMerchant: 'SECRET MERCHANT NAME',
      purchaseDate: '2026-09-11',
      purchaseTime: null,
      total: '999.99',
      currency: 'ILS',
      invoiceNumber: null,
      receiptNumber: null,
      paymentMethod: null,
      cardLast4: null,
      vat: null,
      subtotalBeforeVat: null,
      items: [{ name: 'Hidden item text', quantity: 1, unitPrice: '999.99', totalPrice: '999.99', discount: null }],
      confidence: 0.02,
      warnings: []
    },
    validation: validateReceiptExtraction({
      merchant: null,
      rawMerchant: null,
      purchaseDate: null,
      purchaseTime: null,
      total: null,
      currency: null,
      invoiceNumber: null,
      receiptNumber: null,
      paymentMethod: null,
      cardLast4: null,
      vat: null,
      subtotalBeforeVat: null,
      items: [],
      confidence: 0.02,
      warnings: []
    }),
    timingsMs: { ocr: 1200, ai: 800, validation: 2, total: 2002 }
  });

  const serialized = JSON.stringify(diagnostics);

  assert.equal('rawText' in diagnostics, false);
  assert.equal('rawOcrText' in diagnostics, false);
  assert.doesNotMatch(serialized, /SECRET MERCHANT NAME/);
  assert.doesNotMatch(serialized, /Hidden item text/);
  assert.doesNotMatch(serialized, /999\.99/);
  assert.doesNotMatch(serialized, /2026-09-11/);
  assert.equal(typeof diagnostics.ocr.dateLikePatternCandidateCount, 'number');
  assert.equal(typeof diagnostics.ocr.plausibleDatePresent, 'boolean');
  assert.equal(typeof diagnostics.ocr.plausibleAmountPresent, 'boolean');
  assert.ok(diagnostics.timingsMs.total > 0);
});

test('PDF analyze path keeps diagnostics null', async () => {
  const result = await processReceiptPdf(
    new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34])
  );

  assert.equal(result.diagnostics, null);
});

test('logReceiptAnalyzeDiagnostics emits codes and counts only', () => {
  const diagnostics = buildReceiptAnalyzeDiagnostics({
    rawText: 'ABC 123',
    usedOcr: true,
    extraction: null,
    validation: null,
    timingsMs: { ocr: 10, total: 10 }
  });

  const lines = [];
  const originalInfo = console.info;

  console.info = (...args) => {
    lines.push(args.join(' '));
  };

  try {
    logReceiptAnalyzeDiagnostics(diagnostics);
  } finally {
    console.info = originalInfo;
  }

  assert.equal(lines.length, 1);
  assert.match(lines[0], /\[receipt-analyze-diagnostics\]/);
  assert.doesNotMatch(lines[0], /ABC 123/);
  assert.match(lines[0], /"digitCount":3/);
});
