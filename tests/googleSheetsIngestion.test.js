import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptExpensesSheetRows, adaptBankSheetRows, adaptIncomeSheetRows, adaptEvidenceRows, adaptReviewRows, buildCandidateInventory, reconcileCandidates, describeMalformedRows, compareRerunIdentities, normalizeSheetReference, semanticDiagnostics, finalSafeImportSummary } from '../backend/googleSheetsIngestion.ts';

const headers = ['תאריך עסקה','חודש קנייה','חודש חיוב','בית עסק','קטגוריה','סכום חיוב','מקור','הערה','סוג הוצאה','תת-קטגוריה','דורש החלטה?'];
const row = (date, merchant, amount, kind, review='') => [date,'2026-06','2026-07',merchant,'כללי',amount,'Sheet','',kind,'',review];

test('expenses adapter preserves review, semantics, provenance and installment rows', () => {
  const result = adaptExpensesSheetRows([headers,
    row('2026-06-01','חנות',120,'הוצאה'),
    row('2026-06-02','זיכוי',80,'זיכוי'),
    row('2026-06-03','PayBox',500,'התחשבנות'),
    row('2026-06-04','חנות בתשלומים',40,'הוצאה','כן'),
    row('2026-06-04','חנות בתשלומים',40,'הוצאה')
  ]);
  assert.equal(result.rows.length, 5);
  assert.equal(result.reviewRows, 1);
  assert.equal(result.rows[1].financialType, 'refund');
  assert.equal(result.rows[2].financialType, 'transfer');
  assert.equal(result.rows[2].countInTotals, false);
  assert.equal(result.rows[3].excluded, true);
  assert.equal(result.rows[0].purchaseMonth, '2026-06');
  assert.equal(result.rows[0].billingMonth, '2026-07');
  assert.equal(result.rows[0].externalSourceId, 'sheet:19XaIrFj64ozMOvviU4U9We3_7gD8bW40TdLaWM2iXWc:הוצאות:2');
  assert.notEqual(result.rows[3].externalSourceId, result.rows[4].externalSourceId);
});

test('structured semantic fields override amount sign and preserve review reporting', () => {
  const positiveRow = row('2026-06-05','זיכוי',25,'',''); positiveRow[4] = 'זיכויים והחזרים';
  const positive = adaptExpensesSheetRows([headers, positiveRow]).rows[0];
  const negative = adaptExpensesSheetRows([headers, row('2026-06-06','זיכוי',-25,'זיכוי','כן')]).rows[0];
  const reimbursement = adaptExpensesSheetRows([headers, row('2026-06-07','החזר',50,'החזר הוצאות')]).rows[0];
  const savings = adaptExpensesSheetRows([headers, row('2026-06-08','חיסכון',100,'חיסכון')]).rows[0];
  assert.equal(positive.financialType, 'refund'); assert.equal(positive.direction, 'credit');
  assert.equal(negative.financialType, 'refund'); assert.equal(negative.direction, 'credit');
  assert.equal(reimbursement.financialType, 'reimbursement');
  assert.equal(savings.countInTotals, false);
  assert.equal(negative.reviewRequired, true); assert.equal(negative.excluded, true);
});

test('generic refund language is a fallback while structured settlement wins', () => {
  const credit = row('2026-06-09','ספק',10,''); credit[4] = 'זיכוי';
  const refund = row('2026-06-10','ספק',11,''); refund[7] = 'החזר';
  const settlement = row('2026-06-11','ספק',12,'התחשבנות'); settlement[7] = 'החזר';
  const ordinary = row('2026-06-12','ספק',13,'הוצאה');
  assert.equal(adaptExpensesSheetRows([headers, credit]).rows[0].financialType, 'refund');
  assert.equal(adaptExpensesSheetRows([headers, refund]).rows[0].financialType, 'refund');
  assert.equal(adaptExpensesSheetRows([headers, settlement]).rows[0].financialType, 'transfer');
  assert.equal(adaptExpensesSheetRows([headers, ordinary]).rows[0].financialType, 'expense');
});

test('bank and income adapters preserve semantics and stable source identity', () => {
  const bank = adaptBankSheetRows([
    ['תאריך','חודש','סוג תנועה','סכום','כיוון','הערה','קטגוריה'],
    ['2026-06-01','2026-06','משכורת',1000,'הכנסה','',''],
    ['2026-06-02','2026-06','העברה',200,'הוצאה','חיסכון','חיסכון והשקעות'],
    ['2026-06-03','2026-06','חיוב',500,'הוצאה','לא נכלל בסיכום – העסקאות מפורטות בגיליון הוצאות',''],
    ['2026-06-04','2026-06','זיכוי',50,'הכנסה','החזר','']
  ]);
  assert.equal(bank.rows[0].financialType, 'income');
  assert.equal(bank.rows[1].financialType, 'savings_transfer');
  assert.equal(bank.rows[1].countInTotals, false);
  assert.equal(bank.rows[2].financialType, 'transfer');
  assert.equal(bank.rows[2].countInTotals, false);
  assert.equal(bank.rows[3].financialType, 'reimbursement');
  assert.match(bank.rows[0].externalSourceId, /^sheet:.*:תנועות בנק:/);
  const income = adaptIncomeSheetRows([
    ['תאריך','חודש','מקור הכנסה','סכום','כיוון','מזהה מקור','הערה'],
    ['2026-06-01','2026-06','תמיכה מההורים',300,'הכנסה','',''],
    ['2026-06-02','2026-06','שיפוי',100,'החזר','תנועות בנק!A4:D4','']
  ]);
  assert.equal(income.rows[0].financialType, 'family_support');
  assert.equal(income.rows[1].financialType, 'reimbursement');
  assert.equal(income.rows[0].direction, 'credit');
});

test('evidence and review adapters never produce importable transaction semantics', () => {
  const evidence = adaptEvidenceRows([['תאריך','תיאור','סכום'],['2026-06-01','פריט קבלה',10]], 'קבלות - מיקרו');
  assert.equal(evidence.rows[0].evidence, true);
  assert.equal(evidence.rows[0].financialType, undefined);
  const review = adaptReviewRows([['תאריך','תיאור','סכום'],['2026-06-01','לא ברור',10]]);
  assert.equal(review.rows[0].reviewRequired, true);
  assert.equal(review.rows[0].excluded, true);
});

test('validation inventory and cross-source reconciliation are read-only and identity based', () => {
  const expense = { sourceType:'google_sheet_הוצאות', sourceRowIdentity:'2', externalSourceId:'sheet:book:הוצאות:2', date:'2026-06-01', amount:10, merchant:'Shop', financialType:'expense' };
  const bank = { sourceType:'google_sheet_תנועות בנק', sourceRowIdentity:'9', externalSourceId:'sheet:book:תנועות בנק:9', sourceReference:expense.externalSourceId, date:'2026-06-01', amount:10, merchant:'Shop', financialType:'expense' };
  const inventory = buildCandidateInventory([expense, bank], [{ sourceType:'google_sheet_קבלות - מיקרו', sourceRowIdentity:'4', evidence:true }]);
  assert.equal(inventory.bySource['google_sheet_הוצאות'], 1); assert.equal(inventory.evidenceOnly.length, 1);
  const report = reconcileCandidates([expense, bank]);
  assert.equal(report.exactSourceReferenceMatches, 1); assert.equal(report.suppressed, 1); assert.equal(report.candidatesAfterReconciliation, 1);
  assert.equal(describeMalformedRows({ malformed:[7] }, 'הוצאות', '2026-06').length, 1);
  assert.deepEqual(compareRerunIdentities([expense], [expense]).mismatchedIdentityCount, 0);
});

test('date adapters accept ISO and DD/MM/YYYY in the same tab', () => {
  const result = adaptBankSheetRows([
    ['תאריך','חודש','סוג תנועה','סכום','כיוון','הערה','קטגוריה'],
    ['2026-08-16','2026-08','חיוב',10,'הוצאה','',''],
    ['17/08/2026','2026-08','חיוב',20,'הוצאה','','']
  ]);
  assert.deepEqual(result.rows.map(row => row.date), ['2026-08-16','2026-08-17']);
});

test('normalizes Hebrew A1 source references and explicit representations', () => {
  assert.equal(normalizeSheetReference('תנועות בנק!A48:D48', 'book'), 'sheet:book:תנועות בנק:48');
  const expense = { sourceType:'google_sheet_הוצאות', sourceRowIdentity:'48', externalSourceId:'sheet:19XaIrFj64ozMOvviU4U9We3_7gD8bW40TdLaWM2iXWc:הוצאות:48', date:'2026-06-01', amount:10, merchant:'x', financialType:'expense' };
  const bank = { sourceType:'google_sheet_תנועות בנק', sourceRowIdentity:'9', externalSourceId:'sheet:19XaIrFj64ozMOvviU4U9We3_7gD8bW40TdLaWM2iXWc:תנועות בנק:9', sourceReference:'הוצאות!A48:D48', explicitRepresentation:true, date:'2026-06-01', amount:10, merchant:'x', financialType:'transfer' };
  const report = reconcileCandidates([expense, bank]);
  assert.equal(report.explicitRepresentationMatches, 1);
});

test('validation diagnostics expose metadata only and deterministic final hash', () => {
  const rows = [{ externalSourceId:'sheet:x:הוצאות:2', sourceType:'google_sheet_הוצאות', financialType:'expense', reviewRequired:false }];
  const d = semanticDiagnostics(rows)[0]; assert.equal(d.stableSourceIdentity, rows[0].externalSourceId); assert.equal('merchant' in d, false); assert.deepEqual(finalSafeImportSummary(rows), finalSafeImportSummary(rows));
});

test('merchant wording alone does not imply a refund', () => {
  const item = adaptExpensesSheetRows([headers, row('2026-06-20','מנהרות הכרמל-זיכוי',30,'הוצאה')]).rows[0];
  assert.equal(item.financialType, 'expense');
});
