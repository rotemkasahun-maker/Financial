import { transactions, receipts, recurring } from '../data/mockData.js';
import { importSources, expectedDocuments, importRuns, importIssues, reminderTasks } from '../data/ingestionMockData.js';

export class FinanceDataService {
  async getTransactions() { throw new Error('Not implemented'); }
  async getReceipts() { throw new Error('Not implemented'); }
  async saveReceipt() { throw new Error('Not implemented'); }
}

export class MockFinanceDataService extends FinanceDataService {
  constructor() { super(); this.transactions = structuredClone(transactions); this.receipts = structuredClone(receipts); this.importSources=structuredClone(importSources); this.expectedDocuments=structuredClone(expectedDocuments); this.importRuns=structuredClone(importRuns); this.importIssues=structuredClone(importIssues); this.reminderTasks=structuredClone(reminderTasks); }
  async getTransactions() { return structuredClone(this.transactions); }
  async getReceipts() { return structuredClone(this.receipts); }
  async getRecurring() { return structuredClone(recurring); }
  async getIngestionState() { return structuredClone({sources:this.importSources,expectedDocuments:this.expectedDocuments,importRuns:this.importRuns,issues:this.importIssues,reminders:this.reminderTasks}); }
  async resolveIssue(issueId) { this.importIssues=this.importIssues.map(i=>i.id===issueId?{...i,status:'resolved'}:i); return this.getIngestionState(); }
  async receiveExpectedDocument(documentId, fileName) { const doc=this.expectedDocuments.find(d=>d.id===documentId); if(!doc) throw new Error('Expected document not found'); doc.received=true; doc.fileId=`demo:${fileName}`; doc.reminderState='completed'; this.reminderTasks=this.reminderTasks.map(t=>t.expectedDocumentId===documentId?{...t,status:'completed'}:t); this.importIssues=this.importIssues.map(i=>i.expectedDocumentId===documentId?{...i,status:'resolved'}:i); const source=this.importSources.find(s=>s.id===doc.sourceId); if(source){source.status='up_to_date';source.lastSuccess=new Date().toISOString();source.pendingIssues=Math.max(0,source.pendingIssues-1)} return this.getIngestionState(); }
  async saveReceipt(receipt, linkedId) {
    const saved = {...receipt, id: crypto.randomUUID(), linkedTransactionId: linkedId || null, reviewStatus:'approved'};
    this.receipts.unshift(saved);
    if (linkedId) this.transactions = this.transactions.map(t => t.id === linkedId ? {...t, receiptId:saved.id} : t);
    else this.transactions.unshift({id:crypto.randomUUID(), date:saved.purchaseDate, merchant:saved.merchant, description:'נוצר מקבלה לאחר בדיקה', amount:Number(saved.total), currency:'ILS', direction:'debit', financialType:'expense', category:saved.category || 'כללי', source:'קבלה', sourceType:saved.sourceMetadata?.sourceType || 'manual_upload', sourceAccount:saved.sourceMetadata?.userId || null, householdId:saved.sourceMetadata?.householdId, userId:saved.sourceMetadata?.userId, deviceId:saved.sourceMetadata?.deviceId, importedAt:saved.sourceMetadata?.importedAt, receiptId:saved.id, reimbursementStatus:'none'});
    return structuredClone(saved);
  }
}

/** Future adapter: implement these methods against the approved Google Apps Script/API endpoint. */
export class GoogleSheetsFinanceDataService extends FinanceDataService {
  constructor({ endpoint, sheetId }) { super(); this.endpoint = endpoint; this.sheetId = sheetId; }
  async getTransactions() { throw new Error('Google Sheets אינו מחובר עדיין'); }
  async getReceipts() { throw new Error('Google Sheets אינו מחובר עדיין'); }
  async saveReceipt() { throw new Error('שמירה חיצונית דורשת אישור וחיבור'); }
}

export const dataService = new MockFinanceDataService();
