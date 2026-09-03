import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
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
  receiptIngestionService = null
} = {}) {
  config =
    config || loadConfig();

  const auth = config.authSigningSecret ? createAuth(config) : null;
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
          return json(res, 200, { session: auth.issue(identity), user: identity });
        }

        if (req.method === 'GET' && url.pathname === '/api/auth/me') {
          if (!auth) return json(res, 503, { error: 'auth_not_configured' });
          try { return json(res, 200, { user: auth.authenticateRequest(req) }); }
          catch { return json(res, 401, { error: 'unauthorized' }); }
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
          if (
            config.connectorSharedToken &&
            req.headers.authorization !==
              `Bearer ${config.connectorSharedToken}`
          ) {
            return json(
              res,
              401,
              { error: 'unauthorized' }
            );
          }

          if (!financeDataService) {
            return json(
              res,
              503,
              { error: 'finance_not_configured' }
            );
          }

          let householdContext = null;
          const householdSession = String(req.headers['x-household-session'] || '');
          if (householdSession) {
            if (!auth) return json(res, 401, { error: 'household_auth_unavailable' });
            try {
              householdContext = auth.authenticateRequest({ headers: { authorization: `Bearer ${householdSession}`, 'x-device-id': req.headers['x-device-id'] || null } });
            } catch {
              return json(res, 401, { error: 'invalid_household_session' });
            }
          }

          const payload = await body(req);
          const result = await ingestionService.processEvidence(payload, householdContext);

          return json(res, 200, result);
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
          if (
            config
              .schedulerToken &&
            req.headers
              .authorization !==
              `Bearer ${config.schedulerToken}`
          ) {
            return json(
              res,
              401,
              {
                error:
                  'unauthorized'
              }
            );
          }

          return json(
            res,
            200,
            {
              renewal:
                await sync
                  .renewWatches()
            }
          );
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
