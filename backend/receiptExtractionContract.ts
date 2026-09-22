import type { AiReceiptExtraction } from './aiReceiptExtractor.ts';

export const receiptSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    merchant: {
      type: ['string', 'null']
    },
    rawMerchant: {
      type: ['string', 'null']
    },
    purchaseDate: {
      type: ['string', 'null'],
      description: 'ISO date YYYY-MM-DD when identifiable'
    },
    purchaseTime: {
      type: ['string', 'null'],
      description: '24-hour HH:MM when identifiable'
    },
    total: {
      type: ['string', 'null'],
      description: 'Final amount paid, decimal string such as 204.00'
    },
    currency: {
      type: ['string', 'null'],
      description: 'ISO 4217 currency code such as ILS'
    },
    invoiceNumber: {
      type: ['string', 'null']
    },
    receiptNumber: {
      type: ['string', 'null']
    },
    paymentMethod: {
      type: ['string', 'null']
    },
    cardLast4: {
      type: ['string', 'null']
    },
    vat: {
      type: ['string', 'null']
    },
    subtotalBeforeVat: {
      type: ['string', 'null']
    },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: {
            type: 'string'
          },
          quantity: {
            type: ['number', 'null']
          },
          unitPrice: {
            type: ['string', 'null']
          },
          totalPrice: {
            type: ['string', 'null']
          },
          discount: {
            type: ['string', 'null']
          }
        },
        required: [
          'name',
          'quantity',
          'unitPrice',
          'totalPrice',
          'discount'
        ]
      }
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1
    },
    warnings: {
      type: 'array',
      items: {
        type: 'string'
      }
    }
  },
  required: [
    'merchant',
    'rawMerchant',
    'purchaseDate',
    'purchaseTime',
    'total',
    'currency',
    'invoiceNumber',
    'receiptNumber',
    'paymentMethod',
    'cardLast4',
    'vat',
    'subtotalBeforeVat',
    'items',
    'confidence',
    'warnings'
  ]
} as const;

export const RECEIPT_EXTRACTION_SYSTEM_PROMPT =
  'You extract structured financial receipt data. ' +
  'Use only information present in the supplied document text. ' +
  'Do not invent missing values. Use null when unknown. ' +
  'Keep monetary values as decimal strings, without currency symbols. ' +
  'Use negative values only when the document clearly represents a refund or discount. ' +
  'Do not categorize products. ' +
  'rawMerchant should preserve the merchant name as written. ' +
  'merchant may be a shorter normalized business name when obvious. ' +
  'For items, include actual purchased goods or services; do not include legal text, warranty text, totals, payment instructions, or unrelated metadata. ' +
  'If extraction is uncertain, lower confidence and add a concise warning.';

export const RECEIPT_CATEGORY_OPTIONS = [
  'מסעדה',
  'סופר',
  'פארם',
  'ביגוד',
  'תחבורה',
  'חשבונות',
  'פנאי',
  'אחר'
] as const;

export const receiptVisionSpikeSchema = {
  ...receiptSchema,
  properties: {
    ...receiptSchema.properties,
    category: {
      type: ['string', 'null'],
      description:
        'Receipt-level transaction category inferred from merchant and overall receipt context, not from individual product names. Allowed values: מסעדה, סופר, פארם, ביגוד, תחבורה, חשבונות, פנאי, אחר. Use null when unknown.'
    }
  },
  required: [...receiptSchema.required, 'category']
} as const;

export const RECEIPT_VISION_SYSTEM_PROMPT =
  'You extract structured financial receipt data. ' +
  'Use only information visible in the supplied receipt image. ' +
  'Do not invent missing values. Use null when unknown. ' +
  'Keep monetary values as decimal strings, without currency symbols. ' +
  'Use negative values only when the document clearly represents a refund or discount. ' +
  'Do not categorize products. ' +
  'rawMerchant should preserve the merchant name as written on the receipt. ' +
  'merchant may be a shorter normalized business name when obvious. ' +
  'For items, include actual purchased goods or services; do not include legal text, warranty text, totals, payment instructions, or unrelated metadata. ' +
  'If extraction is uncertain, lower confidence and add a concise warning.';

export const RECEIPT_VISION_SPIKE_SYSTEM_PROMPT =
  RECEIPT_VISION_SYSTEM_PROMPT +
  ' Also infer one receipt-level transaction category from the merchant and overall receipt context. ' +
  'Do not categorize individual products. ' +
  'Allowed category values: מסעדה, סופר, פארם, ביגוד, תחבורה, חשבונות, פנאי, אחר. ' +
  'Use null when the receipt-level category is unknown.';

export function parseReceiptExtractionResponse(
  outputText: string | null | undefined
): AiReceiptExtraction {
  if (!outputText) {
    throw new Error('AI receipt extraction returned no structured output');
  }

  return JSON.parse(outputText) as AiReceiptExtraction;
}

export function sanitizeOpenAiUsage(
  usage: Record<string, unknown> | null | undefined
): Record<string, number> | null {
  if (!usage || typeof usage !== 'object') {
    return null;
  }

  const sanitized: Record<string, number> = {};

  for (const [key, value] of Object.entries(usage)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      sanitized[key] = value;
    }
  }

  return Object.keys(sanitized).length ? sanitized : null;
}
