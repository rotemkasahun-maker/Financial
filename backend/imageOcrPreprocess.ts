import { createCanvas, loadImage } from '@napi-rs/canvas';

const MIN_SHORT_SIDE = 1600;
const MAX_LONG_SIDE = 2400;

export async function preprocessReceiptImage(
  bytes: Uint8Array
): Promise<Uint8Array> {
  if (!(bytes instanceof Uint8Array) || bytes.length === 0) {
    throw new TypeError('preprocessReceiptImage expects non-empty Uint8Array');
  }

  const image = await loadImage(Buffer.from(bytes));
  const sourceWidth = image.width;
  const sourceHeight = image.height;

  if (!sourceWidth || !sourceHeight) {
    return bytes;
  }

  const scale = computeScale(sourceWidth, sourceHeight);
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = true;
  context.drawImage(image, 0, 0, width, height);
  convertToGrayscale(context, width, height);
  stretchContrastIfNeeded(context, width, height);

  return new Uint8Array(canvas.toBuffer('image/png'));
}

function computeScale(width: number, height: number): number {
  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);
  let scale = 1;

  if (shortSide < MIN_SHORT_SIDE) {
    scale = MIN_SHORT_SIDE / shortSide;
  }

  if (longSide * scale > MAX_LONG_SIDE) {
    scale = MAX_LONG_SIDE / longSide;
  }

  return scale;
}

function convertToGrayscale(
  context: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
  width: number,
  height: number
): void {
  const imageData = context.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  for (let i = 0; i < pixels.length; i += 4) {
    const gray = Math.round(
      0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]
    );
    pixels[i] = gray;
    pixels[i + 1] = gray;
    pixels[i + 2] = gray;
  }

  context.putImageData(imageData, 0, 0);
}

function stretchContrastIfNeeded(
  context: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
  width: number,
  height: number
): void {
  const imageData = context.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  const samples: number[] = [];

  for (let i = 0; i < pixels.length; i += 16) {
    samples.push(pixels[i]);
  }

  samples.sort((a, b) => a - b);
  const low = samples[Math.floor(samples.length * 0.02)] ?? 0;
  const high = samples[Math.max(0, Math.ceil(samples.length * 0.98) - 1)] ?? 255;

  if (high - low >= 140) {
    return;
  }

  const range = Math.max(1, high - low);

  for (let i = 0; i < pixels.length; i += 4) {
    const stretched = Math.max(
      0,
      Math.min(255, Math.round(((pixels[i] - low) / range) * 255))
    );
    pixels[i] = stretched;
    pixels[i + 1] = stretched;
    pixels[i + 2] = stretched;
  }

  context.putImageData(imageData, 0, 0);
}
