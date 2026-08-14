/** Canonical models. Dates are ISO strings, currency defaults to ILS. */
export const FinancialType = Object.freeze({
  EXPENSE: 'expense', INCOME: 'income', REIMBURSEMENT: 'reimbursement', TRANSFER: 'transfer', REFUND: 'refund'
});

export const createReceipt = (data) => ({
  id: crypto.randomUUID(), fileUrl: '', fileType: 'image', merchant: '', purchaseDate: '',
  total: 0, currency: 'ILS', paymentMethod: '', extractionStatus: 'pending',
  reviewStatus: 'needs_review', linkedTransactionId: null, items: [], createdAt: new Date().toISOString(),
  householdId: 'demo-household', userId: 'demo-member-a', deviceId: 'web-demo',
  sourceType: 'manual_upload', sourceAccount: null, externalSourceId: null, importedAt: new Date().toISOString(), ...data
});

export const createImportEnvelope = ({ sourceType, payload, userId, deviceId, sourceAccount=null, externalSourceId=null }) => ({
  id: crypto.randomUUID(), householdId:'demo-household', userId, deviceId, sourceType,
  sourceAccount, externalSourceId, importedAt:new Date().toISOString(), status:'received', payload
});

export const createExpectedDocument = data => ({id:crypto.randomUUID(),documentType:'',frequency:'monthly',period:'',expectedDate:'',owner:'',received:false,fileId:null,extractedData:null,reminderState:'upcoming',...data});
export const createImportIssue = data => ({id:crypto.randomUUID(),type:'unknown',severity:'warning',title:'',description:'',sourceId:null,status:'open',createdAt:new Date().toISOString(),...data});
export const createReminderTask = data => ({id:crypto.randomUUID(),type:'manual_followup',title:'',period:null,dueDate:null,status:'upcoming',notifyAndroidLater:true,...data});
export const createCanonicalFinancialEvent = data => ({id:crypto.randomUUID(),date:'',amount:0,currency:'ILS',financialType:'unclassified',countInTotals:false,linkedSourceRecordIds:[],createdAt:new Date().toISOString(),...data});
export const createFinancialSourceRecord = data => ({id:crypto.randomUUID(),sourceId:'',sourceType:'',externalTransactionId:null,occurredAt:'',amount:0,currency:'ILS',direction:'unknown',canonicalEventId:null,importedAt:new Date().toISOString(),...data});
