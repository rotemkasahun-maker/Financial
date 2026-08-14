let fallbackSequence=0;

/** Browser-safe local identifier. Uses UUID when available and never requires it. */
export function generateId(prefix='id'){
  const cryptoApi=globalThis.crypto;
  if(typeof cryptoApi?.randomUUID==='function')return cryptoApi.randomUUID();
  let randomPart='';
  if(typeof cryptoApi?.getRandomValues==='function'){
    const bytes=new Uint8Array(12);cryptoApi.getRandomValues(bytes);
    randomPart=Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');
  }else randomPart=`${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  fallbackSequence=(fallbackSequence+1)%Number.MAX_SAFE_INTEGER;
  return `${prefix}-${Date.now().toString(36)}-${fallbackSequence.toString(36)}-${randomPart}`;
}
