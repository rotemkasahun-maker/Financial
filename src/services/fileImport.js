import { classifyWithRules, classifyCapitalAllocation, classifyBankFee, classifyKnownIncoming } from './classification.js';
import { findReceiptMatches } from './finance.js';
import { applySavedClassificationRules, categoryFor } from './classificationRules.js';
import { reconcileBeforeReview } from './reviewReconciliation.js';
import { classifyPsychologicalTreatment } from './reimbursementTracking.js';

export const COLUMN_ALIASES={
  date:['תאריך','תאריך עסקה','תאריך פעולה','תאריך ביצוע','תאריך רישום','תאריך התנועה','transaction date','date'],
  valueDate:['תאריך ערך','יום ערך','value date'],
  description:['בית עסק','תיאור','תאור','תיאור התנועה','תאור התנועה','תיאור תנועה','תאור תנועה','תיאור פעולה','תאור פעולה','פרטי פעולה','פרטי התנועה','פירוט','שם בית עסק','description','merchant'],
  debit:['חובה','חיוב','סכום חובה','סכום חיוב','חובה בשח','חיוב בשח','סכום חובה בשח','משיכה','debit'],
  credit:['זכות','זיכוי','סכום זכות','סכום זיכוי','זכות בשח','זיכוי בשח','סכום זכות בשח','הפקדה','credit'],
  amount:['סכום','סכום עסקה','סכום תנועה','סכום הפעולה','סכום בשח','סכום בשקלים','זכות/חובה ₪','זכות חובה ₪','amount'],
  balance:['יתרה','יתרה ₪','יתרה בשח','running balance','balance'],
  reference:['אסמכתא','מספר אסמכתא','אסמכתה','מס אסמכתא','reference'],
  card:['כרטיס','מספר כרטיס','card'],
  account:['חשבון','מספר חשבון','account'],
  status:['סטטוס','מצב עסקה','transaction status'],
  fee:['עמלה','סכום עמלה','fee'],
  channel:['ערוץ ביצוע','ערוץ','אופן ביצוע','channel']
};

const normalizeHeader=value=>String(value??'').replace(/^\uFEFF/,'').replace(/[\u200e\u200f\u202a-\u202e]/g,'').replace(/[״׳'"]/g,'').replace(/[.:()\[\]_/\\-]/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
const clean=value=>normalizeHeader(value);
const normalizedAliases=Object.fromEntries(Object.entries(COLUMN_ALIASES).map(([field,aliases])=>[field,aliases.map(normalizeHeader)]));
const matchesAlias=(header,alias)=>header===alias||(alias.length>=5&&(header.startsWith(`${alias} `)||header.endsWith(` ${alias}`)));

export function parseCsv(text,delimiter=detectDelimiter(text)){
  const rows=[];let row=[],cell='',quoted=false;
  const source=String(text??'').replace(/^\uFEFF/,'');
  for(let index=0;index<source.length;index++){
    const character=source[index];
    if(character==='"'){if(quoted&&source[index+1]==='"'){cell+='"';index++}else quoted=!quoted}
    else if(character===delimiter&&!quoted){row.push(cell);cell=''}
    else if((character==='\n'||character==='\r')&&!quoted){if(character==='\r'&&source[index+1]==='\n')index++;row.push(cell);row=trimTrailingEmptyFields(row);if(row.some(value=>String(value).trim()))rows.push(row);row=[];cell=''}
    else cell+=character;
  }
  row.push(cell);row=trimTrailingEmptyFields(row);if(row.some(value=>String(value).trim()))rows.push(row);
  return rows;
}

export function trimTrailingEmptyFields(row){const normalized=[...row];while(normalized.length&&String(normalized.at(-1)??'').trim()==='')normalized.pop();return normalized}

const countDelimiter=(line,delimiter)=>{let count=0,quoted=false;for(let index=0;index<line.length;index++){if(line[index]==='"'){if(quoted&&line[index+1]==='"')index++;else quoted=!quoted}else if(line[index]===delimiter&&!quoted)count++}return count};
export function detectDelimiter(text){
  const declaration=String(text??'').match(/^sep=(.)\s*$/im);if(declaration)return declaration[1];
  const lines=String(text??'').split(/\r?\n/).filter(line=>line.trim()).slice(0,40);
  const candidates=[',',';','\t','|'];
  return candidates.map(delimiter=>{const counts=lines.map(line=>countDelimiter(line,delimiter)).filter(Boolean);const frequency=counts.length,mode=counts.sort((a,b)=>counts.filter(x=>x===b).length-counts.filter(x=>x===a).length)[0]||0;return {delimiter,score:frequency*3+mode,frequency}}).sort((a,b)=>b.score-a.score)[0]?.delimiter||',';
}

export function detectHeaderRow(rows){
  let best={index:-1,score:0,map:{},headers:[]};
  rows.slice(0,80).forEach((row,index)=>{const map={};row.forEach((value,column)=>{const header=normalizeHeader(value);for(const [field,aliases] of Object.entries(normalizedAliases))if(map[field]===undefined&&aliases.some(alias=>matchesAlias(header,alias)))map[field]=column});const hasAmount=map.amount!==undefined||map.debit!==undefined||map.credit!==undefined;const score=Object.keys(map).length+(map.date!==undefined?3:0)+(map.description!==undefined?2:0)+(hasAmount?3:0);if(score>best.score)best={index,score,map,headers:row.map(value=>String(value??'').trim())}});
  return best.score>=7&&best.map.date!==undefined&&best.map.description!==undefined&&(best.map.amount!==undefined||best.map.debit!==undefined||best.map.credit!==undefined)?best:null;
}

export function normalizeDate(value){if(value instanceof Date&&!isNaN(value))return value.toISOString().slice(0,10);if(typeof value==='number'){const date=new Date(Date.UTC(1899,11,30)+value*86400000);return date.toISOString().slice(0,10)}const text=String(value??'').trim();const match=text.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/);if(match){const year=match[3].length===2?`20${match[3]}`:match[3];return `${year}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}`}if(/^\d{4}-\d{2}-\d{2}/.test(text))return text.slice(0,10);return null}
export function parseAmount(value){if(value===null||value===undefined||value==='')return null;if(typeof value==='number')return Number.isFinite(value)?value:null;let text=String(value).trim().replace(/[₪\u00a0\u200e\u200f\s]/g,'').replace(/[−–—]/g,'-');const negative=/^\(.*\)$/.test(text)||text.endsWith('-')||text.startsWith('-');text=text.replace(/[()]/g,'').replace(/^-|-$/g,'');const decimalComma=/^\d+,\d{1,2}$/.test(text)&&!text.includes('.');text=decimalComma?text.replace(',','.'):text.replace(/,/g,'');const number=Number(text);return Number.isFinite(number)?(negative?-Math.abs(number):number):null}
export function parseFeeAmount(value){const direct=parseAmount(value);if(direct!==null)return direct;const cleaned=String(value??'').replace(/ש[״"']?ח|ILS|NIS|₪/gi,' ').replace(/[−–—]/g,'-'),negative=/-\s*$|^\s*-/u.test(cleaned);const numeric=cleaned.match(/\d[\d,.]*/u)?.[0],parsed=numeric?parseAmount(numeric):null;return parsed===null?null:negative?-Math.abs(parsed):parsed}
export function detectSource({filename='',headers=[]}){const text=clean(`${filename} ${headers.join(' ')}`);if(/כרטיס|אשראי|visa|mastercard|ישראכרט|max|cal/.test(text))return {source:'credit_card_import',confidence:.9};if(/בנק|חשבון|עוש|תאריך ערך|יום ערך|חובה|זכות|יתרה/.test(text))return {source:'bank_import',confidence:.82};return {source:'unknown_financial_export',confidence:.35}}

export function normalizeRows(rows,{filename='import',selectedSource=null,classificationRules=[],reconciliationEvidence={}}={}){
  const header=detectHeaderRow(rows);if(!header)return {filename,error:'לא נמצאה שורת כותרות פיננסית',rows:[],malformed:rows.length,selectedSource:selectedSource||'unknown_financial_export'};
  const headers=rows[header.index],detected=detectSource({filename,headers}),source=selectedSource||detected.source,normalized=[];
  for(let index=header.index+1;index<rows.length;index++){
    const raw=rows[index],date=normalizeDate(raw[header.map.date]),valueDate=header.map.valueDate===undefined?null:normalizeDate(raw[header.map.valueDate]),description=String(raw[header.map.description]??'').trim();let amount=null,direction='unknown';
    if(header.map.debit!==undefined||header.map.credit!==undefined){const debit=parseAmount(raw[header.map.debit]),credit=parseAmount(raw[header.map.credit]);if(debit){amount=Math.abs(debit);direction='debit'}else if(credit){amount=Math.abs(credit);direction='credit'}}else{const signed=parseAmount(raw[header.map.amount]);if(signed!==null){amount=Math.abs(signed);direction=signed<0?'debit':'credit'}}
    const fee=header.map.fee===undefined?null:parseFeeAmount(raw[header.map.fee]),feeRule=classifyBankFee({merchant:description,description});let feeRepresentation=fee?'metadata_only':null;if((amount===null||amount===0)&&feeRule&&fee){amount=Math.abs(fee);direction='debit';feeRepresentation='fee_column_row'}else if(feeRule&&amount)feeRepresentation='dedicated_row';
    const valid=Boolean(date&&description&&amount!==null&&amount!==0),parseFailureReason=!date?'לא זוהה תאריך':!description?'לא זוהה תיאור':amount===null||amount===0?'לא זוהה סכום':null;const base={rowNumber:index+1,rawRow:raw,date,valueDate,description,merchant:description,amount,direction,runningBalance:header.map.balance===undefined?null:parseAmount(raw[header.map.balance]),fee,feeRepresentation,channel:header.map.channel===undefined?null:String(raw[header.map.channel]??'').trim(),reference:header.map.reference!==undefined?String(raw[header.map.reference]??'').trim():null,sourceAccount:header.map.card!==undefined?String(raw[header.map.card]??'').trim():header.map.account!==undefined?String(raw[header.map.account]??'').trim():null,status:header.map.status!==undefined?String(raw[header.map.status]??'').trim():null,sourceType:source,externalSourceId:header.map.reference!==undefined?String(raw[header.map.reference]??'').trim()||null:null,valid,excluded:false,parseFailureReason};
    const savedRule=valid?applySavedClassificationRules(base,classificationRules):null,reconciled=valid&&!savedRule?reconcileBeforeReview(base,reconciliationEvidence):null,treatment=valid&&!savedRule&&!reconciled?classifyPsychologicalTreatment(base):null,allocation=valid&&!savedRule&&!reconciled&&!treatment?classifyCapitalAllocation(base):null,bankFee=valid&&!savedRule&&!reconciled&&!treatment?classifyBankFee(base):null,knownIncoming=valid&&!savedRule&&!reconciled&&!treatment&&!allocation&&!bankFee?classifyKnownIncoming(base):null,rule=valid&&!savedRule&&!reconciled&&!treatment&&!allocation&&!bankFee&&!knownIncoming?classifyWithRules(base):null,financialType=savedRule?.financialType||reconciled?.financialType||treatment?.financialType||bankFee?.financialType||allocation?.financialType||knownIncoming?.financialType||(direction==='debit'?'expense':'unknown'),category=savedRule?.category||reconciled?.category||treatment?.category||bankFee?.category||allocation?.category||knownIncoming?.category||rule?.category||null,reviewReason=savedRule?.requiresReview?'התאמה לכלל שמור דורשת אישור':reconciled?.requiresReview?(reconciled.reviewReason||'נמצאה התאמה אפשרית במקור נוסף'):valid?deriveReviewReason({...base,financialType,category,allocationType:allocation?.allocationType}):null;
    const resolution={...base,financialType,allocationType:allocation?.allocationType||null,category,reimbursementExpected:Boolean(treatment?.reimbursementExpected),expectedReimbursementSource:treatment?.expectedReimbursementSource||null,reimbursementExpectationId:reconciled?.expectationId||null,linkedTransactionId:reconciled?.expenseTransactionId||null,reimbursementCandidateExpectationIds:reconciled?.candidateExpectationIds||[],classificationOrigin:savedRule?.origin||(reconciled?'reconciliation':treatment?.origin||bankFee?.origin||allocation?.origin||knownIncoming?.origin||rule?.origin||null),classificationRuleId:savedRule?.ruleId||null,classificationConfidence:savedRule?.confidence||reconciled?.confidence||treatment?.confidence||(bankFee||allocation||knownIncoming||rule?'high':null),classificationExplanation:savedRule?.explanation||reconciled?.explanation||null,reconciliationMatchId:reconciled?.matchingRecordId||null,reconciliationMatchIds:reconciled?.matchingRecordIds||[],cardSuffix:reconciled?.cardSuffix||null,countInTotals:!['transfer','savings_transfer','investment_transfer','capital_allocation','credit_card_settlement'].includes(financialType),reviewStatus:reviewReason?'required':'not_required',reviewSeverity:'non_critical',blocksImport:false,reviewReason,reviewDecision:null,importStatus:valid?'ready':'malformed',warnings:valid?[]:[parseFailureReason]};
    normalized.push(finalizeReviewState(resolution));
  }
  return {filename,headerRow:header.index,headers,columnMap:header.map,detectedSource:detected.source,sourceConfidence:detected.confidence,selectedSource:source,rows:normalized,malformed:normalized.filter(row=>!row.valid).length};
}

function deriveReviewReason(row){const text=`${row.description||''} ${row.merchant||''}`;if(row.financialType==='unknown'&&row.direction==='credit'&&/העברה|הפקדה/i.test(text))return 'העברה פנימית אפשרית';if(row.financialType==='unknown'&&row.direction==='credit')return 'זיכוי לא מסווג';if(row.financialType==='unknown')return 'לא זוהה סוג התנועה';return null}

export function isHighConfidenceResolved(row){return Boolean(row?.valid&&!row.blocksImport&&row.classificationConfidence==='high'&&row.financialType&&row.financialType!=='unknown')}
export function rowRequiresReview(row){if(!row?.valid)return false;if(row.blocksImport)return true;if(isHighConfidenceResolved(row))return false;return row.reviewStatus==='required'}
export function finalizeReviewState(row){if(!row?.valid)return row;if(row.blocksImport)return {...row,reviewStatus:'required'};if(isHighConfidenceResolved(row))return {...row,reviewStatus:'not_required',reviewReason:null,reviewDecision:null};return row}
export function filterPreviewRows(rows,filter='all'){if(filter==='all')return rows;if(filter==='new')return rows.filter(row=>row.importStatus==='ready');if(filter==='existing')return rows.filter(row=>row.importStatus==='existing');if(filter==='review')return rows.filter(rowRequiresReview);if(filter==='failed')return rows.filter(row=>!row.valid);return rows}
export function applyReviewDecision(row,decision,{deferUntil=null}={}){const mapping={expense:{financialType:'expense',category:row.category||'כללי'},income:{financialType:'income',category:'הכנסה שוטפת'},family_support:{financialType:'family_support',category:categoryFor('family_support')},government_benefit:{financialType:'government_benefit',category:categoryFor('government_benefit')},bank_credit:{financialType:'bank_credit',category:categoryFor('bank_credit')},gift:{financialType:'gift',category:categoryFor('gift')},refund:{financialType:'refund',category:categoryFor('refund')},reimbursement:{financialType:'reimbursement',category:'החזרים'},transfer:{financialType:'transfer',category:'העברה פנימית'},savings_transfer:{financialType:'savings_transfer',allocationType:'savings',category:'חיסכון'},investment_transfer:{financialType:'investment_transfer',allocationType:'investment',category:'השקעות'}};if(decision==='defer')return {...row,financialType:'unknown',category:null,excluded:false,reviewDecision:decision,reviewStatus:'deferred',deferUntil,reviewReason:'לבדיקה מאוחר יותר',blocksImport:false};if(decision==='ignore')return {...row,excluded:true,reviewDecision:decision,reviewStatus:'resolved'};if(!mapping[decision])return row;return {...row,...mapping[decision],excluded:false,reviewDecision:decision,reviewStatus:'resolved',reviewReason:null}}

export function buildImportPreview(parsed,{existingTransactions=[],existingReceipts=[]}={}){
  const seen=new Set(existingTransactions.map(transaction=>`${transaction.date}|${transaction.amount}|${clean(transaction.merchant)}|${transaction.externalSourceId||''}`));
  const previewExternalIds=new Set(),previewFingerprints=new Set();
  const rows=parsed.rows.map(row=>{
    if(!row.valid)return {...row,blocksImport:true,reviewSeverity:'critical'};
    const fingerprint=`${row.date}|${row.amount}|${clean(row.merchant)}`,duplicateExternalId=Boolean(row.externalSourceId&&previewExternalIds.has(row.externalSourceId)),duplicateInFile=previewFingerprints.has(fingerprint),exact=duplicateExternalId||seen.has(`${fingerprint}|${row.externalSourceId||''}`)||Boolean(row.externalSourceId&&existingTransactions.some(transaction=>transaction.externalSourceId===row.externalSourceId));
    const possibleDuplicate=!exact&&(duplicateInFile||existingTransactions.find(transaction=>Math.abs(transaction.amount-row.amount)<.01&&daysApart(transaction.date,row.date)<=2&&clean(transaction.merchant)===clean(row.merchant)));
    if(row.externalSourceId)previewExternalIds.add(row.externalSourceId);previewFingerprints.add(fingerprint);
    const receipt=existingReceipts.find(item=>Math.abs(item.total-row.amount)<.01&&item.purchaseDate===row.date);
    return finalizeReviewState({...row,duplicateStatus:exact?'existing':possibleDuplicate?'possible':'new',importStatus:exact?'existing':'ready',matchingReceiptId:receipt?.id||null,possibleMatch:possibleDuplicate?.id||null,reviewStatus:possibleDuplicate?'required':row.reviewStatus,reviewReason:possibleDuplicate?'כפילות אפשרית':row.reviewReason,reviewSeverity:possibleDuplicate?'critical':row.reviewSeverity,blocksImport:Boolean(possibleDuplicate)});
  });
  const included=rows.filter(row=>row.valid&&!row.excluded),debits=included.filter(row=>row.direction==='debit').reduce((sum,row)=>sum+row.amount,0),credits=included.filter(row=>row.direction==='credit').reduce((sum,row)=>sum+row.amount,0);
  return {...parsed,rows,summary:{totalRows:rows.length,validRows:rows.filter(row=>row.valid).length,totalDebits:debits,totalCredits:credits,newTransactions:rows.filter(row=>row.importStatus==='ready').length,existingTransactions:rows.filter(row=>row.importStatus==='existing').length,possibleDuplicates:rows.filter(row=>row.duplicateStatus==='possible').length,requiresReview:rows.filter(rowRequiresReview).length,malformed:rows.filter(row=>!row.valid).length},dateRange:{from:included.map(row=>row.date).sort()[0]||null,to:included.map(row=>row.date).sort().at(-1)||null}};
}
const daysApart=(left,right)=>Math.abs((new Date(left)-new Date(right))/86400000);

export class ImportFileError extends Error {constructor(message='לא הצלחנו לקרוא את הקובץ',code='file_read_failed',diagnostics=null){super(message);this.name='ImportFileError';this.code=code;this.diagnostics=diagnostics}}
const diagnostic=(logger,data)=>logger?.('[import diagnostic]',data);
const bomName=bytes=>bytes[0]===0xef&&bytes[1]===0xbb&&bytes[2]===0xbf?'utf-8-bom':bytes[0]===0xff&&bytes[1]===0xfe?'utf-16le-bom':bytes[0]===0xfe&&bytes[1]===0xff?'utf-16be-bom':'none';
const decodeCandidates=bytes=>{const bom=bomName(bytes),encodings=bom==='utf-16le-bom'?['utf-16le']:bom==='utf-16be-bom'?['utf-16be']:['utf-8','windows-1255'];return encodings.map(encoding=>{try{return {encoding,text:new TextDecoder(encoding).decode(bytes).replace(/^\uFEFF/,'')}}catch{return null}}).filter(Boolean)};
const safeStructure=(text,delimiter,rows,header)=>({delimiter:delimiter==='\t'?'tab':delimiter,nonEmptyRows:rows.length,candidateRows:rows.slice(0,Math.min(12,rows.length)).map((row,index)=>({rowNumber:index+1,columnCount:row.length,headerCandidate:index===header?.index?row.map(value=>String(value??'').trim()):undefined}))});

export async function readSelectedImportFile(file,{parseXlsx,logger=console.info}={}){
  if(!file||typeof file!=='object')throw new ImportFileError('לא התקבל קובץ לבדיקת הייבוא','missing_file');
  const filename=typeof file.name==='string'?file.name.trim():'',size=Number(file.size||0),type=String(file.type||'');diagnostic(logger,{stage:'selected',fileExists:true,filename:filename||null,type:type||null,size});
  if(!filename)throw new ImportFileError('לא הצלחנו לזהות את שם הקובץ','missing_filename');if(size<=0)throw new ImportFileError('הקובץ ריק','empty_file');
  if(filename.toLowerCase().endsWith('.xlsx')){if(typeof parseXlsx!=='function')throw new ImportFileError('קורא XLSX אינו זמין','xlsx_reader_missing');const rows=await parseXlsx(file);diagnostic(logger,{stage:'parsed',filename,type,size,parserRowCount:Array.isArray(rows)?rows.length:0,encoding:'xlsx'});if(!Array.isArray(rows)||!rows.length)throw new ImportFileError('לא נמצאו שורות בקובץ','empty_parse');return {filename,type,size,characterCount:0,encoding:'xlsx',delimiter:null,bom:null,rows,structure:{nonEmptyRows:rows.length}}}
  const bytes=new Uint8Array(await file.arrayBuffer()),bom=bomName(bytes);diagnostic(logger,{stage:'read',filename,type,size,bytesRead:bytes.byteLength,bom});
  const attempts=[];for(const decoded of decodeCandidates(bytes))for(const delimiter of [detectDelimiter(decoded.text),',',';','\t','|'].filter((value,index,array)=>array.indexOf(value)===index)){const rows=parseCsv(decoded.text,delimiter),header=detectHeaderRow(rows);attempts.push({...decoded,delimiter,rows,header,score:(header?.score||0)+(header?100:0)})}
  attempts.sort((a,b)=>b.score-a.score);const selected=attempts[0],structures=attempts.slice(0,8).map(attempt=>({encoding:attempt.encoding,...safeStructure(attempt.text,attempt.delimiter,attempt.rows,attempt.header)}));
  diagnostic(logger,{stage:'structure',filename,bom,attempts:structures});diagnostic(logger,{stage:'parsed',filename,type,size,characterCount:selected?.text.length||0,parserRowCount:selected?.rows.length||0,encoding:selected?.encoding||'unknown',delimiter:selected?.delimiter==='\t'?'tab':selected?.delimiter,headerRow:selected?.header?selected.header.index+1:null,headerNames:selected?.header?.headers||null});
  if(!selected?.rows.length)throw new ImportFileError('לא נמצאו שורות בקובץ','empty_parse',{bom,attempts:structures});return {filename,type,size,characterCount:selected.text.length,encoding:selected.encoding,delimiter:selected.delimiter,bom,rows:selected.rows,structure:{...safeStructure(selected.text,selected.delimiter,selected.rows,selected.header),attempts:structures}};
}

export async function createValidatedImportPreview(file,{parseXlsx,existingTransactions=[],existingReceipts=[],classificationRules=globalThis.__familyFinanceClassificationRules||[],reconciliationEvidence={},logger=console.info}={}){
  const selected=await readSelectedImportFile(file,{parseXlsx,logger}),parsed=normalizeRows(selected.rows,{filename:selected.filename,classificationRules,reconciliationEvidence:{historicalTransactions:existingTransactions,receipts:existingReceipts,...reconciliationEvidence}});diagnostic(logger,{stage:'normalized',filename:selected.filename,parserRowCount:selected.rows.length,normalizedRowCount:parsed.rows.length,validRowCount:parsed.rows.filter(row=>row.valid).length,errorCode:parsed.error?'header_not_detected':null});
  if(parsed.error)throw new ImportFileError('לא הצלחנו לזהות את מבנה הקובץ','header_not_detected',{encoding:selected.encoding,delimiter:selected.delimiter,bom:selected.bom,structure:selected.structure});if(!parsed.rows.some(row=>row.valid))throw new ImportFileError('לא נמצאו עסקאות תקינות בקובץ','zero_valid_rows',{encoding:selected.encoding,delimiter:selected.delimiter,bom:selected.bom,structure:selected.structure});return {selected,parsed,preview:buildImportPreview(parsed,{existingTransactions,existingReceipts})};
}
