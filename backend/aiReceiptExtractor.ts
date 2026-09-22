import OpenAI from 'openai';
import {
  RECEIPT_EXTRACTION_SYSTEM_PROMPT,
  parseReceiptExtractionResponse,
  receiptSchema
} from './receiptExtractionContract.ts';

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

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (client) return client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw Object.assign(
      new Error('AI receipt extraction is unavailable: OPENAI_API_KEY is not configured'),
      { code: 'ai_credentials_missing' }
    );
  }
  client = new OpenAI({ apiKey });
  return client;
}

export async function extractReceiptWithAi(
  rawText: string
): Promise<AiReceiptExtraction> {
  if (typeof rawText !== 'string' || rawText.trim().length === 0) {
    throw new TypeError('extractReceiptWithAi expects non-empty text');
  }

  const openai = getClient();

  const response = await openai.responses.create({
    model: 'gpt-5.6-luna',

    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: RECEIPT_EXTRACTION_SYSTEM_PROMPT
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

  return parseReceiptExtractionResponse(response.output_text);
}
