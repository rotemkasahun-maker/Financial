import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { signState, verifyState } from './crypto.ts';

const hashCredential = (value: string, salt: string) => createHash('sha256').update(`${salt}:${value}`).digest('hex');

export function createAuth(config: any) {
  const users = Array.isArray(config.authUsers) ? config.authUsers : [];
  const secret = config.authSigningSecret;
  const duration = config.authSessionDurationMs;
  const authenticate = (userId: string, credential: string) => {
    const user = users.find((candidate: any) => candidate.userId === userId);
    if (!user || !user.passwordHash || !user.passwordSalt) return null;
    const expected = Buffer.from(String(user.passwordHash));
    const actual = Buffer.from(hashCredential(String(credential || ''), String(user.passwordSalt)));
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    return { userId: user.userId, householdId: user.householdId };
  };
  const issue = (identity: any) => {
    const now = Date.now();
    return signState({ tokenId: randomUUID(), userId: identity.userId, householdId: identity.householdId, issuedAt: now, expiresAt: now + duration }, secret);
  };
  const authenticateRequest = (req: any) => {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) throw new Error('Missing session');
    const payload = verifyState(token, secret, duration);
    if (!payload.expiresAt || payload.expiresAt < Date.now()) throw new Error('Expired session');
    const user = users.find((candidate: any) => candidate.userId === payload.userId && candidate.householdId === payload.householdId);
    if (!user) throw new Error('Invalid session');
    return { userId: user.userId, householdId: user.householdId, deviceId: req.headers['x-device-id'] || null };
  };
  return { authenticate, issue, authenticateRequest };
}
