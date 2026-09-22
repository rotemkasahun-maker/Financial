import { createWorker, PSM } from 'tesseract.js';
import { preprocessReceiptImage } from './imageOcrPreprocess.ts';

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
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      preserve_interword_spaces: '1'
    });

    let ocrInput: Uint8Array = bytes;

    try {
      ocrInput = await preprocessReceiptImage(bytes);
    } catch {
      ocrInput = bytes;
    }

    const result = await worker.recognize(ocrInput);
    const text = result.data.text?.trim() || '';

    return {
      rawText: text,
      usedOcr: true
    };
  } finally {
    await worker.terminate();
  }
}
