import { daysBetween, merchantSimilarity } from './finance.js';

const incoming=direction=>['credit','incoming'].includes(direction);
const sourceKind=record=>record.sourceType||record.sourceMetadata?.sourceType||'';

export function reconcileBeforeReview(row,{historicalTransactions=[],sourceRecords=[],receipts=[],gmailRecords=[],smsRecords=[],walletRecords=[]}={}){
  const candidates=[
    ...historicalTransactions.map(record=>({...record,evidenceType:'historical'})),
    ...sourceRecords.map(record=>({...record,date:record.occurredAt,merchant:record.counterparty,evidenceType:'source'})),
    ...receipts.map(record=>({...record,date:record.purchaseDate,amount:record.total,merchant:record.merchant,financialType:'expense',category:record.category||'קניות',evidenceType:'receipt'})),
    ...gmailRecords.map(record=>({...record,evidenceType:'gmail'})),
    ...smsRecords.map(record=>({...record,evidenceType:'sms'})),
    ...walletRecords.map(record=>({...record,evidenceType:sourceKind(record)||'wallet'}))
  ];
  const ranked=candidates.map(candidate=>scoreEvidence(row,candidate)).filter(Boolean).sort((a,b)=>b.score-a.score);
  const best=ranked[0];if(!best)return null;
  const confidence=best.score>=.86?'high':best.score>=.64?'medium':'low';if(confidence==='low')return null;
  return {confidence,score:best.score,financialType:best.candidate.financialType||'unknown',category:best.candidate.category||null,matchingRecordId:best.candidate.id||null,evidenceType:best.candidate.evidenceType,explanation:explanationFor(best.candidate.evidenceType,confidence),requiresReview:confidence!=='high'};
}

function scoreEvidence(row,candidate){
  if(!row.date||!candidate.date||Number(row.amount)!==Number(candidate.amount))return null;
  if(incoming(row.direction)!==incoming(candidate.direction)&&candidate.evidenceType!=='receipt')return null;
  const dayGap=daysBetween(row.date,candidate.date);if(dayGap>3)return null;
  const exactReference=Boolean(row.reference&&candidate.reference&&String(row.reference)===String(candidate.reference));
  const merchant=merchantSimilarity(row.merchant||row.description,candidate.merchant||candidate.description||candidate.counterparty);
  const sourceDiversity=Number(sourceKind(row)!==sourceKind(candidate))*.1;
  const score=.5+(dayGap===0?.2:dayGap<=1?.13:.06)+merchant*.2+(exactReference?.1:0)+sourceDiversity;
  return {candidate,score:Math.min(1,score)};
}

const explanationFor=(type,confidence)=>confidence==='high'?({receipt:'הותאם לקבלה קיימת',gmail:'הותאם לרשומה מ־Gmail',sms:'הותאם לרשומת SMS',historical:'סווג לפי עסקה דומה מהעבר',source:'אותו אירוע זוהה במקור נוסף',bit_wallet:'הותאם לתנועת Bit',paybox_wallet:'הותאם לתנועת PayBox'}[type]||'זוהה אירוע תואם במקור נוסף'):'מצאנו התאמה אפשרית — אישור אחד יספיק';

export function rerunDeferredReconciliation(transaction,evidence){const result=reconcileBeforeReview(transaction,evidence);return result?.confidence==='high'?{...transaction,financialType:result.financialType,category:result.category,reviewStatus:'resolved_automatically',classificationExplanation:result.explanation,countInTotals:!['unknown','transfer'].includes(result.financialType)}:transaction}
