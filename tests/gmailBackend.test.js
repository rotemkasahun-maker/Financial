import test from 'node:test';
import assert from 'node:assert/strict';

import {
  GmailStateRepository,
  MemoryBlobStore
} from '../backend/storage.ts';

import {
  GmailSyncService
} from '../backend/syncService.ts';

import {
  extractDocumentUrls,
  isReceiptCandidate,
  minimalEvidence
} from '../backend/receiptCandidate.ts';

import {
  createBackend
} from '../backend/server.ts';

const key = Buffer.alloc(32, 7).toString('base64');

const receipt = id => ({
  id,
  threadId: `thread-${id}`,
  snippet: 'קבלה זמינה',
  payload: {
    headers: [
      {
        name: 'Subject',
        value: 'הקבלה שלך'
      }
    ],
    parts: [
      {
        mimeType: 'application/pdf',
        filename: 'receipt.pdf',
        body: {
          attachmentId: `attachment-${id}`
        }
      }
    ]
  }
});

/*
 * Default fake processor for tests.
 *
 * It performs no real PDF processing
 * and makes no OpenAI API calls.
 */
const stagingOnlyReceiptProcessor = {
  async process() {
    return {
      status: 'no_automatic_document',
      reason: 'test_staging_only'
    };
  }
};

function setup({
  historyError = null,
  recovery = [],
  receiptProcessor = stagingOnlyReceiptProcessor
} = {}) {
  const calls = {
    watch: 0,
    history: 0,
    metadata: 0,
    full: 0,
    recovery: 0,
    revoke: 0
  };

  const messages = new Map([
    ['m1', receipt('m1')],
    [
      'normal',
      {
        id: 'normal',
        snippet: 'עדכון',
        payload: {
          headers: [
            {
              name: 'Subject',
              value: 'חדשות השבוע'
            }
          ]
        }
      }
    ]
  ]);

  const gmail = {
    async watch(connection) {
      calls.watch++;

      return {
        active: {
          ...connection,
          accessToken: 'new'
        },
        response: {
          historyId: '100',
          expiration: String(
            Date.now() + 86400000
          )
        }
      };
    },

    async history(connection) {
      calls.history++;

      if (historyError) {
        throw historyError;
      }

      return {
        active: connection,
        response: {
          historyId: '102',
          history: [
            {
              messagesAdded: [
                {
                  message: {
                    id: 'm1'
                  }
                },
                {
                  message: {
                    id: 'normal'
                  }
                }
              ]
            }
          ]
        }
      };
    },

    async boundedRecovery(connection) {
      calls.recovery++;

      return {
        active: connection,
        response: {
          messages: recovery.map(id => ({
            id
          }))
        }
      };
    },

    async getMessage(connection, id, format) {
      calls[format]++;

      return {
        active: connection,
        response: messages.get(id)
      };
    },

    async revoke() {
      calls.revoke++;
      return true;
    }
  };

  const repository =
    new GmailStateRepository({
      blobStore: new MemoryBlobStore(),
      encryptionKey: key
    });

  const service =
    new GmailSyncService({
      repository,
      gmail,
      receiptProcessor,
      clock: () =>
        new Date(
          '2026-08-15T10:00:00Z'
        )
    });

  return {
    calls,
    gmail,
    repository,
    service
  };
}

test(
  'watch registration and daily renewal persist cursor and health without financial state',
  async () => {
    const {
      service,
      repository,
      calls
    } = setup();

    await service.connect({
      tokens: {
        access_token: 'a',
        refresh_token: 'r',
        expires_in: 3600
      },
      email: 'family@example.test'
    });

    await service.renewWatches();

    const state =
      await repository.read();

    assert.equal(calls.watch, 2);

    assert.equal(
      state.connections.primary.historyId,
      '100'
    );

    assert.equal(
      state.connections.primary.status,
      'active'
    );

    for (
      const forbidden of [
        'transactions',
        'canonicalEvents',
        'tasks',
        'xp',
        'madrid',
        'totals'
      ]
    ) {
      assert.equal(
        state[forbidden],
        undefined
      );
    }
  }
);

test(
  'history processing filters metadata first, stages receipts, and deduplicates delivery and messages',
  async () => {
    const {
      service,
      repository,
      calls
    } = setup();

    await service.connect({
      tokens: {
        access_token: 'a',
        refresh_token: 'r',
        expires_in: 3600
      },
      email: 'family@example.test'
    });

    const input = {
      deliveryId: 'delivery-1',
      emailAddress: 'family@example.test',
      historyId: '102'
    };

    const first =
      await service.processNotification(
        input
      );

    const second =
      await service.processNotification(
        input
      );

    assert.deepEqual(first, {
      status: 'processed',
      stagedCount: 1,
      automaticallyProcessed: 0,
      automaticallyLinked: 0,
      reviewRequired: 0,
      recovered: false
    });

    assert.equal(
      second.status,
      'duplicate_delivery'
    );

    assert.equal(calls.metadata, 2);
    assert.equal(calls.full, 1);

    const state =
      await repository.read();

    assert.equal(
      state.connections.primary.historyId,
      '102'
    );

    assert.equal(
      Object.keys(state.staging).length,
      1
    );

    assert.equal(
      state.processedMessages.normal.status,
      'not_relevant'
    );

    assert.equal(
      state.staging.m1
        .automaticProcessing.status,
      'no_automatic_document'
    );
  }
);

test(
  'automatic receipt processor result is stored in staging without calling real AI',
  async () => {
    let processorCalls = 0;

    const fakeReceiptResult = {
      status: 'processed',
      attachmentId: 'attachment-m1',
      filename: 'receipt.pdf',
      receipt: {
        status:
          'ready_for_automatic_save',
        extraction: {
          merchant: 'Synthetic Store',
          total: '100.00',
          confidence: 0.97
        },
        validation: {
          valid: true,
          safeForAutomaticSave: true,
          requiresReview: false
        },
        document: {
          pageCount: 1,
          hasTextLayer: true,
          usedOcr: false,
          textLength: 120
        },
        error: null
      }
    };

    const receiptProcessor = {
      async process(
        connection,
        evidence
      ) {
        processorCalls++;

        assert.equal(
          connection.id,
          'primary'
        );

        assert.equal(
          evidence.messageId,
          'm1'
        );

        return fakeReceiptResult;
      }
    };

    const {
      service,
      repository
    } = setup({
      receiptProcessor
    });

    await service.connect({
      tokens: {
        access_token: 'a',
        refresh_token: 'r',
        expires_in: 3600
      },
      email: 'family@example.test'
    });

    const result =
      await service.processNotification({
        deliveryId: 'automatic-1',
        emailAddress:
          'family@example.test',
        historyId: '102'
      });

    assert.equal(processorCalls, 1);

    assert.equal(
      result.stagedCount,
      1
    );

    assert.equal(
      result.automaticallyProcessed,
      1
    );

    assert.equal(
      result.reviewRequired,
      0
    );

    const state =
      await repository.read();

    assert.equal(
      state.staging.m1
        .automaticProcessing.status,
      'processed'
    );

    assert.equal(
      state.processedMessages.m1.status,
      'receipt_processed'
    );

    assert.equal(
      state.processedDocuments[
        'm1:attachment-m1'
      ].status,
      'receipt_processed'
    );
  }
);

test(
  'receipt processor review result stays staged for review',
  async () => {
    const receiptProcessor = {
      async process() {
        return {
          status: 'review_required',
          reason:
            'receipt_validation_required',
          attachmentId:
            'attachment-m1',
          filename: 'receipt.pdf',
          receipt: {
            status: 'review_required'
          }
        };
      }
    };

    const {
      service,
      repository
    } = setup({
      receiptProcessor
    });

    await service.connect({
      tokens: {
        access_token: 'a',
        refresh_token: 'r',
        expires_in: 3600
      },
      email: 'family@example.test'
    });

    const result =
      await service.processNotification({
        deliveryId: 'review-1',
        emailAddress:
          'family@example.test',
        historyId: '102'
      });

    assert.equal(
      result.automaticallyProcessed,
      0
    );

    assert.equal(
      result.reviewRequired,
      1
    );

    const state =
      await repository.read();

    assert.equal(
      state.processedMessages.m1.status,
      'review_required'
    );

    assert.equal(
      state.processedMessages.m1.reason,
      'receipt_validation_required'
    );

    assert.equal(
      state.staging.m1
        .automaticProcessing.status,
      'review_required'
    );

    assert.equal(
      state.processedDocuments[
        'm1:attachment-m1'
      ].status,
      'review_required'
    );
  }
);

test(
  'receipt processor failure never breaks Gmail synchronization',
  async () => {
    const receiptProcessor = {
      async process() {
        throw new Error(
          'Synthetic processing failure'
        );
      }
    };

    const {
      service,
      repository
    } = setup({
      receiptProcessor
    });

    await service.connect({
      tokens: {
        access_token: 'a',
        refresh_token: 'r',
        expires_in: 3600
      },
      email: 'family@example.test'
    });

    const result =
      await service.processNotification({
        deliveryId: 'failure-1',
        emailAddress:
          'family@example.test',
        historyId: '102'
      });

    assert.equal(
      result.status,
      'processed'
    );

    assert.equal(
      result.stagedCount,
      1
    );

    assert.equal(
      result.reviewRequired,
      1
    );

    const state =
      await repository.read();

    assert.equal(
      state.processedMessages.m1.status,
      'review_required'
    );

    assert.equal(
      state.processedMessages.m1.reason,
      'automatic_processing_failed'
    );

    assert.equal(
      state.staging.m1
        .automaticProcessing.status,
      'review_required'
    );
  }
);

test(
  'invalid history cursor triggers bounded recovery rather than full mailbox rescan',
  async () => {
    const error = Object.assign(
      new Error('old cursor'),
      {
        status: 404
      }
    );

    const {
      service,
      calls
    } = setup({
      historyError: error,
      recovery: ['m1']
    });

    await service.connect({
      tokens: {
        access_token: 'a',
        refresh_token: 'r',
        expires_in: 3600
      },
      email: 'family@example.test'
    });

    const result =
      await service.processNotification({
        deliveryId: 'd2',
        emailAddress:
          'family@example.test',
        historyId: '500'
      });

    assert.equal(
      result.recovered,
      true
    );

    assert.equal(
      calls.recovery,
      1
    );

    assert.equal(
      result.stagedCount,
      1
    );
  }
);

test(
  'revoked OAuth becomes reconnect_required during renewal',
  async () => {
    const {
      service,
      repository,
      gmail
    } = setup();

    await service.connect({
      tokens: {
        access_token: 'a',
        refresh_token: 'r',
        expires_in: 3600
      },
      email: 'family@example.test'
    });

    gmail.watch = async () => {
      throw Object.assign(
        new Error('revoked'),
        {
          code: 'oauth_revoked'
        }
      );
    };

    const result =
      await service.renewWatches();

    const state =
      await repository.read();

    assert.equal(
      result[0].error,
      'oauth_revoked'
    );

    assert.equal(
      state.connections.primary.status,
      'reconnect_required'
    );
  }
);

test(
  'receipt candidate filtering uses metadata and supported attachments',
  () => {
    assert.equal(
      isReceiptCandidate(
        receipt('m1')
      ),
      true
    );

    assert.equal(
      isReceiptCandidate({
        snippet: 'ordinary',
        payload: {
          headers: [
            {
              name: 'Subject',
              value: 'hello'
            }
          ]
        }
      }),
      false
    );
  }
);

test(
  'linked receipt URL is extracted only after full candidate fetch without retaining body',
  () => {
    const message =
      receipt('link');

    message.payload.parts = [
      {
        mimeType: 'text/html',
        body: {
          data: Buffer.from(
            '<a href="https://receipts.example/download/abc">קבלה</a>'
          ).toString('base64url')
        }
      }
    ];

    const evidence =
      minimalEvidence(message);

    assert.deepEqual(
      evidence.documentUrls,
      [
        'https://receipts.example/download/abc'
      ]
    );

    assert.equal(
      'body' in evidence,
      false
    );

    assert.deepEqual(
      extractDocumentUrls(
        'https://example.test/home'
      ),
      []
    );
  }
);

test(
  'storage abstraction encrypts persisted Gmail state and remains replaceable',
  async () => {
    const blob =
      new MemoryBlobStore();

    const repository =
      new GmailStateRepository({
        blobStore: blob,
        encryptionKey: key
      });

    await repository.update(
      state => {
        state.connections.primary = {
          refreshToken:
            'secret-token'
        };
      }
    );

    assert.equal(
      blob.value.includes(
        Buffer.from(
          'secret-token'
        )
      ),
      false
    );

    const replacement =
      new GmailStateRepository({
        blobStore: blob,
        encryptionKey: key
      });

    assert.equal(
      (
        await replacement.read()
      ).connections.primary
        .refreshToken,
      'secret-token'
    );
  }
);

test(
  'disconnect revokes token and deletes connection staging',
  async () => {
    const {
      service,
      repository,
      calls
    } = setup();

    await service.connect({
      tokens: {
        access_token: 'a',
        refresh_token: 'r',
        expires_in: 3600
      },
      email: 'family@example.test'
    });

    await service.disconnect();

    assert.equal(
      calls.revoke,
      1
    );

    assert.equal(
      Object.keys(
        (
          await repository.read()
        ).connections
      ).length,
      0
    );
  }
);

test(
  'health-only Cloud Run revision starts before Gmail credentials exist',
  async t => {
    const server =
      createBackend({
        config: {
          publicBaseUrl:
            'http://127.0.0.1',
          gmailConfigured: false
        },
        repository: {},
        gmail: {}
      });

    await new Promise(
      resolve =>
        server.listen(
          0,
          '127.0.0.1',
          resolve
        )
    );

    t.after(() =>
      server.close()
    );

    const { port } =
      server.address();

    const response =
      await fetch(
        `http://127.0.0.1:${port}/healthz`
      );

    assert.equal(
      response.status,
      200
    );

    assert.deepEqual(
      await response.json(),
      {
        status: 'ok',
        service:
          'family-finance-gmail',
        gmailConfigured: false,
        financeConfigured: false
      }
    );
  }
);