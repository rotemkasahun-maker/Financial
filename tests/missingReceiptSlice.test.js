import test from 'node:test';
import assert from 'node:assert/strict';
import { MockFinanceDataService } from '../src/services/dataService.js';
import { completeReceiptTask, completeTaskExactlyOnce, ensureMissingReceiptTask } from '../src/services/taskEngine.js';
import { renderAttention } from '../src/views/ingestionViews.js';

const base={id:'missing-1',date:'2026-08-01',importedAt:'2026-08-01T00:00:00Z',merchant:'חנות',amount:50,financialType:'expense',receiptId:null};
test('scan creates one eligible missing-receipt task and repeated scan deduplicates',async()=>{const service=new MockFinanceDataService();service.transactions=[base];service.tasks=[];await service.scanMissingReceiptTasks(new Date('2026-08-03T00:00:00Z'));await service.scanMissingReceiptTasks(new Date('2026-08-04T00:00:00Z'));assert.equal(service.tasks.length,1);assert.equal(service.tasks[0].type,'missing_receipt')});
test('receipt-present, non-expense, and waiting-period transactions create no task',async()=>{const service=new MockFinanceDataService();service.transactions=[{...base,id:'receipt',receiptId:'r1'},{...base,id:'income',financialType:'income'},{...base,id:'new',importedAt:'2026-08-02T18:00:00Z'}];service.tasks=[];await service.scanMissingReceiptTasks(new Date('2026-08-03T00:00:00Z'));assert.equal(service.tasks.length,0)});
test('missing receipt task appears in Attention with existing upload action',()=>{const html=renderAttention({ingestion:{issues:[],smsStaging:[]},engagement:{tasks:[{id:'task-m',type:'missing_receipt',status:'open',explanation:'חנות · 50 ₪'}]}},{header:()=>''});assert.match(html,/חסרה קבלה/);assert.match(html,/data-task-action="task-m"/);assert.match(html,/צלמי קבלה/)});
test('receipt completion awards XP exactly once',()=>{const task={id:'task-m',type:'missing_receipt',relatedRecordId:'missing-1',ownerId:'u',status:'open',xpReward:20};const state={tasks:[task],xpEvents:[],userScores:[{userId:'u',xp:0}]};const once=completeReceiptTask('missing-1',state);const twice=completeTaskExactlyOnce({taskId:task.id,...once});assert.equal(once.xpEvents.length,1);assert.equal(twice.xpEvents.length,1);assert.equal(once.tasks[0].status,'completed')});
