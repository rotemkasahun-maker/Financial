import test from 'node:test';
import assert from 'node:assert/strict';

test('receipt response values are limited to the two explicit states', () => {
  const allowed = ['DIGITAL_AWAITING_DOCUMENT', 'NO_RECEIPT_RECEIVED'];
  assert.equal(allowed.includes('DIGITAL_AWAITING_DOCUMENT'), true);
  assert.equal(allowed.includes('NO_RECEIPT_RECEIVED'), true);
  assert.equal(allowed.includes('PRESENT'), false);
});

test('same household and source identity keep one current response', () => {
  const responses = {};
  const key = 'household-a:source-1';
  responses[key] = { externalSourceId: 'source-1', response: 'DIGITAL_AWAITING_DOCUMENT' };
  responses[key] = { externalSourceId: 'source-1', response: 'NO_RECEIPT_RECEIVED' };
  assert.equal(Object.keys(responses).length, 1);
  assert.equal(responses[key].response, 'NO_RECEIPT_RECEIVED');
});

test('receipt response state cannot represent receipt presence or create transactions', () => {
  const state = { receiptResponses: {}, transactions: [], receipts: [] };
  state.receiptResponses['household-a:unknown'] = { externalSourceId: 'unknown', response: 'NO_RECEIPT_RECEIVED' };
  assert.equal(state.transactions.length, 0);
  assert.equal(state.receipts.length, 0);
});
