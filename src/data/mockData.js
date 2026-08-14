export const transactions = [
  { id:'t1', date:'2026-08-12', merchant:'רמי לוי', description:'קנייה שבועית', amount:487.30, currency:'ILS', direction:'debit', financialType:'expense', category:'סופר', subcategory:'מזון', source:'כרטיס אשראי', sourceType:'credit_card_import', sourceAccount:'כרטיס משפחתי •••• 4321', accountId:'card-1', receiptId:null, reimbursementStatus:'none' },
  { id:'t2', date:'2026-08-10', merchant:'משכורת', description:'משכורת חודשית', amount:14500, currency:'ILS', direction:'credit', financialType:'income', category:'הכנסה', source:'חשבון בנק', sourceType:'bank_import', sourceAccount:'עו״ש משפחתי' },
  { id:'t3', date:'2026-08-09', merchant:'מקפ״ת', description:'פעילות קהילתית', amount:240, currency:'ILS', direction:'debit', financialType:'expense', category:'איתן', source:'כרטיס אשראי', sourceType:'credit_card_import', sourceAccount:'כרטיס משפחתי •••• 4321' },
  { id:'t4', date:'2026-08-08', merchant:'עזיזו לבנדר מהגולן', description:'טיול משפחתי', amount:185, currency:'ILS', direction:'debit', financialType:'expense', category:'פנאי ובילויים', source:'כרטיס אשראי', sourceType:'credit_card_import', sourceAccount:'כרטיס משפחתי •••• 4321', receiptId:'r2' },
  { id:'t5', date:'2026-08-06', merchant:'לאגו שיווק', description:'ברז למטבח', amount:620, currency:'ILS', direction:'debit', financialType:'expense', category:'בית', source:'כרטיס אשראי', sourceType:'credit_card_import', sourceAccount:'כרטיס משפחתי •••• 4321', receiptId:'r3', reimbursementStatus:'fully_reimbursed' },
  { id:'t6', date:'2026-08-07', merchant:'החזר מבעלת הדירה', description:'החזר עבור ברז', amount:620, currency:'ILS', direction:'credit', financialType:'reimbursement', category:'בית', linkedTransactionId:'t5', source:'העברה', sourceType:'bank_import', sourceAccount:'עו״ש משפחתי', reimbursementStatus:'linked' },
  { id:'t7', date:'2026-08-04', merchant:'SACARA', description:'טיפוח', amount:129.90, currency:'ILS', direction:'debit', financialType:'expense', category:'איפור וטיפוח', source:'כרטיס אשראי', sourceType:'credit_card_import', sourceAccount:'כרטיס אישי •••• 1180' },
  { id:'t8', date:'2026-08-03', merchant:'מועדון הכדורגל', description:'אימון שמואל', amount:180, currency:'ILS', direction:'debit', financialType:'expense', category:'כדורגל שמואל', source:'הוראת קבע', sourceType:'bank_import', sourceAccount:'עו״ש משפחתי' },
  { id:'t9', date:'2026-08-01', merchant:'העברה לחיסכון', description:'עו״ש לחיסכון משפחתי', amount:1000, currency:'ILS', direction:'debit', financialType:'savings_transfer', allocationType:'savings', category:'חיסכון', source:'חשבון בנק', sourceType:'bank_import', sourceAccount:'עו״ש משפחתי' },
  { id:'t10', date:'2026-08-01', merchant:'ויקטורי', description:'השלמות לסוף שבוע', amount:214.50, currency:'ILS', direction:'debit', financialType:'expense', category:'סופר', subcategory:'מזון', source:'קבלה', sourceType:'manual_upload', sourceAccount:'רותם', receiptId:'r4' },
  { id:'t11', date:'2026-08-05', merchant:'תמיכה משפחתית', description:'דוגמה לעזרה חודשית מההורים', amount:1500, currency:'ILS', direction:'credit', financialType:'family_support', category:'עזרה מההורים', source:'חשבון בנק', sourceType:'bank_import', sourceAccount:'עו״ש משפחתי' },
];

export const receipts = [
  { id:'r1', merchant:'שופרסל', supermarket:'שופרסל', purchaseDate:'2026-08-02', total:326.40, fileType:'image', sourceType:'camera_capture', userId:'demo-member-b', reviewStatus:'approved', linkedTransactionId:null, items:[{rawName:'חלב 3%',quantity:2,totalPrice:13.8,category:'מוצרי חלב'},{rawName:'עגבניות',quantity:1.4,totalPrice:11.9,category:'ירקות'},{rawName:'קורנפלקס',quantity:1,totalPrice:19.9,category:'דגנים'},{rawName:'נייר טואלט',quantity:1,totalPrice:34.9,category:'ניקיון'},{rawName:'תפוחים',quantity:2,totalPrice:22.8,category:'פירות'},{rawName:'לחם מלא',quantity:1,totalPrice:16.9,category:'מאפים'}]},
  { id:'r2', merchant:'עזיזו לבנדר', purchaseDate:'2026-08-08', total:185, fileType:'image', reviewStatus:'approved', linkedTransactionId:'t4', items:[] },
  { id:'r3', merchant:'לאגו שיווק', purchaseDate:'2026-08-06', total:620, fileType:'pdf', reviewStatus:'approved', linkedTransactionId:'t5', items:[] }
  ,{ id:'r4', merchant:'ויקטורי', supermarket:'ויקטורי', purchaseDate:'2026-08-01', total:214.50, fileType:'image', sourceType:'manual_upload', userId:'demo-member-a', reviewStatus:'approved', linkedTransactionId:'t10', items:[{rawName:'מלפפונים',quantity:1.2,totalPrice:9.5,category:'ירקות'},{rawName:'גבינה לבנה',quantity:2,totalPrice:12.8,category:'מוצרי חלב'},{rawName:'מים מינרליים',quantity:1,totalPrice:17.9,category:'שתייה'},{rawName:'חטיף בייגלה',quantity:2,totalPrice:15.8,category:'חטיפים ומתוקים'}]}
];

export const recurring = [
  {id:'rec-save',name:'חיסכון חודשי',amount:1500,next:'2026-08-20',status:'active',financialType:'savings_transfer',allocationType:'savings',change:0},
  {id:'rec-invest',name:'השקעה חודשית',amount:800,next:'2026-08-22',status:'active',financialType:'investment_transfer',allocationType:'investment',change:0},
  {name:'משכנתה', amount:4850, next:'2026-09-02', status:'active', change:0},
  {name:'אינטרנט', amount:119.90, next:'2026-09-05', status:'active', change:0},
  {name:'מועדון הכדורגל', amount:180, next:'2026-09-03', status:'active', change:12},
  {name:'שירות סטרימינג', amount:39.90, next:'2026-09-12', status:'active', change:0}
];
