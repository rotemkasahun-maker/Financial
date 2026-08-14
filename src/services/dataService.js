import { transactions, receipts, recurring } from '../data/mockData.js';
import { importSources, expectedDocuments, importRuns, importIssues, reminderTasks } from '../data/ingestionMockData.js';
import { tasks, xpEvents, userScores, challenges, achievements, notificationRules, rewardConfig } from '../data/gamificationMockData.js';
import { completeReceiptTask, completeTaskExactlyOnce } from './taskEngine.js';
import { createSourceRecord, createCanonicalEvent } from './reconciliation.js';
import { upsertClassificationRule, disableClassificationRule } from './classificationRules.js';

const RULE_STORAGE_KEY='family-finance:classification-rules:v1';
const loadRules=()=>{try{return JSON.parse(globalThis.localStorage?.getItem(RULE_STORAGE_KEY)||'[]')}catch{return []}};
const persistRules=rules=>{try{globalThis.localStorage?.setItem(RULE_STORAGE_KEY,JSON.stringify(rules))}catch{/* In-memory fallback. */}};

export class FinanceDataService {
  async getTransactions() { throw new Error('Not implemented'); }
  async getReceipts() { throw new Error('Not implemented'); }
  async saveReceipt() { throw new Error('Not implemented'); }
}

export class MockFinanceDataService extends FinanceDataService {
  constructor() { super(); this.transactions = structuredClone(transactions); this.receipts = structuredClone(receipts); this.importSources=structuredClone(importSources); this.expectedDocuments=structuredClone(expectedDocuments); this.importRuns=structuredClone(importRuns); this.importIssues=structuredClone(importIssues); this.reminderTasks=structuredClone(reminderTasks);this.tasks=structuredClone(tasks);this.xpEvents=structuredClone(xpEvents);this.userScores=structuredClone(userScores);this.challenges=structuredClone(challenges);this.achievements=structuredClone(achievements);this.notificationRules=structuredClone(notificationRules);this.rewardConfig=structuredClone(rewardConfig);this.lastXPEvent=null;this.sourceRecords=[];this.canonicalEvents=[];this.classificationRules=loadRules();globalThis.__familyFinanceClassificationRules=this.classificationRules; }
  async getTransactions() { return structuredClone(this.transactions); }
  async getReceipts() { return structuredClone(this.receipts); }
  async getRecurring() { return structuredClone(recurring); }
  async getClassificationRules() { return structuredClone(this.classificationRules); }
  async saveClassificationRule(rule) { this.classificationRules=upsertClassificationRule(this.classificationRules,rule);globalThis.__familyFinanceClassificationRules=this.classificationRules;persistRules(this.classificationRules);return this.getClassificationRules(); }
  async disableClassificationRule(id) { this.classificationRules=disableClassificationRule(this.classificationRules,id);globalThis.__familyFinanceClassificationRules=this.classificationRules;persistRules(this.classificationRules);return this.getClassificationRules(); }
  async getIngestionState() { return structuredClone({sources:this.importSources,expectedDocuments:this.expectedDocuments,importRuns:this.importRuns,issues:this.importIssues,reminders:this.reminderTasks}); }
  async getEngagementState() { return structuredClone({tasks:this.tasks,xpEvents:this.xpEvents,userScores:this.userScores,challenges:this.challenges,achievements:this.achievements,notificationRules:this.notificationRules,rewardConfig:this.rewardConfig,lastXPEvent:this.lastXPEvent}); }
  async completeUserTask(taskId) { const result=completeTaskExactlyOnce({taskId,tasks:this.tasks,xpEvents:this.xpEvents,userScores:this.userScores});this.tasks=result.tasks;this.xpEvents=result.xpEvents;this.userScores=result.userScores;this.lastXPEvent=result.xpEvent;return this.getEngagementState(); }
  async resolveIssue(issueId) { this.importIssues=this.importIssues.map(i=>i.id===issueId?{...i,status:'resolved'}:i); return this.getIngestionState(); }
  async receiveExpectedDocument(documentId, fileName) { const doc=this.expectedDocuments.find(d=>d.id===documentId); if(!doc) throw new Error('Expected document not found'); doc.received=true; doc.fileId=`demo:${fileName}`; doc.reminderState='completed'; this.reminderTasks=this.reminderTasks.map(t=>t.expectedDocumentId===documentId?{...t,status:'completed'}:t); this.importIssues=this.importIssues.map(i=>i.expectedDocumentId===documentId?{...i,status:'resolved'}:i); const source=this.importSources.find(s=>s.id===doc.sourceId); if(source){source.status='up_to_date';source.lastSuccess=new Date().toISOString();source.pendingIssues=Math.max(0,source.pendingIssues-1)} const task=this.tasks.find(t=>t.relatedRecordType==='expected_document'&&t.relatedRecordId===documentId&&t.status!=='completed');if(task){const result=completeTaskExactlyOnce({taskId:task.id,tasks:this.tasks,xpEvents:this.xpEvents,userScores:this.userScores});this.tasks=result.tasks;this.xpEvents=result.xpEvents;this.userScores=result.userScores;this.lastXPEvent=result.xpEvent} return this.getIngestionState(); }
  async approveFileImport(preview,userId='demo-member-a') { const importedAt=new Date().toISOString(),sourceId=preview.selectedSource==='bank_import'?'src-bank':'src-card';let imported=0,skipped=0,review=0,failed=0;for(const row of preview.rows){if(row.excluded)continue;const sourceRecord=createSourceRecord({sourceId,sourceType:preview.selectedSource,externalTransactionId:row.externalSourceId,occurredAt:row.date,amount:row.amount,direction:row.direction,counterparty:row.merchant,reference:row.reference,rawStatus:'booked',rawRow:row.rawRow,originalFilename:preview.filename,importedAt,userId});if(!row.valid){failed++;this.sourceRecords.push(sourceRecord);continue}if(row.importStatus==='existing'){const existing=this.transactions.find(t=>(row.externalSourceId&&t.externalSourceId===row.externalSourceId)||(t.date===row.date&&Math.abs(t.amount-row.amount)<.01&&t.merchant===row.merchant));sourceRecord.canonicalEventId=existing?.canonicalEventId||existing?.id||null;this.sourceRecords.push(sourceRecord);skipped++;continue}const financialType=row.financialType==='unknown'?'unknown':row.financialType;if(financialType==='unknown')review++;const event=createCanonicalEvent({date:row.date,amount:row.amount,financialType,category:row.category,countInTotals:financialType!=='unknown',linkedSourceRecordIds:[sourceRecord.id]});sourceRecord.canonicalEventId=event.id;this.sourceRecords.push(sourceRecord);this.canonicalEvents.push(event);const receipt=row.matchingReceiptId?this.receipts.find(r=>r.id===row.matchingReceiptId):null;const tx={id:crypto.randomUUID(),canonicalEventId:event.id,date:row.date,merchant:row.merchant,description:row.description,amount:row.amount,currency:'ILS',direction:row.direction,financialType,category:row.category||'ללא קטגוריה',source:preview.selectedSource==='bank_import'?'ייבוא בנק':'ייבוא אשראי',sourceType:preview.selectedSource,sourceAccount:row.sourceAccount,externalSourceId:row.externalSourceId,receiptId:receipt?.id||null,importedAt,userId};this.transactions.unshift(tx);if(receipt)receipt.linkedTransactionId=tx.id;if(financialType==='unknown')this.importIssues.push({id:crypto.randomUUID(),type:'uncategorized',severity:'warning',title:'עסקה שיובאה דורשת סיווג',description:`${row.merchant} · ${row.amount} ₪`,sourceId,status:'open',createdAt:importedAt,action:'בחירת סוג וקטגוריה'});imported++}const run={id:crypto.randomUUID(),sourceId,filename:preview.filename,source:preview.selectedSource,importedAt,importedRows:imported,duplicatesSkipped:skipped,rowsRequiringReview:review,failedRows:failed,userId,status:failed&&imported===0?'failed':review||failed?'partial':'success'};this.importRuns.unshift(run);if(imported>0||skipped>0){const source=this.importSources.find(s=>s.id===sourceId);if(source){source.status=run.status==='success'?'synced':'needs_attention';source.lastAttempt=importedAt;source.lastSuccess=importedAt;source.pendingIssues=review+failed}}return structuredClone({run,transactions:this.transactions,receipts:this.receipts,ingestion:await this.getIngestionState(),sourceRecords:this.sourceRecords,canonicalEvents:this.canonicalEvents}) }
  async saveReceipt(receipt, linkedId) {
    const saved = {...receipt, id: crypto.randomUUID(), linkedTransactionId: linkedId || null, reviewStatus:'approved'};
    this.receipts.unshift(saved);
    if (linkedId) this.transactions = this.transactions.map(t => t.id === linkedId ? {...t, receiptId:saved.id} : t);
    else this.transactions.unshift({id:crypto.randomUUID(), date:saved.purchaseDate, merchant:saved.merchant, description:'נוצר מקבלה לאחר בדיקה', amount:Number(saved.total), currency:'ILS', direction:'debit', financialType:'expense', category:saved.category || 'כללי', source:'קבלה', sourceType:saved.sourceMetadata?.sourceType || 'manual_upload', sourceAccount:saved.sourceMetadata?.userId || null, householdId:saved.sourceMetadata?.householdId, userId:saved.sourceMetadata?.userId, deviceId:saved.sourceMetadata?.deviceId, importedAt:saved.sourceMetadata?.importedAt, receiptId:saved.id, reimbursementStatus:'none'});
    if(linkedId){const result=completeReceiptTask(linkedId,{tasks:this.tasks,xpEvents:this.xpEvents,userScores:this.userScores});this.tasks=result.tasks;this.xpEvents=result.xpEvents;this.userScores=result.userScores;this.lastXPEvent=result.xpEvent}
    return structuredClone(saved);
  }
}

/** Future adapter: implement these methods against the approved Google Apps Script/API endpoint. */
export class GoogleSheetsFinanceDataService extends FinanceDataService {
  constructor({ endpoint, sheetId }) { super(); this.endpoint = endpoint; this.sheetId = sheetId; }
  async getTransactions() { throw new Error('Google Sheets אינו מחובר עדיין'); }
  async getReceipts() { throw new Error('Google Sheets אינו מחובר עדיין'); }
  async saveReceipt() { throw new Error('שמירה חיצונית דורשת אישור וחיבור'); }
}

export const dataService = new MockFinanceDataService();
