import { transactions, receipts, recurring } from '../data/mockData.js';
import { importSources, expectedDocuments, importRuns, importIssues, reminderTasks } from '../data/ingestionMockData.js';
import { tasks, xpEvents, userScores, challenges, achievements, notificationRules, rewardConfig, madridGoal } from '../data/gamificationMockData.js';
import { completeReceiptTask, completeTaskExactlyOnce, ensureDeferredReviewTask, closeDeferredReviewTask } from './taskEngine.js';
import { createSourceRecord, createCanonicalEvent } from './reconciliation.js';
import { upsertClassificationRule, disableClassificationRule, applySavedClassificationRules } from './classificationRules.js';
import { rerunDeferredReconciliation } from './reviewReconciliation.js';
import { analyzeHistoricalRecords, approveHistoricalProposal, bulkApproveSafeHistoricalRules } from './historicalLearning.js';
import { generateId } from '../utils/id.js';
import { completeMadridChallengeExactlyOnce } from './madridGoal.js';
import { persistableReceiptKnowledge } from './historicalReceiptLearning.js';

const RULE_STORAGE_KEY='family-finance:classification-rules:v1';
let memoryRuleStore=[];
const loadRules=()=>{try{const stored=globalThis.localStorage?.getItem(RULE_STORAGE_KEY);return stored?JSON.parse(stored):structuredClone(memoryRuleStore)}catch{return structuredClone(memoryRuleStore)}};
const persistRules=rules=>{memoryRuleStore=structuredClone(rules);try{globalThis.localStorage?.setItem(RULE_STORAGE_KEY,JSON.stringify(rules))}catch{/* In-memory fallback. */}};
const RECEIPT_KNOWLEDGE_STORAGE_KEY='family-finance:receipt-knowledge:v1';
let memoryReceiptKnowledge={merchantAliases:[],receiptMatchingPatterns:[],sourceRelationships:[],itemFamilyEvidence:[]};
const loadReceiptKnowledge=()=>{try{const stored=globalThis.localStorage?.getItem(RECEIPT_KNOWLEDGE_STORAGE_KEY);return stored?JSON.parse(stored):structuredClone(memoryReceiptKnowledge)}catch{return structuredClone(memoryReceiptKnowledge)}};
const persistReceiptKnowledge=knowledge=>{memoryReceiptKnowledge=structuredClone(knowledge);try{globalThis.localStorage?.setItem(RECEIPT_KNOWLEDGE_STORAGE_KEY,JSON.stringify(knowledge))}catch{/* In-memory fallback. */}};

export class FinanceDataService {
  async getTransactions() { throw new Error('Not implemented'); }
  async getReceipts() { throw new Error('Not implemented'); }
  async saveReceipt() { throw new Error('Not implemented'); }
}

export class MockFinanceDataService extends FinanceDataService {
  constructor() { super(); this.transactions = structuredClone(transactions); this.receipts = structuredClone(receipts); this.importSources=structuredClone(importSources); this.expectedDocuments=structuredClone(expectedDocuments); this.importRuns=structuredClone(importRuns); this.importIssues=structuredClone(importIssues); this.reminderTasks=structuredClone(reminderTasks);this.tasks=structuredClone(tasks);this.xpEvents=structuredClone(xpEvents);this.userScores=structuredClone(userScores);this.challenges=structuredClone(challenges);this.madridGoal=structuredClone(madridGoal);this.achievements=structuredClone(achievements);this.notificationRules=structuredClone(notificationRules);this.rewardConfig=structuredClone(rewardConfig);this.lastXPEvent=null;this.sourceRecords=[];this.canonicalEvents=[];this.classificationRules=loadRules();this.receiptKnowledge=loadReceiptKnowledge();this.historicalLearning=null;globalThis.__familyFinanceClassificationRules=this.classificationRules; }
  async getTransactions() { return structuredClone(this.transactions); }
  async getReceipts() { return structuredClone(this.receipts); }
  async getRecurring() { return structuredClone(recurring); }
  async getClassificationRules() { return structuredClone(this.classificationRules); }
  async saveClassificationRule(rule) { this.classificationRules=upsertClassificationRule(this.classificationRules,rule);globalThis.__familyFinanceClassificationRules=this.classificationRules;persistRules(this.classificationRules);return this.getClassificationRules(); }
  async disableClassificationRule(id) { this.classificationRules=disableClassificationRule(this.classificationRules,id);globalThis.__familyFinanceClassificationRules=this.classificationRules;persistRules(this.classificationRules);return this.getClassificationRules(); }
  async analyzeHistoricalRecords(records,options={}) { this.historicalLearning=analyzeHistoricalRecords(records,options);return structuredClone(this.historicalLearning); }
  async approveHistoricalRule(proposalId,overrides={}) { const proposal=this.historicalLearning?.proposals.find(item=>item.id===proposalId);if(!proposal)throw new Error('Historical proposal not found');const rule=approveHistoricalProposal(proposal,overrides);await this.saveClassificationRule(rule);proposal.status='approved';return structuredClone({learning:this.historicalLearning,rules:this.classificationRules}); }
  async bulkApproveHistoricalRules() { if(!this.historicalLearning)return {learning:null,rules:await this.getClassificationRules()};for(const rule of bulkApproveSafeHistoricalRules(this.historicalLearning))await this.saveClassificationRule(rule);this.historicalLearning.proposals=this.historicalLearning.proposals.map(item=>item.confidence==='high'?{...item,status:'approved'}:item);return structuredClone({learning:this.historicalLearning,rules:this.classificationRules}); }
  async getReceiptKnowledge() { return structuredClone(this.receiptKnowledge); }
  async saveHistoricalReceiptKnowledge(result) { this.receiptKnowledge=persistableReceiptKnowledge(result);persistReceiptKnowledge(this.receiptKnowledge);return this.getReceiptKnowledge(); }
  async rejectHistoricalRule(proposalId) { if(this.historicalLearning)this.historicalLearning.proposals=this.historicalLearning.proposals.map(item=>item.id===proposalId?{...item,status:'rejected'}:item);return structuredClone(this.historicalLearning); }
  async getIngestionState() { return structuredClone({sources:this.importSources,expectedDocuments:this.expectedDocuments,importRuns:this.importRuns,issues:this.importIssues,reminders:this.reminderTasks}); }
  async getEngagementState() { return structuredClone({tasks:this.tasks,xpEvents:this.xpEvents,userScores:this.userScores,challenges:this.challenges,madridGoal:this.madridGoal,achievements:this.achievements,notificationRules:this.notificationRules,rewardConfig:this.rewardConfig,lastXPEvent:this.lastXPEvent}); }
  async completeUserTask(taskId) { const result=completeTaskExactlyOnce({taskId,tasks:this.tasks,xpEvents:this.xpEvents,userScores:this.userScores});this.tasks=result.tasks;this.xpEvents=result.xpEvents;this.userScores=result.userScores;this.lastXPEvent=result.xpEvent;return this.getEngagementState(); }
  async claimMadridChallenge(challengeId,userId='demo-member-a') { const result=completeMadridChallengeExactlyOnce({challengeId,challenges:this.challenges,xpEvents:this.xpEvents,userScores:this.userScores,goal:this.madridGoal,completedByUserId:userId});this.challenges=result.challenges;this.xpEvents=result.xpEvents;this.userScores=result.userScores;this.madridGoal=result.goal;this.lastXPEvent=result.xpEvent;return this.getEngagementState(); }
  async resolveIssue(issueId) { this.importIssues=this.importIssues.map(i=>i.id===issueId?{...i,status:'resolved'}:i); return this.getIngestionState(); }
  async receiveExpectedDocument(documentId, fileName) { const doc=this.expectedDocuments.find(d=>d.id===documentId); if(!doc) throw new Error('Expected document not found'); doc.received=true; doc.fileId=`demo:${fileName}`; doc.reminderState='completed'; this.reminderTasks=this.reminderTasks.map(t=>t.expectedDocumentId===documentId?{...t,status:'completed'}:t); this.importIssues=this.importIssues.map(i=>i.expectedDocumentId===documentId?{...i,status:'resolved'}:i); const source=this.importSources.find(s=>s.id===doc.sourceId); if(source){source.status='up_to_date';source.lastSuccess=new Date().toISOString();source.pendingIssues=Math.max(0,source.pendingIssues-1)} const task=this.tasks.find(t=>t.relatedRecordType==='expected_document'&&t.relatedRecordId===documentId&&t.status!=='completed');if(task){const result=completeTaskExactlyOnce({taskId:task.id,tasks:this.tasks,xpEvents:this.xpEvents,userScores:this.userScores});this.tasks=result.tasks;this.xpEvents=result.xpEvents;this.userScores=result.userScores;this.lastXPEvent=result.xpEvent} return this.getIngestionState(); }
  async approveFileImport(preview,userId='demo-member-a') { const importedAt=new Date().toISOString(),sourceId=preview.selectedSource==='bank_import'?'src-bank':'src-card';let imported=0,skipped=0,review=0,failed=0;for(const row of preview.rows){if(row.excluded)continue;const sourceRecord=createSourceRecord({sourceId,sourceType:preview.selectedSource,externalTransactionId:row.externalSourceId,occurredAt:row.date,amount:row.amount,direction:row.direction,counterparty:row.merchant,reference:row.reference,rawStatus:'booked',rawRow:row.rawRow,originalFilename:preview.filename,importedAt,userId});if(!row.valid){failed++;this.sourceRecords.push(sourceRecord);continue}if(row.importStatus==='existing'){const existing=this.transactions.find(t=>(row.externalSourceId&&t.externalSourceId===row.externalSourceId)||(t.date===row.date&&Math.abs(t.amount-row.amount)<.01&&t.merchant===row.merchant));sourceRecord.canonicalEventId=existing?.canonicalEventId||existing?.id||null;this.sourceRecords.push(sourceRecord);skipped++;continue}const financialType=row.financialType==='unknown'?'unknown':row.financialType;if(financialType==='unknown')review++;const event=createCanonicalEvent({date:row.date,amount:row.amount,financialType,category:row.category,countInTotals:financialType!=='unknown',linkedSourceRecordIds:[sourceRecord.id]});sourceRecord.canonicalEventId=event.id;this.sourceRecords.push(sourceRecord);this.canonicalEvents.push(event);const receipt=row.matchingReceiptId?this.receipts.find(r=>r.id===row.matchingReceiptId):null;const tx={id:generateId('transaction'),canonicalEventId:event.id,date:row.date,merchant:row.merchant,description:row.description,amount:row.amount,currency:'ILS',direction:row.direction,financialType,category:row.category||'ללא קטגוריה',source:preview.selectedSource==='bank_import'?'ייבוא בנק':'ייבוא אשראי',sourceType:preview.selectedSource,sourceAccount:row.sourceAccount,externalSourceId:row.externalSourceId,receiptId:receipt?.id||null,importedAt,userId};this.transactions.unshift(tx);if(receipt)receipt.linkedTransactionId=tx.id;if(financialType==='unknown')this.importIssues.push({id:generateId('issue'),type:'uncategorized',severity:'warning',title:'עסקה שיובאה דורשת סיווג',description:`${row.merchant} · ${row.amount} ₪`,sourceId,status:'open',createdAt:importedAt,action:'בחירת סוג וקטגוריה'});imported++}const run={id:generateId('import-run'),sourceId,filename:preview.filename,source:preview.selectedSource,importedAt,importedRows:imported,duplicatesSkipped:skipped,rowsRequiringReview:review,failedRows:failed,userId,status:failed&&imported===0?'failed':review||failed?'partial':'success'};this.importRuns.unshift(run);if(imported>0||skipped>0){const source=this.importSources.find(s=>s.id===sourceId);if(source){source.status=run.status==='success'?'synced':'needs_attention';source.lastAttempt=importedAt;source.lastSuccess=importedAt;source.pendingIssues=review+failed}}return structuredClone({run,transactions:this.transactions,receipts:this.receipts,ingestion:await this.getIngestionState(),sourceRecords:this.sourceRecords,canonicalEvents:this.canonicalEvents}) }
  async saveReceipt(receipt, linkedId) {
    const saved = {...receipt, id: generateId('receipt'), linkedTransactionId: linkedId || null, reviewStatus:'approved'};
    this.receipts.unshift(saved);
    if (linkedId) this.transactions = this.transactions.map(t => t.id === linkedId ? {...t, receiptId:saved.id} : t);
    else this.transactions.unshift({id:generateId('transaction'), date:saved.purchaseDate, merchant:saved.merchant, description:'נוצר מקבלה לאחר בדיקה', amount:Number(saved.total), currency:'ILS', direction:'debit', financialType:'expense', category:saved.category || 'כללי', source:'קבלה', sourceType:saved.sourceMetadata?.sourceType || 'manual_upload', sourceAccount:saved.sourceMetadata?.userId || null, householdId:saved.sourceMetadata?.householdId, userId:saved.sourceMetadata?.userId, deviceId:saved.sourceMetadata?.deviceId, importedAt:saved.sourceMetadata?.importedAt, receiptId:saved.id, reimbursementStatus:'none'});
    if(linkedId){const result=completeReceiptTask(linkedId,{tasks:this.tasks,xpEvents:this.xpEvents,userScores:this.userScores});this.tasks=result.tasks;this.xpEvents=result.xpEvents;this.userScores=result.userScores;this.lastXPEvent=result.xpEvent}
    await this.rerunDeferredItems({receipts:[saved]});
    return structuredClone(saved);
  }
}

const approveFileImportBase=MockFinanceDataService.prototype.approveFileImport;
MockFinanceDataService.prototype.approveFileImport=async function(preview,userId='demo-member-a'){
  const result=await approveFileImportBase.call(this,preview,userId);
  for(const row of preview.rows.filter(item=>item.financialType==='credit_card_settlement')){const transaction=this.transactions.find(item=>item.date===row.date&&item.amount===row.amount&&item.merchant===row.merchant),event=this.canonicalEvents.find(item=>item.id===transaction?.canonicalEventId);if(transaction)Object.assign(transaction,{countInTotals:false,settlementOfSourceRecordIds:row.reconciliationMatchIds||[],classificationExplanation:row.classificationExplanation});if(event)Object.assign(event,{countInTotals:false,relationship:'credit_card_settlement',settlementOfSourceRecordIds:row.reconciliationMatchIds||[]})}
  for(const row of preview.rows.filter(item=>item.valid&&!item.excluded&&item.reviewStatus==='deferred')){
    const transaction=this.transactions.find(item=>item.date===row.date&&item.amount===row.amount&&item.merchant===row.merchant);
    if(!transaction)continue;Object.assign(transaction,{reviewStatus:'deferred',reviewReason:'לבדיקה מאוחר יותר',countInTotals:false});
    const ensured=ensureDeferredReviewTask(transaction,this.tasks,{dueAt:row.deferUntil||null});this.tasks=ensured.tasks;
  }
  result.transactions=structuredClone(this.transactions);result.canonicalEvents=structuredClone(this.canonicalEvents);result.sourceRecords=structuredClone(this.sourceRecords);result.engagement=await this.getEngagementState();return result;
};

const saveClassificationRuleBase=MockFinanceDataService.prototype.saveClassificationRule;
MockFinanceDataService.prototype.saveClassificationRule=async function(rule){
  const rules=await saveClassificationRuleBase.call(this,rule);
  this.transactions=this.transactions.map(transaction=>{if(transaction.reviewStatus!=='deferred')return transaction;const matched=applySavedClassificationRules(transaction,rules);if(matched?.confidence!=='high')return transaction;this.tasks=closeDeferredReviewTask(transaction.id,this.tasks);return {...transaction,financialType:matched.financialType,category:matched.category,reviewStatus:'resolved_automatically',classificationExplanation:'פתרנו את התעלומה הזאת בשבילך ✓',countInTotals:!['transfer','unknown'].includes(matched.financialType)}});
  return rules;
};

MockFinanceDataService.prototype.rerunDeferredItems=async function(evidence){
  this.transactions=this.transactions.map(transaction=>{if(transaction.reviewStatus!=='deferred')return transaction;const resolved=rerunDeferredReconciliation(transaction,evidence);if(resolved.reviewStatus==='resolved_automatically')this.tasks=closeDeferredReviewTask(transaction.id,this.tasks);return resolved});
  return structuredClone({transactions:this.transactions,engagement:await this.getEngagementState()});
};

MockFinanceDataService.prototype.resolveDeferredTransaction=async function(transactionId,decision){
  const transaction=this.transactions.find(item=>item.id===transactionId);if(!transaction)throw new Error('Transaction not found');Object.assign(transaction,{financialType:decision.financialType,category:decision.category,reviewStatus:'resolved',countInTotals:!['transfer','unknown'].includes(decision.financialType)});
  const task=this.tasks.find(item=>item.type==='transaction_review'&&item.relatedRecordId===transactionId);if(task){const completed=completeTaskExactlyOnce({taskId:task.id,tasks:this.tasks,xpEvents:this.xpEvents,userScores:this.userScores});this.tasks=completed.tasks;this.xpEvents=completed.xpEvents;this.userScores=completed.userScores;this.lastXPEvent=completed.xpEvent}
  return structuredClone({transaction,engagement:await this.getEngagementState()});
};

/** Future adapter: implement these methods against the approved Google Apps Script/API endpoint. */
export class GoogleSheetsFinanceDataService extends FinanceDataService {
  constructor({ endpoint, sheetId }) { super(); this.endpoint = endpoint; this.sheetId = sheetId; }
  async getTransactions() { throw new Error('Google Sheets אינו מחובר עדיין'); }
  async getReceipts() { throw new Error('Google Sheets אינו מחובר עדיין'); }
  async saveReceipt() { throw new Error('שמירה חיצונית דורשת אישור וחיבור'); }
}

export const dataService = new MockFinanceDataService();
