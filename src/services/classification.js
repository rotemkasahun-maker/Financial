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

export function classifyCapitalAllocation(record){if(!['debit','outgoing'].includes(record.direction))return null;const text=`${record.merchant||''} ${record.description||''}`;if(/העבר.*חיסכון|חיסכון משפחתי|תכנית חיסכון|פיקדון/i.test(text))return {financialType:'savings_transfer',allocationType:'savings',category:'חיסכון',origin:DecisionOrigin.HOUSEHOLD_RULE,confidence:.98,countInExpenseTotals:false};if(/העבר.*השקע|חשבון השקעות|תיק ניירות|קרן השתלמות/i.test(text))return {financialType:'investment_transfer',allocationType:'investment',category:'השקעות',origin:DecisionOrigin.HOUSEHOLD_RULE,confidence:.98,countInExpenseTotals:false};return null;}

export function classifyBankFee(record){const text=`${record.merchant||''} ${record.description||''}`.trim();if(!text)return null;const highConfidence=/עמלת פעולה בערוץ ישיר|עמלת הקצאת אשראי|עמלת בנק|דמי ניהול|דמי טיפול|עמלת שירות|עמלת שורה|^עמלה(?:\s|$)/i.test(text);return highConfidence?{financialType:'expense',category:'עמלות בנק ופיננסים',origin:DecisionOrigin.HOUSEHOLD_RULE,confidence:.99,countInExpenseTotals:true}:null;}

export function classifyKnownIncoming(record){if(!['credit','incoming'].includes(record.direction))return null;const text=`${record.merchant||''} ${record.description||''}`.trim();if(/משכורת|שכר עבודה|תשלום שכר/i.test(text))return {financialType:'income',category:'הכנסה שוטפת',origin:DecisionOrigin.HOUSEHOLD_RULE,confidence:.98};return null}
