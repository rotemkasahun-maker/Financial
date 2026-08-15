const normalize=value=>String(value??'').toLowerCase().replace(/[\u200e\u200f]/g,'').replace(/[׳״"'.,()_\-]/g,' ').replace(/\s+/g,' ').trim();
const tokens=value=>new Set(normalize(value).split(' ').filter(token=>token.length>2&&!/^\d+$/.test(token)));
const similarity=(left,right)=>{const a=tokens(left),b=tokens(right);if(!a.size||!b.size)return 0;const common=[...a].filter(token=>b.has(token)).length;if(common<2)return 0;return common/Math.min(a.size,b.size)};
const daysApart=(left,right)=>Math.abs((new Date(left)-new Date(right))/86400000);

export function reconcileIncomeDocument(document,bankTransactions=[]){
  const net=Number(document?.netAmount),date=document?.paymentDate||document?.periodEnd||document?.documentDate;
  if(!Number.isFinite(net)||net<=0||!date)return null;
  const candidates=bankTransactions.filter(row=>['credit','incoming'].includes(row.direction)&&Math.abs(Number(row.amount)-net)<=Math.max(1,net*.005)&&daysApart(row.date,date)<=10).map(row=>({row,sourceScore:similarity(document.sourceName||document.issuer,row.description||row.merchant)})).filter(match=>match.sourceScore>=.5).sort((a,b)=>b.sourceScore-a.sourceScore);
  if(candidates.length!==1)return null;
  const match=candidates[0];
  return {confidence:'high',relationship:'income_document_evidence',financialType:document.financialType||'income',canonicalCashRecordId:match.row.id||null,documentRecordId:document.id||null,linkedSourceRecordIds:[match.row.id,document.id].filter(Boolean),bankRecordCountInTotals:true,documentCountInTotals:false,explanation:'מסמך ההכנסה הותאם לזיכוי הבנקאי ואינו יוצר הכנסה נוספת'};
}
