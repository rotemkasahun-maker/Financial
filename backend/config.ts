export function loadConfig(env = process.env) {
  const get = name => env[name];

  return {
    port:
      Number(
        get('PORT') || 8080
      ),

    publicBaseUrl:
      get('PUBLIC_BASE_URL') ||
      'http://127.0.0.1:8080',

    gmailClientId:
      get('GMAIL_CLIENT_ID') ||
      null,

    gmailClientSecret:
      get('GMAIL_CLIENT_SECRET') ||
      null,

    gmailRedirectUri:
      get('GMAIL_REDIRECT_URI') ||
      `${
        get('PUBLIC_BASE_URL') ||
        'http://127.0.0.1:8080'
      }/oauth/gmail/callback`,

    gmailPubsubTopic:
      get('GMAIL_PUBSUB_TOPIC') ||
      null,

    stateEncryptionKey:
      get('STATE_ENCRYPTION_KEY') ||
      null,

    /*
     * Gmail sync state
     */
    stateFile:
      get('GMAIL_STATE_FILE') ||
      '.local/gmail-state.enc',

    stateBucket:
      get('GMAIL_STATE_BUCKET') ||
      null,

    stateObject:
      get('GMAIL_STATE_OBJECT') ||
      'gmail-sync/state.enc',

    /*
     * Financial application state
     *
     * Deliberately kept separate from Gmail
     * connection/sync state.
     */
    financeStateFile:
      get('FINANCE_STATE_FILE') ||
      '.local/finance-state.enc',

    financeStateBucket:
      get('FINANCE_STATE_BUCKET') ||
      get('GMAIL_STATE_BUCKET') ||
      null,

    financeStateObject:
      get('FINANCE_STATE_OBJECT') ||
      'finance/state.enc',

    pushAudience:
      get('PUBSUB_PUSH_AUDIENCE') ||
      `${
        get('PUBLIC_BASE_URL') ||
        'http://127.0.0.1:8080'
      }/webhooks/gmail`,

    pushServiceAccount:
      get(
        'PUBSUB_PUSH_SERVICE_ACCOUNT'
      ) || null,

    schedulerToken:
      get(
        'SCHEDULER_SHARED_TOKEN'
      ) || null,

    recoveryDays:
      Math.min(
        30,
        Math.max(
          1,
          Number(
            get(
              'GMAIL_RECOVERY_DAYS'
            ) || 7
          )
        )
      ),

    gmailConfigured:
      Boolean(
        get('GMAIL_CLIENT_ID') &&
        get('GMAIL_CLIENT_SECRET') &&
        get('GMAIL_PUBSUB_TOPIC') &&
        get('STATE_ENCRYPTION_KEY')
      )
  };
}

export const GMAIL_SCOPE =
  'https://www.googleapis.com/auth/gmail.readonly';