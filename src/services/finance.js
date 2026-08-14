const clean = (s='') => s.toLowerCase().replace(/[\s\-״"']/g,'');
export const merchantSimilarity = (a,b) => {
  const x=clean(a), y=clean(b); if (!x || !y) return 0; if (x.includes(y)||y.includes(x)) return 1;
  const grams = s => new Set([...Array(Math.max(0,s.length-1))].map((_,i)=>s.slice(i,i+2)));
  const gx=grams(x), gy=grams(y), common=[...gx].filter(v=>gy.has(v)).length;
  return common / Math.max(gx.size, gy.size, 1);
};
export const daysBetween = (a,b) => Math.abs((new Date(a)-new Date(b))/86400000);
export function findReceiptMatches(receipt, transactions) {
  return transactions.filter(t=>t.financialType==='expense').map(t=>{
    const amountDiff=Math.abs(Number(receipt.total)-t.amount);
    const amountScore=amountDiff<0.01?1:amountDiff<=2?.8:0;
    const dateScore=daysBetween(receipt.purchaseDate,t.date)===0?1:daysBetween(receipt.purchaseDate,t.date)<=2?.65:0;
    const merchantScore=merchantSimilarity(receipt.merchant,t.merchant);
    const score=amountScore*.5+dateScore*.25+merchantScore*.25;
    return {...t, matchScore:score, confidence:score>=.85?'high':score>=.58?'medium':'low'};
  }).filter(t=>t.confidence!=='low').sort((a,b)=>b.matchScore-a.matchScore);
}
export function calculateSummary(transactions) {
  const expenses=transactions.filter(t=>t.financialType==='expense').reduce((s,t)=>s+t.amount,0);
  const income=transactions.filter(t=>t.financialType==='income').reduce((s,t)=>s+t.amount,0);
  const reimbursements=transactions.filter(t=>['reimbursement','refund'].includes(t.financialType)).reduce((s,t)=>s+t.amount,0);
  return {expenses,income,reimbursements,netExpenses:expenses-reimbursements,balance:income-expenses+reimbursements};
}
