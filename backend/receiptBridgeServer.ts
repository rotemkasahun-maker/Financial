import { GoogleSheetsSourceReader } from './googleSheetsIngestion.ts';
import { runReceiptBridgeDryRun } from '../src/shared/receiptBridgePipeline.js';
import { GcsReceiptCheckpoint } from '../src/shared/receiptCheckpoint.js';

export function mapSheetRows(rows: any[], tab: string) {
  const headers = rows?.[0] || [];
  return (rows || []).slice(1).map((values, index) => {
    const raw: any = { rowNumber: index + 2 };
    headers.forEach((header: any, column: number) => { const key = String(header ?? '').trim(); if (key) raw[key] = values?.[column] ?? ''; });
    if (tab === 'קבלות מהמייל') return { ...raw, date: raw['תאריך'], transactionDate: raw['תאריך'], merchant: raw['ספק/בית עסק'], provider: raw['ספק/בית עסק'], description: raw['פירוט'], amount: raw['סכום'], source: raw['מקור'] };
    return { ...raw, date: raw['תאריך'], transactionDate: raw['תאריך'], merchant: raw['בית עסק'], provider: raw['בית עסק'], description: raw['פריט'], amount: raw['סכום'], sourceImage: raw['מקור תמונה'], sourceReference: raw['מקור תמונה'] };
  });
}

export function createReceiptBridgeHandler({ reader, stateReader, checkpointStore }: any = {}) {
  const sourceReader = reader || new GoogleSheetsSourceReader();
  const checkpoints = checkpointStore || (() => { const bucket = process.env.RECEIPT_BRIDGE_CHECKPOINT_BUCKET; if (!bucket) throw new Error('RECEIPT_BRIDGE_CHECKPOINT_BUCKET is required'); return new GcsReceiptCheckpoint({ bucket, object: process.env.RECEIPT_BRIDGE_CHECKPOINT_OBJECT || 'receipt-bridge/checkpoint.json', tokenProvider: () => sourceReader.metadataToken() }); })();
  return async function handler(req: any, res: any) {
    if (req.method === 'GET' && req.url === '/health') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ status: 'ok' })); return; }
    if (req.method !== 'POST' || req.url !== '/run') { res.writeHead(404); res.end(); return; }
    try {
      const state = await stateReader();
      const email = await sourceReader.readTab('קבלות מהמייל');
      const micro = await sourceReader.readTab('קבלות - מיקרו');
      const result = await runReceiptBridgeDryRun({ emailRows: mapSheetRows(email.rows, 'קבלות מהמייל'), microRows: mapSheetRows(micro.rows, 'קבלות - מיקרו'), spreadsheetId: sourceReader.spreadsheetId, state, checkpointStore: checkpoints });
      const counts = result.results.reduce((a: any, r: any) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {}); const identityStrategies = result.results.reduce((a: any, r: any) => { const tab=r.sourceType||'unknown'; a[tab]=a[tab]||{}; const k=r.identityStrategy||'rowFallback'; a[tab][k]=(a[tab][k]||0)+1; return a; }, {});
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ status: 'DRY_RUN_COMPLETE', rowsRead: result.rowsRead, byTab: { 'קבלות מהמייל': email.rows.length - 1, 'קבלות - מיקרו': micro.rows.length - 1 }, normalized: result.normalized, deduped: result.deduped, duplicatesCollapsed: result.duplicatesCollapsed, identityStrategies, newSources: counts.NEW || 0, unchanged: counts.UNCHANGED || 0, sourceChanged: counts.SOURCE_CHANGED || 0, alreadyCanonical: counts.ALREADY_CANONICAL || 0, matched: counts.MATCHED || 0, ambiguous: counts.AMBIGUOUS || 0, unmatched: counts.UNMATCHED || 0, identityWeak: result.results.filter((r: any) => r.externalSourceId?.includes(':row:')).length }));
    } catch { res.writeHead(500, { 'content-type': 'application/json' }); res.end(JSON.stringify({ status: 'DRY_RUN_FAILED' })); }
  };
}

