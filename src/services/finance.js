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
  const familySupport=transactions.filter(t=>t.financialType==='family_support').reduce((s,t)=>s+t.amount,0);
  const gifts=transactions.filter(t=>t.financialType==='gift').reduce((s,t)=>s+t.amount,0);
  const reimbursements=transactions.filter(t=>['reimbursement','refund'].includes(t.financialType)).reduce((s,t)=>s+t.amount,0);
  const netExpenses=expenses-reimbursements;
  const savingsTransfers=sumAllocations(transactions,'savings');
  const investmentTransfers=sumAllocations(transactions,'investment');
  const otherCapitalAllocations=sumAllocations(transactions,'capital');
  const totalCapitalAllocation=savingsTransfers+investmentTransfers+otherCapitalAllocations;
  const otherIncomingFunds=familySupport+gifts;
  const cashInflows=income+otherIncomingFunds;
  const surplusBeforeAllocations=cashInflows-netExpenses;
  const cashFlowAfterAllocations=surplusBeforeAllocations-totalCapitalAllocation;
  return {expenses,income,familySupport,gifts,otherIncomingFunds,cashInflows,reimbursements,netExpenses,savingsTransfers,investmentTransfers,otherCapitalAllocations,totalCapitalAllocation,surplusBeforeAllocations,cashFlowAfterAllocations,economicSurplus:surplusBeforeAllocations,currentAccountCashRemaining:cashFlowAfterAllocations,operatingSpendingRate:rate(netExpenses,cashInflows),savingsRate:rate(savingsTransfers,cashInflows),investmentRate:rate(investmentTransfers,cashInflows),capitalAllocationRate:rate(totalCapitalAllocation,cashInflows),balance:cashFlowAfterAllocations};
}

const allocationKind=record=>record.allocationType||(record.financialType==='savings_transfer'?'savings':record.financialType==='investment_transfer'?'investment':record.financialType==='capital_allocation'?'capital':null);
const sumAllocations=(records,kind)=>records.filter(record=>allocationKind(record)===kind&&record.direction!=='credit').reduce((sum,record)=>sum+Number(record.amount||0),0);
const rate=(amount,income)=>income>0?amount/income:0;
const sameMonth=(date,month)=>String(date||'').slice(0,7)===month;

export function calculateMonthlyCashFlow(transactions,{month}={}) {
  const selected=month?transactions.filter(transaction=>sameMonth(transaction.date,month)):transactions;
  return calculateSummary(selected);
}

export function calculateMonthEndForecast(transactions,recurring,{asOf=new Date().toISOString().slice(0,10),month=String(asOf).slice(0,7)}={}) {
  const actual=calculateMonthlyCashFlow(transactions,{month});
  const expected=recurring.filter(item=>item.status==='active'&&sameMonth(item.next,month)&&item.next>=asOf&&!item.posted&&!(item.linkedTransactionId&&transactions.some(transaction=>transaction.id===item.linkedTransactionId)));
  const expectedOperatingExpenses=expected.filter(item=>!allocationKind(item)).reduce((sum,item)=>sum+Number(item.amount||0),0);
  const expectedSavingsTransfers=sumAllocations(expected,'savings');
  const expectedInvestmentTransfers=sumAllocations(expected,'investment');
  const expectedOtherCapitalAllocations=sumAllocations(expected,'capital');
  const expectedCapitalAllocation=expectedSavingsTransfers+expectedInvestmentTransfers+expectedOtherCapitalAllocations;
  return {...actual,expectedOperatingExpenses,expectedSavingsTransfers,expectedInvestmentTransfers,expectedOtherCapitalAllocations,expectedCapitalAllocation,projectedOperatingExpenses:actual.netExpenses+expectedOperatingExpenses,projectedCapitalAllocation:actual.totalCapitalAllocation+expectedCapitalAllocation,projectedCashFlow:actual.cashFlowAfterAllocations-expectedOperatingExpenses-expectedCapitalAllocation,projectedAvailableToSpend:actual.cashFlowAfterAllocations-expectedOperatingExpenses-expectedCapitalAllocation};
}
