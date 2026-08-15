import { daysBetween } from './finance.js';
import { generateId } from '../utils/id.js';

export const PSYCHOLOGICAL_TREATMENT_CATEGORY='בריאות — טיפול פסיכולוגי';
export const REHABILITATION_REIMBURSEMENT_SOURCE='אגף השיקום';

const textOf=record=>`${record?.merchant||''} ${record?.description||''} ${record?.category||''}`.trim();
const incoming=record=>['credit','incoming'].includes(record?.direction);

export function classifyPsychologicalTreatment(record){
  const text=textOf(record);
  if(incoming(record)||!/(?:טיפול\s*פסיכולוגי|פסיכולוג(?:ית)?|פסיכותרפיה|טיפול\s*רגשי)/u.test(text))return null;
  return {financialType:'expense',category:PSYCHOLOGICAL_TREATMENT_CATEGORY,reimbursementExpected:true,expectedReimbursementSource:REHABILITATION_REIMBURSEMENT_SOURCE,origin:'household_rule',confidence:'high'};
}

export function createReimbursementExpectation(expense,{receiptId=null,expectedAmount=null,now=new Date()}={}){
  const normalizedExpected=expectedAmount===null||expectedAmount===undefined?null:Number(expectedAmount);
  return {id:generateId('reimbursement-expectation'),expenseTransactionId:expense.id,receiptId:receiptId||expense.receiptId||null,category:PSYCHOLOGICAL_TREATMENT_CATEGORY,source:REHABILITATION_REIMBURSEMENT_SOURCE,grossAmount:Number(expense.amount||0),expectedAmount:Number.isFinite(normalizedExpected)?normalizedExpected:null,status:'open',createdAt:now.toISOString(),receivedAmount:0,reimbursementTransactionId:null};
}

export function matchExpectedReimbursement(record,expectations=[],expenses=[],{maxDays=365,tolerance=.01}={}){
  if(!incoming(record)||!/(?:אגף\s*השיקום)/u.test(textOf(record)))return null;
  const open=expectations.filter(item=>item.status==='open').map(expectation=>({expectation,expense:expenses.find(item=>item.id===expectation.expenseTransactionId)})).filter(item=>item.expense&&new Date(record.date)>=new Date(item.expense.date)&&daysBetween(record.date,item.expense.date)<=maxDays);
  if(!open.length)return {confidence:'low',requiresReview:true,reason:'no_open_expectation'};
  const exact=open.filter(({expectation})=>Math.abs(Number(record.amount)-Number(expectation.expectedAmount??expectation.grossAmount))<=tolerance);
  if(exact.length===1){const {expectation,expense}=exact[0];return {confidence:'high',requiresReview:false,financialType:'reimbursement',category:PSYCHOLOGICAL_TREATMENT_CATEGORY,expectationId:expectation.id,expenseTransactionId:expense.id,explanation:'הותאם להחזר צפוי מאגף השיקום'} }
  return {confidence:'medium',requiresReview:true,financialType:'reimbursement',category:PSYCHOLOGICAL_TREATMENT_CATEGORY,candidateExpectationIds:(exact.length?exact:open).map(item=>item.expectation.id),reviewReason:exact.length>1?'כמה טיפולים יכולים להתאים להחזר':'סכום ההחזר שונה מהסכום הצפוי',explanation:'נמצא החזר אפשרי מאגף השיקום — נדרש לבחור טיפול'};
}

export function applyConfirmedReimbursement({reimbursement,match,expectations,expenses,now=new Date()}){
  if(match?.confidence!=='high')return {reimbursement,expectations,expenses};
  const linked={...reimbursement,financialType:'reimbursement',category:PSYCHOLOGICAL_TREATMENT_CATEGORY,linkedTransactionId:match.expenseTransactionId,reimbursementExpectationId:match.expectationId,countInTotals:true};
  const updatedExpectations=expectations.map(item=>item.id===match.expectationId?{...item,status:'received',receivedAmount:Number(reimbursement.amount),reimbursementTransactionId:reimbursement.id,receivedAt:now.toISOString(),closedAt:now.toISOString()}:item);
  const updatedExpenses=expenses.map(item=>item.id===match.expenseTransactionId?{...item,reimbursementStatus:Number(reimbursement.amount)>=Number(item.amount)?'fully_reimbursed':'partially_reimbursed',reimbursementReceived:Number(reimbursement.amount),reimbursementExpected:true,expectedReimbursementSource:REHABILITATION_REIMBURSEMENT_SOURCE}:item);
  return {reimbursement:linked,expectations:updatedExpectations,expenses:updatedExpenses};
}
