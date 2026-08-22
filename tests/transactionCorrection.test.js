import test from 'node:test';
import assert from 'node:assert/strict';
import { MockFinanceDataService } from '../src/services/dataService.js';
import { calculateSummary } from '../src/services/finance.js';

const key='family-finance:transaction-overrides:v1';
function storage(){const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)}}

test('updates one transaction by stable id, persists, recalculates, and preserves provenance', async()=>{
  globalThis.localStorage=storage();
  const first=new MockFinanceDataService();
  const before=await first.getTransactions();
  const original=before.find(t=>t.id==='t1');
  await first.updateTransaction('t1',{merchant:'רמי לוי חדש',description:'תיקון',amount:100,date:'2026-08-13',category:'בית',subcategory:'מטבח',financialType:'income',receiptId:'fake'});
  const after=await first.getTransactions();
  const edited=after.find(t=>t.id==='t1');
  assert.equal(after.length,before.length);
  assert.equal(edited.merchant,'רמי לוי חדש');
  assert.equal(edited.amount,100);
  assert.equal(edited.category,'בית');
  assert.equal(edited.subcategory,'מטבח');
  assert.equal(edited.financialType,original.financialType);
  assert.equal(edited.receiptId,original.receiptId);
  assert.ok(Math.abs(calculateSummary(after).expenses-(calculateSummary(before).expenses-387.3))<0.001);
  const categoryTotal=after.filter(t=>t.financialType==='expense'&&t.category==='בית').reduce((sum,t)=>sum+t.amount,0);
  assert.equal(categoryTotal,720);
  const restarted=new MockFinanceDataService();
  assert.equal((await restarted.getTransactions()).find(t=>t.id==='t1').merchant,'רמי לוי חדש');
  globalThis.localStorage=undefined;
});
