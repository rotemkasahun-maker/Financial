import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { GcsBlobStore, LocalFileBlobStore } from './storage.ts';
import { decryptJson, encryptJson } from './crypto.ts';

const hash = value => createHash('sha256').update(String(value)).digest('hex');
const empty = () => ({ version: 1, sessions: {} });

export class TrustedSessionStore {
  constructor({ config }) {
    this.blob = config.stateBucket
      ? new GcsBlobStore({ bucket: config.stateBucket, object: config.trustedSessionObject || 'auth/trusted-sessions.enc' })
      : new LocalFileBlobStore(config.trustedSessionFile || '.local/trusted-sessions.enc');
    this.key = config.stateEncryptionKey;
    this.lifetimeMs = 30 * 24 * 60 * 60 * 1000;
  }
  async read() { const bytes = await this.blob.read(); return bytes ? decryptJson(bytes, this.key) : empty(); }
  async write(state) { await this.blob.write(encryptJson(state, this.key)); }
  async issue(identity) {
    const state = await this.read(); const now = Date.now();
    for (const [k, s] of Object.entries(state.sessions)) if (s.expiresAt < now || s.revokedAt) delete state.sessions[k];
    const secret = randomBytes(32).toString('base64url');
    state.sessions[hash(secret)] = { userId: identity.userId, householdId: identity.householdId, createdAt: now, expiresAt: now + this.lifetimeMs };
    await this.write(state); return { secret, expiresAt: now + this.lifetimeMs };
  }
  async rotate(secret) {
    const state = await this.read(); const key = hash(secret); const current = state.sessions[key];
    if (!current || current.revokedAt || current.expiresAt < Date.now()) return null;
    delete state.sessions[key]; const replacement = randomBytes(32).toString('base64url');
    state.sessions[hash(replacement)] = { ...current, createdAt: Date.now(), expiresAt: Date.now() + this.lifetimeMs, rotatedFrom: key };
    await this.write(state); return { ...current, secret: replacement, expiresAt: state.sessions[hash(replacement)].expiresAt };
  }
  async revoke(secret) { const state = await this.read(); const current = state.sessions[hash(secret)]; if (!current) return false; current.revokedAt = Date.now(); await this.write(state); return true; }
}
