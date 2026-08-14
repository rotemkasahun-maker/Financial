export class ReceiptExtractor { async extract(_file) { throw new Error('Not implemented'); } }
export class MockReceiptExtractor extends ReceiptExtractor {
  async extract(file) {
    await new Promise(r=>setTimeout(r,1100));
    return { merchant:'רמי לוי', purchaseDate:'2026-08-12', total:487.30, paymentMethod:'כרטיס אשראי •••• 4321', category:'סופר', confidence:.93,
      items:[{rawName:'חלב 3%',quantity:2,unitPrice:6.9,totalPrice:13.8,category:'מוצרי חלב',confidence:.96},{rawName:'עגבניות',quantity:2.1,unitPrice:8.5,totalPrice:17.85,category:'ירקות',confidence:.88},{rawName:'לחם כוסמין',quantity:1,unitPrice:18.9,totalPrice:18.9,category:'מאפים',confidence:.91},{rawName:'נייר טואלט',quantity:1,unitPrice:29.9,totalPrice:29.9,category:'ניקיון',confidence:.89}], fileName:file?.name || 'צילום קבלה' };
  }
}
export const receiptExtractor = new MockReceiptExtractor();
