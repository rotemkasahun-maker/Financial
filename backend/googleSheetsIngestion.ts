import { normalizeDate, parseAmount, normalizeRows } from '../src/services/fileImport.js';
import { createHash } from 'node:crypto';

export const FAMILY_FINANCE_SPREADSHEET_ID = '19XaIrFj64ozMOvviU4U9We3_7gD8bW40TdLaWM2iXWc';
export const REQUIRED_TABS = ['הוצאות', 'תנועות בנק', 'הכנסות', 'קבלות - מיקרו', 'קבלות מהמייל', 'לבדיקה'];

const expenseColumns = ['תאריך עסקה', 'חודש קנייה', 'חודש חיוב', 'בית עסק', 'ענף במקור', 'קטגוריה', 'סכום חיוב', 'מתוכנן?', 'הכרחי?', 'מקור', 'הערה', 'סוג הוצאה', 'תת-קטגוריה', 'מקור סיווג', 'דורש החלטה?', 'סוג קנייה / מיקרו', 'התאמה לרשימת קניות', 'סטטוס סיכום', 'סכום נטו'];
const text = (value: any) => String(value ?? '').trim();
export function normalizeSheetReference(value: any, spreadsheetId = FAMILY_FINANCE_SPREADSHEET_ID) {
  const m = text(value).match(/^(.+?)!\$?([A-Z]+)\$?(\d+)(?::\$?[A-Z]+\$?\d+)?$/i);
  return m ? `sheet:${spreadsheetId}:${m[1]}:${m[3]}` : null;
}
const headerIndex = (headers: any[]) => Object.fromEntries(expenseColumns.map(name => [name, headers.findIndex(item => text(item) === name)]));

function semanticType(fields: any) {
  const kind = text(fields.type).toLowerCase();
  const structured = `${kind} ${text(fields.category).toLowerCase()} ${text(fields.subcategory).toLowerCase()} ${text(fields.source).toLowerCase()} ${text(fields.sourceClassification).toLowerCase()} ${text(fields.note).toLowerCase()} ${text(fields.microType).toLowerCase()} ${text(fields.summaryStatus).toLowerCase()}`;
  if (/לא.?נכלל|לא נכלל|מוחרג|excluded|non.?consumption/.test(structured)) return 'transfer';
  if (/העברה|התחשבנות|settlement|transfer|החזר אישי|החזר פרטי|תשלום אישי|repayment/.test(structured)) return 'transfer';
  if (/החזר הוצאות|שיפוי|reimburse/.test(structured)) return 'reimbursement';
  if (/החזר|זיכוי|refund|credit/.test(structured)) return 'refund';
  if (/חיסכון|השקעה|savings|investment/.test(structured)) return /השקעה|investment/.test(structured) ? 'investment_transfer' : 'savings_transfer';
  if (/הכנסה|income/.test(structured)) return 'income';
  if (/הוצאה|expense|רכישה|קנייה/.test(kind)) return 'expense';
  return null;
}

export function adaptExpensesSheetRows(rows: any[], { spreadsheetId = FAMILY_FINANCE_SPREADSHEET_ID } = {}) {
  if (!Array.isArray(rows) || rows.length === 0) return { rows: [], malformed: 0, reviewRows: 0 };
  const indexes = headerIndex(rows[0]);
  const required = ['תאריך עסקה', 'בית עסק', 'סכום חיוב'];
  const malformed = [];
  const adapted = [];
  for (let index = 1; index < rows.length; index++) {
    const raw = rows[index];
    if (!raw?.some?.((value: any) => text(value))) continue;
    const date = normalizeDate(raw[indexes['תאריך עסקה']]);
    const merchant = text(raw[indexes['בית עסק']]);
    const amount = parseAmount(raw[indexes['סכום חיוב']]);
    if (isNonDataStructural(raw, raw[indexes['תאריך עסקה']], raw[indexes['סכום חיוב']])) continue;
    if (!date || !merchant || amount === null || amount === 0) { malformed.push(index + 1); continue; }
    const explicitType = semanticType({ type: raw[indexes['סוג הוצאה']], category: raw[indexes['קטגוריה']], subcategory: raw[indexes['תת-קטגוריה']], source: raw[indexes['מקור']], sourceClassification: raw[indexes['מקור סיווג']], note: raw[indexes['הערה']], microType: raw[indexes['סוג קנייה / מיקרו']], summaryStatus: raw[indexes['סטטוס סיכום']] });
    const financialType = explicitType || 'expense';
    const reviewRequired = /^כן$/i.test(text(raw[indexes['דורש החלטה?']]));
    const sourceRowIdentity = String(index + 1);
    adapted.push({
      rowNumber: index + 1, date, purchaseMonth: text(raw[indexes['חודש קנייה']]) || null, billingMonth: text(raw[indexes['חודש חיוב']]) || null,
      merchant, description: text(raw[indexes['הערה']]) || merchant, amount: Math.abs(amount), direction: financialType === 'refund' || amount < 0 ? 'credit' : 'debit',
      financialType, category: text(raw[indexes['קטגוריה']]) || null, subcategory: text(raw[indexes['תת-קטגוריה']]) || null,
      source: text(raw[indexes['מקור']]) || 'Google Sheet', sourceType: 'google_sheet_expenses', postingStatus: financialType === 'refund' || financialType === 'reimbursement' ? 'posted' : 'unknown', reimbursementStatus: financialType === 'refund' || financialType === 'reimbursement' ? 'received' : 'none', countInTotals: !['transfer', 'savings_transfer', 'investment_transfer'].includes(financialType),
      reviewStatus: reviewRequired ? 'required' : 'not_required', reviewRequired, valid: true, excluded: reviewRequired,
      externalSourceId: `sheet:${spreadsheetId}:הוצאות:${sourceRowIdentity}`, sourceRowIdentity
    });
  }
  return { rows: adapted, malformed: malformed.length, reviewRows: adapted.filter(row => row.reviewRequired).length };
}

const isStructural = (row: any[], headers: any[]) => {
  if (!row?.some?.((value: any) => text(value))) return true;
  const joined = row.map(text).join(' ').trim();
  const headerJoined = headers.map(text).join(' ').trim();
  return joined === headerJoined || /^(סהכ|סיכום|total|summary|פרק|חודש|קטגוריה)$/i.test(joined);
};
const isNonDataStructural = (row: any[], dateValue: any, amountValue: any) => !normalizeDate(dateValue) && (amountValue === null || amountValue === undefined || text(amountValue) === '');

function genericSheetRows(rows: any[], tab: string, { spreadsheetId = FAMILY_FINANCE_SPREADSHEET_ID } = {}) {
  if (!Array.isArray(rows) || rows.length < 2) return { rows: [], malformed: 0, structural: rows?.length || 0 };
  const headers = rows[0] || [];
  const find = (names: string[]) => names.map(name => headers.findIndex((item: any) => text(item) === name)).find(index => index >= 0) ?? -1;
  const dateIndex = find(['תאריך עסקה','תאריך','תאריך פעולה','תאריך קבלה']);
  const descriptionIndex = find(['בית עסק','תיאור','שם','ספק','מקור']);
  const amountIndex = find(['סכום חיוב','סכום','סכום תנועה','סכום נטו','סהכ']);
  const referenceIndex = find(['אסמכתא','מזהה','מספר אסמכתא','externalSourceId']);
  const malformed: number[] = [], result: any[] = [];
  for (let i = 1; i < rows.length; i++) {
    const raw = rows[i]; if (isStructural(raw, headers)) continue;
    const date = dateIndex >= 0 ? normalizeDate(raw[dateIndex]) : null;
    const description = descriptionIndex >= 0 ? text(raw[descriptionIndex]) : '';
    const amount = amountIndex >= 0 ? parseAmount(raw[amountIndex]) : null;
    if (!date || !description || amount === null || amount === 0) { malformed.push(i + 1); continue; }
    result.push({ rowNumber: i + 1, date, merchant: description, description, amount: Math.abs(amount), direction: amount < 0 ? 'debit' : 'credit', sourceType: `google_sheet_${tab}`, externalSourceId: `sheet:${spreadsheetId}:${tab}:${referenceIndex >= 0 && text(raw[referenceIndex]) ? text(raw[referenceIndex]) : i + 1}`, sourceRowIdentity: String(i + 1), valid: true });
  }
  return { rows: result, malformed: malformed.length, structural: rows.length - 1 - result.length - malformed.length };
}

export function adaptBankSheetRows(rows: any[], { spreadsheetId = FAMILY_FINANCE_SPREADSHEET_ID } = {}) {
  const headers = rows?.[0] || [], ix = (names: string[]) => names.map(name => headers.findIndex((item: any) => text(item) === name)).find(index => index >= 0) ?? -1;
  const date=ix(['תאריך']), month=ix(['חודש']), kind=ix(['סוג תנועה']), amount=ix(['סכום']), direction=ix(['כיוון']), note=ix(['הערה']), category=ix(['קטגוריה']); const result:any[]=[]; let malformed=0;
  for(let i=1;i<(rows||[]).length;i++){const raw=rows[i];if(isStructural(raw,headers))continue;const d=normalizeDate(raw[date]), a=parseAmount(raw[amount]);if(isNonDataStructural(raw,raw[date],raw[amount]))continue;if(!d||a===null||a===0){malformed++;continue;}const textFields=`${text(raw[kind])} ${text(raw[direction])} ${text(raw[note])} ${text(raw[category])}`.toLowerCase();let financialType='expense';let explicitRepresentation=false;if(/נכלל בגיליון הוצאות|עסקאות מפורטות|לא נכלל/.test(textFields)){financialType='transfer';explicitRepresentation=true;}else if(/החזר|זיכוי|reimburse|refund/.test(textFields))financialType='reimbursement';else if(/חיסכון/.test(textFields))financialType='savings_transfer';else if(/השקעה/.test(textFields))financialType='investment_transfer';else if(/הכנסה|משכורת|קצבה/.test(text(raw[direction])))financialType='income';result.push({rowNumber:i+1,date:d,month:text(raw[month])||null,merchant:text(raw[note])||text(raw[kind])||'bank movement',description:text(raw[note]),amount:Math.abs(a),direction:/הכנסה|זיכוי|החזר/.test(text(raw[direction]))?'credit':'debit',financialType,category:text(raw[category])||null,sourceType:'google_sheet_תנועות בנק',externalSourceId:`sheet:${spreadsheetId}:תנועות בנק:${i+1}`,sourceRowIdentity:String(i+1),explicitRepresentation, countInTotals:!['transfer','savings_transfer','investment_transfer'].includes(financialType),valid:true});}
  return {rows:result,malformed,structural:Math.max(0,(rows||[]).length-1-result.length-malformed)};
}
export function adaptIncomeSheetRows(rows: any[], { spreadsheetId = FAMILY_FINANCE_SPREADSHEET_ID } = {}) {
  const headers=rows?.[0]||[],ix=(names:string[])=>names.map(name=>headers.findIndex((item:any)=>text(item)===name)).find(index=>index>=0)??-1;const date=ix(['תאריך']),month=ix(['חודש']),source=ix(['מקור הכנסה']),amount=ix(['סכום']),direction=ix(['כיוון']),reference=ix(['מזהה מקור']),note=ix(['הערה']);const result:any[]=[];let malformed=0;
  for(let i=1;i<(rows||[]).length;i++){const raw=rows[i];if(isStructural(raw,headers))continue;const d=normalizeDate(raw[date]),a=parseAmount(raw[amount]);if(!d||a===null||a===0){malformed++;continue;}const dir=text(raw[direction]);const desc=text(raw[note])||text(raw[source]);const financialType=/החזר|שיפוי/.test(dir+' '+desc)?'reimbursement':/זיכוי/.test(dir+' '+desc)?'refund':/תמיכה/.test(text(raw[source])+' '+desc)?'family_support':'income';result.push({rowNumber:i+1,date:d,month:text(raw[month])||null,merchant:text(raw[source])||'income',description:desc,amount:Math.abs(a),direction:'credit',financialType,sourceType:'google_sheet_הכנסות',externalSourceId:`sheet:${spreadsheetId}:הכנסות:${i+1}`,sourceReference:text(raw[reference])||null,sourceRowIdentity:String(i+1),countInTotals:true,valid:true});}
  return {rows:result,malformed,structural:Math.max(0,(rows||[]).length-1-result.length-malformed)};
}
export function adaptEvidenceRows(rows: any[], tab: string, options: any = {}) { const base = genericSheetRows(rows, tab, options); return { ...base, rows: base.rows.map(row => ({ sourceType: `google_sheet_${tab}`, sourceRowIdentity: row.sourceRowIdentity, externalSourceId: row.externalSourceId, date: row.date, evidence: true })) }; }
export function adaptReviewRows(rows: any[], options: any = {}) { const base = genericSheetRows(rows, 'לבדיקה', options); return { ...base, rows: base.rows.map(row => ({ ...row, reviewRequired: true, reviewStatus: 'required', excluded: true })) }; }

export function reconcileDryRun(candidates: any[], state: any) {
  const transactions = Array.isArray(state?.transactions) ? state.transactions : [];
  const seen = new Set<string>(); let alreadyExists = 0, externalSourceMatches = 0, fallbackMatches = 0, canonicalEventMatches = 0, conflicts = 0;
  for (const row of candidates) {
    const key = row.externalSourceId || `${row.date}|${row.amount}|${String(row.merchant || '').trim().toLowerCase().replace(/\s+/g, ' ')}|${row.sourceType}`;
    if (seen.has(key)) { conflicts++; continue; } seen.add(key);
    const external = transactions.find((item: any) => row.externalSourceId && item.externalSourceId === row.externalSourceId);
    const fallback = !external && transactions.find((item: any) => item.date === row.date && Number(item.amount) === Number(row.amount) && String(item.merchant || '').trim().toLowerCase().replace(/\s+/g, ' ') === String(row.merchant || '').trim().toLowerCase().replace(/\s+/g, ' ') && item.sourceType === row.sourceType);
    const canonical = !external && !fallback && row.canonicalEventId && transactions.find((item: any) => item.canonicalEventId === row.canonicalEventId);
    if (external) { alreadyExists++; externalSourceMatches++; } else if (fallback) { alreadyExists++; fallbackMatches++; } else if (canonical) { alreadyExists++; canonicalEventMatches++; }
    if (row.canonicalEventId && transactions.some((item: any) => item.canonicalEventId === row.canonicalEventId && item.externalSourceId !== row.externalSourceId)) conflicts++;
  }
  return { alreadyExists, new: candidates.length - alreadyExists - conflicts, conflicts, externalSourceMatches, fallbackMatches, canonicalEventMatches, crossSourceDuplicates: conflicts, unresolvedRelationships: 0, status: 'compared' };
}

const validationIdentity = (row: any) => ({
  sourceType: row.sourceType || null,
  sourceTab: row.sourceType?.replace(/^google_sheet_/, '') || null,
  sourceRowReference: row.sourceRowIdentity || row.rowNumber || null,
  externalSourceId: row.externalSourceId || null,
  canonicalEventId: row.canonicalEventId || null,
  date: row.date || null,
  amount: Number.isFinite(Number(row.amount)) ? Number(row.amount) : null,
  semanticType: row.financialType || null,
  normalizedMerchant: row.merchant ? String(row.merchant).trim().toLowerCase().replace(/\s+/g, ' ') : null
});

export function buildCandidateInventory(candidates: any[], evidence: any[] = []) {
  const bySource: Record<string, number> = {};
  for (const row of candidates) bySource[row.sourceType || 'unknown'] = (bySource[row.sourceType || 'unknown'] || 0) + 1;
  return { bySource, totalCandidates: candidates.length, evidenceOnlyCount: evidence.length, candidates: candidates.map(validationIdentity), evidenceOnly: evidence.map(validationIdentity) };
}

export function compareRerunIdentities(first: any[], second: any[]) {
  const ids = (rows: any[]) => rows.map(row => row.externalSourceId || `${row.sourceType}|${row.sourceRowIdentity}`).sort();
  const a = ids(first), b = ids(second), setA = new Set(a), setB = new Set(b);
  return { firstCount: a.length, rerunCount: b.length, stableIdentityCount: a.filter(id => setB.has(id)).length, mismatchedIdentityCount: a.filter(id => !setB.has(id)).length + b.filter(id => !setA.has(id)).length, duplicateIdsFirst: a.length - setA.size, duplicateIdsRerun: b.length - setB.size, sameReconciliationResult: JSON.stringify(a) === JSON.stringify(b) };
}

export function reconcileCandidates(candidates: any[]) {
  const groups = new Map<string, any[]>();
  for (const row of candidates) {
    const key = row.externalSourceId || `${row.date}|${row.amount}|${String(row.merchant || '').trim().toLowerCase().replace(/\s+/g, ' ')}|${row.sourceType}`;
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  const relationships: any[] = []; let exactSourceReferenceMatches = 0, explicitRepresentationMatches = 0, exactSourceReferenceSuppressed = 0, explicitRepresentationSuppressed = 0, canonicalEventMatches = 0, fallbackMatches = 0, ambiguous = 0, conflicts = 0, suppressed = 0;
  const suppressedIds: string[] = [];
  for (const rows of groups.values()) if (rows.length > 1) {
    const semantics = new Set(rows.map(row => row.financialType));
    const classification = semantics.size > 1 ? 'conflict' : 'safe fallback match';
    if (classification === 'conflict') conflicts++; else fallbackMatches++;
    if (rows.some(row => row.explicitRepresentation)) explicitRepresentationMatches++;
    if (classification !== 'conflict') { const canonical = [...rows].sort((a,b) => (a.sourceType.includes('הוצאות') ? 0 : a.sourceType.includes('הכנסות') ? 1 : 2) - (b.sourceType.includes('הוצאות') ? 0 : b.sourceType.includes('הכנסות') ? 1 : 2))[0]; suppressed += rows.length - 1; rows.filter(row => row !== canonical).forEach(row => suppressedIds.push(row.externalSourceId)); relationships.push({ classification, identities: rows.map(validationIdentity), semanticRelationship: [...semantics].join('|'), canonicalSource: validationIdentity(canonical) }); }
  }
  const byExternal = new Map(candidates.filter(row => row.externalSourceId).map(row => [row.externalSourceId, row]));
  for (const row of candidates) if (row.sourceReference) { const ref = normalizeSheetReference(row.sourceReference); const prior = byExternal.get(ref || row.sourceReference); if (prior && prior !== row) { exactSourceReferenceMatches++; if (!suppressedIds.includes(row.externalSourceId)) { suppressed++; exactSourceReferenceSuppressed++; suppressedIds.push(row.externalSourceId); } relationships.push({ classification: 'exact explicit-source match', identities: [validationIdentity(prior), validationIdentity(row)], canonicalSource: validationIdentity(prior) }); } }
  for (const row of candidates) if (row.explicitRepresentation) { explicitRepresentationMatches++; if (!suppressedIds.includes(row.externalSourceId)) { explicitRepresentationSuppressed++; suppressed++; suppressedIds.push(row.externalSourceId); relationships.push({ classification: 'explicit representation', identities: [validationIdentity(row)], canonicalSource: null }); } }
  return { exactSourceReferenceMatches, explicitRepresentationMatches, exactSourceReferenceSuppressed, explicitRepresentationSuppressed, overlap: suppressed - exactSourceReferenceSuppressed - explicitRepresentationSuppressed, canonicalEventMatches, fallbackMatches, duplicateGroups: relationships.length, suppressed, independentRecords: candidates.length - suppressed, candidatesAfterReconciliation: candidates.length - suppressed, ambiguous, conflicts, suppressedIdentities: suppressedIds, finalCandidateIdentities: candidates.filter(row => !suppressedIds.includes(row.externalSourceId)).map(row => row.externalSourceId), relationships };
}

export function describeMalformedRows(adapted: any, tab: string, period: string) {
  return (adapted.malformedRows || adapted.malformed || []).map((row: any) => ({ month: period, tab, sourceRowReference: typeof row === 'number' ? String(row) : String(row.rowNumber || 'unknown'), reason: row.reason || 'required field missing or invalid', structural: Boolean(row.structural), reviewOverlap: Boolean(row.reviewRequired), blocksImport: true }));
}
export function semanticDiagnostics(rows: any[]) { return rows.map(row => ({ stableSourceIdentity: row.externalSourceId || null, sourceTab: row.sourceType || null, semanticType: row.financialType || 'unknown', semanticRuleId: row.semanticRuleId || 'mapped_structured_or_fallback', reviewRequired: Boolean(row.reviewRequired), contributingFieldNames: ['type','category','subcategory','source','sourceClassification','note','microType','summaryStatus'] })); }
export function finalSafeImportSummary(rows: any[]) { const ids = rows.map(row => row.externalSourceId).filter(Boolean).sort(); const hash = createHash('sha256').update(ids.join('\n')).digest('hex'); return { finalSafeCandidateIdentityCount: ids.length, finalSafeCandidateIdentityHash: hash, finalSafeImportCount: ids.length }; }
export function buildFinalSafeCandidates(rows: any[]) { return rows.filter(row => row.valid !== false && !row.reviewRequired && !row.excluded && !row.unsafeSemantic && !(row.financialType === 'reimbursement' && row.reimbursementStatus !== 'received')); }
export function blockerDiagnostics(rows: any[]) { return rows.filter(row => row.reviewRequired || ['refund','reimbursement','transfer','unknown'].includes(row.financialType) || row.unsafeSemantic).map(row => ({ stableSourceIdentity: row.externalSourceId || null, sourceTab: row.sourceType || null, semanticType: row.financialType || 'unknown', semanticRuleId: row.semanticRuleId || 'mapped_structured_or_fallback', reviewRequired: Boolean(row.reviewRequired), contributingFieldNames: ['type','category','subcategory','source','sourceClassification','note','microType','summaryStatus'] })); }

type FetchLike = typeof fetch;

export class GoogleSheetsSourceReader {
  constructor({ spreadsheetId = FAMILY_FINANCE_SPREADSHEET_ID, fetchImpl = fetch as FetchLike, tokenProvider }: any = {}) {
    this.spreadsheetId = spreadsheetId;
    this.fetchImpl = fetchImpl;
    this.tokenProvider = tokenProvider || (() => this.metadataToken());
  }

  spreadsheetId: string;
  fetchImpl: FetchLike;
  tokenProvider: () => Promise<string>;

  async metadataToken() {
    const response = await this.fetchImpl('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', { headers: { 'Metadata-Flavor': 'Google' } });
    if (!response.ok) throw new Error(`ADC token unavailable: ${response.status}`);
    const body = await response.json();
    if (!body?.access_token) throw new Error('ADC token missing');
    return body.access_token;
  }

  async request(path: string) {
    const token = await this.tokenProvider();
    const response = await this.fetchImpl(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(this.spreadsheetId)}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Sheets API read failed: ${response.status}`);
    return response.json();
  }

  async metadata() {
    return this.request('?fields=properties(title,sheets(properties(title,hidden)))');
  }

  async readTab(tab: string) {
    const range = encodeURIComponent(`'${tab.replaceAll("'", "''")}'`);
    const result = await this.request(`/values/${range}?majorDimension=ROWS`);
    return { tab, rows: Array.isArray(result.values) ? result.values : [] };
  }

  async readRequiredTabs() {
    const tabs = [];
    for (const tab of REQUIRED_TABS) tabs.push(await this.readTab(tab));
    return tabs;
  }
}

export function buildDryRunReport({ rows, filename = 'google-sheet:הוצאות', classificationRules = [], reconciliationEvidence = {}, startDate = null, endDate = null }: any) {
  const normalized = filename === 'google-sheet:הוצאות' ? adaptExpensesSheetRows(rows) : normalizeRows(rows, { filename, selectedSource: 'bank_import', classificationRules, reconciliationEvidence });
  const inPeriod = (row: any) => { const periodDate = row.purchaseMonth && /^\d{4}-\d{2}/.test(row.purchaseMonth) ? `${row.purchaseMonth}-01` : row.date; return (!startDate || periodDate >= startDate) && (!endDate || periodDate <= endDate); };
  const periodRows = normalized.rows.filter(inPeriod);
  const review = periodRows.filter((row: any) => row.reviewRequired || row.reviewStatus === 'review_required' || row.valid === false);
  const importable = periodRows.filter((row: any) => row.valid && !row.excluded && !row.reviewRequired && row.reviewStatus !== 'review_required');
  const counts: Record<string, number> = {};
  for (const row of periodRows) counts[row.financialType || 'unknown'] = (counts[row.financialType || 'unknown'] || 0) + 1;
  return {
    sourceRows: periodRows.length,
    importableRows: importable.length,
    reviewRows: review.length,
    semanticCounts: counts,
    malformedRows: normalized.malformed,
    provenance: { spreadsheetId: FAMILY_FINANCE_SPREADSHEET_ID, tab: 'הוצאות', sourceRowIdentity: 'sheet row number' }
  };
}
