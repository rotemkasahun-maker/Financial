import { findReceiptMatches } from './finance.js';

/** Shared source-neutral pipeline contract for Web, future Android, Gmail, SMS and CSV connectors. */
export class ImportPipeline {
  constructor({ extractor, dataService }) { this.extractor=extractor; this.dataService=dataService; }
  async prepare(envelope, file) {
    const extracted=await this.extractor.extract(file ?? envelope.payload);
    const contentHash=file?.arrayBuffer?await localContentHash(file):null;
    const normalized={...extracted, merchant:extracted.merchant.trim(), total:Number(extracted.total), sourceMetadata:{householdId:envelope.householdId,userId:envelope.userId,deviceId:envelope.deviceId,sourceType:envelope.sourceType,sourceAccount:envelope.sourceAccount,externalSourceId:envelope.externalSourceId,contentHash,metadata:envelope.metadata,importedAt:envelope.importedAt}};
    const matches=findReceiptMatches(normalized,await this.dataService.getTransactions());
    return {envelope,normalized,matches,decision:matches[0]?.confidence==='high'?'suggest_link':'manual_review'};
  }
  async commit(prepared, approvedLinkedTransactionId=null) {
    // A document is saved as a new expense only after explicit review and approval.
    return this.dataService.saveReceipt(prepared.normalized,approvedLinkedTransactionId);
  }
}

async function localContentHash(file){const bytes=new Uint8Array(await file.arrayBuffer());let hash=2166136261;for(const byte of bytes){hash^=byte;hash=Math.imul(hash,16777619)}return `fnv1a-${(hash>>>0).toString(16).padStart(8,'0')}-${bytes.length}`}
