import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

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

const json = (res, status, value) => {
  res.writeHead(status, {
    'Content-Type':
      'application/json; charset=utf-8',
    'Cache-Control':
      'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
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

  repository =
    repository ||
    createStateRepository(config);

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
        config
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
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
          });
          return res.end();
        }

        if (
          req.method === 'GET' &&
          (
            url.pathname === '/' ||
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

          const payload = await body(req);
          const result = await ingestionService.processEvidence(payload);

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
