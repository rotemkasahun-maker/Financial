import test from 'node:test'; import assert from 'node:assert/strict';
import { selectFinancialAdapter,FileAdapter,OpenBankingAdapter } from '../src/services/sourceAdapters.js';
import { classifyWithRules,shouldReplaceClassification,DecisionOrigin } from '../src/services/classification.js';
test('bank and card sources can switch adapters',()=>{assert.ok(selectFinancialAdapter({kind:'bank',mode:'file'}) instanceof FileAdapter);assert.ok(selectFinancialAdapter({kind:'card',mode:'provider'}) instanceof OpenBankingAdapter)});
test('household rules preserve known classifications',()=>{assert.equal(classifyWithRules({merchant:'לאגו שיווק'}).category,'בית');assert.equal(classifyWithRules({merchant:'SACARA'}).category,'איפור וטיפוח')});
test('weak automation never overwrites user correction',()=>assert.equal(shouldReplaceClassification({origin:DecisionOrigin.USER,confidence:1},{origin:DecisionOrigin.MODEL,confidence:.99}),false));
