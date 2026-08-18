import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  validateReceiptExtraction
} from '../backend/receiptValidator.ts';

const loadFixture = async () =>
  JSON.parse(
    await readFile(
      new URL('./fixtures/ai-receipt-ksp.json', import.meta.url),
      'utf8'
    )
  );

test('valid AI receipt with AI warning requires review', async () => {
  const receipt = await loadFixture();

  const validation = validateReceiptExtraction(receipt);

  assert.equal(validation.valid, true);
  assert.equal(validation.safeForAutomaticSave, false);
  assert.equal(validation.requiresReview, true);
  assert.equal(validation.confidence, 0.94);

  assert.ok(
    validation.issues.some(
      issue =>
        issue.code === 'ai_warning' &&
        issue.severity === 'warning'
    )
  );
});

test('high-confidence clean receipt can be automatically saved', async () => {
  const receipt = await loadFixture();

  const cleanReceipt = {
    ...receipt,
    warnings: [],
    confidence: 0.96
  };

  const validation =
    validateReceiptExtraction(cleanReceipt);

  assert.equal(validation.valid, true);
  assert.equal(validation.safeForAutomaticSave, true);
  assert.equal(validation.requiresReview, false);
  assert.equal(validation.issues.length, 0);
});

test('missing financial core data blocks automatic save', async () => {
  const receipt = await loadFixture();

  const incompleteReceipt = {
    ...receipt,
    total: null,
    confidence: 0.98,
    warnings: []
  };

  const validation =
    validateReceiptExtraction(incompleteReceipt);

  assert.equal(validation.valid, false);
  assert.equal(validation.safeForAutomaticSave, false);
  assert.equal(validation.requiresReview, true);

  assert.ok(
    validation.issues.some(
      issue =>
        issue.code === 'missing_total' &&
        issue.severity === 'error'
    )
  );
});

test('low AI confidence requires review', async () => {
  const receipt = await loadFixture();

  const uncertainReceipt = {
    ...receipt,
    confidence: 0.82,
    warnings: []
  };

  const validation =
    validateReceiptExtraction(uncertainReceipt);

  assert.equal(validation.valid, true);
  assert.equal(validation.safeForAutomaticSave, false);
  assert.equal(validation.requiresReview, true);

  assert.ok(
    validation.issues.some(
      issue => issue.code === 'review_confidence'
    )
  );
});