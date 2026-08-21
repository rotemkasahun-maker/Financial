import test from 'node:test';
import assert from 'node:assert/strict';
import { FinanceIngestionService } from '../backend/financeIngestionService.ts';

class MockRepository {
  constructor(state = {}) { this.state = state; }
  async read() { return this.state; }
  async update(fn) { return fn(this.state); }
}

class MockFinanceDataService {
  constructor(transactions = []) {
    this.transactions = transactions;
    this.links = [];
  }
  async getTransactions() { return this.transactions; }
  async linkEvidence(id, evidence) { this.links.push({ id, evidence }); }
}

test('FinanceIngestionService tracks idempotency', async () => {
  const syncRepo = new MockRepository({ processedEvidence: {}, staging: {} });
  const service = new FinanceIngestionService({
    dataService: new MockFinanceDataService(),
    syncRepository: syncRepo
  });

  const evidence = {
    externalSourceId: 'id-1',
    sender: 'Bank',
    originalSmsTimestamp: '2026-08-20T10:00:00Z',
    candidateType: 'AMBIGUOUS'
  };

  assert.equal((await service.processEvidence(evidence)).status, 'review_required');
  assert.equal((await service.processEvidence(evidence)).status, 'already_processed');
});

test('FinanceIngestionService links high-confidence matches', async () => {
  const syncRepo = new MockRepository({ processedEvidence: {}, staging: {} });
  const transactions = [{
    id: 'tx-1',
    date: '2026-08-20',
    merchant: 'Test Merchant',
    amount: 100,
    financialType: 'expense'
  }];

  const service = new FinanceIngestionService({
    dataService: new MockFinanceDataService(transactions),
    syncRepository: syncRepo
  });

  const result = await service.processEvidence({
    externalSourceId: 'id-2',
    sourceType: 'notification',
    sender: 'Google Wallet',
    originalSmsTimestamp: '2026-08-20T10:00:00Z',
    candidateType: 'TRANSACTION',
    normalized: {
      merchant: 'Test Merchant',
      date: '2026-08-20',
      amount: 100
    }
  });

  assert.equal(result.status, 'linked_automatically');
  assert.equal(result.transactionId, 'tx-1');
});

test('partial TRANSACTION evidence is staged safely', async () => {
  const syncRepo = new MockRepository({ processedEvidence: {}, staging: {} });
  const service = new FinanceIngestionService({
    dataService: new MockFinanceDataService(),
    syncRepository: syncRepo
  });

  const result = await service.processEvidence({
    externalSourceId: 'partial-1',
    sourceType: 'sms',
    sender: 'Bank',
    originalSmsTimestamp: 1777000000000,
    candidateType: 'TRANSACTION',
    normalized: { amount: 117.4, currency: 'ILS' }
  });

  assert.equal(result.status, 'review_required');
  assert.equal(syncRepo.state.staging['partial-1'].status, 'review_required');
});

test('staged SMS can be linked once and remains resolved across rereads', async () => {
  const syncRepo = new MockRepository({ processedEvidence: {}, staging: {} });
  const data = new MockFinanceDataService([{
    id: 'tx-3', date: '2026-08-20', merchant: 'Test Merchant', amount: 100, financialType: 'expense'
  }]);
  const service = new FinanceIngestionService({ dataService: data, syncRepository: syncRepo });
  await service.processEvidence({
    externalSourceId: 'sms-3', sourceType: 'android_sms', sender: 'Bank', originalSmsTimestamp: 1777000000000,
    candidateType: 'TRANSACTION', normalized: { amount: 100, currency: 'ILS' }
  });

  const staged = await service.listStagedEvidence();
  assert.equal(staged.length, 1);
  assert.equal(staged[0].candidates[0].id, 'tx-3');
  assert.deepEqual(await service.resolveStagedEvidence('sms-3', 'tx-3'), {
    status: 'resolved', evidenceId: 'sms-3', transactionId: 'tx-3'
  });
  assert.equal((await service.listStagedEvidence()).length, 0);
  assert.equal(data.links.length, 1);
  assert.equal((await service.resolveStagedEvidence('sms-3', 'tx-3')).status, 'already_resolved');
  assert.equal(data.links.length, 1);
});

test('staged SMS can be reviewed without changing financial state', async () => {
  const syncRepo = new MockRepository({ processedEvidence: {}, staging: {} });
  const data = new MockFinanceDataService();
  const service = new FinanceIngestionService({ dataService: data, syncRepository: syncRepo });
  await service.processEvidence({ externalSourceId: 'sms-4', sourceType: 'android_sms', candidateType: 'AMBIGUOUS', originalSmsTimestamp: 1 });
  const result = await service.resolveStagedEvidence('sms-4', null, 'reviewed');
  assert.equal(result.status, 'resolved');
  assert.equal(data.links.length, 0);
  assert.equal(syncRepo.state.staging['sms-4'].resolution, 'reviewed');
});
