export const DecisionOrigin=Object.freeze({USER:'user_correction',HOUSEHOLD_RULE:'household_rule',MODEL:'model',SUGGESTION:'suggestion'});
const precedence={[DecisionOrigin.USER]:4,[DecisionOrigin.HOUSEHOLD_RULE]:3,[DecisionOrigin.MODEL]:2,[DecisionOrigin.SUGGESTION]:1};
export function shouldReplaceClassification(existing,incoming){if(!existing)return true;return precedence[incoming.origin]>precedence[existing.origin]||(precedence[incoming.origin]===precedence[existing.origin]&&Number(incoming.confidence)>Number(existing.confidence));}
export const householdRules=[
  {pattern:/מקפ[״\"]?ת|מקפת - מרכזים קהילתי/i,category:'איתן',origin:DecisionOrigin.HOUSEHOLD_RULE},
  {pattern:/SACARA|סקארה/i,category:'איפור וטיפוח',origin:DecisionOrigin.HOUSEHOLD_RULE},
  {pattern:/לאגו שיווק/i,category:'בית',origin:DecisionOrigin.HOUSEHOLD_RULE,reimbursementExpected:true},
  {pattern:/עזיזו לבנדר/i,category:'פנאי ובילויים',origin:DecisionOrigin.HOUSEHOLD_RULE},
  {pattern:/כדורגל.*שמואל|שמואל.*כדורגל/i,category:'כדורגל שמואל',origin:DecisionOrigin.HOUSEHOLD_RULE}
];
export function classifyWithRules(record){const text=`${record.merchant||''} ${record.description||''}`;const rule=householdRules.find(r=>r.pattern.test(text));return rule?{category:rule.category,origin:rule.origin,confidence:1,reimbursementExpected:Boolean(rule.reimbursementExpected)}:null;}
