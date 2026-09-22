import test from 'node:test';
import assert from 'node:assert/strict';

import {
  receiptSchema,
  receiptVisionSpikeSchema
} from '../backend/receiptExtractionContract.ts';
import { extractReceiptFromImageWithAi } from '../backend/aiReceiptVisionExtractor.ts';
import { createSyntheticReceiptJpeg } from './helpers/syntheticReceiptImage.js';

test('production receipt schema has no receipt-level category', () => {
  assert.equal(receiptSchema.properties.category, undefined);
  assert.equal(receiptSchema.required.includes('category'), false);
});

test('vision spike schema extends production schema with receipt-level category', () => {
  assert.equal(receiptVisionSpikeSchema.properties.items.type, 'array');
  assert.deepEqual(receiptVisionSpikeSchema.properties.items.items.required, [
    'name',
    'quantity',
    'unitPrice',
    'totalPrice',
    'discount'
  ]);
  assert.ok(receiptVisionSpikeSchema.properties.category);
  assert.equal(receiptVisionSpikeSchema.required.includes('category'), true);
});

test('extractReceiptFromImageWithAi rejects empty bytes', async () => {
  await assert.rejects(
    () => extractReceiptFromImageWithAi(new Uint8Array()),
    /non-empty Uint8Array/
  );
});

test('extractReceiptFromImageWithAi returns structured extraction when API key configured', async (t) => {
  if (!process.env.OPENAI_API_KEY) {
    t.skip('OPENAI_API_KEY not configured');
    return;
  }

  try {
    const result = await extractReceiptFromImageWithAi(
      createSyntheticReceiptJpeg()
    );

    assert.equal(typeof result.extraction.merchant, 'string');
    assert.equal('category' in result, true);
    assert.equal(typeof result.latencyMs, 'number');
    assert.ok(result.latencyMs > 0);
    assert.ok(
      result.extraction.confidence >= 0 &&
        result.extraction.confidence <= 1
    );
  } catch (error) {
    if (error?.code === 'invalid_api_key' || error?.status === 401) {
      t.skip('OPENAI_API_KEY is not valid in this environment');
      return;
    }

    throw error;
  }
});
