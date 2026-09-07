const normalize = value => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

export function resolveDocumentRequirement(transaction, householdRules = {}) {
  if (['receipt', 'invoice', 'statement', 'none', 'unknown'].includes(transaction?.documentRequirement)) return transaction.documentRequirement;
  const semantic = normalize(transaction?.financialType);
  if (['transfer', 'internal_transfer', 'savings', 'investment', 'loan_repayment', 'bank_fee', 'fee'].includes(semantic)) return 'none';
  if (transaction?.isTransfer || transaction?.isInternalMovement || transaction?.countInTotals === false) return 'none';
  const category = normalize(`${transaction?.category || ''} ${transaction?.subcategory || ''}`);
  if (/(rent|שכר דירה|bank fee|עמלת בנק|דמי כרטיס|savings|חיסכון|investment|השקעה|loan|הלוואה)/u.test(category)) return 'none';
  const ruleKey = normalize(transaction?.provider || transaction?.source || transaction?.sourceType);
  if (householdRules[ruleKey]) return householdRules[ruleKey];
  if (['expense', 'refund', 'reimbursement', 'credit'].includes(semantic)) return semantic === 'expense' ? 'receipt' : 'none';
  return 'unknown';
}
