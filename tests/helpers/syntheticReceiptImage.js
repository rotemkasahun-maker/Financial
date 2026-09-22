import { createCanvas, loadImage } from '@napi-rs/canvas';

export function createSyntheticReceiptPng() {
  return renderLatinReceipt(900, 700, 'image/png');
}

export function createSyntheticReceiptJpeg() {
  return renderLatinReceipt(900, 700, 'image/jpeg');
}

export async function createLowResReceiptJpeg() {
  const source = renderLatinReceipt(900, 700, 'image/png');
  const image = await loadImage(Buffer.from(source));
  const small = createCanvas(420, 327);
  const ctx = small.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(image, 0, 0, small.width, small.height);
  return new Uint8Array(small.toBuffer('image/jpeg', 0.72));
}

export function createHebrewReceiptPng() {
  const canvas = createCanvas(900, 1100);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';
  ctx.font = 'bold 52px Arial';
  ctx.fillText('SUPER MART', 80, 120);
  ctx.fillText('סופר מארט', 80, 200);
  ctx.font = '40px Arial';
  ctx.fillText('11.09.2026', 80, 320);
  ctx.fillText('MILK 8.90', 80, 420);
  ctx.fillText('BREAD 12.40', 80, 500);
  ctx.fillText('TOTAL 21.30', 80, 620);

  return new Uint8Array(canvas.toBuffer('image/png'));
}

function renderLatinReceipt(width, height, type) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 56px Arial';
  ctx.fillText('TEST MARKET', 80, 120);
  ctx.font = '44px Arial';
  ctx.fillText('09.09.2026', 80, 220);
  ctx.fillText('TOTAL 42.50', 80, 320);

  return new Uint8Array(canvas.toBuffer(type));
}
