import { createWorker } from 'tesseract.js';

type ExtractImageTextResult = {
  rawText: string;
  usedOcr: true;
};

export async function extractImageText(
  bytes: Uint8Array
): Promise<ExtractImageTextResult> {
  if (!(bytes instanceof Uint8Array) || bytes.length === 0) {
    throw new TypeError('extractImageText expects non-empty Uint8Array');
  }

  const worker = await createWorker(['heb', 'eng']);

  try {
    const result = await worker.recognize(bytes);
    const text = result.data.text?.trim() || '';

    return {
      rawText: text,
      usedOcr: true
    };
  } finally {
    await worker.terminate();
  }
}
