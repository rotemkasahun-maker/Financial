import test from 'node:test';
import assert from 'node:assert/strict';
import { FinanceIngestionService } from '../backend/financeIngestionService.ts';

class MockRepository {
  constructor(state = {}) { this.state = state; }
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
