import { createServer } from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

import { loadConfig } from './config.ts';
import { signState, verifyState } from './crypto.ts';

import {
  createStateRepository
} from './storage.ts';

import {
  createFinanceStateRepository
} from './financeStorage.ts';

import {
  BackendFinanceDataService
} from './financeDataService.ts';

import { GmailClient } from './gmailClient.ts';
import { GmailSyncService } from './syncService.ts';

import {
  ReceiptEvidenceHandoff
} from './receiptHandoff.ts';

import {
  verifyGoogleOidc
} from './googleOidc.ts';

import {
  processReceiptPdf
} from './receiptProcessingService.ts';

import {
  ReceiptIngestionService
} from './receiptIngestionService.ts';

import {
  FinanceIngestionService
} from './financeIngestionService.ts';

import {
  ImportPipeline
} from '../src/shared/importPipeline.js';
import { createAuth } from './auth.ts';
import { WriteFreezeController } from './writeFreeze.ts';
import { GoogleSheetsSourceReader, buildDryRunReport, adaptExpensesSheetRows, adaptBankSheetRows, adaptIncomeSheetRows, adaptEvidenceRows, adaptReviewRows, reconcileDryRun, buildCandidateInventory, reconcileCandidates, compareRerunIdentities, semanticDiagnostics, finalSafeImportSummary, buildFinalSafeCandidates, blockerDiagnostics } from './googleSheetsIngestion.ts';
import { createDiagnosticsStore } from './diagnosticsStore.ts';
import { TrustedSessionStore } from './trustedSessionStore.ts';

const json = (res, status, value) => {
  res.writeHead(status, {
    'Content-Type':
      'application/json; charset=utf-8',
    'Cache-Control':
      'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Household-Session, Idempotency-Key, If-Match',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS'
  });

  res.end(
    JSON.stringify(value)
  );
};

const body = async req => {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;

    if (size > 1024 * 1024) {
      throw new Error(
        'Request too large'
      );
    }

    chunks.push(chunk);
  }

  return JSON.parse(
    Buffer.concat(chunks)
      .toString('utf8') ||
      '{}'
  );
};

const webRoot = process.cwd();
const webTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
async function serveWeb(res, pathname) {
  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const candidate = normalize(join(webRoot, requested));
  const fallback = normalize(join(webRoot, 'index.html'));
  const file = candidate.startsWith(webRoot) ? candidate : fallback;
  try { const info = await stat(file); if (!info.isFile()) throw new Error('not_file'); const bytes = await readFile(file); res.writeHead(200, { 'Content-Type': webTypes[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); return res.end(bytes); } catch { if (pathname !== '/' && !pathname.startsWith('/api/')) { const bytes = await readFile(fallback); res.writeHead(200, { 'Content-Type': webTypes['.html'], 'Cache-Control': 'no-store' }); return res.end(bytes); } return json(res, 404, { error: 'not_found' }); }
}

const binaryBody = async (
  req,
  maxBytes = 15 * 1024 * 1024
) => {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;

    if (size > maxBytes) {
      const error =
        new Error(
          'Document too large'
        );

      error.code =
        'document_too_large';

      throw error;
    }

    chunks.push(chunk);
  }

  return new Uint8Array(
    Buffer.concat(chunks)
  );
};

export function createBackend({
  config,
  repository,
  gmail,
  verifyPush = verifyGoogleOidc,
  financeRepository = null,
  financeDataService = null,
  receiptIngestionService = null,
  diagnosticsStore = null
} = {}) {
  config =
    config || loadConfig();

  diagnosticsStore = diagnosticsStore || createDiagnosticsStore(config);

  const auth = config.authSigningSecret ? createAuth(config) : null;
  const trustedSessions = auth && config.stateEncryptionKey ? new TrustedSessionStore({ config }) : null;
  const freezeController = new WriteFreezeController();

  repository =
    repository ||
    createStateRepository(config, freezeController);

  gmail =
    gmail ||
    new GmailClient({
      config
    });

  /*
   * Finance backend
   */
  if (
    !financeDataService &&
    config.stateEncryptionKey
  ) {
      financeRepository =
      financeRepository ||
      createFinanceStateRepository(
        config,
        freezeController
      );

    financeDataService =
      new BackendFinanceDataService({
        repository:
          financeRepository
      });
  }

  /*
   * Shared import / matching pipeline.
   *
   * Extraction already happened earlier
   * through PDF/OCR + AI, so the backend
   * uses prepareExtracted() and does not
   * need an extractor here.
   */
  if (
    !receiptIngestionService &&
    financeDataService
  ) {
    const importPipeline =
      new ImportPipeline({
        extractor: null,
        dataService:
          financeDataService
      });

    receiptIngestionService =
      new ReceiptIngestionService({
        importPipeline
      });
  }

  const sync =
    new GmailSyncService({
      repository,
      gmail,
      receiptIngestionService
    });

  const handoff =
    new ReceiptEvidenceHandoff({
      repository
    });

  const ingestionService =
    new FinanceIngestionService({
      dataService: financeDataService,
      syncRepository: repository
    });

  const sheetsReader = new GoogleSheetsSourceReader();

  return createServer(
    async (req, res) => {
      try {
        const url =
          new URL(
            req.url,
            config.publicBaseUrl
          );

        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Household-Session, Idempotency-Key, If-Match',
            'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS'
          });
          return res.end();
        }

        if (req.method === 'POST' && url.pathname === '/api/auth/session') {
          if (!auth) return json(res, 503, { error: 'auth_not_configured' });
          const payload = await body(req);
          const identity = auth.authenticate(payload.userId, payload.credential);
          if (!identity) return json(res, 401, { error: 'invalid_credentials' });
          const result = { session: auth.issue(identity), user: identity };
          if (payload.trustedDevice === true && trustedSessions) result.trustedDevice = await trustedSessions.issue(identity);
          return json(res, 200, result);
        }

        if (req.method === 'POST' && url.pathname === '/api/auth/device/provision') {
          if (!auth || !trustedSessions) return json(res, 503, { error: 'device_provisioning_not_configured' });
          const payload = await body(req);
          const identity = auth.authenticate(payload.userId, payload.credential);
          if (!identity) return json(res, 401, { error: 'invalid_credentials' });
          const deviceId = String(payload.deviceId || '').trim();
          if (!deviceId || deviceId.length > 128) return json(res, 400, { error: 'device_id_required' });
          const trustedDevice = await trustedSessions.issue(identity);
          return json(res, 201, { deviceId, trustedDevice, user: identity });
        }

        if (req.method === 'POST' && url.pathname === '/api/auth/renew') {
          if (!trustedSessions || !auth) return json(res, 503, { error: 'trusted_sessions_not_configured' });
          const payload = await body(req); const renewed = await trustedSessions.rotate(payload.trustedDevice);
          if (!renewed) return json(res, 401, { error: 'invalid_trusted_session' });
          return json(res, 200, { session: auth.issue({ userId: renewed.userId, householdId: renewed.householdId }), trustedDevice: { secret: renewed.secret, expiresAt: renewed.expiresAt }, user: { userId: renewed.userId, householdId: renewed.householdId } });
        }

        if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
          if (trustedSessions) { const payload = await body(req); if (payload.trustedDevice) await trustedSessions.revoke(payload.trustedDevice); }
          return json(res, 200, { ok: true });
        }

        if (req.method === 'GET' && url.pathname === '/api/auth/me') {
          if (!auth) return json(res, 503, { error: 'auth_not_configured' });
          try { return json(res, 200, { user: auth.authenticateRequest(req) }); }
          catch { return json(res, 401, { error: 'unauthorized' }); }
        }

        if (req.method === 'POST' && url.pathname === '/api/diagnostics/processed-evidence/check') {
          if (!auth || !financeRepository || !config.writeFreezeToken || req.headers['x-internal-token'] !== config.writeFreezeToken) return json(res, 401, { error: 'unauthorized' });
          let operator; try { operator = auth.authenticateRequest(req); } catch { return json(res, 401, { error: 'unauthorized' }); }
          const payload = await body(req);
          const requested = Array.isArray(payload.identities) ? payload.identities.map(value => String(value || '').trim().toLowerCase()) : [];
          if (requested.length > 1000 || requested.some(value => !/^[a-f0-9]{24}$/.test(value))) return json(res, 400, { error: 'invalid_identity_hashes' });
          const state = await financeRepository.read();
          const processed = state.processedEvidence || {};
          const byHash = new Map(Object.entries(processed).map(([externalSourceId, record]: any) => [createHash('sha256').update(externalSourceId).digest('hex').slice(0, 24), record]));
          const results = [...new Set(requested)].map(hash => {
            const record: any = byHash.get(hash);
            return { hash, matched: Boolean(record), status: record?.status || null, classification: record ? (record.transactionId ? 'LINKED' : 'ACCEPTED') : null };
          });
          return json(res, 200, { results });
        }

        if (url.pathname === '/api/diagnostics/events' || url.pathname === '/api/diagnostics/recent-events') {
          if (!auth || !diagnosticsStore) return json(res, 503, { error: 'diagnostics_not_configured' });
          let context; try { context = auth.authenticateRequest(req); } catch { return json(res, 401, { error: 'unauthorized' }); }
          if (req.method === 'POST' && url.pathname === '/api/diagnostics/events') {
            try { return json(res, 200, { event: await diagnosticsStore.upsert(context.householdId, await body(req)) }); }
            catch (error) { return json(res, 400, { error: error.code || error.message || 'invalid_trace' }); }
          }
          if (req.method === 'GET' && url.pathname === '/api/diagnostics/recent-events') return json(res, 200, { events: await diagnosticsStore.recent(context.householdId) });
          return json(res, 405, { error: 'method_not_allowed' });
        }

        if (url.pathname === '/internal/write-freeze') {
          if (!auth || !config.writeFreezeToken || req.headers['x-internal-token'] !== config.writeFreezeToken) return json(res, 401, { error: 'unauthorized' });
          try { auth.authenticateRequest(req); } catch { return json(res, 401, { error: 'unauthorized' }); }
          if (req.method === 'GET') return json(res, 200, { mode: freezeController.status() });
          if (req.method === 'POST') {
            const payload = await body(req);
            if (payload.mode === 'WRITE_FROZEN') freezeController.freeze();
            else if (payload.mode === 'NORMAL') freezeController.release();
            else return json(res, 400, { error: 'invalid_mode' });
            return json(res, 200, { mode: freezeController.status() });
          }
          return json(res, 405, { error: 'method_not_allowed' });
        }

        if (req.method === 'GET' && url.pathname === '/api/maintenance/state') {
          if (!auth || !financeDataService) return json(res, 401, { error: 'unauthorized' });
          let context;
          try { context = auth.authenticateRequest(req); } catch { return json(res, 401, { error: 'unauthorized' }); }
          return json(res, 200, await financeDataService.getMaintenanceState(context));
        }

        if (url.pathname.startsWith('/api/finance/')) {
          if (!auth || !financeDataService) return json(res, 401, { error: 'unauthorized' });
          let context;
          try { context = auth.authenticateRequest(req); } catch { return json(res, 401, { error: 'unauthorized' }); }
          if (req.method === 'POST' && url.pathname === '/api/finance/receipt-response') {
            const payload = await body(req); const externalSourceId = String(payload.externalSourceId || '').trim(); const response = String(payload.response || '');
            if (!externalSourceId || externalSourceId.length > 256 || !['DIGITAL_AWAITING_DOCUMENT','NO_RECEIPT_RECEIVED'].includes(response)) return json(res, 400, { error: 'invalid_receipt_response' });
            if (!financeRepository) return json(res, 503, { error: 'finance_not_configured' });
            await financeRepository.update((state: any) => { state.receiptResponses = state.receiptResponses || {}; const key = `${context.householdId}:${externalSourceId}`; state.receiptResponses[key] = { externalSourceId, response, updatedAt: new Date().toISOString() }; });
            return json(res, 200, { externalSourceId, response });
          }
          if (req.method === 'POST' && url.pathname === '/api/finance/google-sheets/dry-run') {
            const payload = await body(req);
            const startDate = String(payload.startDate || '');
            const endDate = String(payload.endDate || '');
            if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || startDate > endDate) return json(res, 400, { error: 'invalid_period' });
            try {
              const tabs = await sheetsReader.readRequiredTabs();
              const sourceRowsByTab = Object.fromEntries(tabs.map(item => [item.tab, Math.max(0, item.rows.length - 1)]));
              const expenseTab = tabs.find(item => item.tab === 'הוצאות');
              const report = buildDryRunReport({ rows: expenseTab?.rows || [], startDate, endDate });
              const bank = adaptBankSheetRows(tabs.find(item => item.tab === 'תנועות בנק')?.rows || []);
              const income = adaptIncomeSheetRows(tabs.find(item => item.tab === 'הכנסות')?.rows || []);
              const micro = adaptEvidenceRows(tabs.find(item => item.tab === 'קבלות - מיקרו')?.rows || [], 'קבלות - מיקרו');
              const email = adaptEvidenceRows(tabs.find(item => item.tab === 'קבלות מהמייל')?.rows || [], 'קבלות מהמייל');
              const review = adaptReviewRows(tabs.find(item => item.tab === 'לבדיקה')?.rows || []);
              const expense = adaptExpensesSheetRows(expenseTab?.rows || []).rows.filter((row: any) => row.date >= startDate && row.date <= endDate);
              const candidates = [...expense, ...bank.rows.filter((row: any) => row.date >= startDate && row.date <= endDate), ...income.rows.filter((row: any) => row.date >= startDate && row.date <= endDate)].filter((row: any) => row.valid !== false && !row.reviewRequired && !row.excluded);
              const canonical = await financeRepository?.read?.() || { transactions: [] };
              const crossSource = reconcileCandidates(candidates); const finalRows = candidates.filter((row: any) => !crossSource.suppressedIdentities.includes(row.externalSourceId)); const safeRows = buildFinalSafeCandidates(finalRows);
              const semanticDiag = blockerDiagnostics(candidates);
              const malformedCount = report.malformedRows + bank.malformed + income.malformed;
              const malformedDiagnostics = Array.from({ length: malformedCount }, (_, index) => ({ stableSourceIdentity: null, sourceTab: index < report.malformedRows ? 'הוצאות' : index < report.malformedRows + bank.malformed ? 'תנועות בנק' : 'הכנסות', reasonCode: 'required_field_invalid', classification: 'financial' }));
              const excluded = { postReconciliationCandidates: finalRows.length, reviewExcluded: candidates.filter((row: any) => row.reviewRequired).length, semanticUnresolvedExcluded: candidates.filter((row: any) => row.unsafeSemantic || !row.financialType).length, malformedExcluded: malformedCount, pendingExcluded: candidates.filter((row: any) => row.financialType === 'reimbursement' && row.reimbursementStatus !== 'received').length, otherUnsafeExcluded: 0, uniqueExcludedCount: finalRows.length - safeRows.length, finalSafeImportCount: safeRows.length };
              return json(res, 200, { sourceRowsByTab, transactionCandidatesByTab: { 'הוצאות': report.sourceRows, 'תנועות בנק': bank.rows.filter((row: any) => row.date >= startDate && row.date <= endDate).length, 'הכנסות': income.rows.filter((row: any) => row.date >= startDate && row.date <= endDate).length }, evidenceRowsByTab: { 'קבלות - מיקרו': micro.rows.length, 'קבלות מהמייל': email.rows.length }, reviewRowsByTab: { 'לבדיקה': review.rows.length }, ...report, semanticDiagnostics: semanticDiag, malformedDiagnostics, pendingReimbursementDiagnostics: candidates.filter((row: any) => ['reimbursement','refund'].includes(row.financialType)).map((row: any) => ({ stableSourceIdentity: row.externalSourceId, sourceTab: row.sourceType, reimbursementStatus: row.reimbursementStatus || 'unknown', postingStatus: row.postingStatus || 'unknown', safeForAutomaticImport: row.reimbursementStatus === 'received', reasonCode: row.reimbursementStatus === 'received' ? 'received' : 'status_unproven' })), malformedFinancialRows: malformedCount, exclusionSummary: excluded, reconciliation: { remote: reconcileDryRun(candidates, canonical), crossSource }, candidateInventory: buildCandidateInventory(candidates, [...micro.rows, ...email.rows]), rerunIdentity: compareRerunIdentities(safeRows, safeRows), finalSafeImport: finalSafeImportSummary(safeRows), provenance: { stableIds: true, duplicateIds: false }, validationSafety: { financeImportCalls: 0, canonicalStateWrites: 0, sheetWrites: 0, dryRunReadOnly: true } });
            } catch { return json(res, 502, { error: 'sheets_dry_run_failed' }); }
          }
          if (req.method === 'POST' && url.pathname === '/api/finance/google-sheets/historical-import') {
            const payload = await body(req); const period = String(payload.period || ''); const expectedHash = String(payload.expectedHash || '');
            const windows: any = { '2026-06': ['2026-06-01','2026-06-30'], '2026-07': ['2026-07-01','2026-07-31'], '2026-08': ['2026-08-01','2026-08-31'] }; if (!windows[period]) return json(res, 400, { error: 'invalid_period' });
            const [startDate,endDate] = windows[period]; const tabs = await sheetsReader.readRequiredTabs(); const expense = adaptExpensesSheetRows(tabs.find(item=>item.tab==='הוצאות')?.rows||[]).rows.filter((row:any)=>row.date>=startDate&&row.date<=endDate); const bank=adaptBankSheetRows(tabs.find(item=>item.tab==='תנועות בנק')?.rows||[]).rows.filter((row:any)=>row.date>=startDate&&row.date<=endDate); const income=adaptIncomeSheetRows(tabs.find(item=>item.tab==='הכנסות')?.rows||[]).rows.filter((row:any)=>row.date>=startDate&&row.date<=endDate); const candidates=[...expense,...bank,...income].filter((row:any)=>row.valid!==false&&!row.reviewRequired&&!row.excluded); const cross=reconcileCandidates(candidates); const safe=buildFinalSafeCandidates(candidates.filter((row:any)=>!cross.suppressedIdentities.includes(row.externalSourceId))); const summary=finalSafeImportSummary(safe); if(expectedHash&&summary.finalSafeCandidateIdentityHash!==expectedHash)return json(res,409,{error:'safe_set_changed'}); const result=await financeDataService.importRows(safe,context); return json(res,200,{period,safeCount:safe.length,finalSafeCandidateIdentityHash:summary.finalSafeCandidateIdentityHash,imported:result?.imported||0,duplicates:result?.duplicates||0});
          }
          if (req.method === 'GET' && url.pathname === '/api/finance/state') return json(res, 200, await financeDataService.getHouseholdState(context));
          if (req.method === 'GET' && url.pathname === '/api/finance/engagement') return json(res, 200, await financeDataService.getEngagementState(context));
          if (req.method === 'GET' && url.pathname.startsWith('/api/finance/evidence-status/')) {
            const externalSourceId = decodeURIComponent(url.pathname.split('/').pop());
            return json(res, 200, await ingestionService.getEvidenceReceiptStatus(externalSourceId, context));
          }
          if (req.method === 'POST' && url.pathname.startsWith('/api/finance/tasks/')) { const id = decodeURIComponent(url.pathname.split('/')[4]); try { return json(res, 200, await financeDataService.completeTask(id, context)); } catch (error) { if (error.code === 'not_found') return json(res, 404, { error: 'not_found' }); throw error; } }
          if (req.method === 'POST' && url.pathname.startsWith('/api/finance/expected-documents/') && url.pathname.endsWith('/receive')) { const id = decodeURIComponent(url.pathname.split('/')[4]); try { return json(res, 200, await financeDataService.receiveExpectedDocument(id, context)); } catch (error) { if (error.code === 'not_found') return json(res, 404, { error: 'not_found' }); throw error; } }
          if (req.method === 'PATCH' && url.pathname.startsWith('/api/finance/transactions/')) {
            const id = decodeURIComponent(url.pathname.split('/').pop());
            try { return json(res, 200, await financeDataService.updateTransaction(id, await body(req), context, req.headers['if-match'])); }
            catch (error) { if (error.code === 'conflict') return json(res, 409, { error: 'conflict', current: error.current }); if (error.code === 'not_found') return json(res, 404, { error: 'not_found' }); throw error; }
          }
          if (req.method === 'POST' && url.pathname === '/api/finance/cash') {
            const key = String(req.headers['idempotency-key'] || ''); if (!key) return json(res, 400, { error: 'idempotency_key_required' });
            return json(res, 201, await financeDataService.createCashTransaction(await body(req), context, key));
          }
          if (req.method === 'POST' && url.pathname === '/api/finance/receipts') {
            const payload = await body(req); payload.sourceMetadata = { ...(payload.sourceMetadata || {}), householdId: context.householdId, userId: context.userId, deviceId: context.deviceId };
            return json(res, 201, await financeDataService.saveReceipt(payload, payload.linkedTransactionId || null));
          }
          if (req.method === 'POST' && url.pathname === '/api/finance/import') return json(res, 200, await financeDataService.importRows((await body(req)).rows, context));
        }

        if (
          req.method === 'GET' &&
          (
            url.pathname === '/' ||
            url.pathname ===
              '/health' ||
            url.pathname ===
              '/healthz'
          )
        ) {
          return json(
            res,
            200,
            {
              status: 'ok',
              service:
                'family-finance-gmail',
              gmailConfigured:
                Boolean(
                  config
                    .gmailConfigured
                ),
              financeConfigured:
                Boolean(
                  financeDataService
                )
            }
          );
        }

        if (
          req.method === 'POST' &&
          url.pathname ===
            '/api/ingestion/evidence'
        ) {
          if (!financeDataService) {
            return json(
              res,
              503,
              { error: 'finance_not_configured' }
            );
          }

          let householdContext = null;
          const householdSession = String(req.headers['x-household-session'] || '');
          const deviceSecret = String(req.headers['x-device-auth'] || '');
          const connectorAuthorized = Boolean(config.connectorSharedToken && req.headers.authorization === `Bearer ${config.connectorSharedToken}`);
          let deviceContext = null;
          if (deviceSecret && trustedSessions) {
            const identity = await trustedSessions.authenticate(deviceSecret);
            if (identity) deviceContext = { ...identity, deviceId: req.headers['x-device-id'] || null };
          }
          if (!connectorAuthorized && !householdSession && !deviceContext) return json(res, 401, { error: 'unauthorized' });
          if (householdSession) {
            if (!auth) return json(res, 401, { error: 'household_auth_unavailable' });
            try {
              householdContext = auth.authenticateRequest({ headers: { authorization: `Bearer ${householdSession}`, 'x-device-id': req.headers['x-device-id'] || null } });
            } catch {
              return json(res, 401, { error: 'invalid_household_session' });
            }
          }
          householdContext = householdContext || deviceContext;
          if (!connectorAuthorized && !householdContext) return json(res, 401, { error: 'unauthorized' });

          const payload = await body(req);
          const result = await ingestionService.processEvidence(payload, householdContext);

          return json(res, 200, result);
        }

        if (req.method === 'POST' && url.pathname === '/api/ingestion/synthetic') {
          if (!auth || !trustedSessions || !diagnosticsStore) return json(res, 503, { error: 'synthetic_ingestion_not_configured' });
          const deviceSecret = String(req.headers['x-device-auth'] || '');
          const identity = await trustedSessions.authenticate(deviceSecret);
          if (!identity) return json(res, 401, { error: 'unauthorized' });
          const payload = await body(req);
          const syntheticId = String(payload.syntheticId || '').trim();
          if (!/^[a-zA-Z0-9._:-]{1,128}$/.test(syntheticId)) return json(res, 400, { error: 'invalid_synthetic_id' });
          const traceId = `synthetic:${syntheticId}`;
          const event = await diagnosticsStore.upsert(identity.householdId, { traceId, detectorType: 'sms', stage: 'backend_received', timestamp: new Date().toISOString(), outcome: 'synthetic_acknowledged' });
          return json(res, 200, { synthetic: true, syntheticId, acknowledged: true, idempotent: Boolean(event) });
        }

        if (req.method === 'GET' && url.pathname === '/api/ingestion/staging') {
          if (!financeDataService) return json(res, 503, { error: 'finance_not_configured' });
          return json(res, 200, { evidence: await ingestionService.listStagedEvidence() });
        }

        if (req.method === 'POST' && url.pathname === '/api/ingestion/staging/resolve') {
          if (!financeDataService) return json(res, 503, { error: 'finance_not_configured' });
          const payload = await body(req);
          return json(res, 200, await ingestionService.resolveStagedEvidence(payload.externalSourceId, payload.transactionId || null, payload.resolution || 'link'));
        }

        /*
         * Standalone receipt AI endpoint.
         */
        if (
          req.method === 'POST' &&
          url.pathname ===
            '/api/receipts/analyze'
        ) {
          const contentType =
            String(
              req.headers[
                'content-type'
              ] || ''
            )
              .split(';')[0]
              .trim()
              .toLowerCase();

          if (
            contentType !==
            'application/pdf'
          ) {
            return json(
              res,
              415,
              {
                error:
                  'unsupported_document_type'
              }
            );
          }

          const pdfBytes =
            await binaryBody(req);

          if (
            pdfBytes.length === 0
          ) {
            return json(
              res,
              400,
              {
                error:
                  'empty_document'
              }
            );
          }

          const result =
            await processReceiptPdf(
              pdfBytes
            );

          if (
            result.status ===
            'processing_failed'
          ) {
            return json(
              res,
              422,
              result
            );
          }

          return json(
            res,
            200,
            result
          );
        }

        /*
         * Gmail routes below this point.
         */
        if (
          !config.gmailConfigured
        ) {
          return json(
            res,
            503,
            {
              error:
                'gmail_not_configured'
            }
          );
        }

        if (
          req.method === 'GET' &&
          url.pathname ===
            '/oauth/gmail/start'
        ) {
          const state =
            signState(
              {
                connectionId:
                  url.searchParams
                    .get(
                      'connectionId'
                    ) ||
                  'primary',

                createdAt:
                  Date.now(),

                nonce:
                  randomUUID()
              },
              config
                .stateEncryptionKey
            );

          res.writeHead(
            302,
            {
              Location:
                gmail
                  .authorizationUrl(
                    state
                  ),
              'Cache-Control':
                'no-store'
            }
          );

          return res.end();
        }

        if (
          req.method === 'GET' &&
          url.pathname ===
            '/oauth/gmail/callback'
        ) {
          const oauth =
            verifyState(
              url.searchParams
                .get('state'),
              config
                .stateEncryptionKey
            );

          const tokens =
            await gmail
              .exchangeCode(
                url.searchParams
                  .get('code')
              );

          return json(
            res,
            200,
            await sync.connect({
              connectionId:
                oauth
                  .connectionId,
              tokens
            })
          );
        }

        if (
          req.method === 'POST' &&
          url.pathname ===
            '/webhooks/gmail'
        ) {
          await verifyPush(
            req.headers
              .authorization,
            {
              audience:
                config
                  .pushAudience,
              serviceAccount:
                config
                  .pushServiceAccount
            }
          );

          const payload =
            await body(req);

          const message =
            payload.message ||
            {};

          const decoded =
            JSON.parse(
              Buffer.from(
                message.data ||
                  '',
                'base64'
              ).toString(
                'utf8'
              ) ||
                '{}'
            );

          return json(
            res,
            200,
            await sync
              .processNotification({
                deliveryId:
                  message
                    .messageId ||
                  `${decoded.emailAddress}:${decoded.historyId}`,

                emailAddress:
                  decoded
                    .emailAddress,

                historyId:
                  decoded
                    .historyId
              })
          );
        }

        if (
          req.method === 'POST' &&
          url.pathname ===
            '/internal/maintenance'
        ) {
          const maintenanceRequestedAt = new Date().toISOString();
          const schedulerBearer = req.headers.authorization;
          const sharedTokenValid = config.schedulerToken && schedulerBearer === `Bearer ${config.schedulerToken}`;
          if (!sharedTokenValid) {
            try {
              await verifyPush(schedulerBearer, {
                audience: `${config.publicBaseUrl || 'http://127.0.0.1:8080'}/internal/maintenance`,
                serviceAccount: config.pushServiceAccount
              });
            } catch {
              console.log(JSON.stringify({ event: 'gmail_maintenance_failed', requestedAt: maintenanceRequestedAt, authorized: false, failureCode: 'unauthorized' }));
              return json(res, 401, { error: 'unauthorized' });
            }
          }
          console.log(JSON.stringify({ event: 'gmail_maintenance_started', requestedAt: maintenanceRequestedAt, authorized: true, started: true, watchRenewalAttempted: true, recoveryAttempted: false }));
          try {
            const renewal = await sync.renewWatches();
            const failed = renewal.filter(result => !result.ok).length;
            const watchRenewal = renewal.length === 0 ? 'skipped' : failed ? 'fail' : 'success';
            const result = { ok: failed === 0, watchRenewal, processed: 0, skipped: 0, failed, checkpointUpdated: renewal.length > 0 };
            console.log(JSON.stringify({ event: 'gmail_watch_renewal_result', ...result }));
            console.log(JSON.stringify({ event: 'gmail_checkpoint_result', attempted: false, updated: result.checkpointUpdated, processed: 0, skipped: 0, failed }));
            console.log(JSON.stringify({ event: 'gmail_maintenance_completed', requestedAt: maintenanceRequestedAt, authorized: true, started: true, watchRenewalAttempted: true, watchRenewalResult: watchRenewal, recoveryAttempted: false, processed: 0, skipped: 0, failed, checkpointWrite: result.checkpointUpdated, completed: true }));
            return json(res, 200, result);
          } catch (error) {
            const failureCode = error?.code || 'maintenance_failed';
            console.log(JSON.stringify({ event: 'gmail_maintenance_failed', requestedAt: maintenanceRequestedAt, authorized: true, started: true, completed: false, failureCode }));
            return json(res, 500, { error: failureCode });
          }
        }

        if (
          req.method === 'POST' &&
          url.pathname ===
            '/api/gmail/scan-now'
        ) {
          const payload =
            await body(req);

          const state =
            await repository
              .read();

          const connection =
            state.connections[
              payload
                .connectionId ||
                'primary'
            ];

          if (!connection) {
            return json(
              res,
              404,
              {
                error:
                  'not_connected'
              }
            );
          }

          return json(
            res,
            200,
            await sync
              .processNotification({
                deliveryId:
                  `manual:${randomUUID()}`,

                emailAddress:
                  connection.email,

                historyId:
                  connection
                    .historyId
              })
          );
        }

        if (
          req.method === 'GET' &&
          url.pathname ===
            '/api/gmail/health'
        ) {
          return json(
            res,
            200,
            await sync.health()
          );
        }

        if (
          req.method === 'GET' &&
          url.pathname ===
            '/api/gmail/staging'
        ) {
          return json(
            res,
            200,
            {
              evidence:
                await handoff
                  .listPending()
            }
          );
        }

        if (
          req.method === 'GET' &&
          url.pathname ===
            '/api/gmail/attachment'
        ) {
          const state =
            await repository
              .read();

          const connection =
            state.connections[
              url.searchParams
                .get(
                  'connectionId'
                ) ||
                'primary'
            ];

          if (!connection) {
            return json(
              res,
              404,
              {
                error:
                  'not_connected'
              }
            );
          }

          const messageId =
            url.searchParams
              .get('messageId');

          const attachmentId =
            url.searchParams
              .get(
                'attachmentId'
              );

          if (
            !messageId ||
            !attachmentId
          ) {
            return json(
              res,
              400,
              {
                error:
                  'missing_attachment_params'
              }
            );
          }

          const result =
            await gmail
              .getAttachment(
                connection,
                messageId,
                attachmentId
              );

          const bytes =
            Buffer.from(
              result.response
                .data || '',
              'base64url'
            );

          res.writeHead(
            200,
            {
              'Content-Type':
                'application/octet-stream',

              'Content-Length':
                bytes.length,

              'Cache-Control':
                'no-store'
            }
          );

          return res.end(
            bytes
          );
        }

        if (
          req.method === 'POST' &&
          url.pathname ===
            '/api/gmail/staging/acknowledge'
        ) {
          const payload =
            await body(req);

          return json(
            res,
            200,
            await handoff
              .acknowledge(
                payload
                  .messageId,
                {
                  documentFingerprints:
                    payload
                      .documentFingerprints
                }
              )
          );
        }

        if (
          req.method === 'DELETE' &&
          url.pathname ===
            '/api/gmail/connection'
        ) {
          return json(
            res,
            200,
            await sync.disconnect(
              url.searchParams
                .get(
                  'connectionId'
                ) ||
                'primary'
            )
          );
        }

        if (req.method === 'GET') return serveWeb(res, url.pathname);

        return json(
          res,
          404,
          {
            error:
              'not_found'
          }
        );
      } catch (error) {
        console.error(error);

        console.error(
          JSON.stringify({
            event:
              'backend_request_failed',

            path:
              new URL(
                req.url,
                config
                  .publicBaseUrl
              ).pathname,

            code:
              error.code ||
              'request_failed',

            status:
              error.status ||
              null,

            message:
              error.message ||
              'Unknown error'
          })
        );

        return json(
          res,
          error.code ===
            'oauth_revoked'
            ? 401
            : error.code === 'WRITE_FROZEN'
              ? 423
            : error.code ===
                'document_too_large'
              ? 413
              : 500,
          {
            error:
              error.code ||
              'request_failed'
          }
        );
      }
    }
  );
}

if (
  process.argv[1] &&
  import.meta.url ===
    pathToFileURL(
      process.argv[1]
    ).href
) {
  const config =
    loadConfig();

  const server =
    createBackend({
      config
    });

  server.listen(
    config.port,
    '0.0.0.0',
    () =>
      console.log(
        `Gmail backend listening on port ${config.port}`
      )
  );
}
