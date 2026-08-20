import test from 'node:test';
import assert from 'node:assert/strict';
import { FinanceIngestionService } from '../backend/financeIngestionService.ts';

class MockRepository {
  constructor(state = {}) { this.state = state; }
  async update(fn) {
    const result = await fn(this.state);
    return result;
  }
}

class MockFinanceDataService {
  constructor(transactions = []) {
    this.transactions = transactions;
    this.links = [];
  }
  async getTransactions() { return this.transactions; }
  async linkEvidence(id, evidence) {
    this.links.push({ id, evidence });
  }
}

test('FinanceIngestionService tracks idempotency', async () => {
  const syncRepo = new MockRepository({ processedEvidence: {}, staging: {} });
  const financeData = new MockFinanceDataService();
  const service = new FinanceIngestionService({ dataService: financeData, syncRepository: syncRepo });

  const evidence = {
    externalSourceId: 'id-1',
    sender: 'Bank',
    originalSmsTimestamp: '2026-08-20T10:00:00Z',
    candidateType: 'AMBIGUOUS'
  };

  const result1 = await service.processEvidence(evidence);
  assert.equal(result1.status, 'review_required');

  const result2 = await service.processEvidence(evidence);
  assert.equal(result2.status, 'already_processed');
});

test('FinanceIngestionService links high-confidence matches', async () => {
  const syncRepo = new MockRepository({ processedEvidence: {}, staging: {} });
  const transactions = [{ id: 'tx-1', date: '2026-08-20', merchant: 'Test Merchant', amount: 100, financialType: 'expense' }];
  const financeData = new MockFinanceDataService(transactions);
  const service = new FinanceIngestionService({ dataService: financeData, syncRepository: syncRepo });

  // Mock state for handleTransaction to find the transaction
  syncRepo.state.transactions = transactions;

  const evidence = {
    externalSourceId: 'id-2',
    sender: 'Bank',
    originalSmsTimestamp: '2026-08-20T10:00:00Z',
    candidateType: 'TRANSACTION',
    normalized: {
      merchant: 'Test Merchant',
      date: '2026-08-20',
      amount: 100
    }
  };

  const result = await service.processEvidence(evidence);
  assert.equal(result.status, 'linked_automatically');
  assert.equal(result.transactionId, 'tx-1');
});
