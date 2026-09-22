import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorker } from 'tesseract.js';

import { extractImageText } from '../backend/imageTextExtractor.ts';
import { deriveOcrTextMetadata } from '../backend/receiptDiagnostics.ts';
import {
  createSyntheticReceiptPng,
  createLowResReceiptJpeg,
  createHebrewReceiptPng
} from './helpers/syntheticReceiptImage.js';

async function ocrRaw(bytes) {
  const worker = await createWorker(['heb', 'eng']);
  try {
    const result = await worker.recognize(bytes);
    return result.data.text?.trim() || '';
  } finally {
    await worker.terminate();
  }
}

function fragmentFound(text) {
  return /TEST\s*MARKET|09\.09\.2026|42\.50|TOTAL/i.test(text);
}

test('meaningful OCR - synthetic receipt image returns non-empty text', async () => {
  const imageBytes = createSyntheticReceiptPng();
  const result = await extractImageText(imageBytes);

  assert.equal(typeof result.rawText, 'string');
  assert.equal(result.usedOcr, true);
  assert.ok(result.rawText.length > 0);
  assert.ok(
    fragmentFound(result.rawText),
    `Expected receipt fragment in OCR output, got: "${result.rawText}"`
  );
});

test('OCR unit - empty bytes rejected', async () => {
  await assert.rejects(
    async () => await extractImageText(new Uint8Array([])),
    /non-empty/,
    'Should reject empty bytes'
  );
});

test('low-res receipt OCR improves date/amount structure after preprocess', async () => {
  const imageBytes = await createLowResReceiptJpeg();
  const beforeText = await ocrRaw(imageBytes);
  const after = await extractImageText(imageBytes);
  const beforeMeta = deriveOcrTextMetadata(beforeText, true);
  const afterMeta = deriveOcrTextMetadata(after.rawText, true);

  assert.ok(
    fragmentFound(after.rawText),
    `Expected recoverable fragments after preprocess, got length=${after.rawText.length}`
  );
  assert.equal(afterMeta.plausibleDatePresent, true);
  assert.equal(afterMeta.plausibleAmountPresent, true);
  assert.ok(afterMeta.decimalPriceLikeCandidateCount > 0);
  assert.ok(afterMeta.dateLikePatternCandidateCount > 0);
  assert.ok(
    afterMeta.alphanumericCharacterRatio >= beforeMeta.alphanumericCharacterRatio - 0.05
  );
  assert.ok(afterMeta.noiseHeavyLineCount <= Math.max(beforeMeta.noiseHeavyLineCount, 2));
});

test('Hebrew receipt OCR recovers date and decimal prices', async () => {
  const imageBytes = createHebrewReceiptPng();
  const result = await extractImageText(imageBytes);
  const meta = deriveOcrTextMetadata(result.rawText, true);

  assert.ok(result.rawText.length > 0);
  assert.equal(meta.plausibleDatePresent, true);
  assert.equal(meta.plausibleAmountPresent, true);
  assert.ok(meta.decimalPriceLikeCandidateCount > 0);
  assert.ok(/11\.09\.2026|8\.90|12\.40|21\.30|TOTAL/i.test(result.rawText));
});
