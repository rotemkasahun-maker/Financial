import test from 'node:test';
import assert from 'node:assert/strict';
import { extractImageText } from '../backend/imageTextExtractor.ts';
import { createSyntheticReceiptPng } from './helpers/syntheticReceiptImage.js';

test('meaningful OCR - synthetic receipt image returns non-empty text', async () => {
  const imageBytes = createSyntheticReceiptPng();
  const result = await extractImageText(imageBytes);

  assert.equal(typeof result.rawText, 'string');
  assert.equal(result.usedOcr, true);
  assert.ok(result.rawText.length > 0, `Expected non-empty OCR output, got: "${result.rawText}"`);
  assert.ok(
    /TEST\s*MARKET|09\.09\.2026|42\.50|TOTAL/i.test(result.rawText),
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
