import { createClassificationRule } from './classificationRules.js';
import { generateId } from '../utils/id.js';

export const HistoricalConfidence=Object.freeze({HIGH:'high',MEDIUM:'medium',LOW:'low',CONFLICT:'conflict'});
const normalize=value=>String(value??'').toLowerCase().replace(/[\u200e\u200f]/g,'').replace(/[׳״"'.,()_\-]/g,' ').replace(/\d{4,}/g,'#').replace(/\s+/g,' ').trim();
const directionOf=row=>row.direction==='credit'||row.direction==='incoming'||Number(row.signedAmount)>0?'incoming':row.direction==='debit'||row.direction==='outgoing'||Number(row.signedAmount)<0?'outgoing':'unknown';
const explicitTarget=row=>row.userClassification||row.financialType||row.target||null;
const sourceName=row=>row.sourceFile||row.fileName||'מקור היסטורי';
const dateValue=row=>row.date||row.transactionDate||'';
const categoryValue=row=>row.userCategory||row.category||'';

function inferTarget(row){
  if(explicitTarget(row)){const target=explicitTarget(row);return {target,category:categoryValue(row),explicit:Boolean(row.userClassification||row.userCategory),ruleType:target==='credit_card_settlement'?'reconciliation':'classification'};}
  const text=normalize(`${row.description||''} ${row.merchant||''}`);
  if(/ביטוח לאומי.*ילד|קצבת ילד/.test(text))return {target:'government_benefit',category:'קצבאות ומענקים'};
  if(/עמלת|דמי ניהול|הקצאת אשראי/.test(text))return {target:'expense',category:'עמלות בנק ופיננסים'};
  if(/עזרה.*הור|תמיכת הור/.test(text))return {target:'family_support',category:'עזרה מההורים'};
  if(/חיסכון|פקדון|פיקדון/.test(text))return {target:'savings_transfer',category:'חיסכון'};
  if(/השקע|ברוקר|בית השקעות/.test(text))return {target:'investment_transfer',category:'השקעות'};
  if(/חיוב כרטיס|זיכוי לכרטיס|התחשבנות כרטיס/.test(text))return {target:'credit_card_settlement',category:'התחשבנות כרטיס אשראי',ruleType:'reconciliation'};
  if(/החזר|refund|זיכוי מחנות/.test(text))return {target:'refund',category:categoryValue(row)||'זיכויים והחזרים'};
  return {target:null,category:''};
}

const proposalId=key=>`history-${normalize(key).replace(/\s/g,'-')}`;
export function analyzeHistoricalRecords(records=[],options={}){
  const groups=new Map(),ignored=[];
  records.forEach((row,index)=>{
    const description=normalize(row.normalizedDescription||row.description||row.merchant),direction=directionOf(row),inferred=inferTarget(row);
    if(!description||direction==='unknown'||!inferred.target){ignored.push({index,reason:'אין מספיק הקשר לסיווג בטוח'});return}
    const key=[description,row.sourceType||'',row.sourceAccount||'',direction].join('|');
    if(!groups.has(key))groups.set(key,{key,description,direction,sourceType:row.sourceType||'',sourceAccount:row.sourceAccount||'',rows:[]});
    groups.get(key).rows.push({...row,_inferred:inferred});
  });
  const proposals=[];
  for(const group of groups.values()){
    const explicitRows=group.rows.filter(row=>row._inferred.explicit),evidenceRows=explicitRows.length?explicitRows:group.rows,targets=new Map();
    evidenceRows.forEach(row=>{const k=`${row._inferred.target}|${row._inferred.category}`;targets.set(k,(targets.get(k)||0)+1)});
    const sorted=[...targets.entries()].sort((a,b)=>b[1]-a[1]),[winner,count]=sorted[0],conflict=sorted.length>1;
    const [target,category]=winner.split('|'),dates=group.rows.map(dateValue).filter(Boolean).sort(),explicitCount=explicitRows.length;
    const confidence=conflict?HistoricalConfidence.CONFLICT:count>=3||explicitCount>=2?HistoricalConfidence.HIGH:count===2?HistoricalConfidence.MEDIUM:HistoricalConfidence.LOW;
    const amounts=group.rows.map(row=>Math.abs(Number(row.amount??row.signedAmount))).filter(Number.isFinite),typicalAmount=amounts.length?amounts.reduce((a,b)=>a+b,0)/amounts.length:null;
    const suffixes=[...new Set(group.rows.map(row=>String(row.cardSuffix||row.description||'').match(/(?:^|\D)(\d{4})(?:\D|$)/)?.[1]).filter(Boolean))],destinations=[...new Set(group.rows.map(row=>normalize(row.destinationAccount||row.destination||'')).filter(Boolean))];
    proposals.push({id:proposalId(group.key),ruleType:group.rows[0]._inferred.ruleType||'classification',pattern:group.description,sourceType:group.sourceType,sourceAccount:group.sourceAccount,direction:group.direction,target,category,confidence,evidenceCount:group.rows.length,dateRange:{from:dates[0]||null,to:dates.at(-1)||null},sourceFiles:[...new Set(group.rows.map(sourceName))],candidateClassifications:sorted.map(([key,occurrences])=>{const [candidateTarget,candidateCategory]=key.split('|');return {target:candidateTarget,category:candidateCategory,occurrences}}),typicalAmount,cardSuffix:suffixes.length===1?suffixes[0]:'',destinationPattern:destinations.length===1?destinations[0]:'',explicitUserEvidence:explicitCount,status:'proposed'});
  }
  return {proposals:proposals.sort((a,b)=>({high:0,medium:1,conflict:2,low:3}[a.confidence]-{high:0,medium:1,conflict:2,low:3}[b.confidence])),ignored,summary:{total:proposals.length,high:proposals.filter(p=>p.confidence==='high').length,medium:proposals.filter(p=>p.confidence==='medium').length,conflicts:proposals.filter(p=>p.confidence==='conflict').length,low:proposals.filter(p=>p.confidence==='low').length,recordsAnalyzed:records.length},readOnly:true,affectsTotals:false,createsXP:false,sessionId:options.sessionId||generateId('bootstrap')};
}

export function approveHistoricalProposal(proposal,overrides={}){
  if(proposal.confidence==='conflict'&&!overrides.target)throw new Error('Conflicting proposal requires an explicit classification');
  return createClassificationRule({target:overrides.target||proposal.target,category:overrides.category||proposal.category,description:proposal.pattern,sourceType:proposal.sourceType,sourceAccount:proposal.sourceAccount,direction:proposal.direction,typicalAmount:proposal.typicalAmount,ruleType:proposal.ruleType,origin:'historical_bootstrap',confidence:proposal.confidence,evidenceCount:proposal.evidenceCount,evidenceDateRange:proposal.dateRange,userApproved:true,approvedAt:new Date().toISOString(),frequency:proposal.evidenceCount>=3?'recurring':'unknown',cardSuffix:overrides.cardSuffix||proposal.cardSuffix||'',destinationPattern:overrides.destinationPattern||proposal.destinationPattern||''});
}

export const bulkApproveSafeHistoricalRules=result=>result.proposals.filter(p=>p.confidence==='high'&&p.status!=='rejected').map(approveHistoricalProposal);
export const updateProposal=(result,id,patch)=>({...result,proposals:result.proposals.map(item=>item.id===id?{...item,...patch}:item)});
