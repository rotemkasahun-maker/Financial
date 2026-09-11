import { createCanvas } from '@napi-rs/canvas';

export function createSyntheticReceiptPng() {
  const canvas = createCanvas(900, 700);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 56px Arial';
  ctx.fillText('TEST MARKET', 80, 120);
  ctx.font = '44px Arial';
  ctx.fillText('09.09.2026', 80, 220);
  ctx.fillText('TOTAL 42.50', 80, 320);

  return new Uint8Array(canvas.toBuffer('image/png'));
}

export function createSyntheticReceiptJpeg() {
  const canvas = createCanvas(900, 700);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 56px Arial';
  ctx.fillText('TEST MARKET', 80, 120);
  ctx.font = '44px Arial';
  ctx.fillText('09.09.2026', 80, 220);
  ctx.fillText('TOTAL 42.50', 80, 320);

  return new Uint8Array(canvas.toBuffer('image/jpeg'));
}
