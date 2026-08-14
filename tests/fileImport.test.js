import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseCsv, detectDelimiter, trimTrailingEmptyFields, normalizeRows, buildImportPreview, createValidatedImportPreview, filterPreviewRows, applyReviewDecision, normalizeDate, parseAmount, parseFeeAmount } from '../src/services/fileImport.js';
import { renderFileImport } from '../src/views/fileImportView.js';

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

test('a selected Android-like File reaches the parser with its filename intact',async()=>{
  const text='דוח תנועות\nתאריך,תיאור,חובה,זכות\n12.08.2026,רמי לוי,487.30,';
  const bytes=new TextEncoder().encode(text);
  const file={name:'עובר ושב_13082026_1557.csv',type:'text/csv',size:bytes.byteLength,arrayBuffer:async()=>bytes.buffer};
  const logs=[];
  const result=await createValidatedImportPreview(file,{logger:(label,data)=>logs.push({label,data})});
  assert.equal(result.selected.filename,file.name);
  assert.equal(result.preview.filename,file.name);
  assert.equal(result.preview.summary.totalRows,1);
  assert.equal(result.preview.summary.totalDebits,487.3);
  assert.ok(logs.some(entry=>entry.data.stage==='selected'&&entry.data.filename===file.name));
  assert.ok(logs.some(entry=>entry.data.stage==='parsed'&&entry.data.parserRowCount===3));
});

test('missing filename or zero valid rows cannot become a valid empty preview',async()=>{
  const bytes=new TextEncoder().encode('not a bank export');
  await assert.rejects(()=>createValidatedImportPreview({name:undefined,type:'text/csv',size:bytes.byteLength,arrayBuffer:async()=>bytes.buffer},{logger:()=>{}}),error=>error.code==='missing_filename');
  await assert.rejects(()=>createValidatedImportPreview({name:'empty.csv',type:'text/csv',size:bytes.byteLength,arrayBuffer:async()=>bytes.buffer},{logger:()=>{}}),error=>error.code==='header_not_detected');
});

test('parses a reusable current-account profile with metadata rows and semicolon delimiter',async()=>{
  const text=await readFile(new URL('./fixtures/bank-current-account-structure.csv',import.meta.url),'utf8');
  assert.equal(detectDelimiter(text),';');
  const bytes=new TextEncoder().encode(text);
  const result=await createValidatedImportPreview({name:'bank-export.csv',type:'text/csv',size:bytes.byteLength,arrayBuffer:async()=>bytes.buffer},{logger:()=>{}});
  assert.equal(result.selected.delimiter,';');
  assert.equal(result.parsed.headerRow,2);
  assert.deepEqual(result.parsed.columnMap,{date:0,valueDate:1,description:2,reference:3,debit:4,credit:5,balance:6});
  assert.equal(result.preview.summary.totalRows,2);
  assert.equal(result.preview.summary.totalDebits,487.3);
  assert.equal(result.preview.summary.totalCredits,100);
});

test('detects a UTF-16LE bank export and quoted tab-separated headers',async()=>{
  const text='כותרת דוח\r\n"תאריך רישום"\t"תיאור פעולה"\t"חיוב"\t"זיכוי"\r\n"12.08.2026"\t"עסקה לדוגמה"\t"250.00"\t';
  const body=Buffer.from(text,'utf16le'),bytes=Buffer.concat([Buffer.from([0xff,0xfe]),body]);
  const result=await createValidatedImportPreview({name:'export.csv',type:'text/csv',size:bytes.byteLength,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)},{logger:()=>{}});
  assert.equal(result.selected.encoding,'utf-16le');
  assert.equal(result.selected.delimiter,'\t');
  assert.equal(result.preview.summary.totalDebits,250);
});

test('parses the generic eight-column signed-amount bank profile with trailing delimiters',async()=>{
  const bytes=await readFile(new URL('./fixtures/bank-signed-amount-trailing-delimiter.csv',import.meta.url));
  assert.deepEqual([...bytes.subarray(0,3)],[0xef,0xbb,0xbf]);
  const result=await createValidatedImportPreview({name:'current-account.csv',type:'text/csv',size:bytes.byteLength,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)},{logger:()=>{}});
  assert.equal(result.selected.bom,'utf-8-bom');
  assert.equal(result.selected.delimiter,',');
  assert.equal(result.parsed.headers.length,8);
  assert.ok(result.selected.rows.slice(1).every(row=>row.length===8));
  assert.equal(result.parsed.columnMap.amount,3);
  assert.equal(result.parsed.columnMap.balance,4);
  assert.equal(result.parsed.columnMap.fee,6);
  assert.equal(result.parsed.columnMap.channel,7);
  assert.deepEqual(result.parsed.rows.map(row=>[row.amount,row.direction]),[[100,'debit'],[376.28,'credit'],[1800,'debit']]);
  assert.deepEqual(result.parsed.rows.map(row=>row.runningBalance),[5439.11,5815.39,4015.39]);
  assert.equal(result.preview.summary.totalDebits,1900);
  assert.equal(result.preview.summary.totalCredits,376.28);
});

test('trailing empty fields are removed without collapsing internal blank fields',()=>{
  assert.deepEqual(trimTrailingEmptyFields(['a','','c','','']),['a','','c']);
  const rows=parseCsv('h1,h2,h3\n"value",,"last",');
  assert.deepEqual(rows[1],['value','','last']);
});

test('bank fee is imported as an expense in the bank fees category',()=>{
  const parsed=normalizeRows([['תאריך','תיאור התנועה','זכות/חובה ₪','אסמכתה'],['12/08/26','עמלת פעולה בערוץ ישיר','-2.50','FEE-1']],{filename:'bank.csv'});
  assert.equal(parsed.rows[0].valid,true);
  assert.equal(parsed.rows[0].financialType,'expense');
  assert.equal(parsed.rows[0].category,'עמלות בנק ופיננסים');
  assert.equal(parsed.rows[0].description,'עמלת פעולה בערוץ ישיר');
  assert.equal(parsed.rows[0].reference,'FEE-1');
  assert.equal(parsed.rows[0].reviewStatus,'not_required');
});

test('fee metadata and a dedicated fee row do not create a duplicate fee event',()=>{
  const parsed=normalizeRows([['תאריך','תיאור התנועה','זכות/חובה ₪','עמלה'],['12/08/26','העברה לדוגמה','-100','2.50'],['12/08/26','עמלת בנק','-2.50','2.50']],{filename:'bank.csv'});
  const preview=buildImportPreview(parsed);
  assert.equal(preview.rows.length,2);
  assert.equal(preview.rows[0].feeRepresentation,'metadata_only');
  assert.equal(preview.rows[1].feeRepresentation,'dedicated_row');
  assert.equal(preview.summary.totalDebits,102.5);
});

test('a fee-only column can represent a dedicated fee row',()=>{
  const parsed=normalizeRows([['תאריך','תיאור התנועה','זכות/חובה ₪','עמלה'],['12/08/26','דמי ניהול','','7.25']],{filename:'bank.csv'});
  assert.equal(parsed.rows[0].valid,true);
  assert.equal(parsed.rows[0].amount,7.25);
  assert.equal(parsed.rows[0].feeRepresentation,'fee_column_row');
  assert.equal(parsed.rows[0].category,'עמלות בנק ופיננסים');
});

test('fee-only row accepts localized decimal comma, unicode minus and trailing cells',()=>{
  const csv='תאריך,תיאור התנועה,זכות/חובה ₪,עמלה,ערוץ ביצוע\n"12/08/26","עמלת פעולה בערוץ ישיר","","−1,35","דיגיטלי",,';
  const parsed=normalizeRows(parseCsv(csv),{filename:'synthetic-bank.csv'});
  assert.equal(parsed.rows[0].valid,true);
  assert.equal(parsed.rows[0].amount,1.35);
  assert.equal(parsed.rows[0].financialType,'expense');
  assert.equal(parsed.rows[0].category,'עמלות בנק ופיננסים');
  assert.equal(parsed.rows[0].feeRepresentation,'fee_column_row');
});

test('fee-only row extracts a decorated bank fee amount without double counting metadata',()=>{
  assert.equal(parseFeeAmount('עמלה: 1,35 ש״ח-'),-1.35);
  const parsed=normalizeRows([['תאריך','תיאור התנועה','זכות/חובה ₪','עמלה'],['12/08/26','עמלת פעולה בערוץ ישיר','','עמלה: 1,35 ש״ח-'],['12/08/26','העברה לדוגמה','-100','2.00']],{filename:'synthetic.csv'});
  assert.equal(parsed.rows[0].valid,true);assert.equal(parsed.rows[0].amount,1.35);assert.equal(parsed.rows[0].category,'עמלות בנק ופיננסים');
  assert.equal(parsed.rows[1].feeRepresentation,'metadata_only');assert.equal(buildImportPreview(parsed).summary.totalDebits,101.35);
});

test('review filters return only actionable rows and preserve technical failures separately',()=>{
  const parsed=normalizeRows([['תאריך','תיאור התנועה','זכות/חובה ₪'],['12/08/26','העברה שהתקבלה','500'],['13/08/26','זיכוי אחר','120'],['14/08/26','עסקה רגילה','-80'],['תאריך שגוי','שורה שבורה',''],['15/08/26','עמלת בנק','-3']],{filename:'bank.csv'});
  const preview=buildImportPreview(parsed);
  assert.equal(filterPreviewRows(preview.rows,'review').length,2);
  assert.ok(filterPreviewRows(preview.rows,'review').every(row=>row.reviewStatus==='required'&&row.reviewReason));
  assert.equal(filterPreviewRows(preview.rows,'failed').length,1);
  assert.equal(filterPreviewRows(preview.rows,'failed')[0].parseFailureReason,'לא זוהה תאריך');
  assert.equal(preview.summary.requiresReview,2);
  assert.equal(preview.summary.malformed,1);
});

test('review decision is retained in preview state',()=>{
  const row={valid:true,financialType:'unknown',reviewStatus:'required',reviewReason:'זיכוי לא מסווג',excluded:false};
  const resolved=applyReviewDecision(row,'reimbursement');
  assert.equal(resolved.reviewStatus,'resolved');
  assert.equal(resolved.reviewDecision,'reimbursement');
  assert.equal(resolved.financialType,'reimbursement');
  assert.equal(applyReviewDecision(row,'ignore').excluded,true);
});

test('review reason and action are visible while review filter hides other rows',()=>{
  const rows=[{valid:true,date:'2026-08-12',description:'העברה שהתקבלה',amount:500,direction:'credit',financialType:'unknown',category:null,reference:'',excluded:false,importStatus:'ready',reviewStatus:'required',reviewReason:'העברה פנימית אפשרית'},{valid:true,date:'2026-08-13',description:'עמלת בנק',amount:3,direction:'debit',financialType:'expense',category:'עמלות בנק ופיננסים',reference:'',excluded:false,importStatus:'ready',reviewStatus:'not_required'}];
  const state={fileImportFilter:'review',fileImportPreview:{filename:'demo.csv',selectedSource:'bank_import',dateRange:{from:'2026-08-12',to:'2026-08-13'},rows,summary:{totalRows:2,totalDebits:3,totalCredits:500}},ingestion:{importRuns:[]}};
  const html=renderFileImport(state,{header:()=>''});
  assert.match(html,/העברה פנימית אפשרית/);
  assert.match(html,/data-review-row="0"/);
  assert.doesNotMatch(html,/עמלת בנק/);
  assert.match(html,/חזרה לכל השורות/);
});
