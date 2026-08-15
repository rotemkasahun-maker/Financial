import { generateId } from '../utils/id.js';

const normalize=value=>String(value??'').toLowerCase().replace(/[\u200e\u200f]/g,'').replace(/&(?:nbsp|amp);/g,' ').replace(/[׳״"'.,()_\-/\\]/g,' ').replace(/\s+/g,' ').trim();
const tokens=value=>new Set(normalize(value).split(' ').filter(token=>token.length>1&&!/^\d+$/.test(token)));
const similarity=(left,right)=>{const a=tokens(left),b=tokens(right);if(!a.size||!b.size)return 0;return [...a].filter(token=>b.has(token)).length/Math.max(a.size,b.size)};
const daysApart=(left,right)=>Math.abs((new Date(left)-new Date(right))/86400000);
const money=value=>{const cleaned=String(value??'').replace(/[₪\s]/g,'').replace(/,/g,'');const number=Number(cleaned);return Number.isFinite(number)?Math.abs(number):null};
const isoDate=value=>{const text=String(value??'').trim(),match=text.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);if(!match)return /^\d{4}-\d{2}-\d{2}/.test(text)?text.slice(0,10):null;const year=match[3].length===2?`20${match[3]}`:match[3];return `${year}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}`};
const decodeHtml=value=>String(value??'').replace(/&#(x?[0-9a-f]+);/gi,(_,code)=>String.fromCodePoint(parseInt(code.replace(/^x/i,''),/^x/i.test(code)?16:10))).replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"');
const filenameMerchant=filename=>{const rawStem=decodeURIComponent(String(filename??'')).replace(/\.(?:mht|mhtml|pdf)$/i,'').trim(),domain=rawStem.match(/(?:^|[_.\s])(?:www\.|digi\.)?([a-z0-9-]+)\.(?:co\.)?il(?=$|[^a-z0-9])/i);if(domain)return domain[1].replace(/-/g,' ');const stem=rawStem.replace(/[_-]+/g,' ').trim();if(/^קבלה(?:\s|$)/i.test(stem))return null;return stem.replace(/\breceipt\b/ig,'').trim()||null};
const uniqueDate=(...values)=>{const found=[...new Set(values.flatMap(value=>[...String(value??'').replace(/_/g,'-').matchAll(/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/g)].map(match=>isoDate(match[0]))).filter(Boolean))];return found.length===1?found[0]:null};

export function parseMhtReceipt(text,{filename='receipt.mht'}={}){
  const source=String(text??''),mimeParts=source.split(/\r?\n--[^\r\n]+/),decodedParts=mimeParts.map(part=>{if(/Content-Transfer-Encoding:\s*base64/i.test(part)){const body=part.split(/\r?\n\r?\n/).slice(1).join('\n').replace(/\s+/g,'');try{if(typeof globalThis.atob==='function')return decodeURIComponent([...globalThis.atob(body)].map(char=>`%${char.charCodeAt(0).toString(16).padStart(2,'0')}`).join(''))}catch{return ''}}return part.replace(/=\r?\n/g,'').replace(/=([0-9A-F]{2})/gi,(_,hex)=>String.fromCharCode(parseInt(hex,16)))}),decoded=decodeHtml(decodedParts.join(' ')).replace(/<[^>]+>/g,' '),plain=decoded.replace(/\s+/g,' ');
  const merchant=(plain.match(/(?:merchant|בית עסק|ספק)\s*[:：-]\s*([^|;]{2,80})/i)||[])[1]?.trim()||null;
  const date=isoDate((plain.match(/(?:date|תאריך)\s*[:：-]?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i)||[])[1])||uniqueDate(plain,filename);
  const total=money((plain.match(/(?:total|סה.?כ|סך\s*הכל|לתשלום|סכום\s*כולל)[^\d]{0,40}([\d,.]+)/i)||[])[1]);
  const reference=(plain.match(/(?:order|reference|הזמנה|אסמכתה)\s*(?:number|מספר|#)?\s*[:：-]?\s*([\w-]{3,})/i)||[])[1]||null;
  const items=[...plain.matchAll(/(?:item|פריט)\s*[:：-]\s*([^|;]+?)\s+(?:₪|ש.?ח)\s*([\d,.]+)/gi)].map(match=>({name:match[1].trim(),total:money(match[2])}));
  const resolvedMerchant=merchant||filenameMerchant(filename);
  return {filename,fileType:'mht',merchant:resolvedMerchant,date,total,reference,items,valid:Boolean(resolvedMerchant&&date&&total),parseStatus:resolvedMerchant&&date&&total?'parsed':'unresolved'};
}

export function persistableReceiptKnowledge(result){
  const active=items=>(items||[]).filter(item=>item.active&&item.confidence==='high');
  return {merchantAliases:active(result?.merchantAliases),receiptMatchingPatterns:active(result?.receiptMatchingPatterns),sourceRelationships:active(result?.sourceRelationships),itemFamilyEvidence:active(result?.itemFamilyEvidence),savedAt:new Date().toISOString(),readOnlyBootstrap:true};
}

export function parsePdfReceiptText(text,{filename='receipt.pdf'}={}){
  const plain=decodeHtml(text).replace(/\s+/g,' '),merchant=(plain.match(/(?:merchant|בית עסק|ספק)\s*[:：-]\s*([^|;]{2,80})/i)||[])[1]?.trim()||filenameMerchant(filename),date=isoDate((plain.match(/(?:date|תאריך)\s*[:：-]?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i)||[])[1])||uniqueDate(plain,filename),total=money((plain.match(/(?:total|סה.?כ|סך\s*הכל|לתשלום|סכום\s*כולל)[^\d]{0,40}([\d,.]+)/i)||[])[1]);
  return {filename,fileType:'pdf',merchant,date,total,valid:Boolean(merchant&&date&&total),parseStatus:merchant&&date&&total?'parsed':'unresolved',fallback:'embedded_text_only'};
}

export function matchHistoricalReceipt(receipt,transactions=[]){
  if(!receipt?.merchant||!receipt?.date||!Number.isFinite(Number(receipt.total)))return {confidence:'low',status:'unresolved',reason:'חסרים שדות זיהוי'};
  const candidates=transactions.map(transaction=>{const amountMatch=Math.abs(Number(transaction.amount)-Number(receipt.total))<=.02,dateDistance=daysApart(transaction.date,receipt.date),merchantScore=similarity(receipt.merchant,transaction.merchant||transaction.description),aliasMatch=(transaction.merchantAliases||[]).some(alias=>similarity(receipt.merchant,alias)>=.55),suffixMatch=Boolean(receipt.cardSuffix&&transaction.cardSuffix&&receipt.cardSuffix===transaction.cardSuffix),referenceMatch=Boolean(receipt.reference&&transaction.reference&&normalize(receipt.reference)===normalize(transaction.reference)),ownerMatch=Boolean(receipt.ownerId&&transaction.ownerId&&receipt.ownerId===transaction.ownerId);let score=(amountMatch?.38:0)+(dateDistance===0?.22:dateDistance<=3?.12:0)+(Math.max(merchantScore,aliasMatch?1:0)*.25)+(suffixMatch?.08:0)+(referenceMatch?.12:0)+(ownerMatch?.05:0);return {transaction,score,amountMatch,merchantScore,dateDistance,aliasMatch,suffixMatch,referenceMatch}}).filter(candidate=>candidate.amountMatch&&candidate.dateDistance<=7&&candidate.score>=.5).sort((a,b)=>b.score-a.score);
  if(!candidates.length)return {confidence:'low',status:'unresolved',reason:'לא נמצאה התאמה רב־אותית'};
  if(candidates.length>1&&candidates[0].score-candidates[1].score<.12)return {confidence:'conflict',status:'unresolved',reason:'נמצאו כמה עסקאות אפשריות',candidateIds:candidates.slice(0,3).map(item=>item.transaction.id)};
  const best=candidates[0],confidence=best.score>=.78&&(best.merchantScore>=.45||best.aliasMatch||best.referenceMatch)?'high':'medium';
  return {confidence,status:confidence==='high'?'matched':'proposed',transactionId:best.transaction.id,canonicalEventId:best.transaction.canonicalEventId||null,score:best.score,signals:{amount:true,dateDays:best.dateDistance,merchant:best.merchantScore,alias:best.aliasMatch,cardSuffix:best.suffixMatch,reference:best.referenceMatch},countInTotals:false};
}

export function learnHistoricalReceiptKnowledge({receipts=[],transactions=[],explicitClassifications=[]}={}){
  const matches=receipts.map(receipt=>({receipt,match:matchHistoricalReceipt(receipt,transactions)})),aliases=[],sourcePatterns=[],categoryEvidence=[],ownerEvidence=[],refundLinks=[];
  for(const {receipt,match} of matches){
    if(match.confidence!=='high')continue;
    const transaction=transactions.find(item=>item.id===match.transactionId);if(!transaction)continue;
    if(normalize(receipt.merchant)!==normalize(transaction.merchant))aliases.push({id:generateId('alias'),canonicalMerchant:transaction.merchant,alias:receipt.merchant,sourceType:receipt.sourceType||receipt.fileType,confidence:'high',evidenceCount:1,active:true});
    if(receipt.sourceType||receipt.fileType)sourcePatterns.push({id:generateId('receipt-source'),merchant:transaction.merchant,sourceType:receipt.sourceType||receipt.fileType,expectedWithinDays:3,confidence:'high',evidenceCount:1,active:false});
    const explicit=explicitClassifications.find(item=>normalize(item.merchant)===normalize(transaction.merchant));if(explicit)categoryEvidence.push({merchant:transaction.merchant,category:explicit.category,confidence:'high',strengthened:true,receiptHeuristic:receipt.category||null,conflict:Boolean(receipt.category&&receipt.category!==explicit.category)});
    if(receipt.ownerId&&receipt.ownerEvidence==='card_account'&&transaction.ownerId===receipt.ownerId)ownerEvidence.push({merchant:transaction.merchant,ownerId:receipt.ownerId,confidence:'high',active:true});
    if(['refund','reimbursement'].includes(transaction.financialType)&&transaction.originalPurchaseId)refundLinks.push({refundTransactionId:transaction.id,originalPurchaseId:transaction.originalPurchaseId,financialType:transaction.financialType,countAsIncome:false});
  }
  const grouped=(items,key)=>{const map=new Map();for(const item of items){const value=key(item);if(!map.has(value))map.set(value,[]);map.get(value).push(item)}return [...map.values()]};
  const persistedAliases=grouped(aliases,item=>`${normalize(item.canonicalMerchant)}|${normalize(item.alias)}`).map(group=>({...group[0],evidenceCount:group.length,active:group.length>=2}));
  const receiptMatchingPatterns=grouped(matches.filter(item=>item.match.confidence==='high'),item=>`${normalize(item.receipt.merchant)}|${item.receipt.sourceType||item.receipt.fileType}`).map(group=>({id:generateId('receipt-match'),merchantPattern:normalize(group[0].receipt.merchant),sourceType:group[0].receipt.sourceType||group[0].receipt.fileType,evidenceCount:group.length,confidence:'high',active:group.length>=2}));
  const expectations=grouped(sourcePatterns,item=>`${normalize(item.merchant)}|${item.sourceType}`).map(group=>({...group[0],evidenceCount:group.length,active:group.length>=2}));
  return {matches,merchantAliases:persistedAliases,receiptMatchingPatterns,sourceRelationships:expectations,categoryEvidence,ownerEvidence,refundLinks,itemFamilyEvidence:learnItemFamilies(receipts),summary:{high:matches.filter(x=>x.match.confidence==='high').length,medium:matches.filter(x=>x.match.confidence==='medium').length,low:matches.filter(x=>x.match.confidence==='low').length,conflicts:matches.filter(x=>x.match.confidence==='conflict').length},readOnly:true,affectsTotals:false,createsReceipts:false,createsXP:false,createsTasks:false,affectsMadrid:false,affectsCompleteness:false};
}

function learnItemFamilies(receipts){const families=new Map();for(const receipt of receipts)for(const item of receipt.items||[]){const family=item.category||item.productFamily;if(!family)continue;families.set(family,(families.get(family)||0)+1)}return [...families].filter(([,count])=>count>=2).map(([family,evidenceCount])=>({family,evidenceCount,confidence:evidenceCount>=3?'high':'medium',active:evidenceCount>=3}))}
