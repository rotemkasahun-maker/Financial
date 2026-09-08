import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { createBackend } from '../backend/server.ts';
import { MemoryDiagnosticsStore } from '../backend/diagnosticsStore.ts';

const salt = 'phase1-test-salt';
const key = 'dGhpcy1pcy1hLTMyLWJ5dGUtZW5jcnlwdGlvbi1rZXk=';
const hash = value => createHash('sha256').update(`${salt}:${value}`).digest('hex');

async function withServer(run) {
  const config = {
    publicBaseUrl: 'http://127.0.0.1:8080',
    stateEncryptionKey: key,
    authSigningSecret: key,
    authSessionDurationMs: 600000,
    authUsers: [{ userId: 'phase1-user', householdId: 'household-alpha', passwordSalt: salt, passwordHash: hash('phase1-secret') }],
    trustedSessionFile: `.tmp/phase1-trusted-${randomUUID()}.enc`,
    connectorSharedToken: 'connector-only-test-token'
    ,writeFreezeToken: 'operator-only-test-token'
  };
  const diagnostics = new MemoryDiagnosticsStore();
  const repository = { state: {}, async read() { return this.state; }, async update(fn) { return fn(this.state); } };
  const server = createBackend({ config, diagnosticsStore: diagnostics, financeDataService: {}, repository, financeRepository: repository });
  await new Promise(resolve => server.listen(0, resolve));
  try { return await run(`http://127.0.0.1:${server.address().port}`, diagnostics, repository); } finally { await new Promise(resolve => server.close(resolve)); }
}

test('device provisioning rejects bad credentials and binds a valid device to household-alpha', async () => withServer(async base => {
  const bad = await fetch(`${base}/api/auth/device/provision`, { method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({ userId: 'phase1-user', credential: 'wrong', deviceId: 'device-a' }) });
  assert.equal(bad.status, 401);
  const response = await fetch(`${base}/api/auth/device/provision`, { method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({ userId: 'phase1-user', credential: 'phase1-secret', deviceId: 'device-a' }) });
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.user.householdId, 'household-alpha');
  assert.equal(body.deviceId, 'device-a');
  assert.ok(body.trustedDevice.secret);
}));

test('synthetic namespace requires device auth and is idempotent in diagnostics only', async () => withServer(async (base, diagnostics) => {
  assert.equal((await fetch(`${base}/api/ingestion/synthetic`, { method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({ syntheticId: 'synthetic-1' }) })).status, 401);
  const provision = await (await fetch(`${base}/api/auth/device/provision`, { method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({ userId: 'phase1-user', credential: 'phase1-secret', deviceId: 'device-a' }) })).json();
  const headers = {'content-type': 'application/json', 'x-device-auth': provision.trustedDevice.secret};
  const first = await (await fetch(`${base}/api/ingestion/synthetic`, { method: 'POST', headers, body: JSON.stringify({ syntheticId: 'synthetic-1' }) })).json();
  const second = await (await fetch(`${base}/api/ingestion/synthetic`, { method: 'POST', headers, body: JSON.stringify({ syntheticId: 'synthetic-1' }) })).json();
  assert.equal(first.acknowledged, true);
  assert.equal(second.acknowledged, true);
  assert.equal((await diagnostics.recent('household-alpha')).length, 1);
}));

test('protected ingestion rejects unauthenticated requests even when connector auth is configured', async () => withServer(async base => {
  const response = await fetch(`${base}/api/ingestion/evidence`, { method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({ externalSourceId: 'synthetic-no-auth' }) });
  assert.equal(response.status, 401);
}));

test('valid device auth reaches protected ingestion without connector fallback', async () => withServer(async base => {
  const provision = await (await fetch(`${base}/api/auth/device/provision`, { method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({ userId: 'phase1-user', credential: 'phase1-secret', deviceId: 'device-a' }) })).json();
  const response = await fetch(`${base}/api/ingestion/evidence`, { method: 'POST', headers: {'content-type': 'application/json', 'x-device-auth': provision.trustedDevice.secret, 'x-device-id': 'device-a'}, body: JSON.stringify({ externalSourceId: 'device-evidence-1', candidateType: 'AMBIGUOUS' }) });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, 'review_required');
}));

test('operator processed-evidence check is read-only, least-privilege, and hash-only', async () => withServer(async (base, diagnostics, repository) => {
  const externalSourceId = 'device-evidence-known';
  repository.state = { processedEvidence: { [externalSourceId]: { status: 'review_required', transactionId: null, householdId: 'household-alpha' }, leaked: { status: 'linked', transactionId: 'secret-transaction' } } };
  const session = await (await fetch(`${base}/api/auth/session`, { method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({ userId: 'phase1-user', credential: 'phase1-secret' }) })).json();
  const knownHash = createHash('sha256').update(externalSourceId).digest('hex').slice(0, 24);
  const response = await fetch(`${base}/api/diagnostics/processed-evidence/check`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${session.session}`, 'x-internal-token': 'operator-only-test-token' }, body: JSON.stringify({ identities: [knownHash, knownHash, '000000000000000000000000'] }) });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(result.results, [{ hash: knownHash, matched: true, status: 'review_required', classification: 'ACCEPTED' }, { hash: '000000000000000000000000', matched: false, status: null, classification: null }]);
  assert.equal(Object.keys(repository.state.processedEvidence).length, 2);
  assert.equal(JSON.stringify(result).includes('device-evidence-known'), false);
  assert.equal((await fetch(`${base}/api/diagnostics/processed-evidence/check`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identities: [knownHash] }) })).status, 401);
}));
