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

  async getHouseholdState(context: any) {
    const state = await this.repository.update(async current => { await this.ensureMaintenance(current, new Date(), context); return current; });
    return structuredClone({
      transactions: state.transactions.filter(item => !item.householdId || item.householdId === context.householdId),
      receipts: state.receipts.filter(item => !item.householdId || item.householdId === context.householdId),
      tasks: state.tasks.filter(item => !item.householdId || item.householdId === context.householdId),
      expectedDocuments: state.expectedDocuments.filter(item => !item.householdId || item.householdId === context.householdId),
      rewardEvents: state.rewardEvents
    });
  }

  async ensureMaintenance(state: any, now = new Date(), context: any = null) {
    state.tasks = Array.isArray(state.tasks) ? state.tasks : [];
    state.expectedDocuments = Array.isArray(state.expectedDocuments) ? state.expectedDocuments : [];
    state.transactions = Array.isArray(state.transactions) ? state.transactions : [];
    state.receipts = Array.isArray(state.receipts) ? state.receipts : [];
    state.rewardEvents = state.rewardEvents && typeof state.rewardEvents === 'object' ? state.rewardEvents : {};
    const period = now.toISOString().slice(0, 7);
    for (const rule of [{ type: 'rehabilitation_document', day: 1, title: 'העלאת המסמך החודשי מאגף השיקום' }, { type: 'credit_card_statement', day: 2, title: 'העלאת פירוט האשראי החודשי' }]) {
      const id = `expected-${rule.type}-${period}`;
      let doc = state.expectedDocuments.find((item: any) => item.id === id);
      if (!doc) { doc = { id, householdId: context?.householdId || null, documentType: rule.type, period, dueDate: `${period}-${String(rule.day).padStart(2, '0')}`, received: false, status: 'open' }; state.expectedDocuments.push(doc); }
      const key = `expected_document:${id}`;
      if (!doc.received && !state.tasks.some((item: any) => item.dedupeKey === key && (!context || item.householdId === context.householdId))) state.tasks.push({ id: `task-${key}`, householdId: context?.householdId || doc.householdId || null, type: 'expected_document', dedupeKey: key, relatedRecordId: id, title: rule.title, status: 'open', priority: 'high', xpReward: 15 });
    }
    for (const tx of state.transactions.filter((item: any) => item.financialType === 'expense' && !item.receiptId)) {
      const key = `missing_receipt:${tx.id}`;
      if (!state.tasks.some((item: any) => item.dedupeKey === key && (!context || item.householdId === context.householdId))) state.tasks.push({ id: `task-${key}`, householdId: context?.householdId || tx.householdId || null, type: 'missing_receipt', dedupeKey: key, relatedRecordId: tx.id, title: `חסרה קבלה ל${tx.merchant}`, explanation: `${tx.merchant} · ${tx.amount} ₪`, status: 'open', priority: 'normal', xpReward: 10, deepLink: { route: 'receipt_capture', params: { transactionId: tx.id } } });
    }
  }

  async completeTask(taskId: string, context: any) { return this.repository.update(async state => { await this.ensureMaintenance(state); const task = state.tasks.find((item: any) => item.id === taskId && (!item.householdId || item.householdId === context.householdId)); if (!task) throw Object.assign(new Error('Task not found'), { code: 'not_found' }); if (task.status !== 'completed') { task.status = 'completed'; task.completedAt = new Date().toISOString(); const rewardKey = `task:${task.id}`; if (!state.rewardEvents[rewardKey]) state.rewardEvents[rewardKey] = { taskId: task.id, amount: task.xpReward || 0, completedBy: context.userId, completedAt: task.completedAt }; } return structuredClone({ task, reward: state.rewardEvents[`task:${task.id}`] || null }); }); }
  async receiveExpectedDocument(documentId: string, context: any) { return this.repository.update(async state => { await this.ensureMaintenance(state); const doc = state.expectedDocuments.find((item: any) => item.id === documentId); if (!doc) throw Object.assign(new Error('Document not found'), { code: 'not_found' }); doc.received = true; doc.status = 'completed'; for (const task of state.tasks.filter((item: any) => item.relatedRecordId === documentId)) { if (task.status !== 'completed') { task.status = 'completed'; task.completedAt = new Date().toISOString(); const rewardKey = `task:${task.id}`; if (!state.rewardEvents[rewardKey]) state.rewardEvents[rewardKey] = { taskId: task.id, amount: task.xpReward || 0, completedBy: context.userId, completedAt: task.completedAt }; } } return structuredClone(doc); }); }

  async updateTransaction(transactionId: string, changes: any, context: any, expectedVersion: any) {
    return this.repository.update(async state => {
      const transaction = state.transactions.find(item => item.id === transactionId && item.householdId === context.householdId);
      if (!transaction) throw Object.assign(new Error('Transaction not found'), { code: 'not_found' });
      if (expectedVersion !== undefined && Number(transaction.version || 1) !== Number(expectedVersion)) throw Object.assign(new Error('Stale transaction'), { code: 'conflict', current: structuredClone(transaction) });
      const allowed = ['merchant','description','amount','date','category','subcategory'];
      for (const field of allowed) if (changes[field] !== undefined) transaction[field] = field === 'amount' ? Number(changes[field]) : String(changes[field] ?? '').trim();
      transaction.version = Number(transaction.version || 1) + 1;
      transaction.updatedAt = new Date().toISOString();
      transaction.lastEditedBy = context.userId;
      return structuredClone(transaction);
    });
  }

  async createCashTransaction(input: any, context: any, idempotencyKey: string) {
    return this.repository.update(async state => {
      if (idempotencyKey && state.idempotency[idempotencyKey]) return structuredClone(state.idempotency[idempotencyKey]);
      const transaction = { id: `transaction-${randomUUID()}`, date: input.date, merchant: String(input.merchant || '').trim(), description: String(input.description || '').trim(), amount: Number(input.amount), currency: 'ILS', direction: 'debit', financialType: 'expense', category: String(input.category || 'כללי').trim(), subcategory: String(input.subcategory || '').trim(), source: 'מזומן', sourceType: 'manual_cash', sourceAccount: 'cash', paymentMethod: 'cash', householdId: context.householdId, userId: context.userId, deviceId: context.deviceId, provenance: { sourceType: 'manual_cash', captureMethod: 'quick_cash' }, version: 1, importedAt: new Date().toISOString(), receiptId: null };
      state.transactions.unshift(transaction);
      if (idempotencyKey) state.idempotency[idempotencyKey] = transaction;
      return structuredClone(transaction);
    });
  }

  async importRows(rows: any[], context: any) {
    return this.repository.update(async state => {
      let imported = 0; let skipped = 0;
      for (const row of rows || []) {
        if (row.excluded || !row.valid) continue;
        const duplicate = state.transactions.find(item => (row.externalSourceId && item.externalSourceId === row.externalSourceId) || (item.date === row.date && Number(item.amount) === Number(row.amount) && item.merchant === row.merchant && item.sourceType === row.sourceType));
        if (duplicate) { skipped += 1; continue; }
        state.transactions.unshift({ id: row.id || `transaction-${randomUUID()}`, canonicalEventId: row.canonicalEventId || null, date: row.date, merchant: row.merchant, description: row.description, amount: Number(row.amount), currency: 'ILS', direction: row.direction, financialType: row.financialType || 'unknown', category: row.category || 'ללא קטגוריה', subcategory: row.subcategory || '', source: row.source || (row.sourceType === 'bank_import' ? 'ייבוא בנק' : 'ייבוא אשראי'), sourceType: row.sourceType, sourceAccount: row.sourceAccount || null, postingStatus: row.postingStatus || 'unknown', rawStatus: row.rawStatus ?? null, runningBalance: row.runningBalance ?? null, externalSourceId: row.externalSourceId || null, householdId: context.householdId, userId: context.userId, deviceId: context.deviceId, importedAt: new Date().toISOString(), receiptId: row.receiptId || null, countInTotals: row.countInTotals !== false, version: 1 });
        imported += 1;
      }
      return { imported, skipped, transactions: structuredClone(state.transactions) };
    });
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
            completeLinkedReceiptTasks(state, linkedTransactionId);
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
          completeLinkedReceiptTasks(state, linkedTransactionId);
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

function completeLinkedReceiptTasks(state: any, transactionId: string) {
  for (const task of state.tasks || []) if (task.type === 'missing_receipt' && task.relatedRecordId === transactionId && task.status !== 'completed') {
    task.status = 'completed'; task.completedAt = new Date().toISOString();
    const key = `task:${task.id}`;
    if (!state.rewardEvents[key]) state.rewardEvents[key] = { taskId: task.id, amount: task.xpReward || 0, completedAt: task.completedAt };
  }
}
