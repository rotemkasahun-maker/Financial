import test from 'node:test';
import assert from 'node:assert/strict';
import { finalizeReviewState, rowRequiresReview } from '../src/services/fileImport.js';
import { createClassificationRule } from '../src/services/classificationRules.js';
import { ensureDeferredReviewTask } from '../src/services/taskEngine.js';
import { MockFinanceDataService } from '../src/services/dataService.js';
import { renderFileImport } from '../src/views/fileImportView.js';

const supportTransaction={id:'synthetic-support',date:'2026-08-10',description:'סיוע משפחתי מחזורי',merchant:'סיוע משפחתי מחזורי',amount:1437,direction:'credit',sourceType:'bank_import',financialType:'unknown',reviewStatus:'required'};
const supportRule=()=>createClassificationRule({id:'synthetic-support-rule',target:'family_support',description:'סיוע משפחתי מחזורי',counterparty:'סיוע משפחתי מחזורי',sourceType:'bank_import',direction:'incoming',typicalAmount:1437,origin:'historical_bootstrap',evidenceCount:3,userApproved:true});

test('final review state clears stale HIGH state and preserves medium review',()=>{const high=finalizeReviewState({valid:true,blocksImport:false,financialType:'family_support',classificationConfidence:'high',reviewStatus:'required',reviewReason:'stale'}),medium=finalizeReviewState({valid:true,blocksImport:false,financialType:'family_support',classificationConfidence:'medium',reviewStatus:'required',reviewReason:'needs confirmation'});assert.equal(high.reviewStatus,'not_required');assert.equal(high.reviewReason,null);assert.equal(rowRequiresReview(high),false);assert.equal(rowRequiresReview(medium),true)});

test('hydrating a HIGH learned rule closes an existing mission without XP',async()=>{const service=new MockFinanceDataService();service.transactions=[supportTransaction];service.tasks=ensureDeferredReviewTask(supportTransaction,[]).tasks;service.xpEvents=[];await service.hydrateClassificationRules([supportRule()]);const [resolved]=await service.getTransactions(),engagement=await service.getEngagementState();assert.equal(resolved.financialType,'family_support');assert.equal(resolved.reviewStatus,'resolved_automatically');assert.equal(resolved.reviewReason,null);assert.equal(engagement.tasks[0].status,'completed');assert.equal(engagement.tasks[0].xpAwarded,false);assert.equal(engagement.xpEvents.length,0)});

test('automatic resolved row has no mission dropdown and keeps manual override',()=>{const row={...supportTransaction,valid:true,financialType:'family_support',category:'עזרה מההורים',classificationConfidence:'high',excluded:false,importStatus:'ready',blocksImport:false},preview={filename:'synthetic.csv',selectedSource:'bank_import',dateRange:{from:row.date,to:row.date},summary:{totalRows:1,totalDebits:0,totalCredits:row.amount},rows:[row]},html=renderFileImport({fileImportPreview:preview,fileImportFilter:'all',showAutomaticImports:true,ingestion:{importRuns:[]}},{header:()=>''});assert.doesNotMatch(html,/data-review-row/);assert.doesNotMatch(html,/משימת XP/);assert.match(html,/data-override-row/)});

test('HIGH resolved card settlement clears stale review and remains zero impact',()=>{const row=finalizeReviewState({valid:true,blocksImport:false,financialType:'credit_card_settlement',classificationConfidence:'high',countInTotals:false,reviewStatus:'required',reviewReason:'stale settlement review'});assert.equal(rowRequiresReview(row),false);assert.equal(row.reviewStatus,'not_required');assert.equal(row.countInTotals,false)});

test('critical integrity issue remains in review even with HIGH classification',()=>{const row=finalizeReviewState({valid:true,blocksImport:true,financialType:'credit_card_settlement',classificationConfidence:'high',reviewStatus:'required',reviewReason:'כפילות אפשרית'});assert.equal(rowRequiresReview(row),true);assert.equal(row.reviewStatus,'required')});
