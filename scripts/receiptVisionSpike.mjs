import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import { extractReceiptFromImageWithAi } from '../backend/aiReceiptVisionExtractor.ts';
import { validateReceiptExtraction } from '../backend/receiptValidator.ts';

const imagePath = resolve(
  process.env.REAL_RECEIPT_IMAGE_PATH ||
    process.argv[2] ||
    ''
);

function summarizeVision(result, validation) {
  const extraction = result?.extraction;
  return {
    merchant: extraction?.merchant ?? null,
    rawMerchant: extraction?.rawMerchant ?? null,
    purchaseDate: extraction?.purchaseDate ?? null,
    total: extraction?.total ?? null,
    currency: extraction?.currency ?? null,
    category: result?.category ?? null,
    itemCount: Array.isArray(extraction?.items)
      ? extraction.items.length
      : 0,
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
  if (
    !imagePath ||
    !existsSync(imagePath) ||
    !statSync(imagePath).isFile()
  ) {
    console.error(
      JSON.stringify({
        status: 'VISION_SPIKE_BLOCKED',
        reason: 'REAL_RECEIPT_IMAGE_PATH not set or image file missing',
        expectedEnv: 'REAL_RECEIPT_IMAGE_PATH',
        checkedPath: imagePath || null
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
  const visionResult = await extractReceiptFromImageWithAi(bytes);
  const visionValidation = validateReceiptExtraction(visionResult.extraction);

  console.log(
    JSON.stringify(
      {
        status: 'VISION_SPIKE_COMPLETE',
        path: 'image→vision only; OCR skipped',
        latencyMs: visionResult.latencyMs,
        usage: visionResult.usage,
        summary: summarizeVision(visionResult, visionValidation)
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
