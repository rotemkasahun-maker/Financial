import { daysBetween, merchantSimilarity } from './finance.js';

export const ReconciliationRelationship=Object.freeze({SAME_EVENT:'same_event',INTERNAL_TRANSFER:'internal_transfer',REIMBURSEMENT:'reimbursement',DUPLICATE:'duplicate_representation'});

export const createSourceRecord=data=>({id:crypto.randomUUID(),sourceId:'',externalTransactionId:null,occurredAt:'',amount:0,currency:'ILS',direction:'unknown',counterparty:'',reference:null,rawStatus:'booked',canonicalEventId:null,...data});
export const createCanonicalEvent=data=>({id:crypto.randomUUID(),date:'',amount:0,currency:'ILS',financialType:'unclassified',category:null,countInTotals:false,linkedSourceRecordIds:[],...data});

const opposite=(a,b)=>a.direction!==b.direction&&['incoming','credit'].includes(a.direction)!==['incoming','credit'].includes(b.direction);
export function scoreSourceRecordMatch(a,b){
  if(a.sourceId===b.sourceId&&a.externalTransactionId&&a.externalTransactionId===b.externalTransactionId)return 1;
  const amount=Math.abs(Number(a.amount)-Number(b.amount))<.01?0.55:0;
  const date=daysBetween(a.occurredAt,b.occurredAt)<=1?0.2:0;
  const party=merchantSimilarity(a.counterparty,b.counterparty)*.15;
  const reference=a.reference&&b.reference&&a.reference===b.reference?.toString()?0.1:0;
  return Math.min(1,amount+date+party+reference);
}
export function proposeReconciliation(a,b,{ownedSourceIds=[]}={}){
  const score=scoreSourceRecordMatch(a,b);
  const wallets=['bit_wallet','paybox_wallet'];
  const walletBankPair=(wallets.includes(a.sourceType)&&['bank_import','credit_card_import'].includes(b.sourceType))||(wallets.includes(b.sourceType)&&['bank_import','credit_card_import'].includes(a.sourceType));
  const internal=walletBankPair&&opposite(a,b)&&(ownedSourceIds.includes(a.sourceId)||ownedSourceIds.includes(b.sourceId));
  return {score,confidence:score>=.85?'high':score>=.6?'medium':'low',relationship:internal?ReconciliationRelationship.INTERNAL_TRANSFER:ReconciliationRelationship.SAME_EVENT,requiresReview:score<.85};
}

export function classifyWalletMovement(record,reconciliation){
  if(reconciliation?.relationship===ReconciliationRelationship.INTERNAL_TRANSFER)return {financialType:'transfer',countInTotals:false,reason:'movement_between_household_sources'};
  if(record.direction==='incoming')return {financialType:'unclassified',countInTotals:false,requiresReview:true,candidates:['reimbursement','shared_purchase_repayment','gift','transfer','income']};
  return {financialType:'unclassified',countInTotals:false,requiresReview:true,candidates:['expense','transfer','wallet_funding','duplicate_representation']};
}
