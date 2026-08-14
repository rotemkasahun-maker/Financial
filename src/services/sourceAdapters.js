/** Connectors only acquire raw source data. They never apply financial policy. */
export class SourceAdapter {
  async fetch(_cursor) { throw new Error('Not implemented'); }
  async health() { return {status:'waiting_connection',checkedAt:new Date().toISOString()}; }
}
export class FileAdapter extends SourceAdapter {
  constructor({sourceType}) { super(); this.sourceType=sourceType; }
  async fetch(file) { return {sourceType:this.sourceType,raw:file,status:'received'}; }
}
export class OpenBankingAdapter extends SourceAdapter {
  async fetch() { throw new Error('Open Banking provider is not connected'); }
}
export class GmailAdapter extends SourceAdapter {
  async fetch() { throw new Error('Gmail OAuth is not connected'); }
}
export class AndroidSmsAdapter extends SourceAdapter {
  async fetch() { throw new Error('Private Android client is not connected'); }
}

export const selectFinancialAdapter=({kind,mode})=>mode==='file'?new FileAdapter({sourceType:kind==='bank'?'bank_import':'credit_card_import'}):new OpenBankingAdapter();
