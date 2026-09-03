import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');

test('receipt reminder deep link preserves transaction context through authenticated bootstrap', () => {
  assert.match(source, /requestedPage==='receiptCapture'&&requestedReceiptTransactionId/);
  assert.match(source, /openReceiptForTransaction\(requestedReceiptTransactionId\)/);
  assert.match(source, /preselectedTransactionId:transactionId/);
});
