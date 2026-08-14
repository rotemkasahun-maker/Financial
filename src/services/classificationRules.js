const normalize=value=>String(value??'').toLowerCase().replace(/[\u200e\u200f]/g,'').replace(/[׳״"'.,()\-_]/g,' ').replace(/\s+/g,' ').trim();
const tokens=value=>new Set(normalize(value).split(' ').filter(token=>token.length>1));
const similarity=(left,right)=>{const a=tokens(left),b=tokens(right);if(!a.size||!b.size)return 0;const common=[...a].filter(token=>b.has(token)).length;return common/Math.max(a.size,b.size)};
const directionOf=row=>['credit','incoming'].includes(row.direction)?'incoming':['debit','outgoing'].includes(row.direction)?'outgoing':'unknown';

export const RuleTarget=Object.freeze({FAMILY_SUPPORT:'family_support',GOVERNMENT_BENEFIT:'government_benefit',BANK_CREDIT:'bank_credit',INCOME:'income',REIMBURSEMENT:'reimbursement',GIFT:'gift',TRANSFER:'transfer',REFUND:'refund',EXPENSE:'expense',SAVINGS:'savings_transfer',INVESTMENT:'investment_transfer'});

export function createClassificationRule({id=crypto.randomUUID(),householdId='demo-household',userId='demo-member-a',target,category,description='',counterparty='',sourceType='',sourceAccount='',direction,typicalAmount=null,amountTolerance=null,frequency='unknown',referencePattern='',enabled=true}={}){
  const amount=typicalAmount===null?null:Math.abs(Number(typicalAmount));
  return {id,householdId,userId,target,category:category||categoryFor(target),descriptionPattern:normalize(description),counterpartyPattern:normalize(counterparty),sourceType,sourceAccount:normalize(sourceAccount),direction:direction||'unknown',typicalAmount:Number.isFinite(amount)?amount:null,amountTolerance:amountTolerance??(Number.isFinite(amount)?Math.max(50,amount*.08):null),frequency,referencePattern:normalize(referencePattern),enabled,origin:'user_rule',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
}

export function ruleFromReviewDecision(row,decision){return createClassificationRule({target:decision,category:categoryFor(decision),description:row.description,counterparty:row.merchant,sourceType:row.sourceType,direction:directionOf(row),typicalAmount:row.amount,frequency:row.recurringFrequency||'unknown',referencePattern:row.reference?.replace(/\d+/g,'#')||''});}

export function categoryFor(target){return ({family_support:'עזרה מההורים',government_benefit:'קצבאות ומענקים',bank_credit:'ריבית וזיכויים מהבנק',income:'הכנסה שוטפת',reimbursement:'החזר',gift:'מתנה',transfer:'העברה פנימית',refund:'זיכוי',expense:'כללי',savings_transfer:'חיסכון',investment_transfer:'השקעות'})[target]||'ללא קטגוריה'}

export function matchClassificationRule(rule,row){
  if(!rule?.enabled||rule.direction!==directionOf(row))return {confidence:'none',score:0};
  if(rule.sourceType&&row.sourceType&&rule.sourceType!==row.sourceType)return {confidence:'none',score:0};
  const descriptionScore=Math.max(similarity(rule.descriptionPattern,row.description),similarity(rule.counterpartyPattern,row.merchant));
  const accountMatch=Boolean(rule.sourceAccount&&normalize(row.sourceAccount)===rule.sourceAccount);
  const referenceMatch=Boolean(rule.referencePattern&&normalize(String(row.reference||'').replace(/\d+/g,'#'))===rule.referencePattern);
  const amountMatch=rule.typicalAmount!==null&&Math.abs(Number(row.amount)-rule.typicalAmount)<=Number(rule.amountTolerance||0);
  // A monetary amount is supporting evidence only; one contextual identity signal is mandatory.
  if(descriptionScore<.45&&!accountMatch&&!referenceMatch)return {confidence:'none',score:0};
  const score=Math.min(1,descriptionScore*.55+(amountMatch?.2:0)+(rule.sourceType?.1:0)+(accountMatch?.1:0)+(referenceMatch?.05:0));
  return {score,confidence:score>=.82?'high':score>=.62?'medium':'low',amountMatch,descriptionScore,accountMatch,referenceMatch};
}

export function applySavedClassificationRules(row,rules=[]){
  const matches=rules.map(rule=>({rule,...matchClassificationRule(rule,row)})).filter(match=>match.score>0).sort((a,b)=>b.score-a.score);
  const best=matches[0];if(!best||best.confidence==='low')return null;
  const explanation=best.confidence==='high'?'סווג אוטומטית לפי כלל ששמרת':'זוהה כדפוס מוכר לפי כלל ששמרת';
  return {ruleId:best.rule.id,financialType:best.rule.target,category:best.rule.category,confidence:best.confidence,score:best.score,origin:'user_rule',explanation,requiresReview:best.confidence!=='high'};
}

export function upsertClassificationRule(rules,newRule){
  const key=rule=>[rule.householdId,rule.target,rule.direction,rule.sourceType,rule.sourceAccount,rule.descriptionPattern,rule.counterpartyPattern].join('|');
  const index=rules.findIndex(rule=>key(rule)===key(newRule));if(index<0)return [...rules,newRule];
  return rules.map((rule,i)=>i===index?{...rule,...newRule,id:rule.id,createdAt:rule.createdAt,updatedAt:new Date().toISOString(),enabled:true}:rule);
}

export const disableClassificationRule=(rules,id)=>rules.map(rule=>rule.id===id?{...rule,enabled:false,updatedAt:new Date().toISOString()}:rule);
