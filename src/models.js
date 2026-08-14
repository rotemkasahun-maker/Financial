import { generateId } from './utils/id.js';
/** Canonical models. Dates are ISO strings, currency defaults to ILS. */
export const FinancialType = Object.freeze({
  EXPENSE: 'expense', INCOME: 'income', FAMILY_SUPPORT: 'family_support', GOVERNMENT_BENEFIT: 'government_benefit', BANK_CREDIT: 'bank_credit', GIFT: 'gift', REIMBURSEMENT: 'reimbursement', TRANSFER: 'transfer', REFUND: 'refund',
  CREDIT_CARD_SETTLEMENT:'credit_card_settlement', SAVINGS_TRANSFER: 'savings_transfer', INVESTMENT_TRANSFER: 'investment_transfer', CAPITAL_ALLOCATION: 'capital_allocation'
});

export const createReceipt = (data) => ({
  id: generateId('receipt'), fileUrl: '', fileType: 'image', merchant: '', purchaseDate: '',
  total: 0, currency: 'ILS', paymentMethod: '', extractionStatus: 'pending',
  reviewStatus: 'needs_review', linkedTransactionId: null, items: [], createdAt: new Date().toISOString(),
  householdId: 'demo-household', userId: 'demo-member-a', deviceId: 'web-demo',
  sourceType: 'manual_upload', sourceAccount: null, externalSourceId: null, importedAt: new Date().toISOString(), ...data
});

export const createImportEnvelope = ({ sourceType, payload, userId, deviceId, sourceAccount=null, externalSourceId=null }) => ({
  id: generateId('import'), householdId:'demo-household', userId, deviceId, sourceType,
  sourceAccount, externalSourceId, importedAt:new Date().toISOString(), status:'received', payload
});

export const createExpectedDocument = data => ({id:generateId('document'),documentType:'',frequency:'monthly',period:'',expectedDate:'',owner:'',received:false,fileId:null,extractedData:null,reminderState:'upcoming',...data});
export const createImportIssue = data => ({id:generateId('issue'),type:'unknown',severity:'warning',title:'',description:'',sourceId:null,status:'open',createdAt:new Date().toISOString(),...data});
export const createReminderTask = data => ({id:generateId('reminder'),type:'manual_followup',title:'',period:null,dueDate:null,status:'upcoming',notifyAndroidLater:true,...data});
export const createCanonicalFinancialEvent = data => {const event={id:generateId('event'),date:'',amount:0,currency:'ILS',financialType:'unclassified',countInTotals:false,linkedSourceRecordIds:[],createdAt:new Date().toISOString(),...data};if(['transfer','credit_card_settlement','savings_transfer','investment_transfer','capital_allocation'].includes(event.financialType))event.countInTotals=false;return event};
export const createFinancialSourceRecord = data => ({id:generateId('source-record'),sourceId:'',sourceType:'',externalTransactionId:null,occurredAt:'',amount:0,currency:'ILS',direction:'unknown',canonicalEventId:null,importedAt:new Date().toISOString(),...data});
