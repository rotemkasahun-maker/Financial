import { daysBetween, merchantSimilarity } from './finance.js';

const incoming=direction=>['credit','incoming'].includes(direction);
const sourceKind=record=>record.sourceType||record.sourceMetadata?.sourceType||'';

export function reconcileBeforeReview(row,{historicalTransactions=[],sourceRecords=[],receipts=[],gmailRecords=[],smsRecords=[],walletRecords=[],cardTransactions=[]}={}){
  const cardSettlement=reconcileCardSettlement(row,cardTransactions);if(cardSettlement)return cardSettlement;
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

export function extractCardSuffix(value){const text=String(value??'');return text.match(/(?:ויזה|אשראי|כרטיס|visa).*?(\d{4})(?!\d)/i)?.[1]||text.match(/(?:^|\D)(\d{4})(?:\D|$)/)?.[1]||null}
const cardDirectionSign=record=>incoming(record.direction)?1:-1;
export function calculateCardCycleNet(records){return Math.round(records.reduce((sum,record)=>sum+cardDirectionSign(record)*Number(record.amount||0),0)*100)/100}

export function reconcileCardSettlement(bankRow,cardTransactions=[],{windowDays=45,tolerance=.01}={}){
  const text=`${bankRow.description||''} ${bankRow.merchant||''}`,looksLikeSettlement=/(?:חיוב|זיכוי|התחשבנות|תשלום).*(?:כרטיס|ויזה|אשראי)|(?:כרטיס|ויזה|אשראי).*(?:חיוב|זיכוי|התחשבנות|תשלום)/i.test(text);if(!looksLikeSettlement)return null;
  const suffix=extractCardSuffix(text),bankDate=new Date(bankRow.date),eligible=cardTransactions.filter(item=>{const itemSuffix=item.cardSuffix||extractCardSuffix(item.sourceAccount||item.cardNumber||'');const dayGap=(bankDate-new Date(item.date))/86400000;return (!suffix||itemSuffix===suffix)&&dayGap>=-3&&dayGap<=windowDays});
  if(!eligible.length)return {confidence:'low',financialType:'unknown',category:null,requiresReview:true,reviewReason:'התחשבנות כרטיס אפשרית — פירוט הכרטיס עדיין חסר',explanation:'נבדוק שוב כשפירוט הכרטיס יגיע',cardSuffix:suffix};
  const grouped=eligible.reduce((result,item)=>{const key=item.statementCycle||item.cycleId||`${item.cardSuffix||extractCardSuffix(item.sourceAccount)||suffix||'card'}:${String(bankRow.date).slice(0,7)}`;(result[key]||=[]).push(item);return result},{}),groups=Object.values(grouped);
  const matches=groups.map(items=>{const net=calculateCardCycleNet(items),expectedDirection=net>=0?'credit':'debit',amountDifference=Math.abs(Math.abs(net)-Number(bankRow.amount));return {items,net,amountDifference,directionMatches:incoming(bankRow.direction)===(expectedDirection==='credit')}}).filter(match=>match.directionMatches&&match.amountDifference<=tolerance);
  if(matches.length!==1)return {confidence:matches.length>1?'medium':'low',financialType:'unknown',category:null,requiresReview:true,reviewReason:matches.length>1?'נמצאו כמה מחזורי כרטיס אפשריים':'סכום התחשבנות הכרטיס אינו תואם לפירוט',explanation:suffix?`נראה שזו התחשבנות של כרטיס ${suffix}`:'נראה שזו התחשבנות כרטיס',cardSuffix:suffix};
  const match=matches[0];return {confidence:'high',score:1,financialType:'credit_card_settlement',category:'התחשבנות כרטיס אשראי',countInTotals:false,requiresReview:false,matchingRecordIds:match.items.map(item=>item.id),cardSuffix:suffix,net:match.net,explanation:suffix?`הותאם להתחשבנות כרטיס ויזה ${suffix}`:'הסכום כבר מורכב מעסקאות הכרטיס ולכן לא נספר שוב'};
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

const hasTotalsImpact=financialType=>!['unknown','transfer','savings_transfer','investment_transfer','capital_allocation','credit_card_settlement'].includes(financialType);
export function rerunDeferredReconciliation(transaction,evidence){const result=reconcileBeforeReview(transaction,evidence);return result?.confidence==='high'?{...transaction,financialType:result.financialType,category:result.category,reviewStatus:'resolved_automatically',reviewReason:null,classificationConfidence:'high',classificationExplanation:result.explanation,countInTotals:hasTotalsImpact(result.financialType)}:transaction}
