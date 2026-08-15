import { createImportEnvelope } from '../models.js';

const RECEIPT_TERMS=/(?:קבלה|חשבונית|מסמך\s*(?:מס|חיוב)|receipt|invoice|tax\s*document)/iu;
const MAX_DOCUMENT_BYTES=15*1024*1024;
const ALLOWED_TYPES=new Set(['application/pdf','image/jpeg','image/png','image/webp']);
const decode=value=>String(value||'').replace(/&amp;/gi,'&').replace(/&#x2F;/gi,'/').replace(/&quot;/gi,'"');

export function extractDocumentUrls(message){
  const body=`${message?.textBody||''}\n${message?.htmlBody||''}`,urls=[...body.matchAll(/https?:\/\/[^\s<>"']+/giu)].map(match=>decode(match[0]).replace(/[),.;]+$/u,''));
  return [...new Set(urls)].sort((left,right)=>documentLikelihood(right)-documentLikelihood(left));
}
const documentLikelihood=value=>/\.(?:pdf|png|jpe?g|webp)(?:[?#]|$)/iu.test(value)?2:/(?:receipt|invoice|document|download|קבלה|חשבונית|מסמך)/iu.test(value)?1:0;

export function isSafeDocumentUrl(value){
  try{const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password)return false;const host=url.hostname.toLowerCase();if(host==='localhost'||host.endsWith('.local')||host==='0.0.0.0'||host==='::1')return false;const parts=host.split('.').map(Number);if(parts.length===4&&parts.every(Number.isFinite)){if(parts[0]===10||parts[0]===127||parts[0]===0||(parts[0]===192&&parts[1]===168)||(parts[0]===172&&parts[1]>=16&&parts[1]<=31))return false}return true}catch{return false}
}

export function detectLinkedReceiptEmail(message){const hasAttachment=(message?.attachments||[]).length>0,urls=extractDocumentUrls(message);return {detected:!hasAttachment&&RECEIPT_TERMS.test(`${message?.subject||''} ${message?.textBody||''} ${message?.htmlBody||''}`)&&urls.length>0,hasAttachment,urls}}

const header=(response,name)=>response?.headers?.get?.(name)||response?.headers?.[name]||response?.headers?.[name.toLowerCase()]||'';
const filenameFor=(url,type)=>{const name=new URL(url).pathname.split('/').filter(Boolean).at(-1);return name&&name.includes('.')?name:`gmail-document.${type==='application/pdf'?'pdf':type.split('/')[1]||'bin'}`};
const makeFile=(bytes,name,type)=>typeof File==='function'?new File([bytes],name,{type}):Object.assign(new Blob([bytes],{type}),{name});

export class GmailLinkedReceiptFlow {
  constructor({importPipeline,fetchDocument}){this.importPipeline=importPipeline;this.fetchDocument=fetchDocument}
  async process(message,{userId='demo-member-a',sourceAccount=null}={}){
    const detection=detectLinkedReceiptEmail(message),metadata={messageId:message.id||message.messageId||null,threadId:message.threadId||null,from:message.from||null,to:message.to||null,subject:message.subject||null,receivedAt:message.receivedAt||message.date||null};
    if(!detection.detected)return {status:'not_relevant',metadata};
    for(const documentUrl of detection.urls){
      if(!isSafeDocumentUrl(documentUrl))continue;
      let response;try{response=await this.fetchDocument(documentUrl,{redirect:'manual',credentials:'omit'})}catch{return {status:'fallback_required',reason:'download_failed',documentUrl,metadata}}
      if([401,403].includes(response.status))return {status:'fallback_required',reason:'authentication_required',documentUrl,metadata};
      if(response.status>=300&&response.status<400)return {status:'fallback_required',reason:'redirect_requires_validation',documentUrl,metadata};
      if(!response.ok)return {status:'fallback_required',reason:'download_failed',documentUrl,metadata};
      if(response.url&&!isSafeDocumentUrl(response.url))return {status:'fallback_required',reason:'unsafe_redirect',documentUrl,metadata};
      const type=String(header(response,'content-type')).split(';')[0].trim().toLowerCase(),declaredSize=Number(header(response,'content-length')||0);
      if(type.includes('text/html'))return {status:'fallback_required',reason:'authentication_required',documentUrl,metadata};
      if(!ALLOWED_TYPES.has(type)||declaredSize>MAX_DOCUMENT_BYTES)return {status:'fallback_required',reason:'unsupported_document',documentUrl,metadata};
      const bytes=await response.arrayBuffer();if(bytes.byteLength===0||bytes.byteLength>MAX_DOCUMENT_BYTES)return {status:'fallback_required',reason:'invalid_document_size',documentUrl,metadata};
      const file=makeFile(bytes,filenameFor(documentUrl,type),type),envelope=createImportEnvelope({sourceType:'gmail',payload:{fileName:file.name,fileType:type},userId,deviceId:'gmail-connector',sourceAccount,externalSourceId:metadata.messageId,metadata:{email:{...metadata,documentUrl}}}),prepared=await this.importPipeline.prepare(envelope,file),highMatch=prepared.matches.find(item=>item.confidence==='high');
      if(highMatch){const saved=await this.importPipeline.commit(prepared,highMatch.id);return {status:'linked_automatically',saved,prepared,metadata,documentUrl}}
      return {status:'review_required',prepared,metadata,documentUrl};
    }
    return {status:'fallback_required',reason:'no_safe_document_url',metadata};
  }
}
