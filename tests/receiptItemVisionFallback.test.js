import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { processReceiptImage } from '../backend/receiptProcessingService.ts';
import {
  applyItemVisionFallback,
  mergeVisionItems,
  shouldUseItemVisionFallback
} from '../backend/receiptItemVisionFallback.ts';
import {
  createSyntheticReceiptJpeg,
  createSyntheticReceiptPng
} from './helpers/syntheticReceiptImage.js';

const OCR_CORE = {
  merchant: 'OCR MARKET',
  rawMerchant: 'OCR MARKET LTD',
  purchaseDate: '2026-09-10',
  purchaseTime: '14:06',
  total: '38.20',
  currency: 'ILS',
  invoiceNumber: null,
  receiptNumber: null,
  paymentMethod: null,
  cardLast4: null,
  vat: null,
  subtotalBeforeVat: null,
  confidence: 0.95,
  warnings: []
};

const COMPLETE_ITEM = {
  name: 'OCR ITEM',
  quantity: 1,
  unitPrice: '38.20',
  totalPrice: '38.20',
  discount: null
};

const VISION_WRONG_CORE = {
  merchant: 'VISION STORE',
  rawMerchant: 'VISION STORE LTD',
  purchaseDate: '2023-01-01',
  purchaseTime: '00:00',
  total: '999.00',
  currency: 'USD',
  invoiceNumber: null,
  receiptNumber: null,
  paymentMethod: null,
  cardLast4: null,
  vat: null,
  subtotalBeforeVat: null,
  confidence: 0.99,
  warnings: ['vision-note'],
  category: 'פנאי',
  items: [
    {
      name: 'VISION ITEM',
      quantity: 2,
      unitPrice: '8.50',
      totalPrice: '17.00',
      discount: null
    }
  ]
};

function visionResult(overrides = {}) {
  return {
    extraction: {
      ...VISION_WRONG_CORE,
      ...overrides
    },
    category: overrides.category ?? 'פנאי',
    latencyMs: 12,
    usage: null
  };
}

function assertOcrCorePreserved(extraction) {
  assert.equal(extraction.merchant, 'OCR MARKET');
  assert.equal(extraction.rawMerchant, 'OCR MARKET LTD');
  assert.equal(extraction.purchaseDate, '2026-09-10');
  assert.equal(extraction.purchaseTime, '14:06');
  assert.equal(extraction.total, '38.20');
  assert.equal(extraction.currency, 'ILS');
  assert.equal(extraction.confidence, 0.95);
  assert.deepEqual(extraction.warnings, []);
  assert.equal(extraction.category, undefined);
}

async function runImage(ocrExtraction, visionFn, extraDeps = {}) {
  let visionCalls = 0;
  const result = await processReceiptImage(new Uint8Array([255, 216, 255]), {
    extractImageTextFn: async () => ({ rawText: 'TOTAL 38.20', usedOcr: true }),
    extractReceiptWithAiFn: async () => structuredClone(ocrExtraction),
    extractReceiptFromImageWithAiFn: async bytes => {
      visionCalls += 1;
      return visionFn(bytes);
    },
    ...extraDeps
  });
  return { result, visionCalls };
}

test('1. OCR complete items do not trigger Vision', async () => {
  assert.equal(
    shouldUseItemVisionFallback({ ...OCR_CORE, items: [COMPLETE_ITEM] }),
    false
  );

  const { result, visionCalls } = await runImage(
    { ...OCR_CORE, items: [COMPLETE_ITEM] },
    async () => {
      throw new Error('Vision should not be called');
    }
  );

  assert.equal(visionCalls, 0);
  assert.equal(result.status, 'ready_for_automatic_save');
  assert.equal(result.validation.requiresReview, false);
  assertOcrCorePreserved(result.extraction);
});

test('2. OCR 0 items uses Vision rows as review candidates and preserves OCR core', async () => {
  const { result, visionCalls } = await runImage({ ...OCR_CORE, items: [] }, async () =>
    visionResult()
  );

  assert.equal(visionCalls, 1);
  assert.equal(result.status, 'review_required');
  assert.equal(result.validation.requiresReview, true);
  assert.equal(result.validation.safeForAutomaticSave, false);
  assertOcrCorePreserved(result.extraction);
  assert.equal(result.extraction.items.length, 1);
  assert.equal(result.extraction.items[0].name, 'VISION ITEM');
  assert.equal(result.extraction.items[0].totalPrice, '17.00');
});

test('3. matching Vision item fills only missing OCR line total', () => {
  const merged = mergeVisionItems(
    {
      ...OCR_CORE,
      items: [
        {
          name: 'OCR ITEM',
          quantity: 1,
          unitPrice: null,
          totalPrice: null,
          discount: null
        }
      ]
    },
    {
      ...VISION_WRONG_CORE,
      items: [
        {
          name: 'VISION ITEM',
          quantity: 3,
          unitPrice: '8.50',
          totalPrice: '8.50',
          discount: null
        }
      ]
    }
  );

  assert.equal(merged.visionContributed, true);
  assert.equal(merged.extraction.items[0].name, 'OCR ITEM');
  assert.equal(merged.extraction.items[0].quantity, 1);
  assert.equal(merged.extraction.items[0].totalPrice, '8.50');
  assert.equal(merged.extraction.items[0].unitPrice, '8.50');
  assertOcrCorePreserved(merged.extraction);
});

test('4. quantity plus unitPrice is a usable line total and does not trigger Vision', async () => {
  const ocr = {
    ...OCR_CORE,
    items: [
      {
        name: 'Milk',
        quantity: 2,
        unitPrice: '10.00',
        totalPrice: null,
        discount: null
      }
    ]
  };

  assert.equal(shouldUseItemVisionFallback(ocr), false);
  const { visionCalls } = await runImage(ocr, async () => {
    throw new Error('Vision should not be called');
  });
  assert.equal(visionCalls, 0);
});

test('5. Vision wrong merchant does not overwrite OCR merchant', async () => {
  const { result } = await runImage({ ...OCR_CORE, items: [] }, async () => visionResult());
  assert.equal(result.extraction.merchant, 'OCR MARKET');
});

test('6. Vision wrong rawMerchant does not overwrite OCR rawMerchant', async () => {
  const { result } = await runImage({ ...OCR_CORE, items: [] }, async () => visionResult());
  assert.equal(result.extraction.rawMerchant, 'OCR MARKET LTD');
});

test('7. Vision wrong date does not overwrite OCR date', async () => {
  const { result } = await runImage({ ...OCR_CORE, items: [] }, async () => visionResult());
  assert.equal(result.extraction.purchaseDate, '2026-09-10');
  assert.equal(result.extraction.purchaseTime, '14:06');
});

test('8. Vision wrong total does not overwrite OCR total', async () => {
  const { result } = await runImage({ ...OCR_CORE, items: [] }, async () => visionResult());
  assert.equal(result.extraction.total, '38.20');
});

test('9. Vision wrong currency does not overwrite OCR currency', async () => {
  const { result } = await runImage({ ...OCR_CORE, items: [] }, async () => visionResult());
  assert.equal(result.extraction.currency, 'ILS');
});

test('10. Vision category is ignored', async () => {
  const { result } = await runImage({ ...OCR_CORE, items: [] }, async () =>
    visionResult({ category: 'פנאי' })
  );
  assert.equal(result.extraction.category, undefined);
  assert.equal('category' in result.extraction, false);
});

test('11. Vision name cannot overwrite a non-empty OCR name', () => {
  const merged = mergeVisionItems(
    {
      ...OCR_CORE,
      items: [
        {
          name: 'OCR NAME',
          quantity: null,
          unitPrice: null,
          totalPrice: null,
          discount: null
        }
      ]
    },
    {
      ...VISION_WRONG_CORE,
      items: [
        {
          name: 'VISION NAME',
          quantity: 1,
          unitPrice: '1.00',
          totalPrice: '1.00',
          discount: null
        }
      ]
    }
  );

  assert.equal(merged.extraction.items[0].name, 'OCR NAME');
});

test('12. empty OCR name may take Vision name as review candidate', () => {
  const merged = mergeVisionItems(
    {
      ...OCR_CORE,
      items: [
        {
          name: '',
          quantity: null,
          unitPrice: null,
          totalPrice: null,
          discount: null
        }
      ]
    },
    {
      ...VISION_WRONG_CORE,
      items: [
        {
          name: 'VISION NAME',
          quantity: 1,
          unitPrice: '1.00',
          totalPrice: '1.00',
          discount: null
        }
      ]
    }
  );

  assert.equal(merged.extraction.items[0].name, 'VISION NAME');
  assert.equal(merged.forceReview, true);
});

test('13. unequal item counts do not merge', () => {
  const merged = mergeVisionItems(
    {
      ...OCR_CORE,
      items: [COMPLETE_ITEM, { ...COMPLETE_ITEM, name: 'SECOND' }]
    },
    VISION_WRONG_CORE
  );

  assert.equal(merged.visionContributed, false);
  assert.equal(merged.forceReview, true);
  assert.equal(merged.extraction.items.length, 2);
  assert.equal(merged.extraction.items[0].name, 'OCR ITEM');
});

test('14. Vision timeout preserves OCR extraction and does not fail analyze', async () => {
  const result = await applyItemVisionFallback(
    { ...OCR_CORE, items: [] },
    new Uint8Array([1]),
    {
      timeoutMs: 20,
      extractReceiptFromImageWithAiFn: () => new Promise(() => {})
    }
  );

  assert.equal(result.visionCallCount, 1);
  assert.equal(result.visionContributed, false);
  assertOcrCorePreserved(result.extraction);
  assert.deepEqual(result.extraction.items, []);

  const { result: imageResult } = await runImage(
    { ...OCR_CORE, items: [] },
    () => new Promise(() => {}),
    { visionTimeoutMs: 20 }
  );
  assert.notEqual(imageResult.status, 'processing_failed');
});

test('15. Vision exception preserves OCR extraction and does not fail analyze', async () => {
  const result = await applyItemVisionFallback(
    { ...OCR_CORE, items: [] },
    new Uint8Array([1]),
    {
      extractReceiptFromImageWithAiFn: async () => {
        throw new Error('vision failed');
      }
    }
  );

  assert.equal(result.visionCallCount, 1);
  assert.equal(result.visionContributed, false);
  assert.equal(result.extraction.total, '38.20');

  const { result: imageResult } = await runImage({ ...OCR_CORE, items: [] }, async () => {
    throw new Error('vision failed');
  });
  assert.notEqual(imageResult.status, 'processing_failed');
  assertOcrCorePreserved(imageResult.extraction);
});

test('16. invalid Vision structure preserves OCR items', async () => {
  const merged = mergeVisionItems(
    { ...OCR_CORE, items: [COMPLETE_ITEM] },
    { ...VISION_WRONG_CORE, items: null }
  );
  assert.equal(merged.visionContributed, false);
  assert.equal(merged.extraction.items[0].name, 'OCR ITEM');

  const { result } = await runImage({ ...OCR_CORE, items: [] }, async () => ({
    extraction: { items: 'not-an-array' },
    category: 'פנאי',
    latencyMs: 1,
    usage: null
  }));
  assert.notEqual(result.status, 'processing_failed');
  assert.deepEqual(result.extraction.items, []);
  assertOcrCorePreserved(result.extraction);
});

test('17. Vision contribution forces requiresReview', async () => {
  const { result } = await runImage({ ...OCR_CORE, items: [] }, async () => visionResult());
  assert.equal(result.status, 'review_required');
  assert.equal(result.validation.requiresReview, true);
  assert.equal(result.validation.safeForAutomaticSave, false);
});

test('18. Vision-derived items cannot auto-save before user review', async () => {
  const { result } = await runImage({ ...OCR_CORE, items: [] }, async () => visionResult());
  assert.equal(result.status, 'review_required');
  assert.equal(result.validation.safeForAutomaticSave, false);

  const [serverSource, appSource] = await Promise.all([
    readFile(new URL('../backend/server.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app.js', import.meta.url), 'utf8')
  ]);

  const analyzeStart = serverSource.indexOf("url.pathname ===\n            '/api/receipts/analyze'");
  const analyzeEnd = serverSource.indexOf('Gmail routes below this point');
  assert.ok(analyzeStart > 0 && analyzeEnd > analyzeStart);
  const analyzeBlock = serverSource.slice(analyzeStart, analyzeEnd);
  assert.match(analyzeBlock, /processReceiptImage\(bytes\)/);
  assert.doesNotMatch(analyzeBlock, /saveReceipt/);
  assert.match(analyzeBlock, /return json\(\s*res,\s*200,\s*result/);

  assert.match(
    serverSource,
    /url\.pathname === '\/api\/finance\/receipts'[\s\S]*saveReceipt/
  );

  const analyzeHandler = appSource.slice(
    appSource.indexOf("backendFetch('/api/receipts/analyze'"),
    appSource.indexOf('document.querySelectorAll(\'[data-gmail-receipt]\')')
  );
  assert.match(analyzeHandler, /mapAnalyzeResultToReviewState/);
  assert.match(analyzeHandler, /state\.extracted=/);
  assert.doesNotMatch(analyzeHandler, /saveReceipt/);
  assert.doesNotMatch(analyzeHandler, /receiptStep=2|receiptStep=3/);

  assert.match(
    appSource,
    /#confirmMatch'\)\?\.addEventListener\('click',async\(\)=>\{await dataService\.saveReceipt/
  );
  assert.match(appSource, /#reviewForm'\)\?\.addEventListener\('submit'/);
});

test('19. PDF processing remains Vision-free', async () => {
  const source = await readFile(
    new URL('../backend/receiptProcessingService.ts', import.meta.url),
    'utf8'
  );
  const pdfFn = source.slice(
    source.indexOf('export async function processReceiptPdf'),
    source.indexOf('export async function processReceiptImage')
  );
  assert.match(pdfFn, /extractPdfText/);
  assert.match(pdfFn, /extractReceiptWithAi/);
  assert.match(pdfFn, /validateReceiptExtraction/);
  assert.doesNotMatch(pdfFn, /applyItemVisionFallback|extractReceiptFromImageWithAi|processReceiptImage/);

  const gmail = await readFile(
    new URL('../backend/gmailReceiptProcessor.ts', import.meta.url),
    'utf8'
  );
  assert.match(gmail, /processReceiptPdf/);
  assert.doesNotMatch(gmail, /applyItemVisionFallback|processReceiptImage/);
});

test('20. existing JPEG/PNG extraction still maps OCR without Vision', async () => {
  const jpeg = createSyntheticReceiptJpeg();
  const png = createSyntheticReceiptPng();
  let visionCalls = 0;

  const jpegResult = await processReceiptImage(jpeg, {
    extractReceiptWithAiFn: async rawText => {
      assert.ok(rawText.length > 0);
      return { ...OCR_CORE, items: [COMPLETE_ITEM] };
    },
    extractReceiptFromImageWithAiFn: async () => {
      visionCalls += 1;
      throw new Error('Vision should not run for complete JPEG OCR items');
    }
  });

  const pngResult = await processReceiptImage(png, {
    extractReceiptWithAiFn: async rawText => {
      assert.ok(rawText.length > 0);
      return { ...OCR_CORE, items: [COMPLETE_ITEM] };
    },
    extractReceiptFromImageWithAiFn: async () => {
      visionCalls += 1;
      throw new Error('Vision should not run for complete PNG OCR items');
    }
  });

  assert.equal(visionCalls, 0);
  assert.equal(jpegResult.status, 'ready_for_automatic_save');
  assert.equal(pngResult.status, 'ready_for_automatic_save');
  assert.equal(jpegResult.document.usedOcr, true);
  assert.equal(pngResult.document.usedOcr, true);
  assert.ok(jpegResult.document.textLength > 0);
  assert.ok(pngResult.document.textLength > 0);
});

test('missing merchant or low confidence alone does not trigger Vision', () => {
  assert.equal(
    shouldUseItemVisionFallback({
      ...OCR_CORE,
      merchant: null,
      rawMerchant: null,
      confidence: 0.2,
      items: [COMPLETE_ITEM]
    }),
    false
  );
});

test('processReceiptImage calls Vision at most once', async () => {
  const { visionCalls } = await runImage({ ...OCR_CORE, items: [] }, async () =>
    visionResult()
  );
  assert.equal(visionCalls, 1);
});
