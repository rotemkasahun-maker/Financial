import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';
import { createWorker } from 'tesseract.js';

type ExtractPdfTextResult = {
  pageCount: number;
  rawText: string;
  hasTextLayer: boolean;
  usedOcr: boolean;
};

export async function extractPdfText(
  bytes: Uint8Array
): Promise<ExtractPdfTextResult> {
  if (!(bytes instanceof Uint8Array) || bytes.length === 0) {
    throw new TypeError('extractPdfText expects non-empty Uint8Array');
  }

  const loadingTask = getDocument({
    data: bytes,
    useWorkerFetch: false,
    isEvalSupported: false
  });

  const pdf = await loadingTask.promise;

  try {
    const directPages: string[] = [];

    // Phase 1: first try the PDF text layer.
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);

      try {
        const content = await page.getTextContent();

        const text = content.items
          .map(item => ('str' in item ? item.str : ''))
          .filter(Boolean)
          .join(' ')
          .trim();

        directPages.push(text);
      } finally {
        page.cleanup();
      }
    }

    const directText = directPages.join('\n').trim();

    if (directText.length > 0) {
      return {
        pageCount: pdf.numPages,
        rawText: directText,
        hasTextLayer: true,
        usedOcr: false
      };
    }

    // Phase 2: scanned/image-only PDF -> OCR fallback.
    const worker = await createWorker(['heb', 'eng']);

    try {
      const ocrPages: string[] = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);

        try {
          // Higher scale improves OCR quality.
          const viewport = page.getViewport({ scale: 2 });

          const canvas = createCanvas(
            Math.ceil(viewport.width),
            Math.ceil(viewport.height)
          );

          const context = canvas.getContext('2d');

          await page.render({
            canvasContext: context as any,
            viewport
          }).promise;

          const image = canvas.toBuffer('image/png');

          const result = await worker.recognize(image);
          const text = result.data.text?.trim() || '';

          ocrPages.push(text);
        } finally {
          page.cleanup();
        }
      }

      return {
        pageCount: pdf.numPages,
        rawText: ocrPages.join('\n').trim(),
        hasTextLayer: false,
        usedOcr: true
      };
    } finally {
      await worker.terminate();
    }
  } finally {
    await loadingTask.destroy();
  }
}