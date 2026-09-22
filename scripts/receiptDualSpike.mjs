import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import { extractImageText } from '../backend/imageTextExtractor.ts';
import { extractReceiptWithAi } from '../backend/aiReceiptExtractor.ts';
import { extractReceiptFromImageWithAi } from '../backend/aiReceiptVisionExtractor.ts';
import { validateReceiptExtraction } from '../backend/receiptValidator.ts';

const imagePath = resolve(
  process.env.REAL_RECEIPT_IMAGE_PATH || process.argv[2] || ''
);

function summarizeExtraction(extraction, validation, extra = {}) {
  return {
    merchant: extraction?.merchant ?? null,
    rawMerchant: extraction?.rawMerchant ?? null,
    purchaseDate: extraction?.purchaseDate ?? null,
    total: extraction?.total ?? null,
    currency: extraction?.currency ?? null,
    ...extra,
    itemCount: Array.isArray(extraction?.items) ? extraction.items.length : 0,
    itemNames: Array.isArray(extraction?.items)
      ? extraction.items.map(item => item.name ?? null)
      : [],
    itemQuantities: Array.isArray(extraction?.items)
      ? extraction.items.map(item => item.quantity ?? null)
      : [],
    itemPrices: Array.isArray(extraction?.items)
      ? extraction.items.map(item => item.totalPrice ?? null)
      : [],
    itemUnitPrices: Array.isArray(extraction?.items)
      ? extraction.items.map(item => item.unitPrice ?? null)
      : [],
    confidence: extraction?.confidence ?? null,
    validationIssueCodes: Array.isArray(validation?.issues)
      ? validation.issues.map(issue => issue.code)
      : []
  };
}

async function main() {
  if (!imagePath || !existsSync(imagePath) || !statSync(imagePath).isFile()) {
    console.error(
      JSON.stringify({
        status: 'VISION_SPIKE_BLOCKED',
        reason: 'image file missing'
      })
    );
    process.exitCode = 1;
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error(
      JSON.stringify({
        status: 'VISION_SPIKE_BLOCKED',
        reason: 'OPENAI_API_KEY is not configured'
      })
    );
    process.exitCode = 1;
    return;
  }

  const bytes = new Uint8Array(readFileSync(imagePath));

  const ocrStartedAt = performance.now();
  const ocrResult = await extractImageText(bytes);
  const ocrDoneAt = performance.now();
  const ocrAiExtraction = await extractReceiptWithAi(ocrResult.rawText);
  const ocrAiDoneAt = performance.now();
  const ocrAiValidation = validateReceiptExtraction(ocrAiExtraction);

  const visionResult = await extractReceiptFromImageWithAi(bytes);
  const visionValidation = validateReceiptExtraction(visionResult.extraction);

  console.log(
    JSON.stringify(
      {
        status: 'DUAL_SPIKE_COMPLETE',
        ocrToAi: {
          latencyMs: {
            total: ocrAiDoneAt - ocrStartedAt,
            ocr: ocrDoneAt - ocrStartedAt,
            ai: ocrAiDoneAt - ocrDoneAt
          },
          ocrTextLength: ocrResult.rawText?.length ?? 0,
          summary: summarizeExtraction(ocrAiExtraction, ocrAiValidation)
        },
        vision: {
          latencyMs: visionResult.latencyMs,
          usage: visionResult.usage,
          summary: summarizeExtraction(
            visionResult.extraction,
            visionValidation,
            { category: visionResult.category ?? null }
          )
        }
      },
      null,
      2
    )
  );
}

main().catch(error => {
  console.error(
    JSON.stringify({
      status: 'VISION_SPIKE_BLOCKED',
      reason: error instanceof Error ? error.message : String(error)
    })
  );
  process.exitCode = 1;
});
