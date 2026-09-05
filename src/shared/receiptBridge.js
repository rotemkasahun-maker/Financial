import { createHash } from 'node:crypto';
import { findReceiptMatches } from './receiptMatching.js';

const text = v => String(v ?? '').trim();
const norm = v => text(v).toLowerCase().replace(/\s+/g, ' ');
const hash = v => createHash('sha256').update(text(v)).digest('hex');

// Sheet identity fields: מקור, פירוט, סטטוס התאמה, and מקור תמונה. Explicit
// labels win over source image/content hash; row position is the final fallback.
export function extractGmailMessageIdentity(value) {
  const source = text(value);
  return source.match(/(?:msg|message)\s*([A-Za-z0-9_-]+)/i)?.[1]
    || source.match(/^\s*gmail(?:\s*[–—-].*?)?\s+([a-f0-9]{12,})\s*$/i)?.[1]
    || null;
}

export function extractExplicitDocumentIdentity(value) {
  const fields = [value?.source, value?.description, value?.details, value?.matchStatus, value?.['סטטוס התאמה']]
    .map(text).filter(Boolean).join(' ');
  const find = label => fields.match(new RegExp(`${label}\\s*([A-Za-z0-9-]+)`, 'u'))?.[1] || null;
  return { invoiceNumber: value?.invoiceNumber || find('חשבונית'), receiptNumber: value?.receiptNumber || find('קבלה'), orderId: value?.orderId || find('הזמנה'), documentNumber: value?.documentNumber || find('מס״ד') };
}

export function normalizeReceiptEnvelope(row, { spreadsheetId, tab, rowNumber } = {}) {
  const sourceMetadata = row.sourceMetadata || {};
  const sourceText = text(row.source || sourceMetadata.source);
  const detailText = text(row.description || row.details);
  const statusText = text(row.matchStatus || row['סטטוס התאמה']);
  const gmailMessageId = sourceMetadata.gmailMessageId || extractGmailMessageIdentity(sourceText);
  const { invoiceNumber, receiptNumber, orderId, documentNumber } = extractExplicitDocumentIdentity({ ...row, source: sourceText, description: detailText, matchStatus: statusText });
  const sourceImage = row.sourceImage || row.sourceReference || sourceMetadata.sourceImage || null;
  const identityStrategy = text(row.externalSourceId) ? 'externalSourceId' : (gmailMessageId && sourceMetadata.gmailAttachmentId ? 'gmailMessageAttachment' : gmailMessageId ? 'gmailMessage' : (invoiceNumber || receiptNumber || orderId || documentNumber) ? 'documentId' : sourceImage ? 'sourceImage' : row.contentHash ? 'contentHash' : 'rowFallback');
  const externalSourceId = gmailMessageId && sourceMetadata.gmailAttachmentId
    ? `gmail:${gmailMessageId}:${sourceMetadata.gmailAttachmentId}`
    : gmailMessageId ? `gmail:${gmailMessageId}` : text(row.externalSourceId) || (invoiceNumber || receiptNumber || orderId || documentNumber
      ? `sheet:${spreadsheetId}:${tab}:${invoiceNumber || receiptNumber || orderId || documentNumber}`
      : sourceImage ? `sheet:${spreadsheetId}:${tab}:image:${sourceImage}`
      : `sheet:${spreadsheetId}:${tab}:row:${rowNumber}`);
  return { source: 'google_sheet', sourceType: tab, externalSourceId, identityStrategy, gmailMessageId, gmailThreadId: sourceMetadata.gmailThreadId || null, gmailAttachmentId: sourceMetadata.gmailAttachmentId || null, contentHash: row.contentHash || null, merchant: text(row.merchant || row.provider), merchantNormalized: norm(row.merchant || row.provider), documentType: row.documentType || (invoiceNumber ? 'invoice' : 'receipt'), documentNumber: row.documentNumber || invoiceNumber || receiptNumber || orderId || documentNumber || null, invoiceNumber, receiptNumber, orderId, documentDate: row.documentDate || row.transactionDate || row.date || null, transactionDate: row.transactionDate || row.date || null, amount: Number.isFinite(Number(row.amount)) ? Number(row.amount) : null, currency: row.currency || 'ILS', provider: row.provider || null, cardLast4: row.cardLast4 || null, linkedTransactionId: row.linkedTransactionId || null, sourceMetadata: { ...sourceMetadata, spreadsheetId, tab, rowNumber, sourceImage } };
}

export function dedupeReceiptEnvelopes(rows = []) {
  const seen = new Map(); const output = [];
  for (const row of rows) { const key = row.externalSourceId || row.contentHash || (row.documentNumber ? `${row.documentNumber}|${norm(row.provider)}` : null); if (!key) { output.push(row); continue; } if (seen.has(key)) continue; seen.set(key, row); output.push(row); }
  return output;
}

export function matchReceiptEnvelope(receipt, { transactions = [], receipts = [], documents = [] } = {}) {
  const existing = receipts.find(r => (receipt.externalSourceId && (r.sourceMetadata?.externalSourceId === receipt.externalSourceId || r.externalSourceId === receipt.externalSourceId)) || (receipt.contentHash && r.sourceMetadata?.contentHash === receipt.contentHash) || (receipt.documentNumber && [r.invoiceNumber, r.receiptNumber, r.orderId, r.documentNumber].includes(receipt.documentNumber)));
  if (existing) return { status: 'ALREADY_CANONICAL', confidence: 'high', reason: 'canonical receipt identity', transactionIds: existing.linkedTransactionId ? [existing.linkedTransactionId] : [] };
  if (receipt.linkedTransactionId) return { status: 'MATCHED', confidence: 'high', reason: 'explicit linked transaction', transactionIds: [receipt.linkedTransactionId] };
  const linked = documents.find(d => d.linkedTransactionId && receipt.documentNumber && d.documentNumber === receipt.documentNumber);
  if (linked) return { status: 'MATCHED', confidence: 'high', reason: 'canonical document identity', transactionIds: [linked.linkedTransactionId] };
  const matches = findReceiptMatches({ purchaseDate: receipt.transactionDate, total: receipt.amount, merchant: receipt.merchant }, transactions);
  const high = matches.filter(m => m.confidence === 'high');
  if (high.length === 1) return { status: 'MATCHED', confidence: 'high', reason: 'existing receipt matcher', transactionIds: [high[0].id] };
  if (high.length > 1 || matches.some(m => m.confidence === 'medium')) return { status: 'AMBIGUOUS', confidence: 'medium', reason: 'multiple plausible transactions', transactionIds: matches.slice(0, 5).map(m => m.id) };
  return { status: 'UNMATCHED', confidence: 'none', reason: 'no safe match', transactionIds: [] };
}



