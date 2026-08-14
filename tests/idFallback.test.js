import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateId } from '../src/utils/id.js';
import { createReceipt, createImportEnvelope } from '../src/models.js';
import { createClassificationRule } from '../src/services/classificationRules.js';
import { analyzeHistoricalRecords } from '../src/services/historicalLearning.js';
import { renderHistoricalLearning } from '../src/views/historicalLearningView.js';

test('ID generation falls back when crypto.randomUUID is unavailable',()=>{
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto');
  Object.defineProperty(globalThis,'crypto',{configurable:true,value:{getRandomValues(bytes){for(let i=0;i<bytes.length;i++)bytes[i]=(i*17+3)%256;return bytes}}});
  try{const first=generateId('mobile'),second=generateId('mobile');assert.match(first,/^mobile-/);assert.notEqual(first,second);assert.doesNotThrow(()=>createReceipt({merchant:'בדיקה'}));assert.doesNotThrow(()=>createImportEnvelope({sourceType:'camera_capture',payload:{},userId:'u',deviceId:'android'}));assert.doesNotThrow(()=>createClassificationRule({target:'expense',direction:'outgoing',description:'בדיקה'}));assert.doesNotThrow(()=>analyzeHistoricalRecords([{description:'בדיקה',userClassification:'expense',direction:'debit'}]))}finally{if(descriptor)Object.defineProperty(globalThis,'crypto',descriptor);else delete globalThis.crypto}
});

test('fallback also works without a crypto object',()=>{const descriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto');Object.defineProperty(globalThis,'crypto',{configurable:true,value:undefined});try{assert.notEqual(generateId('local'),generateId('local'))}finally{if(descriptor)Object.defineProperty(globalThis,'crypto',descriptor);else delete globalThis.crypto}});

test('historical learning is absent from ordinary navigation and remains an internal route',()=>{const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8'),navBlock=app.match(/const nav=\[(.*?)\];/s)?.[1]||'',menuBlock=app.match(/const menuGroups=\[(.*?)\];/s)?.[1]||'';assert.doesNotMatch(navBlock,/historicalLearning|למידה מההיסטוריה/);assert.doesNotMatch(menuBlock,/historicalLearning|למידה מההיסטוריה/);assert.match(app,/setup.*historical-learning/)});

test('internal bootstrap keeps multi-file workflow and can be completed',()=>{const html=renderHistoricalLearning({historicalLearning:null,historicalLearningError:null,bootstrapComplete:false},{header:(title,sub)=>`<h1>${title}</h1><p>${sub}</p>`});assert.match(html,/id="historicalFiles"[^>]*multiple/);const completed=renderHistoricalLearning({bootstrapComplete:true},{header:()=>''});assert.match(completed,/הלמידה ההיסטורית הושלמה/);assert.match(completed,/חזרה לאפליקציה/)});

test('application source has no unsafe direct randomUUID calls',()=>{for(const path of ['../src/models.js','../src/services/dataService.js','../src/services/taskEngine.js','../src/services/reconciliation.js','../src/services/historicalLearning.js','../src/services/classificationRules.js'])assert.doesNotMatch(readFileSync(new URL(path,import.meta.url),'utf8'),/crypto\.randomUUID\s*\(/)});
