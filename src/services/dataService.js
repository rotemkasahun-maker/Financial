import { transactions, receipts, recurring } from '../data/mockData.js';

export class FinanceDataService {
  async getTransactions() { throw new Error('Not implemented'); }
  async getReceipts() { throw new Error('Not implemented'); }
  async saveReceipt() { throw new Error('Not implemented'); }
}

export class MockFinanceDataService extends FinanceDataService {
  constructor() { super(); this.transactions = structuredClone(transactions); this.receipts = structuredClone(receipts); }
  async getTransactions() { return structuredClone(this.transactions); }
  async getReceipts() { return structuredClone(this.receipts); }
  async getRecurring() { return structuredClone(recurring); }
  async saveReceipt(receipt, linkedId) {
    const saved = {...receipt, id: crypto.randomUUID(), linkedTransactionId: linkedId || null, reviewStatus:'approved'};
    this.receipts.unshift(saved);
    if (linkedId) this.transactions = this.transactions.map(t => t.id === linkedId ? {...t, receiptId:saved.id} : t);
    else this.transactions.unshift({id:crypto.randomUUID(), date:saved.purchaseDate, merchant:saved.merchant, description:'נוצר מקבלה', amount:Number(saved.total), currency:'ILS', direction:'debit', financialType:'expense', category:saved.category || 'כללי', source:'קבלה', receiptId:saved.id});
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
