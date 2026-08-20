import { findReceiptMatches } from '../src/shared/receiptMatching.js';
import type { BackendFinanceDataService } from './financeDataService.ts';

export type FinancialEvidence = {
  externalSourceId: string;
  sender: string;
  originalSmsTimestamp: string;
  candidateType: 'TRANSACTION' | 'RECEIPT_LINK' | 'AMBIGUOUS';
  normalized?: {
    merchant: string;
    date: string;
    amount: number;
    currency?: string;
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

    // 1. Idempotency Check (in Sync Repository)
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

    // 2. Logic Branching
    if (evidence.candidateType === 'TRANSACTION' && evidence.normalized) {
      result = await this.handleTransaction(evidence);
    } else if (evidence.candidateType === 'RECEIPT_LINK') {
      result = await this.handleReceiptLink(evidence);
    } else {
      result = await this.handleAmbiguous(evidence);
    }

    // 3. Mark as Processed (in Sync Repository)
    await this.syncRepository.update(async (state: any) => {
      state.processedEvidence = state.processedEvidence || {};
      state.processedEvidence[evidence.externalSourceId] = {
        status: result.status,
        processedAt: new Date().toISOString()
      };
    });

    return result;
  }

  private async handleTransaction(evidence: FinancialEvidence) {
    const transactions = await this.dataService.getTransactions();

    const matches = findReceiptMatches(
      {
        merchant: evidence.normalized!.merchant,
        purchaseDate: evidence.normalized!.date,
        total: evidence.normalized!.amount
      },
      transactions
    );

    const highMatch = matches.find(m => m.confidence === 'high');

    if (highMatch) {
      await this.dataService.linkEvidence(highMatch.id, {
        sourceType: 'android_sms',
        externalSourceId: evidence.externalSourceId,
        metadata: {
          sender: evidence.sender,
          originalSmsTimestamp: evidence.originalSmsTimestamp,
          bodyHash: evidence.bodyHash
        }
      });

      return {
        status: 'linked_automatically',
        transactionId: highMatch.id
      };
    }

    // No high match found, stage for review
    return this.handleAmbiguous(evidence);
  }

  private async handleReceiptLink(evidence: FinancialEvidence) {
    await this.syncRepository.update((state: any) => {
      state.staging[evidence.externalSourceId] = {
        ...evidence,
        status: 'pending_fetch',
        sourceType: 'android_sms',
        stagedAt: new Date().toISOString()
      };
    });
    return { status: 'staged_for_fetch' };
  }

  private async handleAmbiguous(evidence: FinancialEvidence) {
    await this.syncRepository.update((state: any) => {
      state.staging[evidence.externalSourceId] = {
        ...evidence,
        status: 'review_required',
        sourceType: 'android_sms',
        stagedAt: new Date().toISOString()
      };
    });
    return { status: 'review_required' };
  }
}
