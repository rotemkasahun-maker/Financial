import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createBackend } from '../backend/server.ts';

const salt = 'alpha-test-salt';
const credential = value => createHash('sha256').update(`${salt}:${value}`).digest('hex');
const config = {
  port: 8091,
  publicBaseUrl: 'http://127.0.0.1:8091',
  stateEncryptionKey: 'dGhpcy1pcy1hLTMyLWJ5dGUtZW5jcnlwdGlvbi1rZXk=',
  authSigningSecret: 'dGhpcy1pcy1hLTMyLWJ5dGUtZW5jcnlwdGlvbi1rZXk=',
  authSessionDurationMs: 600000,
  authUsers: [
    { userId: 'user-a', householdId: 'household-alpha', passwordSalt: salt, passwordHash: credential('a-secret') },
    { userId: 'user-b', householdId: 'household-alpha', passwordSalt: salt, passwordHash: credential('b-secret') }
  ]
};

async function withServer(run) {
  const server = createBackend({ config });
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  try { return await run(`http://127.0.0.1:${port}`); } finally { await new Promise(resolve => server.close(resolve)); }
}

test('pre-provisioned users receive the same household-scoped session context', async () => withServer(async base => {
  const a = await (await fetch(`${base}/api/auth/session`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({userId:'user-a', credential:'a-secret'}) })).json();
  const b = await (await fetch(`${base}/api/auth/session`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({userId:'user-b', credential:'b-secret'}) })).json();
  assert.equal((await (await fetch(`${base}/api/auth/me`, {headers:{Authorization:`Bearer ${a.session}`}})).json()).user.householdId, 'household-alpha');
  assert.equal((await (await fetch(`${base}/api/auth/me`, {headers:{Authorization:`Bearer ${b.session}`}})).json()).user.householdId, 'household-alpha');
}));

test('bad credentials, missing sessions, invalid sessions, and client household claims are rejected', async () => withServer(async base => {
  const bad = await fetch(`${base}/api/auth/session`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({userId:'user-a',credential:'wrong'}) });
  assert.equal(bad.status, 401);
  assert.equal((await fetch(`${base}/api/auth/me`)).status, 401);
  assert.equal((await fetch(`${base}/api/auth/me`, {headers:{Authorization:'Bearer invalid'}})).status, 401);
  const login = await (await fetch(`${base}/api/auth/session`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({userId:'user-a',credential:'a-secret',householdId:'other-household'}) })).json();
  const me = await (await fetch(`${base}/api/auth/me`, {headers:{Authorization:`Bearer ${login.session}`, 'X-Household-Id':'other-household'}})).json();
  assert.equal(me.user.householdId, 'household-alpha');
}));
