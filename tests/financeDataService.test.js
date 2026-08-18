import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MemoryBlobStore
} from '../backend/storage.ts';

import {
  FinanceStateRepository
} from '../backend/financeStorage.ts';

import {
  BackendFinanceDataService
} from '../backend/financeDataService.ts';

const encryptionKey =
  Buffer.alloc(32, 9).toString('base64');

function setup() {
  const repository =
    new FinanceStateRepository({
      blobStore: new MemoryBlobStore(),
      encryptionKey
    });

  const service =
    new BackendFinanceDataService({
      repository
    });

  return {
    repository,
    service
  };
}

const baseReceipt = () => ({
  merchant: 'KSP',
  purchaseDate: '2026-03-22',
  total: '204.00',
  currency: 'ILS',
  category: 'כללי',
  sourceMetadata: {
    sourceType: 'gmail',
    sourceAccount: 'family@example.test',
    externalSourceId: 'gmail-message-1',
    contentHash: 'hash-1',
    householdId: 'household-1',
    userId: 'demo-member-a',
    deviceId: 'gmail-connector',
    importedAt:
      '2026-08-18T09:00:00.000Z'
  }
});

test(
  'saving a receipt without linked transaction creates one financial transaction',
  async () => {
    const {
      service
    } = setup();

    const saved =
      await service.saveReceipt(
        baseReceipt()
      );

    const receipts =
      await service.getReceipts();

    const transactions =
      await service.getTransactions();

    assert.equal(
      receipts.length,
      1
    );

    assert.equal(
      transactions.length,
      1
    );

    assert.equal(
      saved.merchant,
      'KSP'
    );

    assert.equal(
      saved.total,
      204
    );

    assert.equal(
      saved.linkedTransactionId,
      null
    );

    assert.equal(
      transactions[0].merchant,
      'KSP'
    );

    assert.equal(
      transactions[0].amount,
      204
    );

    assert.equal(
      transactions[0].receiptId,
      saved.id
    );

    assert.equal(
      transactions[0].sourceType,
      'gmail'
    );
  }
);

test(
  'saving a receipt linked to an existing transaction does not create a second transaction',
  async () => {
    const {
      repository,
      service
    } = setup();

    await repository.update(
      state => {
        state.transactions.push({
          id: 'transaction-existing',
          date: '2026-03-22',
          merchant: 'KSP',
          amount: 204,
          currency: 'ILS',
          direction: 'debit',
          financialType: 'expense',
          receiptId: null
        });
      }
    );

    const saved =
      await service.saveReceipt(
        baseReceipt(),
        'transaction-existing'
      );

    const transactions =
      await service.getTransactions();

    assert.equal(
      transactions.length,
      1
    );

    assert.equal(
      saved.linkedTransactionId,
      'transaction-existing'
    );

    assert.equal(
      transactions[0].receiptId,
      saved.id
    );
  }
);

test(
  'same Gmail receipt is deduplicated by external source id',
  async () => {
    const {
      service
    } = setup();

    const first =
      await service.saveReceipt(
        baseReceipt()
      );

    const second =
      await service.saveReceipt(
        {
          ...baseReceipt(),
          sourceMetadata: {
            ...baseReceipt()
              .sourceMetadata,
            contentHash:
              'different-hash'
          }
        }
      );

    const receipts =
      await service.getReceipts();

    const transactions =
      await service.getTransactions();

    assert.equal(
      receipts.length,
      1
    );

    assert.equal(
      transactions.length,
      1
    );

    assert.equal(
      second.id,
      first.id
    );
  }
);

test(
  'same receipt is deduplicated by content hash',
  async () => {
    const {
      service
    } = setup();

    const first =
      await service.saveReceipt(
        baseReceipt()
      );

    const second =
      await service.saveReceipt({
        ...baseReceipt(),
        sourceMetadata: {
          ...baseReceipt()
            .sourceMetadata,
          externalSourceId:
            'different-message',
          contentHash:
            'hash-1'
        }
      });

    const receipts =
      await service.getReceipts();

    assert.equal(
      receipts.length,
      1
    );

    assert.equal(
      second.id,
      first.id
    );
  }
);

test(
  'Gmail duplicate fingerprint prevents duplicate receipt and transaction',
  async () => {
    const {
      service
    } = setup();

    const first =
      await service.saveReceipt(
        baseReceipt()
      );

    const second =
      await service.saveReceipt({
        ...baseReceipt(),
        sourceMetadata: {
          ...baseReceipt()
            .sourceMetadata,
          externalSourceId:
            'gmail-message-2',
          contentHash:
            'hash-2'
        }
      });

    const receipts =
      await service.getReceipts();

    const transactions =
      await service.getTransactions();

    assert.equal(
      receipts.length,
      1
    );

    assert.equal(
      transactions.length,
      1
    );

    assert.equal(
      second.id,
      first.id
    );
  }
);

test(
  'duplicate receipt can later become linked to an existing transaction',
  async () => {
    const {
      repository,
      service
    } = setup();

    const first =
      await service.saveReceipt(
        baseReceipt()
      );

    await repository.update(
      state => {
        state.transactions.push({
          id: 'transaction-later',
          date: '2026-03-22',
          merchant: 'KSP',
          amount: 204,
          currency: 'ILS',
          direction: 'debit',
          financialType: 'expense',
          receiptId: null
        });
      }
    );

    const second =
      await service.saveReceipt(
        baseReceipt(),
        'transaction-later'
      );

    const transactions =
      await service.getTransactions();

    const linked =
      transactions.find(
        item =>
          item.id ===
          'transaction-later'
      );

    assert.equal(
      second.id,
      first.id
    );

    assert.equal(
      second.linkedTransactionId,
      'transaction-later'
    );

    assert.equal(
      linked.receiptId,
      first.id
    );
  }
);

test(
  'invalid receipt data is rejected',
  async () => {
    const {
      service
    } = setup();

    await assert.rejects(
      () =>
        service.saveReceipt({
          merchant: '',
          purchaseDate:
            '2026-03-22',
          total: '204.00'
        }),
      /merchant is required/i
    );

    await assert.rejects(
      () =>
        service.saveReceipt({
          merchant: 'Store',
          purchaseDate: '',
          total: '204.00'
        }),
      /purchaseDate is required/i
    );

    await assert.rejects(
      () =>
        service.saveReceipt({
          merchant: 'Store',
          purchaseDate:
            '2026-03-22',
          total: 'not-a-number'
        }),
      /positive number/i
    );
  }
);