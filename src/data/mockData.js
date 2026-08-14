export const transactions = [
  { id:'t1', date:'2026-08-12', merchant:'רמי לוי', description:'קנייה שבועית', amount:487.30, currency:'ILS', direction:'debit', financialType:'expense', category:'סופר', subcategory:'מזון', source:'כרטיס אשראי', accountId:'card-1', receiptId:null },
  { id:'t2', date:'2026-08-10', merchant:'משכורת', description:'משכורת חודשית', amount:14500, currency:'ILS', direction:'credit', financialType:'income', category:'הכנסה', source:'חשבון בנק' },
  { id:'t3', date:'2026-08-09', merchant:'מקפ״ת', description:'פעילות קהילתית', amount:240, currency:'ILS', direction:'debit', financialType:'expense', category:'איתן', source:'כרטיס אשראי' },
  { id:'t4', date:'2026-08-08', merchant:'עזיזו לבנדר מהגולן', description:'טיול משפחתי', amount:185, currency:'ILS', direction:'debit', financialType:'expense', category:'פנאי ובילויים', source:'כרטיס אשראי', receiptId:'r2' },
  { id:'t5', date:'2026-08-06', merchant:'לאגו שיווק', description:'ברז למטבח', amount:620, currency:'ILS', direction:'debit', financialType:'expense', category:'בית', source:'כרטיס אשראי', receiptId:'r3' },
  { id:'t6', date:'2026-08-07', merchant:'החזר מבעלת הדירה', description:'החזר עבור ברז', amount:620, currency:'ILS', direction:'credit', financialType:'reimbursement', category:'בית', linkedTransactionId:'t5', source:'העברה' },
  { id:'t7', date:'2026-08-04', merchant:'SACARA', description:'טיפוח', amount:129.90, currency:'ILS', direction:'debit', financialType:'expense', category:'איפור וטיפוח', source:'כרטיס אשראי' },
  { id:'t8', date:'2026-08-03', merchant:'מועדון הכדורגל', description:'אימון שמואל', amount:180, currency:'ILS', direction:'debit', financialType:'expense', category:'כדורגל שמואל', source:'הוראת קבע' },
  { id:'t9', date:'2026-08-01', merchant:'העברה בין חשבונות', description:'עו״ש לחיסכון', amount:1000, currency:'ILS', direction:'debit', financialType:'transfer', category:'העברה', source:'חשבון בנק' },
];

export const receipts = [
  { id:'r1', merchant:'שופרסל', purchaseDate:'2026-08-02', total:326.40, fileType:'image', reviewStatus:'approved', linkedTransactionId:null, items:[{rawName:'חלב 3%',quantity:2,totalPrice:13.8,category:'מוצרי חלב'},{rawName:'עגבניות',quantity:1.4,totalPrice:11.9,category:'ירקות'},{rawName:'קורנפלקס',quantity:1,totalPrice:19.9,category:'דגנים'}]},
  { id:'r2', merchant:'עזיזו לבנדר', purchaseDate:'2026-08-08', total:185, fileType:'image', reviewStatus:'approved', linkedTransactionId:'t4', items:[] },
  { id:'r3', merchant:'לאגו שיווק', purchaseDate:'2026-08-06', total:620, fileType:'pdf', reviewStatus:'approved', linkedTransactionId:'t5', items:[] }
];

export const recurring = [
  {name:'משכנתה', amount:4850, next:'2026-09-02', status:'active', change:0},
  {name:'אינטרנט', amount:119.90, next:'2026-09-05', status:'active', change:0},
  {name:'מועדון הכדורגל', amount:180, next:'2026-09-03', status:'active', change:12},
  {name:'שירות סטרימינג', amount:39.90, next:'2026-09-12', status:'active', change:0}
];
