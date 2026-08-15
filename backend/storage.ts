import {mkdir,readFile,rename,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {decryptJson,encryptJson} from './crypto.ts';

export const emptyState=()=>({version:1,connections:{},processedMessages:{},processedDocuments:{},deliveries:{},staging:{}});
export class GmailStateRepository {
  constructor({blobStore,encryptionKey}){this.blobStore=blobStore;this.encryptionKey=encryptionKey}
  async read(){const bytes=await this.blobStore.read();return bytes?decryptJson(bytes,this.encryptionKey):emptyState()}
  async write(state){await this.blobStore.write(encryptJson(state,this.encryptionKey))}
  async update(mutator){const state=await this.read(),result=await mutator(state);await this.write(state);return result}
}
export class MemoryBlobStore {constructor(){this.value=null}async read(){return this.value}async write(value){this.value=Buffer.from(value)}}
export class LocalFileBlobStore {constructor(path){this.path=path}async read(){try{return await readFile(this.path)}catch(error){if(error.code==='ENOENT')return null;throw error}}async write(value){await mkdir(dirname(this.path),{recursive:true});const temporary=`${this.path}.tmp`;await writeFile(temporary,value,{mode:0o600});await rename(temporary,this.path)}}

export class GcsBlobStore {
  constructor({bucket,object}){this.bucket=bucket;this.object=object;this.generation='0'}
  async token(){const response=await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',{headers:{'Metadata-Flavor':'Google'}});if(!response.ok)throw new Error('Unable to obtain Cloud Run service token');return (await response.json()).access_token}
  async read(){const token=await this.token(),metadataUrl=`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(this.bucket)}/o/${encodeURIComponent(this.object)}`,metadata=await fetch(metadataUrl,{headers:{Authorization:`Bearer ${token}`}});if(metadata.status===404){this.generation='0';return null}if(!metadata.ok)throw new Error(`GCS state metadata read failed: ${metadata.status}`);this.generation=String((await metadata.json()).generation);const response=await fetch(`${metadataUrl}?alt=media`,{headers:{Authorization:`Bearer ${token}`}});if(!response.ok)throw new Error(`GCS state read failed: ${response.status}`);return Buffer.from(await response.arrayBuffer())}
  async write(value){const token=await this.token(),url=`https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(this.bucket)}/o?uploadType=media&name=${encodeURIComponent(this.object)}&ifGenerationMatch=${encodeURIComponent(this.generation)}`,response=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/octet-stream','Cache-Control':'no-store'},body:value});if(response.status===412)throw Object.assign(new Error('Concurrent Gmail state update; safe retry required'),{code:'state_conflict'});if(!response.ok)throw new Error(`GCS state write failed: ${response.status}`);this.generation=String((await response.json()).generation)}
}
export function createStateRepository(config){const blobStore=config.stateBucket?new GcsBlobStore({bucket:config.stateBucket,object:config.stateObject}):new LocalFileBlobStore(config.stateFile);return new GmailStateRepository({blobStore,encryptionKey:config.stateEncryptionKey})}
