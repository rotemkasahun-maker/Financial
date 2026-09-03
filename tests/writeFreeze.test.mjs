import test from 'node:test';
import assert from 'node:assert/strict';
import { GmailStateRepository, MemoryBlobStore } from '../backend/storage.ts';
import { FinanceStateRepository } from '../backend/financeStorage.ts';
import { WriteFreezeController, WriteFrozenError } from '../backend/writeFreeze.ts';

const key = Buffer.alloc(32, 7);
const finance = { version: 1, transactions: [], receipts: [], expectedDocuments: [], tasks: [], reimbursements: [] };

test('shared freeze blocks Gmail and finance writes while reads remain available', async () => {
  const controller = new WriteFreezeController();
  const gmail = new GmailStateRepository({ blobStore: new MemoryBlobStore(), encryptionKey: key, freezeController: controller });
  const financeRepo = new FinanceStateRepository({ blobStore: new MemoryBlobStore(), encryptionKey: key, freezeController: controller });
  await gmail.write({ version: 1, connections: {}, processedMessages: {}, processedDocuments: {}, processedEvidence: {}, deliveries: {}, staging: {} });
  await financeRepo.write(finance);
  controller.freeze();
  await assert.rejects(() => gmail.update(state => { state.deliveries.x = true; }), WriteFrozenError);
  await assert.rejects(() => financeRepo.update(state => { state.transactions.push({ id: 'x' }); }), WriteFrozenError);
  assert.equal((await gmail.read()).deliveries.x, undefined);
  assert.deepEqual((await financeRepo.read()).transactions, []);
  assert.equal(controller.status(), 'WRITE_FROZEN');
  controller.release();
  await financeRepo.update(state => { state.transactions.push({ id: 'x' }); });
  assert.equal((await financeRepo.read()).transactions.length, 1);
});

test('freeze and release are idempotent and preserve explicit state', () => {
  const controller = new WriteFreezeController();
  assert.equal(controller.status(), 'NORMAL');
  assert.equal(controller.freeze(), 'WRITE_FROZEN');
  assert.equal(controller.freeze(), 'WRITE_FROZEN');
  assert.equal(controller.release(), 'NORMAL');
  assert.equal(controller.release(), 'NORMAL');
});
