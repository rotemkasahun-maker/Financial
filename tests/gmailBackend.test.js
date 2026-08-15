import test from 'node:test';
import assert from 'node:assert/strict';
import {GmailStateRepository,MemoryBlobStore} from '../backend/storage.ts';
import {GmailSyncService} from '../backend/syncService.ts';
import {extractDocumentUrls,isReceiptCandidate,minimalEvidence} from '../backend/receiptCandidate.ts';
import {createBackend} from '../backend/server.ts';

const key=Buffer.alloc(32,7).toString('base64');
const receipt=id=>({id,threadId:`thread-${id}`,snippet:'קבלה זמינה',payload:{headers:[{name:'Subject',value:'הקבלה שלך'}],parts:[{mimeType:'application/pdf',filename:'receipt.pdf',body:{attachmentId:`attachment-${id}`}}]}});
function setup({historyError=null,recovery=[]}={}){const calls={watch:0,history:0,metadata:0,full:0,recovery:0,revoke:0},messages=new Map([['m1',receipt('m1')],['normal',{id:'normal',snippet:'עדכון',payload:{headers:[{name:'Subject',value:'חדשות השבוע'}]}}]]),gmail={
  async watch(connection){calls.watch++;return {active:{...connection,accessToken:'new'},response:{historyId:'100',expiration:String(Date.now()+86400000)}}},
  async history(connection){calls.history++;if(historyError)throw historyError;return {active:connection,response:{historyId:'102',history:[{messagesAdded:[{message:{id:'m1'}},{message:{id:'normal'}}]}]} }},
  async boundedRecovery(connection){calls.recovery++;return {active:connection,response:{messages:recovery.map(id=>({id}))}}},
  async getMessage(connection,id,format){calls[format]++;return {active:connection,response:messages.get(id)}},
  async revoke(){calls.revoke++;return true}
};const repository=new GmailStateRepository({blobStore:new MemoryBlobStore(),encryptionKey:key}),service=new GmailSyncService({repository,gmail,clock:()=>new Date('2026-08-15T10:00:00Z')});return {calls,gmail,repository,service}}

test('watch registration and daily renewal persist cursor and health without financial state',async()=>{const {service,repository,calls}=setup();await service.connect({tokens:{access_token:'a',refresh_token:'r',expires_in:3600},email:'family@example.test'});await service.renewWatches();const state=await repository.read();assert.equal(calls.watch,2);assert.equal(state.connections.primary.historyId,'100');assert.equal(state.connections.primary.status,'active');for(const forbidden of ['transactions','canonicalEvents','tasks','xp','madrid','totals'])assert.equal(state[forbidden],undefined)});

test('history processing filters metadata first, stages receipts, and deduplicates delivery and messages',async()=>{const {service,repository,calls}=setup();await service.connect({tokens:{access_token:'a',refresh_token:'r',expires_in:3600},email:'family@example.test'});const input={deliveryId:'delivery-1',emailAddress:'family@example.test',historyId:'102'};const first=await service.processNotification(input),second=await service.processNotification(input);assert.deepEqual(first,{status:'processed',stagedCount:1,recovered:false});assert.equal(second.status,'duplicate_delivery');assert.equal(calls.metadata,2);assert.equal(calls.full,1);const state=await repository.read();assert.equal(state.connections.primary.historyId,'102');assert.equal(Object.keys(state.staging).length,1);assert.equal(state.processedMessages.normal.status,'not_relevant')});

test('invalid history cursor triggers bounded recovery rather than full mailbox rescan',async()=>{const error=Object.assign(new Error('old cursor'),{status:404}),{service,calls}=setup({historyError:error,recovery:['m1']});await service.connect({tokens:{access_token:'a',refresh_token:'r',expires_in:3600},email:'family@example.test'});const result=await service.processNotification({deliveryId:'d2',emailAddress:'family@example.test',historyId:'500'});assert.equal(result.recovered,true);assert.equal(calls.recovery,1);assert.equal(result.stagedCount,1)});

test('revoked OAuth becomes reconnect_required during renewal',async()=>{const {service,repository,gmail}=setup();await service.connect({tokens:{access_token:'a',refresh_token:'r',expires_in:3600},email:'family@example.test'});gmail.watch=async()=>{throw Object.assign(new Error('revoked'),{code:'oauth_revoked'})};const result=await service.renewWatches(),state=await repository.read();assert.equal(result[0].error,'oauth_revoked');assert.equal(state.connections.primary.status,'reconnect_required')});

test('receipt candidate filtering uses metadata and supported attachments',()=>{assert.equal(isReceiptCandidate(receipt('m1')),true);assert.equal(isReceiptCandidate({snippet:'ordinary',payload:{headers:[{name:'Subject',value:'hello'}]}}),false)});

test('linked receipt URL is extracted only after full candidate fetch without retaining body',()=>{const message=receipt('link');message.payload.parts=[{mimeType:'text/html',body:{data:Buffer.from('<a href="https://receipts.example/download/abc">קבלה</a>').toString('base64url')}}];const evidence=minimalEvidence(message);assert.deepEqual(evidence.documentUrls,['https://receipts.example/download/abc']);assert.equal('body' in evidence,false);assert.deepEqual(extractDocumentUrls('https://example.test/home'),[])});

test('storage abstraction encrypts persisted Gmail state and remains replaceable',async()=>{const blob=new MemoryBlobStore(),repository=new GmailStateRepository({blobStore:blob,encryptionKey:key});await repository.update(state=>{state.connections.primary={refreshToken:'secret-token'}});assert.equal(blob.value.includes(Buffer.from('secret-token')),false);const replacement=new GmailStateRepository({blobStore:blob,encryptionKey:key});assert.equal((await replacement.read()).connections.primary.refreshToken,'secret-token')});

test('disconnect revokes token and deletes connection staging',async()=>{const {service,repository,calls}=setup();await service.connect({tokens:{access_token:'a',refresh_token:'r',expires_in:3600},email:'family@example.test'});await service.disconnect();assert.equal(calls.revoke,1);assert.equal(Object.keys((await repository.read()).connections).length,0)});

test('health-only Cloud Run revision starts before Gmail credentials exist',async t=>{const server=createBackend({config:{publicBaseUrl:'http://127.0.0.1',gmailConfigured:false},repository:{},gmail:{}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>server.close());const {port}=server.address(),response=await fetch(`http://127.0.0.1:${port}/healthz`);assert.equal(response.status,200);assert.deepEqual(await response.json(),{status:'ok',service:'family-finance-gmail',gmailConfigured:false})});
