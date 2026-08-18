import OpenAI from 'openai';

export type AiReceiptItem = {
  name: string;
  quantity: number | null;
  unitPrice: string | null;
  totalPrice: string | null;
  discount: string | null;
};

export type AiReceiptExtraction = {
  merchant: string | null;
  rawMerchant: string | null;
  purchaseDate: string | null;
  purchaseTime: string | null;
  total: string | null;
  currency: string | null;
  invoiceNumber: string | null;
  receiptNumber: string | null;
  paymentMethod: string | null;
  cardLast4: string | null;
  vat: string | null;
  subtotalBeforeVat: string | null;
  items: AiReceiptItem[];
  confidence: number;
  warnings: string[];
};

const client = new OpenAI();

const receiptSchema = {
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

export async function extractReceiptWithAi(
  rawText: string
): Promise<AiReceiptExtraction> {
  if (typeof rawText !== 'string' || rawText.trim().length === 0) {
    throw new TypeError('extractReceiptWithAi expects non-empty text');
  }

  const response = await client.responses.create({
    model: 'gpt-5.6-luna',

    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text:
              'You extract structured financial receipt data. ' +
              'Use only information present in the supplied document text. ' +
              'Do not invent missing values. Use null when unknown. ' +
              'Keep monetary values as decimal strings, without currency symbols. ' +
              'Use negative values only when the document clearly represents a refund or discount. ' +
              'Do not categorize products. ' +
              'rawMerchant should preserve the merchant name as written. ' +
              'merchant may be a shorter normalized business name when obvious. ' +
              'For items, include actual purchased goods or services; do not include legal text, warranty text, totals, payment instructions, or unrelated metadata. ' +
              'If extraction is uncertain, lower confidence and add a concise warning.'
          }
        ]
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: rawText
          }
        ]
      }
    ],

    text: {
      format: {
        type: 'json_schema',
        name: 'receipt_extraction',
        strict: true,
        schema: receiptSchema
      }
    }
  });

  if (!response.output_text) {
    throw new Error('AI receipt extraction returned no structured output');
  }

  return JSON.parse(response.output_text) as AiReceiptExtraction;
}