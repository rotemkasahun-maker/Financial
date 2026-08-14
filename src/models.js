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
