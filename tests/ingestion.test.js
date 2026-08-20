import test from 'node:test';
import assert from 'node:assert/strict';
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
