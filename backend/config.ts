const required=(name)=>{const value=process.env[name];if(!value)throw new Error(`Missing required environment variable: ${name}`);return value};

export function loadConfig(env=process.env){
  const get=name=>env[name];
  return {
    port:Number(get('PORT')||8080),
    publicBaseUrl:get('PUBLIC_BASE_URL')||'http://127.0.0.1:8080',
    gmailClientId:requiredFrom(env,'GMAIL_CLIENT_ID'),
    gmailClientSecret:requiredFrom(env,'GMAIL_CLIENT_SECRET'),
    gmailRedirectUri:get('GMAIL_REDIRECT_URI')||`${get('PUBLIC_BASE_URL')||'http://127.0.0.1:8080'}/oauth/gmail/callback`,
    gmailPubsubTopic:requiredFrom(env,'GMAIL_PUBSUB_TOPIC'),
    stateEncryptionKey:requiredFrom(env,'STATE_ENCRYPTION_KEY'),
    stateFile:get('GMAIL_STATE_FILE')||'.local/gmail-state.enc',
    stateBucket:get('GMAIL_STATE_BUCKET')||null,
    stateObject:get('GMAIL_STATE_OBJECT')||'gmail-sync/state.enc',
    pushAudience:get('PUBSUB_PUSH_AUDIENCE')||`${get('PUBLIC_BASE_URL')||'http://127.0.0.1:8080'}/webhooks/gmail`,
    pushServiceAccount:get('PUBSUB_PUSH_SERVICE_ACCOUNT')||null,
    schedulerToken:get('SCHEDULER_SHARED_TOKEN')||null,
    recoveryDays:Math.min(30,Math.max(1,Number(get('GMAIL_RECOVERY_DAYS')||7)))
  };
}
function requiredFrom(env,name){const value=env[name];if(!value)throw new Error(`Missing required environment variable: ${name}`);return value}

export const GMAIL_SCOPE='https://www.googleapis.com/auth/gmail.readonly';
