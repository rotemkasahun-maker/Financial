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
