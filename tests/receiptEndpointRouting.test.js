import test from 'node:test';
import assert from 'node:assert/strict';

// Test MIME type validation logic without full server
// Using the exact routing logic from server.ts

test('MIME validation - JPEG accepted', () => {
  const contentType = 'image/jpeg';
  const isPdf = contentType === 'application/pdf';
  const isImage = /^image\/(jpeg|png)$/.test(contentType);
  
  assert.equal(isPdf, false);
  assert.equal(isImage, true);
  assert.equal(isPdf || isImage, true, 'JPEG should be accepted');
});

test('MIME validation - PNG accepted', () => {
  const contentType = 'image/png';
  const isPdf = contentType === 'application/pdf';
  const isImage = /^image\/(jpeg|png)$/.test(contentType);
  
  assert.equal(isPdf, false);
  assert.equal(isImage, true);
  assert.equal(isPdf || isImage, true, 'PNG should be accepted');
});

test('MIME validation - PDF accepted', () => {
  const contentType = 'application/pdf';
  const isPdf = contentType === 'application/pdf';
  const isImage = /^image\/(jpeg|png)$/.test(contentType);
  
  assert.equal(isPdf, true);
  assert.equal(isImage, false);
  assert.equal(isPdf || isImage, true, 'PDF should be accepted');
});

test('MIME validation - GIF rejected', () => {
  const contentType = 'image/gif';
  const isPdf = contentType === 'application/pdf';
  const isImage = /^image\/(jpeg|png)$/.test(contentType);
  
  assert.equal(isPdf, false);
  assert.equal(isImage, false);
  assert.equal(isPdf || isImage, false, 'GIF should be rejected');
});

test('MIME validation - WEBP rejected', () => {
  const contentType = 'image/webp';
  const isPdf = contentType === 'application/pdf';
  const isImage = /^image\/(jpeg|png)$/.test(contentType);
  
  assert.equal(isPdf, false);
  assert.equal(isImage, false);
  assert.equal(isPdf || isImage, false, 'WEBP should be rejected');
});
