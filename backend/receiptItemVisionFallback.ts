import type { AiReceiptExtraction, AiReceiptItem } from './aiReceiptExtractor.ts';
import {
  extractReceiptFromImageWithAi,
  type ReceiptVisionExtractionResult
} from './aiReceiptVisionExtractor.ts';

export const VISION_FALLBACK_TIMEOUT_MS = 25_000;

export type ItemVisionFallbackDeps = {
  extractReceiptFromImageWithAiFn?: (
    imageBytes: Uint8Array,
    mimeType?: 'image/jpeg' | 'image/png',
    options?: { signal?: AbortSignal }
  ) => Promise<ReceiptVisionExtractionResult>;
  timeoutMs?: number;
};

export type ItemVisionFallbackResult = {
  extraction: AiReceiptExtraction;
  visionCallCount: number;
  visionContributed: boolean;
  forceReview: boolean;
};

function hasMoney(value: string | null | undefined): boolean {
  if (value === null || value === undefined || value === '') {
    return false;
  }

  return Number.isFinite(Number(value));
}

function hasUsableLineTotal(item: AiReceiptItem): boolean {
  if (hasMoney(item.totalPrice)) {
    return true;
  }

  const quantity = Number(item.quantity);
  return Number.isFinite(quantity) && quantity > 0 && hasMoney(item.unitPrice);
}

function isEmptyName(name: string | null | undefined): boolean {
  return !String(name ?? '').trim();
}

function isUsableVisionItem(item: unknown): item is AiReceiptItem {
  return Boolean(item) && typeof item === 'object';
}

export function shouldUseItemVisionFallback(
  extraction: AiReceiptExtraction | null | undefined
): boolean {
  if (!extraction || !Array.isArray(extraction.items) || extraction.items.length === 0) {
    return true;
  }

  return extraction.items.some(item => !hasUsableLineTotal(item));
}

function toReviewItem(item: AiReceiptItem): AiReceiptItem {
  return {
    name: item.name ?? '',
    quantity: item.quantity ?? null,
    unitPrice: item.unitPrice ?? null,
    totalPrice: item.totalPrice ?? null,
    discount: item.discount ?? null
  };
}

function mergeAlignedItem(
  ocrItem: AiReceiptItem,
  visionItem: AiReceiptItem
): { item: AiReceiptItem; contributed: boolean } {
  let contributed = false;
  const merged: AiReceiptItem = { ...ocrItem };

  if (isEmptyName(ocrItem.name) && !isEmptyName(visionItem.name)) {
    merged.name = visionItem.name;
    contributed = true;
  }

  if (
    (ocrItem.quantity === null || ocrItem.quantity === undefined) &&
    visionItem.quantity !== null &&
    visionItem.quantity !== undefined
  ) {
    merged.quantity = visionItem.quantity;
    contributed = true;
  }

  if (!hasMoney(ocrItem.unitPrice) && hasMoney(visionItem.unitPrice)) {
    merged.unitPrice = visionItem.unitPrice;
    contributed = true;
  }

  if (!hasMoney(ocrItem.totalPrice) && hasMoney(visionItem.totalPrice)) {
    merged.totalPrice = visionItem.totalPrice;
    contributed = true;
  }

  return { item: merged, contributed };
}

export function mergeVisionItems(
  ocrExtraction: AiReceiptExtraction,
  visionExtraction: AiReceiptExtraction | null | undefined
): Pick<ItemVisionFallbackResult, 'extraction' | 'visionContributed' | 'forceReview'> {
  const visionItems = visionExtraction?.items;
  const ocrItems = Array.isArray(ocrExtraction.items) ? ocrExtraction.items : [];

  if (!Array.isArray(visionItems) || visionItems.length === 0 || !visionItems.every(isUsableVisionItem)) {
    return {
      extraction: ocrExtraction,
      visionContributed: false,
      forceReview: false
    };
  }

  if (ocrItems.length === 0) {
    return {
      extraction: retainOcrCore(ocrExtraction, visionItems.map(toReviewItem)),
      visionContributed: true,
      forceReview: true
    };
  }

  if (ocrItems.length !== visionItems.length) {
    return {
      extraction: ocrExtraction,
      visionContributed: false,
      forceReview: true
    };
  }

  let visionContributed = false;
  const items = ocrItems.map((ocrItem, index) => {
    const merged = mergeAlignedItem(ocrItem, visionItems[index]);
    if (merged.contributed) {
      visionContributed = true;
    }
    return merged.item;
  });

  return {
    extraction: retainOcrCore(ocrExtraction, items),
    visionContributed,
    forceReview: visionContributed
  };
}

function retainOcrCore(
  ocrExtraction: AiReceiptExtraction,
  items: AiReceiptItem[]
): AiReceiptExtraction {
  const extraction: AiReceiptExtraction = {
    ...ocrExtraction,
    merchant: ocrExtraction.merchant,
    rawMerchant: ocrExtraction.rawMerchant,
    purchaseDate: ocrExtraction.purchaseDate,
    purchaseTime: ocrExtraction.purchaseTime,
    total: ocrExtraction.total,
    currency: ocrExtraction.currency,
    confidence: ocrExtraction.confidence,
    warnings: ocrExtraction.warnings,
    items
  };

  delete (extraction as { category?: unknown }).category;
  return extraction;
}

async function withTimeout<T>(
  work: Promise<T>,
  timeoutMs: number
): Promise<T> {
  const signal = AbortSignal.timeout(timeoutMs);

  return await new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      reject(Object.assign(new Error('vision_timeout'), { code: 'vision_timeout' }));
    };

    if (signal.aborted) {
      onAbort();
      return;
    }

    signal.addEventListener('abort', onAbort, { once: true });
    work.then(resolve, reject).finally(() => {
      signal.removeEventListener('abort', onAbort);
    });
  });
}

export async function applyItemVisionFallback(
  ocrExtraction: AiReceiptExtraction,
  imageBytes: Uint8Array,
  deps: ItemVisionFallbackDeps = {}
): Promise<ItemVisionFallbackResult> {
  if (!shouldUseItemVisionFallback(ocrExtraction)) {
    return {
      extraction: ocrExtraction,
      visionCallCount: 0,
      visionContributed: false,
      forceReview: false
    };
  }

  const timeoutMs = deps.timeoutMs ?? VISION_FALLBACK_TIMEOUT_MS;
  const signal = AbortSignal.timeout(timeoutMs);
  const extractFn =
    deps.extractReceiptFromImageWithAiFn ??
    ((bytes: Uint8Array) =>
      extractReceiptFromImageWithAi(bytes, undefined, { signal }));

  try {
    const visionResult = await withTimeout(extractFn(imageBytes), timeoutMs);
    const merged = mergeVisionItems(ocrExtraction, visionResult?.extraction);

    return {
      ...merged,
      visionCallCount: 1
    };
  } catch {
    return {
      extraction: ocrExtraction,
      visionCallCount: 1,
      visionContributed: false,
      forceReview: false
    };
  }
}
