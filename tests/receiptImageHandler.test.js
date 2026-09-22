import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { processReceiptImage } from '../backend/receiptProcessingService.ts';
import { createBackend } from '../backend/server.ts';
import { createFinanceStateRepository, emptyFinanceState } from '../backend/financeStorage.ts';
import {
  createSyntheticReceiptJpeg,
  createSyntheticReceiptPng
} from './helpers/syntheticReceiptImage.js';

const STUB_EXTRACTION = {
  merchant: 'TEST MARKET',
  rawMerchant: 'TEST MARKET',
  purchaseDate: '2026-09-09',
  purchaseTime: null,
  total: '42.50',
  currency: 'ILS',
  invoiceNumber: null,
  receiptNumber: null,
  paymentMethod: null,
  cardLast4: null,
  vat: null,
  subtotalBeforeVat: null,
  items: [
    {
      name: 'TEST ITEM',
      quantity: 1,
      unitPrice: '42.50',
      totalPrice: '42.50',
      discount: null
    }
  ],
  confidence: 0.95,
  warnings: []
};

const TEST_CONFIG = {
  authSigningSecret: 'dGhpcy1pcy1hLTMyLWJ5dGUtZW5jcnlwdGlvbi1rZXk=',
  stateEncryptionKey: 'dGhpcy1pcy1hLTMyLWJ5dGUtZW5jcnlwdGlvbi1rZXk=',
  writeFreezeToken: null
};

function fragmentFound(text) {
  return /TEST\s*MARKET|09\.09\.2026|42\.50|TOTAL/i.test(text);
}

test('meaningful OCR - synthetic receipt PNG returns non-empty text with expected fragment', async () => {
  const imageBytes = createSyntheticReceiptPng();
  let ocrInvoked = false;

  const result = await processReceiptImage(imageBytes, {
    extractReceiptWithAiFn: async rawText => {
      ocrInvoked = true;
      assert.ok(rawText.length > 0, 'OCR output should be non-empty');
      assert.ok(fragmentFound(rawText), `OCR output missing expected fragment: ${rawText}`);
      return STUB_EXTRACTION;
    },
    extractReceiptFromImageWithAiFn: async () => {
      throw new Error('Vision fallback should not run for complete stub items');
    }
  });

  assert.equal(ocrInvoked, true, 'AI boundary should receive OCR text');
  assert.ok(result.document?.usedOcr, 'OCR path should be used');
  assert.ok(result.document?.textLength > 0, 'document.textLength should be > 0');
});

test('image handler path - processReceiptImage maps OCR to structured response', async () => {
  const imageBytes = createSyntheticReceiptJpeg();
  let aiInput = null;

  const result = await processReceiptImage(imageBytes, {
    extractReceiptWithAiFn: async rawText => {
      aiInput = rawText;
      return STUB_EXTRACTION;
    },
    extractReceiptFromImageWithAiFn: async () => {
      throw new Error('Vision fallback should not run for complete stub items');
    }
  });

  assert.ok(aiInput, 'extractReceiptWithAi should be invoked');
  assert.ok(fragmentFound(aiInput), `AI input missing expected OCR fragment: ${aiInput}`);
  assert.equal(result.status, 'ready_for_automatic_save');
  assert.equal(result.extraction?.merchant, 'TEST MARKET');
  assert.equal(result.extraction?.total, '42.50');
  assert.equal(result.document?.usedOcr, true);
  assert.equal(result.error, null);
  assert.ok(result.diagnostics, 'image diagnostics should be present');
  assert.equal(result.diagnostics.ocr.usedOcr, true);
  assert.ok(result.diagnostics.ocr.textLength > 0);
  assert.equal(result.diagnostics.extraction.populatedCoreFieldCount, 3);
  assert.equal(typeof result.diagnostics.ocr.plausibleDatePresent, 'boolean');
  assert.equal(typeof result.diagnostics.ocr.plausibleAmountPresent, 'boolean');
  assert.equal(
    JSON.stringify(result.diagnostics).includes('TEST MARKET'),
    false
  );
});

test('image handler path - /api/receipts/analyze executes production image branch', async () => {
  const imageBytes = createSyntheticReceiptJpeg();
  const config = {
    ...TEST_CONFIG,
    publicBaseUrl: 'http://127.0.0.1',
    financeStateFile: `.tmp/test-finance-${randomUUID()}.enc`
  };

  const repository = createFinanceStateRepository(config);
  await repository.write(emptyFinanceState());

  const server = createBackend({
    config,
    financeRepository: repository
  });

  await new Promise(resolve => server.listen(0, resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    const response = await fetch(`${base}/api/receipts/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg' },
      body: imageBytes
    });

    const payload = await response.json();

    if (process.env.OPENAI_API_KEY) {
      assert.ok([200, 422].includes(response.status));
      if (response.status === 200) {
        assert.ok(payload.extraction, 'structured extraction should be present');
        assert.equal(payload.document?.usedOcr, true);
      } else {
        assert.equal(payload.status, 'processing_failed');
      }
      return;
    }

    assert.equal(response.status, 422);
    assert.equal(payload.status, 'processing_failed');
    assert.match(
      payload.error,
      /OPENAI_API_KEY|AI receipt extraction/i,
      'Failure should occur at AI boundary after OCR, not at empty-text OCR failure'
    );
    assert.notEqual(
      payload.error,
      'No readable text could be extracted from image',
      'OCR should produce readable text before AI boundary'
    );
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
