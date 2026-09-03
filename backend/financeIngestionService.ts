import { findReceiptMatches } from '../src/shared/receiptMatching.js';
import type { BackendFinanceDataService } from './financeDataService.ts';

export type FinancialEvidence = {
  externalSourceId: string;
  sourceType?: string;
  sender?: string | null;
  originalSmsTimestamp: string | number;
  candidateType: 'TRANSACTION' | 'RECEIPT_LINK' | 'AMBIGUOUS';
  normalized?: {
    merchant?: string | null;
    date?: string | null;
    amount?: number | null;
    currency?: string | null;
    cardLastFour?: string | null;
    urls?: string[];
  };
  documentUrls?: string[];
  bodyHash?: string;
  metadata?: any;
};

export class FinanceIngestionService {
  private dataService: BackendFinanceDataService;
  private syncRepository: any;

  constructor({ dataService, syncRepository }: { dataService: BackendFinanceDataService; syncRepository: any }) {
    this.dataService = dataService;
    this.syncRepository = syncRepository;
  }

  async processEvidence(evidence: FinancialEvidence, context: any = null) {
    if (!evidence.externalSourceId) {
      throw new Error('externalSourceId is required for idempotency');
    }

    const alreadyProcessed = await this.syncRepository.update(async (state: any) => {
      if (state.processedEvidence?.[evidence.externalSourceId]) {
        return state.processedEvidence[evidence.externalSourceId];
      }
      return null;
    });

    if (alreadyProcessed) {
      return {
        status: 'already_processed',
        evidenceId: evidence.externalSourceId,
        originalResult: alreadyProcessed
      };
    }

    let result;

    if (
      evidence.candidateType === 'TRANSACTION' &&
      this.hasMatchableTransactionData(evidence)
    ) {
      result = await this.handleTransaction(evidence, context);
    } else if (evidence.candidateType === 'RECEIPT_LINK') {
      result = await this.handleReceiptLink(evidence, context);
    } else {
      // Partial transaction evidence is staged instead of being passed
      // into matching with missing merchant/date fields.
      result = await this.handleAmbiguous(evidence, context);
    }

    await this.syncRepository.update(async (state: any) => {
      state.processedEvidence = state.processedEvidence || {};
      state.processedEvidence[evidence.externalSourceId] = {
        status: result.status,
        transactionId: result.transactionId || null,
        householdId: context?.householdId || result.householdId || null,
        processedAt: new Date().toISOString()
      };
    });

    return result;
  }

  async getEvidenceReceiptStatus(externalSourceId: string, context: any) {
    if (!externalSourceId) throw new Error('externalSourceId is required');
    const state = await this.syncRepository.read();
    const processed = state.processedEvidence?.[externalSourceId] || null;

    if (!processed || !processed.householdId || processed.householdId !== context.householdId) {
      return {
        externalSourceId,
        ingestionStatus: 'not_found',
        durableResult: null,
        transactionId: null,
        receiptStatus: 'unknown',
        receiptPresent: null
      };
    }

    if (!processed.transactionId) {
      return {
        externalSourceId,
        ingestionStatus: 'pending',
        durableResult: processed.status || null,
        transactionId: null,
        receiptStatus: 'unknown',
        receiptPresent: null
      };
    }

    const transaction = await this.dataService.getTransactionReceiptState(
      processed.transactionId,
      context
    );

    if (!transaction) {
      return {
        externalSourceId,
        ingestionStatus: 'pending',
        durableResult: processed.status || null,
        transactionId: null,
        receiptStatus: 'unknown',
        receiptPresent: null
      };
    }

    return {
      externalSourceId,
      ingestionStatus: 'resolved',
      durableResult: processed.status || null,
      transactionId: transaction.transactionId,
      receiptStatus: transaction.receiptPresent ? 'present' : 'absent',
      receiptPresent: transaction.receiptPresent
    };
  }

  async listStagedEvidence() {
    const state = await this.syncRepository.read();
    const transactions = await this.dataService.getTransactions();
    return Object.values(state.staging || {})
      .filter((item: any) => item.sourceType === 'android_sms' || item.candidateType === 'TRANSACTION' || item.candidateType === 'AMBIGUOUS')
      .filter((item: any) => item.status === 'review_required')
      .map((item: any) => ({ ...item, candidates: transactions.filter((tx: any) => tx.financialType === 'expense' && item.normalized?.amount != null && Number(tx.amount) === Number(item.normalized.amount)).slice(0, 5) }));
  }

  async resolveStagedEvidence(externalSourceId: string, transactionId: string | null, resolution: 'link' | 'reviewed' = 'link', context: any = null) {
    if (!externalSourceId) throw new Error('externalSourceId is required');
    return this.syncRepository.update(async (state: any) => {
      const evidence = state.staging?.[externalSourceId];
      if (!evidence) return { status: 'already_resolved', evidenceId: externalSourceId };
      if (context && evidence.householdId !== context.householdId) return { status: 'not_found', evidenceId: externalSourceId };
      if (evidence.status === 'resolved') return { status: 'already_resolved', evidenceId: externalSourceId, transactionId: evidence.transactionId || null };
      if (resolution === 'link') {
        if (!transactionId) throw new Error('transactionId is required to link evidence');
        const transaction = (await this.dataService.getTransactions()).find((item: any) => item.id === transactionId);
        if (!transaction) throw new Error('Transaction not found');
        if (context && transaction.householdId && transaction.householdId !== context.householdId) throw new Error('Transaction not found');
        await this.dataService.linkEvidence(transactionId, {
          sourceType: evidence.sourceType || 'android_sms',
          externalSourceId,
          metadata: { sender: evidence.sender, originalSmsTimestamp: evidence.originalSmsTimestamp, bodyHash: evidence.bodyHash, ...(evidence.metadata || {}) }
        });
      }
      state.staging[externalSourceId] = { ...evidence, status: 'resolved', resolution, transactionId: transactionId || null, resolvedAt: new Date().toISOString() };
      state.processedEvidence = state.processedEvidence || {};
      state.processedEvidence[externalSourceId] = {
        ...(state.processedEvidence[externalSourceId] || {}),
        status: 'resolved',
        transactionId: transactionId || null,
        householdId: context?.householdId || evidence.householdId || null,
        processedAt: state.processedEvidence[externalSourceId]?.processedAt || new Date().toISOString()
      };
      return { status: 'resolved', evidenceId: externalSourceId, transactionId: transactionId || null };
    });
  }

  private hasMatchableTransactionData(evidence: FinancialEvidence) {
    const normalized = evidence.normalized;
    return Boolean(
      normalized &&
      typeof normalized.merchant === 'string' &&
      normalized.merchant.trim() &&
      typeof normalized.date === 'string' &&
      normalized.date.trim() &&
      typeof normalized.amount === 'number' &&
      Number.isFinite(normalized.amount)
    );
  }

  private async handleTransaction(evidence: FinancialEvidence, context: any = null) {
    const transactions = (await this.dataService.getTransactions()).filter(
      (transaction: any) => !context || transaction.householdId === context.householdId
    );
    const normalized = evidence.normalized!;

    const matches = findReceiptMatches(
      {
        merchant: normalized.merchant!,
        purchaseDate: normalized.date!,
        total: normalized.amount!
      },
      transactions
    );

    const highMatch = matches.find(match => match.confidence === 'high');

    if (highMatch) {
      await this.dataService.linkEvidence(highMatch.id, {
        sourceType: evidence.sourceType || 'android_sms',
        externalSourceId: evidence.externalSourceId,
        metadata: {
          sender: evidence.sender,
          originalSmsTimestamp: evidence.originalSmsTimestamp,
          bodyHash: evidence.bodyHash,
          ...(evidence.metadata || {})
        }
      });

      return {
        status: 'linked_automatically',
        transactionId: highMatch.id,
        householdId: context?.householdId || highMatch.householdId || null
      };
    }

    return this.handleAmbiguous(evidence, context);
  }

  private async handleReceiptLink(evidence: FinancialEvidence, context: any = null) {
    await this.syncRepository.update((state: any) => {
      state.staging = state.staging || {};
      state.staging[evidence.externalSourceId] = {
        ...evidence,
        householdId: context?.householdId || null,
        status: 'pending_fetch',
        sourceType: evidence.sourceType || 'android_sms',
        stagedAt: new Date().toISOString()
      };
    });
    return { status: 'staged_for_fetch' };
  }

  private async handleAmbiguous(evidence: FinancialEvidence, context: any = null) {
    await this.syncRepository.update((state: any) => {
      state.staging = state.staging || {};
      state.staging[evidence.externalSourceId] = {
        ...evidence,
        householdId: context?.householdId || null,
        status: 'review_required',
        sourceType: evidence.sourceType || 'android_sms',
        stagedAt: new Date().toISOString()
      };
    });
    return { status: 'review_required' };
  }
}
