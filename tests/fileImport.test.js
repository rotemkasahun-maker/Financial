import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, normalizeRows, buildImportPreview, normalizeDate, parseAmount } from '../src/services/fileImport.js';

test('parses an Israeli bank CSV with a title row and debit/credit columns',()=>{
  const csv='דוח תנועות לחשבון\nתאריך,תיאור,חובה,זכות,אסמכתא\n12.08.2026,רמי לוי,"487.30",,abc-1\n13.08.2026,החזר מחבר,,100,abc-2';
  const parsed=normalizeRows(parseCsv(csv),{filename:'bank-export.csv'});
  assert.equal(parsed.headerRow,1);
  assert.equal(parsed.detectedSource,'bank_import');
  assert.deepEqual(parsed.rows.map(row=>[row.date,row.amount,row.direction]),[['2026-08-12',487.3,'debit'],['2026-08-13',100,'credit']]);
});

test('normalizes signed amounts, Israeli dates and Excel serial dates',()=>{
  assert.equal(parseAmount('(1,234.50 ₪)'),-1234.5);
  assert.equal(parseAmount('250-'),-250);
  assert.equal(normalizeDate('12/08/2026'),'2026-08-12');
  assert.equal(normalizeDate(46246),'2026-08-12');
});

test('preview marks an existing transaction and preserves a receipt match',()=>{
  const parsed=normalizeRows([['תאריך','בית עסק','סכום','אסמכתא'],['12.08.2026','רמי לוי','-487.30','abc-1']],{filename:'card.csv'});
  const preview=buildImportPreview(parsed,{existingTransactions:[{id:'tx-1',date:'2026-08-12',amount:487.3,merchant:'רמי לוי',externalSourceId:'abc-1'}],existingReceipts:[{id:'receipt-1',purchaseDate:'2026-08-12',total:487.3}]});
  assert.equal(preview.rows[0].importStatus,'existing');
  assert.equal(preview.rows[0].matchingReceiptId,'receipt-1');
  assert.equal(preview.summary.existingTransactions,1);
});

test('malformed rows remain visible and are not importable',()=>{
  const parsed=normalizeRows([['תאריך','תיאור','סכום'],['לא תאריך','שורה שבורה','abc']],{filename:'unknown.csv'});
  const preview=buildImportPreview(parsed);
  assert.equal(preview.rows[0].valid,false);
  assert.equal(preview.summary.malformed,1);
});

test('explicit bank transfers to savings and investments are not proposed as expenses',()=>{
  const parsed=normalizeRows([['תאריך','תיאור','חובה','זכות'],['15.08.2026','העברה לחיסכון משפחתי','1,500',''],['16.08.2026','העברה לחשבון השקעות','800','']],{filename:'bank.csv'});
  assert.deepEqual(parsed.rows.map(row=>[row.financialType,row.allocationType,row.category]),[['savings_transfer','savings','חיסכון'],['investment_transfer','investment','השקעות']]);
});
