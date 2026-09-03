import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createBackend } from '../backend/server.ts';

const mockConfig = {
  port: 8082,
  publicBaseUrl: 'http://127.0.0.1:8082',
  connectorSharedToken: 'valid-token',
  stateEncryptionKey: 'dGhpcy1pcy1hLTMyLWJ5dGUtZW5jcnlwdGlvbi1rZXk='
};

test('POST /api/ingestion/evidence rejects missing token', async () => {
  const server = createBackend({ config: mockConfig });
  server.listen(8082);

  try {
    const response = await fetch('http://127.0.0.1:8082/api/ingestion/evidence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ externalSourceId: 'id' })
    });
    assert.equal(response.status, 401);
  } finally {
    server.close();
  }
});

test('POST /api/ingestion/evidence rejects invalid token', async () => {
  const server = createBackend({ config: mockConfig });
  server.listen(8082);

  try {
    const response = await fetch('http://127.0.0.1:8082/api/ingestion/evidence', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer wrong-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ externalSourceId: 'id' })
    });
    assert.equal(response.status, 401);
  } finally {
    server.close();
  }
});

test('POST /api/ingestion/evidence returns 503 if finance not configured', async () => {
  const configWithoutFinance = { ...mockConfig, stateEncryptionKey: null };
  const server = createBackend({ config: configWithoutFinance });
  server.listen(8082);

  try {
    const response = await fetch('http://127.0.0.1:8082/api/ingestion/evidence', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ externalSourceId: 'id' })
    });
    assert.equal(response.status, 503);
    const result = await response.json();
    assert.equal(result.error, 'finance_not_configured');
  } finally {
    server.close();
  }
});

test('POST /api/ingestion/evidence succeeds when finance configured', async () => {
  const state = {
    processedEvidence: {},
    staging: {}
  };

  const repository = {
    async read() {
      return state;
    },
    async update(updater) {
      return updater(state);
    }
  };

  const financeDataService = {};

  const server = createBackend({
    config: mockConfig,
    repository,
    financeDataService
  });

  server.listen(8082);

  try {
    const response = await fetch(
      'http://127.0.0.1:8082/api/ingestion/evidence',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          externalSourceId: 'test-id-' + Date.now(),
          sourceType: 'sms',
          candidateType: 'AMBIGUOUS',
          originalSmsTimestamp: new Date().toISOString()
        })
      }
    );

    assert.equal(response.status, 200);

    const result = await response.json();
    assert.equal(result.status, 'review_required');
  } finally {
    server.close();
  }
});

test('household-authenticated evidence status is authoritative and isolated', async () => {
  const salt = 'evidence-status-salt';
  const hash = value => createHash('sha256').update(`${salt}:${value}`).digest('hex');
  const config = {
    ...mockConfig,
    authSigningSecret: mockConfig.stateEncryptionKey,
    authSessionDurationMs: 600000,
    authUsers: [
      { userId: 'user-a', householdId: 'household-a', passwordSalt: salt, passwordHash: hash('a-secret') },
      { userId: 'user-b', householdId: 'household-b', passwordSalt: salt, passwordHash: hash('b-secret') }
    ]
  };
  const syncState = { processedEvidence: {}, staging: {} };
  const repository = {
    async read() { return syncState; },
    async update(updater) { return updater(syncState); }
  };
  const transactions = [{
    id: 'tx-http', householdId: 'household-a', date: '2026-08-20', merchant: 'Test Merchant',
    amount: 100, financialType: 'expense', receiptId: null
  }];
  const financeDataService = {
    async getTransactions() { return transactions; },
    async linkEvidence() {},
    async getTransactionReceiptState(id, context) {
      const transaction = transactions.find(item => item.id === id && item.householdId === context.householdId);
      return transaction ? { transactionId: transaction.id, receiptPresent: Boolean(transaction.receiptId) } : null;
    }
  };
  const server = createBackend({ config, repository, financeDataService });
  await new Promise(resolve => server.listen(0, resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    const login = async (userId, credential) => (await (await fetch(`${base}/api/auth/session`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId, credential })
    })).json()).session;
    const sessionA = await login('user-a', 'a-secret');
    const sessionB = await login('user-b', 'b-secret');
    const evidence = {
      externalSourceId: 'http-status-1', sourceType: 'notification', candidateType: 'TRANSACTION', originalSmsTimestamp: 1,
      normalized: { merchant: 'Test Merchant', date: '2026-08-20', amount: 100 }
    };
    const ingest = () => fetch(`${base}/api/ingestion/evidence`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-token',
        'x-household-session': sessionA,
        'content-type': 'application/json'
      },
      body: JSON.stringify(evidence)
    });

    assert.equal((await ingest()).status, 200);
    assert.equal((await (await ingest()).json()).status, 'already_processed');
    assert.equal((await fetch(`${base}/api/finance/evidence-status/http-status-1`)).status, 401);

    const statusA = await (await fetch(`${base}/api/finance/evidence-status/http-status-1`, {
      headers: { authorization: `Bearer ${sessionA}` }
    })).json();
    assert.equal(statusA.ingestionStatus, 'resolved');
    assert.equal(statusA.transactionId, 'tx-http');
    assert.equal(statusA.receiptStatus, 'absent');
    assert.equal(statusA.receiptPresent, false);

    transactions[0].receiptId = 'receipt-http';
    const withReceipt = await (await fetch(`${base}/api/finance/evidence-status/http-status-1`, {
      headers: { authorization: `Bearer ${sessionA}` }
    })).json();
    assert.equal(withReceipt.receiptStatus, 'present');
    assert.equal(withReceipt.receiptPresent, true);

    const statusB = await (await fetch(`${base}/api/finance/evidence-status/http-status-1`, {
      headers: { authorization: `Bearer ${sessionB}` }
    })).json();
    assert.equal(statusB.ingestionStatus, 'not_found');
    assert.equal(statusB.receiptStatus, 'unknown');
    assert.equal(statusB.transactionId, null);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
