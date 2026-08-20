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

  async processEvidence(evidence: FinancialEvidence) {
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
      result = await this.handleTransaction(evidence);
    } else if (evidence.candidateType === 'RECEIPT_LINK') {
      result = await this.handleReceiptLink(evidence);
    } else {
      // Partial transaction evidence is staged instead of being passed
      // into matching with missing merchant/date fields.
      result = await this.handleAmbiguous(evidence);
    }

    await this.syncRepository.update(async (state: any) => {
      state.processedEvidence = state.processedEvidence || {};
      state.processedEvidence[evidence.externalSourceId] = {
        status: result.status,
        processedAt: new Date().toISOString()
      };
    });

    return result;
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

  private async handleTransaction(evidence: FinancialEvidence) {
    const transactions = await this.dataService.getTransactions();
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
        transactionId: highMatch.id
      };
    }

    return this.handleAmbiguous(evidence);
  }

  private async handleReceiptLink(evidence: FinancialEvidence) {
    await this.syncRepository.update((state: any) => {
      state.staging = state.staging || {};
      state.staging[evidence.externalSourceId] = {
        ...evidence,
        status: 'pending_fetch',
        sourceType: evidence.sourceType || 'android_sms',
        stagedAt: new Date().toISOString()
      };
    });
    return { status: 'staged_for_fetch' };
  }

  private async handleAmbiguous(evidence: FinancialEvidence) {
    await this.syncRepository.update((state: any) => {
      state.staging = state.staging || {};
      state.staging[evidence.externalSourceId] = {
        ...evidence,
        status: 'review_required',
        sourceType: evidence.sourceType || 'android_sms',
        stagedAt: new Date().toISOString()
      };
    });
    return { status: 'review_required' };
  }
}
