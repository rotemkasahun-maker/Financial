import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createBackend } from '../backend/server.ts';
import { MemoryBlobStore } from '../backend/storage.ts';
import { createFinanceStateRepository, emptyFinanceState } from '../backend/financeStorage.ts';
import {
  createSyntheticReceiptJpeg,
  createSyntheticReceiptPng
} from './helpers/syntheticReceiptImage.js';

const TEST_CONFIG = {
  authSigningSecret: 'dGhpcy1pcy1hLTMyLWJ5dGUtZW5jcnlwdGlvbi1rZXk=',
  stateEncryptionKey: 'dGhpcy1pcy1hLTMyLWJ5dGUtZW5jcnlwdGlvbi1rZXk=',
  writeFreezeToken: null
};

async function withServer(run) {
  const config = {
    ...TEST_CONFIG,
    publicBaseUrl: 'http://127.0.0.1',
    financeStateBucket: null,
    financeStateObject: null,
    financeStateFile: `.tmp/test-finance-${randomUUID()}.enc`
  };
  
  const repository = createFinanceStateRepository(config);
  await repository.write(emptyFinanceState());
  
  const server = createBackend({ 
    config, 
    financeRepository: repository 
  });
  
  await new Promise(resolve => server.listen(0, resolve));
  try {
    return await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('receipt extraction - JPEG accepted', async () => withServer(async base => {
  const testImage = createSyntheticReceiptJpeg();
  
  const response = await fetch(`${base}/api/receipts/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg' },
    body: testImage
  });
  
  assert.ok([200, 422].includes(response.status), `Expected 200 or 422, got ${response.status}`);
}));

test('receipt extraction - PNG accepted', async () => withServer(async base => {
  const testImage = createSyntheticReceiptPng();
  
  const response = await fetch(`${base}/api/receipts/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/png' },
    body: testImage
  });
  
  assert.ok([200, 422].includes(response.status), `Expected 200 or 422, got ${response.status}`);
}));

test('receipt extraction - unsupported MIME rejected', async () => withServer(async base => {
  const response = await fetch(`${base}/api/receipts/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/gif' },
    body: new Uint8Array([0x47, 0x49, 0x46])
  });
  
  assert.equal(response.status, 415);
  const payload = await response.json();
  assert.equal(payload.error, 'unsupported_document_type');
}));

test('receipt extraction - empty document rejected', async () => withServer(async base => {
  const response = await fetch(`${base}/api/receipts/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg' },
    body: new Uint8Array([])
  });
  
  assert.equal(response.status, 400);
  const payload = await response.json();
  assert.equal(payload.error, 'empty_document');
}));

test('receipt extraction - existing PDF flow preserved', async () => withServer(async base => {
  const minimalPdf = new Uint8Array([
    0x25, 0x50, 0x44, 0x46,
    0x2D, 0x31, 0x2E, 0x34
  ]);
  
  const response = await fetch(`${base}/api/receipts/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/pdf' },
    body: minimalPdf
  });
  
  assert.ok([200, 422].includes(response.status), `PDF processing should return 200 or 422, got ${response.status}`);
}));
