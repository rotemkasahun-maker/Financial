import { randomUUID } from 'node:crypto';

import type {
  FinanceStateRepository
} from './financeStorage.ts';

export type BackendReceipt = {
  id?: string;
  merchant: string;
  purchaseDate: string;
  total: number | string;
  category?: string | null;
  sourceMetadata?: any;
  linkedTransactionId?: string | null;
  reviewStatus?: string;
  [key: string]: any;
};

export type BackendTransaction = {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  currency?: string;
  direction?: string;
  financialType?: string;
  category?: string;
  receiptId?: string | null;
  sourceType?: string;
  sourceAccount?: string | null;
  householdId?: string | null;
  userId?: string | null;
  deviceId?: string | null;
  importedAt?: string | null;
  [key: string]: any;
};

export class BackendFinanceDataService {
  repository: FinanceStateRepository;

  constructor({
    repository
  }: {
    repository: FinanceStateRepository;
  }) {
    this.repository = repository;
  }

  async getTransactions() {
    const state =
      await this.repository.read();

    return structuredClone(
      state.transactions
    );
  }

  async getReceipts() {
    const state =
      await this.repository.read();

    return structuredClone(
      state.receipts
    );
  }

  async linkEvidence(
    transactionId: string,
    evidence: any
  ) {
    return this.repository.update(
      async state => {
        const transaction =
          state.transactions.find(
            item => item.id === transactionId
          );

        if (!transaction) {
          throw new Error('Transaction not found');
        }

        const evidenceMetadata = {
          sourceType: evidence.sourceType || 'android_sms',
          externalSourceId: evidence.externalSourceId,
          importedAt: new Date().toISOString(),
          metadata: evidence.metadata || {}
        };

        transaction.sourceRepresentations = [
          ...(transaction.sourceRepresentations || []),
          evidenceMetadata
        ];

        return structuredClone(transaction);
      }
    );
  }

  async saveReceipt(
    receipt: BackendReceipt,
    linkedTransactionId: string | null = null
  ) {
    return this.repository.update(
      async state => {
        const normalizedReceipt =
          normalizeReceipt(receipt);

        const existing =
          findExistingReceipt(
            state.receipts,
            normalizedReceipt
          );

        if (existing) {
          mergeSourceRepresentation(
            existing,
            normalizedReceipt
              .sourceMetadata
          );

          if (
            linkedTransactionId &&
            !existing.linkedTransactionId
          ) {
            existing.linkedTransactionId =
              linkedTransactionId;

            linkReceiptToTransaction(
              state.transactions,
              linkedTransactionId,
              existing.id
            );
          }

          return structuredClone(
            existing
          );
        }

        const saved = {
          ...normalizedReceipt,
          id:
            normalizedReceipt.id ||
            `receipt-${randomUUID()}`,
          linkedTransactionId:
            linkedTransactionId ||
            null,
          reviewStatus:
            normalizedReceipt
              .reviewStatus ||
            'approved'
        };

        state.receipts.unshift(
          saved
        );

        if (linkedTransactionId) {
          linkReceiptToTransaction(
            state.transactions,
            linkedTransactionId,
            saved.id
          );
        } else {
          state.transactions.unshift(
            createTransactionFromReceipt(
              saved
            )
          );
        }

        return structuredClone(saved);
      }
    );
  }
}

function normalizeReceipt(
  receipt: BackendReceipt
) {
  if (
    !receipt ||
    typeof receipt !== 'object'
  ) {
    throw new TypeError(
      'saveReceipt expects receipt data'
    );
  }

  const merchant =
    String(
      receipt.merchant || ''
    ).trim();

  if (!merchant) {
    throw new Error(
      'Receipt merchant is required'
    );
  }

  const purchaseDate =
    String(
      receipt.purchaseDate || ''
    ).trim();

  if (!purchaseDate) {
    throw new Error(
      'Receipt purchaseDate is required'
    );
  }

  const total =
    Number(receipt.total);

  if (
    !Number.isFinite(total) ||
    total <= 0
  ) {
    throw new Error(
      'Receipt total must be a positive number'
    );
  }

  return {
    ...receipt,
    merchant,
    purchaseDate,
    total
  };
}

function findExistingReceipt(
  receipts: any[],
  receipt: any
) {
  const metadata =
    receipt.sourceMetadata || {};

  const fingerprint =
    receiptFingerprint(receipt);

  return receipts.find(item => {
    const itemMetadata =
      item.sourceMetadata || {};

    if (
      metadata.externalSourceId &&
      itemMetadata.externalSourceId ===
        metadata.externalSourceId
    ) {
      return true;
    }

    if (
      metadata.contentHash &&
      itemMetadata.contentHash ===
        metadata.contentHash
    ) {
      return true;
    }

    const gmailInvolved =
      metadata.sourceType === 'gmail' ||
      itemMetadata.sourceType ===
        'gmail';

    if (
      gmailInvolved &&
      receiptFingerprint(item) ===
        fingerprint
    ) {
      return true;
    }

    return false;
  });
}

function receiptFingerprint(
  receipt: any
) {
  return [
    receipt.purchaseDate,
    Number(receipt.total),
    String(
      receipt.merchant || ''
    )
      .trim()
      .toLowerCase()
  ].join('|');
}

function mergeSourceRepresentation(
  receipt: any,
  metadata: any
) {
  if (!metadata) {
    return;
  }

  const representations = [
    ...(receipt
      .sourceRepresentations ||
      []),
    metadata
  ];

  receipt.sourceRepresentations =
    representations.filter(
      (
        item,
        index,
        array
      ) =>
        array.findIndex(
          candidate =>
            (
              item.externalSourceId &&
              candidate
                .externalSourceId ===
                item.externalSourceId
            ) ||
            (
              item.contentHash &&
              candidate.contentHash ===
                item.contentHash
            )
        ) === index
    );
}

function linkReceiptToTransaction(
  transactions: any[],
  transactionId: string,
  receiptId: string
) {
  const transaction =
    transactions.find(
      item =>
        item.id ===
        transactionId
    );

  if (!transaction) {
    throw new Error(
      'Linked transaction not found'
    );
  }

  transaction.receiptId =
    receiptId;
}

function createTransactionFromReceipt(
  receipt: any
): BackendTransaction {
  const metadata =
    receipt.sourceMetadata || {};

  return {
    id:
      `transaction-${randomUUID()}`,
    date:
      receipt.purchaseDate,
    merchant:
      receipt.merchant,
    amount:
      Number(receipt.total),
    currency:
      receipt.currency ||
      'ILS',
    direction:
      'debit',
    financialType:
      'expense',
    category:
      receipt.category ||
      'כללי',
    receiptId:
      receipt.id,
    sourceType:
      metadata.sourceType ||
      'receipt',
    sourceAccount:
      metadata.sourceAccount ||
      null,
    householdId:
      metadata.householdId ||
      null,
    userId:
      metadata.userId ||
      null,
    deviceId:
      metadata.deviceId ||
      null,
    importedAt:
      metadata.importedAt ||
      new Date().toISOString()
  };
}