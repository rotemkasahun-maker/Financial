import { createHash } from 'node:crypto';

import {
  isReceiptCandidate,
  minimalEvidence
} from './receiptCandidate.ts';

import {
  GmailReceiptProcessor
} from './gmailReceiptProcessor.ts';

const uniqueMessages = history => [
  ...new Set(
    (history || [])
      .flatMap(item =>
        (item.messagesAdded || [])
          .map(
            entry =>
              entry.message?.id
          )
      )
      .filter(Boolean)
  )
];

export class GmailSyncService {
  constructor({
    repository,
    gmail,
    clock = () => new Date(),
    receiptProcessor = null,
    receiptIngestionService = null
  }) {
    this.repository = repository;
    this.gmail = gmail;
    this.clock = clock;

    this.receiptProcessor =
      receiptProcessor ||
      new GmailReceiptProcessor({
        gmail
      });

    this.receiptIngestionService =
      receiptIngestionService;
  }

  async connect({
    connectionId = 'primary',
    tokens,
    email = null
  }) {
    return this.repository.update(
      async state => {
        const connection = {
          id: connectionId,
          email,

          accessToken:
            tokens.access_token,

          refreshToken:
            tokens.refresh_token,

          accessTokenExpiresAt:
            Date.now() +
            Number(
              tokens.expires_in ||
              3600
            ) *
              1000,

          status: 'connecting',

          lastSuccessfulSync:
            null
        };

        const {
          active,
          response
        } =
          await this.gmail.watch(
            connection
          );

        state.connections[
          connectionId
        ] = {
          ...active,

          historyId:
            response.historyId,

          watchExpiration:
            Number(
              response.expiration
            ),

          status: 'active',
          lastError: null
        };

        return publicConnection(
          state.connections[
            connectionId
          ]
        );
      }
    );
  }

  async renewWatches() {
    return this.repository.update(
      async state => {
        const results = [];

        for (
          const connection of
          Object.values(
            state.connections
          )
        ) {
          if (
            connection.status ===
            'disconnected'
          ) {
            continue;
          }

          try {
            const {
              active,
              response
            } =
              await this.gmail.watch(
                connection
              );

            Object.assign(
              connection,
              active,
              {
                historyId:
                  connection
                    .historyId ||
                  response
                    .historyId,

                watchExpiration:
                  Number(
                    response
                      .expiration
                  ),

                status: 'active',
                lastError: null
              }
            );

            results.push({
              id: connection.id,
              ok: true
            });
          } catch (error) {
            connection.status =
              error.code ===
              'oauth_revoked'
                ? 'reconnect_required'
                : 'watch_failed';

            connection.lastError =
              error.code ||
              'watch_failed';

            results.push({
              id: connection.id,
              ok: false,
              error:
                connection.lastError
            });
          }
        }

        return results;
      }
    );
  }

  async processNotification({
    deliveryId,
    emailAddress,
    historyId
  }) {
    return this.repository.update(
      async state => {
        if (
          state.deliveries[
            deliveryId
          ]
        ) {
          return {
            status:
              'duplicate_delivery'
          };
        }

        const connection =
          Object.values(
            state.connections
          ).find(
            item =>
              item.email ===
              emailAddress
          ) ||
          Object.values(
            state.connections
          )[0];

        if (!connection) {
          return {
            status:
              'no_connection'
          };
        }

        let ids = [];
        let nextHistoryId =
          String(historyId);

        let recovered = false;

        try {
          const result =
            await this.gmail.history(
              connection,
              connection.historyId
            );

          Object.assign(
            connection,
            result.active
          );

          ids =
            uniqueMessages(
              result.response
                .history
            );

          nextHistoryId =
            result.response
              .historyId ||
            nextHistoryId;
        } catch (error) {
          if (
            error.status !== 404
          ) {
            throw error;
          }

          const result =
            await this.gmail
              .boundedRecovery(
                connection
              );

          Object.assign(
            connection,
            result.active
          );

          ids = (
            result.response
              .messages || []
          ).map(
            item => item.id
          );

          recovered = true;
        }

        const staged = [];

        let automaticallyProcessed =
          0;

        let automaticallyLinked =
          0;

        let reviewRequired =
          0;

        for (const id of ids) {
          if (
            state.processedMessages[
              id
            ]
          ) {
            continue;
          }

          const metadataResult =
            await this.gmail
              .getMessage(
                connection,
                id,
                'metadata'
              );

          Object.assign(
            connection,
            metadataResult.active
          );

          const metadata =
            metadataResult
              .response;

          if (
            !isReceiptCandidate(
              metadata
            )
          ) {
            state.processedMessages[
              id
            ] = {
              status:
                'not_relevant',

              processedAt:
                this.clock()
                  .toISOString()
            };

            continue;
          }

          const fullResult =
            await this.gmail
              .getMessage(
                connection,
                id,
                'full'
              );

          Object.assign(
            connection,
            fullResult.active
          );

          const evidence = {
            ...minimalEvidence(
              fullResult.response
            ),

            connectionId:
              connection.id
          };

          /*
           * Always stage first.
           *
           * Even if AI, PDF extraction,
           * matching, or finance storage
           * fails, the receipt is not lost.
           */
          state.staging[id] =
            evidence;

          state.processedMessages[
            id
          ] = {
            status: 'staged',

            processedAt:
              this.clock()
                .toISOString()
          };

          for (
            const attachment of
            evidence.attachmentIds
          ) {
            const fingerprint =
              `${id}:${attachment.id}`;

            if (
              !state
                .processedDocuments[
                  fingerprint
                ]
            ) {
              state.processedDocuments[
                fingerprint
              ] = {
                status:
                  'pending_handoff',

                messageId: id
              };
            }
          }

          for (
            const url of
            evidence.documentUrls
          ) {
            const fingerprint =
              `url:${createHash(
                'sha256'
              )
                .update(url)
                .digest('hex')}`;

            if (
              !state
                .processedDocuments[
                  fingerprint
                ]
            ) {
              state.processedDocuments[
                fingerprint
              ] = {
                status:
                  'pending_handoff',

                messageId: id
              };
            }
          }

          try {
            const processing =
              await this
                .receiptProcessor
                .process(
                  connection,
                  evidence
                );

            let ingestion = null;

            /*
             * Only a receipt that already passed
             * AI extraction + deterministic
             * validation is eligible for matching.
             */
            if (
              processing.status ===
                'processed' &&
              this
                .receiptIngestionService
            ) {
              ingestion =
                await this
                  .receiptIngestionService
                  .ingest({
                    connection,
                    evidence,
                    processing
                  });
            }

            state.staging[id] = {
              ...evidence,

              automaticProcessing:
                processing,

              financialIngestion:
                ingestion
            };

            if (
              ingestion?.status ===
              'linked_automatically'
            ) {
              automaticallyProcessed +=
                1;

              automaticallyLinked +=
                1;

              state.processedMessages[
                id
              ] = {
                status:
                  'linked_automatically',

                processedAt:
                  this.clock()
                    .toISOString(),

                transactionId:
                  ingestion
                    .transactionId
              };

              if (
                processing
                  .attachmentId
              ) {
                const fingerprint =
                  `${id}:${processing.attachmentId}`;

                state
                  .processedDocuments[
                    fingerprint
                  ] = {
                    status:
                      'linked_automatically',

                    messageId: id,

                    transactionId:
                      ingestion
                        .transactionId,

                    processedAt:
                      this.clock()
                        .toISOString()
                  };
              }
            } else if (
              ingestion?.status ===
                'review_required'
            ) {
              reviewRequired += 1;

              state.processedMessages[
                id
              ] = {
                status:
                  'review_required',

                processedAt:
                  this.clock()
                    .toISOString(),

                reason:
                  ingestion.reason
              };

              if (
                processing
                  .attachmentId
              ) {
                const fingerprint =
                  `${id}:${processing.attachmentId}`;

                state
                  .processedDocuments[
                    fingerprint
                  ] = {
                    status:
                      'review_required',

                    messageId: id,

                    processedAt:
                      this.clock()
                        .toISOString(),

                    reason:
                      ingestion.reason
                  };
              }
            } else if (
              processing.status ===
                'review_required'
            ) {
              reviewRequired += 1;

              state.processedMessages[
                id
              ] = {
                status:
                  'review_required',

                processedAt:
                  this.clock()
                    .toISOString(),

                reason:
                  processing.reason
              };

              if (
                processing
                  .attachmentId
              ) {
                const fingerprint =
                  `${id}:${processing.attachmentId}`;

                state
                  .processedDocuments[
                    fingerprint
                  ] = {
                    status:
                      'review_required',

                    messageId: id,

                    processedAt:
                      this.clock()
                        .toISOString(),

                    reason:
                      processing.reason
                  };
              }
            } else if (
              processing.status ===
                'processed' &&
              !this
                .receiptIngestionService
            ) {
              /*
               * Backward-compatible behavior
               * for tests or deployments where
               * finance ingestion is intentionally
               * not configured.
               */
              automaticallyProcessed +=
                1;

              state.processedMessages[
                id
              ] = {
                status:
                  'receipt_processed',

                processedAt:
                  this.clock()
                    .toISOString()
              };

              if (
                processing
                  .attachmentId
              ) {
                const fingerprint =
                  `${id}:${processing.attachmentId}`;

                state
                  .processedDocuments[
                    fingerprint
                  ] = {
                    status:
                      'receipt_processed',

                    messageId: id,

                    processedAt:
                      this.clock()
                        .toISOString()
                  };
              }
            }
          } catch (error) {
            reviewRequired += 1;

            state.staging[id] = {
              ...evidence,

              automaticProcessing: {
                status:
                  'review_required',

                reason:
                  'automatic_processing_failed'
              },

              financialIngestion:
                null
            };

            state.processedMessages[
              id
            ] = {
              status:
                'review_required',

              processedAt:
                this.clock()
                  .toISOString(),

              reason:
                'automatic_processing_failed'
            };

            console.error(
              JSON.stringify({
                event:
                  'gmail_receipt_processing_failed',

                messageId: id,

                code:
                  error?.code ||
                  'receipt_processing_failed',

                message:
                  error?.message ||
                  'Unknown receipt processing error'
              })
            );
          }

          staged.push(
            state.staging[id]
          );
        }

        connection.historyId =
          nextHistoryId;

        connection.status =
          'active';

        connection
          .lastSuccessfulSync =
          this.clock()
            .toISOString();

        connection.lastError =
          null;

        state.deliveries[
          deliveryId
        ] = {
          processedAt:
            this.clock()
              .toISOString(),

          historyId:
            String(historyId)
        };

        return {
          status: 'processed',

          stagedCount:
            staged.length,

          automaticallyProcessed,

          automaticallyLinked,

          reviewRequired,

          recovered
        };
      }
    );
  }

  async health() {
    const state =
      await this.repository.read();

    return {
      connections:
        Object.values(
          state.connections
        ).map(
          publicConnection
        ),

      stagedCount:
        Object.keys(
          state.staging
        ).length
    };
  }

  async disconnect(
    connectionId = 'primary'
  ) {
    return this.repository.update(
      async state => {
        const connection =
          state.connections[
            connectionId
          ];

        if (!connection) {
          return {
            disconnected: true
          };
        }

        const token =
          connection.refreshToken ||
          connection.accessToken;

        try {
          if (token) {
            await this.gmail
              .revoke(token);
          }
        } finally {
          delete state.connections[
            connectionId
          ];

          for (
            const [
              id,
              item
            ] of Object.entries(
              state.staging
            )
          ) {
            if (
              !item.connectionId ||
              item.connectionId ===
                connectionId
            ) {
              delete state
                .staging[id];
            }
          }
        }

        return {
          disconnected: true
        };
      }
    );
  }
}

const publicConnection =
  connection => ({
    id:
      connection.id,

    email:
      connection.email,

    status:
      connection.status,

    historyId:
      connection.historyId ||
      null,

    watchExpiration:
      connection
        .watchExpiration ||
      null,

    lastSuccessfulSync:
      connection
        .lastSuccessfulSync ||
      null,

    lastError:
      connection.lastError ||
      null
  });