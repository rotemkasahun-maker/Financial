import { GcsBlobStore, LocalFileBlobStore } from './storage.ts';
import { decryptJson, encryptJson } from './crypto.ts';

export const TRACE_STAGES = new Set(['source_event_received','detector_accepted','detector_rejected','evidence_persisted','receipt_prompt_requested','receipt_prompt_posted','sync_attempted','sync_succeeded','sync_failed','backend_received','canonical_processed','receipt_decision']);
const MAX_RECORDS = 200;

export function sanitizeTrace(input: any) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('invalid_trace');
  const allowed = new Set(['traceId','detectorType','stage','timestamp','outcome','failureCode']);
  if (Object.keys(input).some(k => !allowed.has(k))) throw new Error('unsupported_trace_field');
  const traceId = String(input.traceId || '').trim();
  const detectorType = String(input.detectorType || '').trim();
  const stage = String(input.stage || '').trim();
  const outcome = String(input.outcome || '').trim();
  const timestamp = String(input.timestamp || '').trim();
  if (!traceId || traceId.length > 128 || !/^[a-zA-Z0-9._:-]+$/.test(traceId)) throw new Error('invalid_trace_id');
  if (!['sms','notification'].includes(detectorType) || !TRACE_STAGES.has(stage) || !outcome || outcome.length > 32 || !timestamp || Number.isNaN(Date.parse(timestamp))) throw new Error('invalid_trace');
  const result: any = { traceId, detectorType, stage, timestamp, outcome };
  if (input.failureCode != null) { const failureCode = String(input.failureCode).trim(); if (!/^[a-zA-Z0-9._:-]{1,64}$/.test(failureCode)) throw new Error('invalid_failure_code'); result.failureCode = failureCode; }
  return result;
}

export class DiagnosticsStore {
  constructor({ blobStore, encryptionKey }: any) { this.blobStore = blobStore; this.encryptionKey = encryptionKey; }
  async load() { const bytes = await this.blobStore.read(); if (!bytes) return { version: 1, records: [] }; const value = decryptJson(bytes, this.encryptionKey); return { version: 1, records: Array.isArray(value?.records) ? value.records : [] }; }
  async save(state: any) { await this.blobStore.write(encryptJson({ version: 1, records: state.records.slice(-MAX_RECORDS) }, this.encryptionKey)); }
  async upsert(householdId: string, input: any) { const trace = sanitizeTrace(input); const state = await this.load(); const record = { householdId, ...trace }; const key = `${householdId}:${trace.traceId}:${trace.stage}`; const index = state.records.findIndex((r: any) => `${r.householdId}:${r.traceId}:${r.stage}` === key); if (index >= 0) state.records[index] = record; else state.records.push(record); state.records = state.records.slice(-MAX_RECORDS); await this.save(state); return { ...trace }; }
  async recent(householdId: string) { const state = await this.load(); return state.records.filter((r: any) => r.householdId === householdId).map(({ householdId, ...r }: any) => r).slice(-MAX_RECORDS); }
}

export class MemoryDiagnosticsStore extends DiagnosticsStore {
  constructor() { super({ blobStore: { value: null, async read() { return this.value; }, async write(v: Buffer) { this.value = Buffer.from(v); } }, encryptionKey: '' }); }
  async load() { return this.blobStore.value ? JSON.parse(this.blobStore.value.toString()) : { version: 1, records: [] }; }
  async save(state: any) { await this.blobStore.write(Buffer.from(JSON.stringify({ version: 1, records: state.records.slice(-MAX_RECORDS) }))); }
}

export function createDiagnosticsStore(config: any) {
  if (!config?.stateEncryptionKey) return null;
  const blobStore = config.financeStateBucket ? new GcsBlobStore({ bucket: config.financeStateBucket, object: config.diagnosticsObject || 'diagnostics/recent-events.enc' }) : new LocalFileBlobStore(config.diagnosticsStateFile || '.local/diagnostics-state.enc');
  return new DiagnosticsStore({ blobStore, encryptionKey: config.stateEncryptionKey });
}
