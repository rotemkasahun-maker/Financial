import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export async function extractPdfText(file) {
  if (!file?.arrayBuffer) {
    throw new TypeError('extractPdfText expects a File-like object');
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  let pdf;
  try {
    const loadingTask = getDocument({ data: bytes });
    pdf = await loadingTask.promise;
  } catch (error) {
    throw new Error(`Unable to read PDF: ${error.message}`);
  }

  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);

    try {
      const content = await page.getTextContent();

      const text = content.items
        .map(item => ('str' in item ? item.str : ''))
        .filter(Boolean)
        .join(' ')
        .trim();

      pages.push(text);
    } finally {
      page.cleanup();
    }
  }

  return {
    pageCount: pdf.numPages,
    rawText: pages.join('\n').trim()
  };
}