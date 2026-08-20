import {GMAIL_SCOPE} from './config.ts';

export class GmailClient {
  constructor({config,fetchImpl=fetch}){this.config=config;this.fetch=fetchImpl}
  authorizationUrl(state){const query=new URLSearchParams({client_id:this.config.gmailClientId,redirect_uri:this.config.gmailRedirectUri,response_type:'code',scope:GMAIL_SCOPE,access_type:'offline',prompt:'consent',state});return `https://accounts.google.com/o/oauth2/v2/auth?${query}`}
  async exchangeCode(code){return this.form('https://oauth2.googleapis.com/token',{code,client_id:this.config.gmailClientId,client_secret:this.config.gmailClientSecret,redirect_uri:this.config.gmailRedirectUri,grant_type:'authorization_code'})}
  async refresh(connection){if(!connection.refreshToken)throw Object.assign(new Error('OAuth reconnect required'),{code:'oauth_revoked'});try{const tokens=await this.form('https://oauth2.googleapis.com/token',{refresh_token:connection.refreshToken,client_id:this.config.gmailClientId,client_secret:this.config.gmailClientSecret,grant_type:'refresh_token'});return {...connection,accessToken:tokens.access_token,accessTokenExpiresAt:Date.now()+Number(tokens.expires_in||3600)*1000}}catch(error){if(error.status===400||error.status===401)throw Object.assign(new Error('OAuth reconnect required'),{code:'oauth_revoked'});throw error}}
  async ensureAccess(connection){return !connection.accessToken||Number(connection.accessTokenExpiresAt)<Date.now()+60_000?this.refresh(connection):connection}
  async watch(connection){const active=await this.ensureAccess(connection),response=await this.api(active,'https://gmail.googleapis.com/gmail/v1/users/me/watch',{method:'POST',body:JSON.stringify({topicName:this.config.gmailPubsubTopic})});return {active,response}}
  async history(connection,startHistoryId){const active=await this.ensureAccess(connection),history=[];let pageToken=null,historyId=String(startHistoryId);do{const url=new URL('https://gmail.googleapis.com/gmail/v1/users/me/history');url.searchParams.set('startHistoryId',String(startHistoryId));url.searchParams.set('historyTypes','messageAdded');if(pageToken)url.searchParams.set('pageToken',pageToken);const page=await this.api(active,url);history.push(...(page.history||[]));historyId=page.historyId||historyId;pageToken=page.nextPageToken||null}while(pageToken);return {active,response:{history,historyId}}}
  async getMessage(connection,id,format='metadata'){const active=await this.ensureAccess(connection),url=`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}?format=${format}`;return {active,response:await this.api(active,url)}}
  async getAttachment(connection,messageId,attachmentId){
    const active=await this.ensureAccess(connection);
    const url=`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`;
    return {active,response:await this.api(active,url)};
  }
  async boundedRecovery(connection){const after=Math.floor((Date.now()-this.config.recoveryDays*86400000)/1000),active=await this.ensureAccess(connection),url=`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(`after:${after}`)}&maxResults=100`;return {active,response:await this.api(active,url)}}
  async revoke(token){const response=await this.fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'}});return response.ok}
  async api(connection,url,init={}){const response=await this.fetch(url,{...init,headers:{Authorization:`Bearer ${connection.accessToken}`,'Content-Type':'application/json',...(init.headers||{})}});if(!response.ok){const error=Object.assign(new Error(`Gmail API failed: ${response.status}`),{status:response.status});throw error}return response.json()}
  async form(url,values){const response=await this.fetch(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(values)});if(!response.ok)throw Object.assign(new Error(`OAuth request failed: ${response.status}`),{status:response.status});return response.json()}
}
