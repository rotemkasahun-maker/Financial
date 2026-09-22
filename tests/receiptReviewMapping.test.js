import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildReviewStatusStrip,
  coerceReviewPrice,
  displayReviewValue,
  mapAnalyzeResultToReviewState,
  mapBackendItemToReviewItem,
  resolveReviewLineTotal,
  resolveReviewMerchant
} from '../src/shared/receiptReviewMapping.js';

test('displayReviewValue never renders literal undefined', () => {
  assert.equal(displayReviewValue(undefined), '');
  assert.equal(displayReviewValue(null), '');
  assert.equal(displayReviewValue('חלב'), 'חלב');
});

test('resolveReviewLineTotal prefers explicit totalPrice', () => {
  assert.equal(
    resolveReviewLineTotal({
      totalPrice: '76.00',
      unitPrice: '10.00',
      quantity: 2
    }),
    76
  );
});

test('resolveReviewLineTotal derives quantity * unitPrice when totalPrice missing', () => {
  assert.equal(
    resolveReviewLineTotal({
      totalPrice: null,
      unitPrice: '10.00',
      quantity: 2
    }),
    20
  );
});

test('resolveReviewLineTotal does not masquerade unitPrice without quantity', () => {
  assert.equal(
    resolveReviewLineTotal({
      totalPrice: null,
      unitPrice: '76.00',
      quantity: null
    }),
    ''
  );

  assert.equal(
    resolveReviewLineTotal({
      totalPrice: null,
      unitPrice: '76.00',
      quantity: 0
    }),
    ''
  );
});

test('resolveReviewMerchant prefers normalized merchant over rawMerchant', () => {
  assert.equal(
    resolveReviewMerchant({
      merchant: 'Nua',
      rawMerchant: 'NUA BEAUTY LTD'
    }),
    'Nua'
  );
});

test('resolveReviewMerchant falls back to rawMerchant only when merchant absent', () => {
  assert.equal(
    resolveReviewMerchant({
      merchant: null,
      rawMerchant: 'NUA BEAUTY LTD'
    }),
    'NUA BEAUTY LTD'
  );
});

test('mapBackendItemToReviewItem maps backend name to review rawName', () => {
  const item = mapBackendItemToReviewItem({
    name: 'מוצר א',
    quantity: 1,
    unitPrice: '76.00',
    totalPrice: '76.00',
    discount: null
  });

  assert.equal(item.rawName, 'מוצר א');
  assert.equal(item.category, '');
  assert.equal(item.totalPrice, 76);
});

test('mapAnalyzeResultToReviewState preserves explicit item totals and merchant semantics', () => {
  const review = mapAnalyzeResultToReviewState(
    {
      status: 'review_required',
      extraction: {
        merchant: 'Nua',
        rawMerchant: 'NUA BEAUTY LTD',
        purchaseDate: '2026-09-10',
        total: '254.00',
        currency: null,
        paymentMethod: 'Visa',
        confidence: 0.68,
        items: [
          {
            name: 'Item A',
            quantity: 1,
            unitPrice: '76.00',
            totalPrice: '76.00',
            discount: null
          },
          {
            name: 'Item B',
            quantity: 2,
            unitPrice: '7.00',
            totalPrice: null,
            discount: null
          },
          {
            name: 'Item C',
            quantity: 1,
            unitPrice: null,
            totalPrice: '164.00',
            discount: null
          }
        ]
      },
      validation: {
        requiresReview: true,
        issues: [
          { code: 'missing_currency' },
          { code: 'low_confidence' }
        ]
      }
    },
    { fileName: 'receipt.jpg', fileType: 'image' }
  );

  assert.equal(review.merchant, 'Nua');
  assert.equal(review.merchantHint, 'NUA BEAUTY LTD');
  assert.equal(review.category, '');
  assert.deepEqual(
    review.items.map(item => item.totalPrice),
    [76, 14, 164]
  );
  assert.equal(review.items.every(item => item.rawName !== 'undefined'), true);
  assert.match(review.reviewStatusStrip, /נדרשת בדיקה/);
});

test('buildReviewStatusStrip uses success wording only when review is not required', () => {
  assert.match(
    buildReviewStatusStrip({
      confidence: 0.93,
      requiresReview: false,
      validationIssueCodes: []
    }),
    /^✓/
  );

  assert.match(
    buildReviewStatusStrip({
      confidence: 0.68,
      requiresReview: true,
      validationIssueCodes: ['low_confidence']
    }),
    /^⚠/
  );
});

test('coerceReviewPrice returns blank for missing optional values', () => {
  assert.equal(coerceReviewPrice(null), '');
  assert.equal(coerceReviewPrice(undefined), '');
  assert.equal(coerceReviewPrice(''), '');
  assert.equal(coerceReviewPrice('14.00'), 14);
});
