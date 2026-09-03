export class WriteFrozenError extends Error { code = 'WRITE_FROZEN'; constructor(){super('Writes are temporarily frozen');} }
export class WriteFreezeController {
  mode: 'NORMAL'|'WRITE_FROZEN' = 'NORMAL';
  freeze(){this.mode='WRITE_FROZEN'; return this.mode}
  release(){this.mode='NORMAL'; return this.mode}
  status(){return this.mode}
  assertWritable(){if(this.mode==='WRITE_FROZEN') throw new WriteFrozenError()}
}
