import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {loadConfig} from './config.ts';
import {signState,verifyState} from './crypto.ts';
import {createStateRepository} from './storage.ts';
import {GmailClient} from './gmailClient.ts';
import {GmailSyncService} from './syncService.ts';
import {ReceiptEvidenceHandoff} from './receiptHandoff.ts';
import {verifyGoogleOidc} from './googleOidc.ts';

const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value))};
const body=async req=>{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>1024*1024)throw new Error('Request too large');chunks.push(chunk)}return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}')};
export function createBackend({config,repository,gmail,verifyPush=verifyGoogleOidc}={}){config=config||loadConfig();repository=repository||createStateRepository(config);gmail=gmail||new GmailClient({config});const sync=new GmailSyncService({repository,gmail}),handoff=new ReceiptEvidenceHandoff({repository});return createServer(async(req,res)=>{try{const url=new URL(req.url,config.publicBaseUrl);
    if(req.method==='GET'&&url.pathname==='/healthz')return json(res,200,{status:'ok',service:'family-finance-gmail',gmailConfigured:Boolean(config.gmailConfigured)});
    if(!config.gmailConfigured)return json(res,503,{error:'gmail_not_configured'});
    if(req.method==='GET'&&url.pathname==='/oauth/gmail/start'){const state=signState({connectionId:url.searchParams.get('connectionId')||'primary',createdAt:Date.now(),nonce:randomUUID()},config.stateEncryptionKey);res.writeHead(302,{Location:gmail.authorizationUrl(state),'Cache-Control':'no-store'});return res.end()}
    if(req.method==='GET'&&url.pathname==='/oauth/gmail/callback'){const oauth=verifyState(url.searchParams.get('state'),config.stateEncryptionKey),tokens=await gmail.exchangeCode(url.searchParams.get('code'));return json(res,200,await sync.connect({connectionId:oauth.connectionId,tokens}))}
    if(req.method==='POST'&&url.pathname==='/webhooks/gmail'){await verifyPush(req.headers.authorization,{audience:config.pushAudience,serviceAccount:config.pushServiceAccount});const payload=await body(req),message=payload.message||{},decoded=JSON.parse(Buffer.from(message.data||'','base64').toString('utf8')||'{}');return json(res,200,await sync.processNotification({deliveryId:message.messageId||`${decoded.emailAddress}:${decoded.historyId}`,emailAddress:decoded.emailAddress,historyId:decoded.historyId}))}
    if(req.method==='POST'&&url.pathname==='/internal/maintenance'){if(config.schedulerToken&&req.headers.authorization!==`Bearer ${config.schedulerToken}`)return json(res,401,{error:'unauthorized'});return json(res,200,{renewal:await sync.renewWatches()})}
    if(req.method==='POST'&&url.pathname==='/api/gmail/scan-now'){const payload=await body(req),state=await repository.read(),connection=state.connections[payload.connectionId||'primary'];if(!connection)return json(res,404,{error:'not_connected'});return json(res,200,await sync.processNotification({deliveryId:`manual:${randomUUID()}`,emailAddress:connection.email,historyId:connection.historyId}))}
    if(req.method==='GET'&&url.pathname==='/api/gmail/health')return json(res,200,await sync.health());
    if(req.method==='GET'&&url.pathname==='/api/gmail/staging')return json(res,200,{evidence:await handoff.listPending()});
    if(req.method==='POST'&&url.pathname==='/api/gmail/staging/acknowledge'){const payload=await body(req);return json(res,200,await handoff.acknowledge(payload.messageId,{documentFingerprints:payload.documentFingerprints}))}
    if(req.method==='DELETE'&&url.pathname==='/api/gmail/connection')return json(res,200,await sync.disconnect(url.searchParams.get('connectionId')||'primary'));
    return json(res,404,{error:'not_found'});
  }catch(error){console.error(JSON.stringify({event:'backend_request_failed',path:req.url,code:error.code||'request_failed'}));return json(res,error.code==='oauth_revoked'?401:500,{error:error.code||'request_failed'})}})}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const config=loadConfig(),server=createBackend({config});server.listen(config.port,'0.0.0.0',()=>console.log(`Gmail backend listening on port ${config.port}`))}
