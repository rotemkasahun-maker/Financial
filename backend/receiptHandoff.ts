/**
 * Boundary between Gmail staging and the existing client-side receipt pipeline.
 * Phase 1 intentionally exposes evidence only; it never writes the financial ledger.
 */
export class ReceiptEvidenceHandoff {
  constructor({repository}){this.repository=repository}
  async listPending(){const state=await this.repository.read();return Object.values(state.staging)}
  async acknowledge(messageId,{documentFingerprints=[]}={}){return this.repository.update(state=>{const evidence=state.staging[messageId];if(!evidence)return {acknowledged:false};for(const fingerprint of documentFingerprints)state.processedDocuments[fingerprint]={status:'handed_off',messageId,processedAt:new Date().toISOString()};delete state.staging[messageId];return {acknowledged:true}})}
}
