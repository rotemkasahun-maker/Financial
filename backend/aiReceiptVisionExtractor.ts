import OpenAI from 'openai';
import type { AiReceiptExtraction } from './aiReceiptExtractor.ts';
import {
  RECEIPT_VISION_SPIKE_SYSTEM_PROMPT,
  parseReceiptExtractionResponse,
  receiptVisionSpikeSchema,
  sanitizeOpenAiUsage
} from './receiptExtractionContract.ts';

export type ReceiptVisionExtractionResult = {
  extraction: AiReceiptExtraction;
  category: string | null;
  latencyMs: number;
  usage: Record<string, number> | null;
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

function detectImageMimeType(bytes: Uint8Array): 'image/jpeg' | 'image/png' {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return 'image/jpeg';
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png';
  }

  return 'image/jpeg';
}

export async function extractReceiptFromImageWithAi(
  imageBytes: Uint8Array,
  mimeType?: 'image/jpeg' | 'image/png',
  options?: { signal?: AbortSignal }
): Promise<ReceiptVisionExtractionResult> {
  if (!(imageBytes instanceof Uint8Array) || imageBytes.length === 0) {
    throw new TypeError(
      'extractReceiptFromImageWithAi expects non-empty Uint8Array'
    );
  }

  const resolvedMimeType = mimeType ?? detectImageMimeType(imageBytes);
  const dataUrl = `data:${resolvedMimeType};base64,${Buffer.from(imageBytes).toString('base64')}`;
  const openai = getClient();
  const startedAt = performance.now();

  const response = await openai.responses.create({
    model: 'gpt-5.6-luna',
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: RECEIPT_VISION_SPIKE_SYSTEM_PROMPT
          }
        ]
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: 'Extract structured receipt data from this image.'
          },
          {
            type: 'input_image',
            detail: 'high',
            image_url: dataUrl
          }
        ]
      }
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'receipt_extraction',
        strict: true,
        schema: receiptVisionSpikeSchema
      }
    }
  }, options?.signal ? { signal: options.signal } : undefined);

  const parsed = JSON.parse(response.output_text || '{}') as AiReceiptExtraction & {
    category?: string | null;
  };
  const category =
    typeof parsed.category === 'string' && parsed.category.trim()
      ? parsed.category.trim()
      : null;
  const { category: _ignored, ...extractionFields } = parsed;

  return {
    extraction: parseReceiptExtractionResponse(
      JSON.stringify(extractionFields)
    ),
    category,
    latencyMs: performance.now() - startedAt,
    usage: sanitizeOpenAiUsage(
      response.usage as Record<string, unknown> | undefined
    )
  };
}
