import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSummary, reconcilePostedBankMovements } from '../src/services/finance.js';

const bankMovement=(id,date,amount,direction,extra={})=>({
  id,
  externalSourceId:id,
  date,
  amount,
  direction,
  sourceType:'bank_import',
  sourceAccount:'qa-account-primary',
  postingStatus:'posted',
  ...extra
});

test('synthetic posted movements reconcile exactly when coverage is complete',()=>{
  const movements=[
    bankMovement('qa-primary-1','2026-08-16',410,'debit',{financialType:'expense',reimbursementExpected:true}),
    bankMovement('qa-primary-2','2026-08-18',275,'debit',{financialType:'expense',reimbursementExpected:true}),
    bankMovement('qa-primary-3','2026-08-19',80,'credit',{financialType:'government_benefit'}),
    bankMovement('qa-primary-4','2026-08-28',450,'debit',{financialType:'transfer',countInTotals:false})
  ];
  const result=reconcilePostedBankMovements({anchorBalance:12000.25,anchorDate:'2026-08-10',account:'qa-account-primary',movements,laterVerifiedBalance:10945.25});
  assert.equal(result.postedDelta,-1055);
  assert.equal(result.postedBalance,10945.25);
  assert.equal(result.verifiedDifference,0);
  assert.equal(result.reconciliationStatus,'pass');
  assert.equal(result.hasCoverageGaps,false);
});

test('synthetic posted reconciliation excludes a pending live difference and reports uncertainty',()=>{
  const movements=[
    bankMovement('qa-secondary-1','2026-08-13',625,'debit',{sourceAccount:'qa-account-secondary'}),
    bankMovement('qa-secondary-2','2026-08-14',180,'debit',{sourceAccount:'qa-account-secondary'}),
    bankMovement('qa-secondary-pending','2026-08-28',73,'debit',{sourceAccount:'qa-account-secondary',postingStatus:'pending',rawStatus:'תנועה מהיום'})
  ];
  const result=reconcilePostedBankMovements({anchorBalance:8000.50,anchorDate:'2026-08-12',account:'qa-account-secondary',movements,laterVerifiedBalance:7195.50,observedLiveBalance:7122.50});
  assert.equal(result.postedBalance,7195.50);
  assert.equal(result.verifiedDifference,0);
  assert.equal(result.liveDifference,-73);
  assert.equal(result.reconciliationStatus,'coverage_gap');
  assert.deepEqual(result.coverageGaps.map(gap=>gap.type),['pending_movement']);
});

test('bank impact uses account, posting status and direction rather than economic classification',()=>{
  const movements=[
    bankMovement('out','2026-08-16',420,'debit',{financialType:'transfer',countInTotals:false}),
    bankMovement('reimbursement','2026-08-20',180,'credit',{financialType:'reimbursement',linkedTransactionId:'out'}),
    bankMovement('unknown-status','2026-08-21',17,'debit',{postingStatus:'unknown'}),
    bankMovement('missing-account','2026-08-22',23,'debit',{sourceAccount:null}),
    bankMovement('wrong-account','2026-08-23',31,'debit',{sourceAccount:'qa-account-other'}),
    bankMovement('unknown-direction','2026-08-24',47,'unknown'),
    bankMovement('duplicate','2026-08-25',60,'debit'),
    bankMovement('duplicate-copy','2026-08-25',60,'debit',{externalSourceId:'duplicate'})
  ];
  const result=reconcilePostedBankMovements({anchorBalance:1500,anchorDate:'2026-08-10',account:'qa-account-primary',movements});
  assert.equal(result.postedBalance,1200);
  assert.deepEqual(result.coverageGaps.map(gap=>gap.type),['unknown_posting_status','missing_account','account_mismatch','unknown_direction','duplicate_movement']);
  assert.equal(calculateSummary(movements).balance,180);
  assert.notEqual(calculateSummary(movements).balance,result.postedBalance);
});
