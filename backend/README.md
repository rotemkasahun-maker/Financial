# Gmail sync backend (Phase 1)

This backend stores only encrypted Gmail synchronization state and receipt evidence awaiting handoff. The household ledger, classification rules, totals, tasks, Madrid and XP remain local and are never mutated here.

## Required secrets and environment

- `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`
- `GMAIL_REDIRECT_URI`, `PUBLIC_BASE_URL`
- `GMAIL_PUBSUB_TOPIC` (`projects/PROJECT_ID/topics/gmail-receipts`)
- `STATE_ENCRYPTION_KEY` (exactly 32 random bytes, base64; keep in Secret Manager)
- Production: `GMAIL_STATE_BUCKET`; optional `GMAIL_STATE_OBJECT`
- `PUBSUB_PUSH_AUDIENCE`, `PUBSUB_PUSH_SERVICE_ACCOUNT`
- `SCHEDULER_SHARED_TOKEN` (fallback application check; prefer authenticated Cloud Run invocation)

Without `GMAIL_STATE_BUCKET`, encrypted state is written to `.local/gmail-state.enc` for local development only. Cloud Run must use the bucket because its filesystem is disposable. The bucket contains only the encrypted state blob, not receipt files.

## Google Cloud setup

1. Enable Gmail API, Pub/Sub, Cloud Run, Cloud Scheduler, Secret Manager and Cloud Storage.
2. Create one Pub/Sub topic and one push subscription targeting `/webhooks/gmail`; grant Gmail's publisher service account permission on the topic.
3. Create a private regional bucket for the encrypted state blob; grant the Cloud Run service account object read/write access only to that bucket.
4. Deploy Cloud Run with request-based billing, `min=0`, `max=2`, no VPC/NAT/load balancer, and inject secrets from Secret Manager.
5. Create one daily Scheduler request to `/internal/maintenance`. Grant only Cloud Run invoker, or provide the scheduler token.
6. Configure the OAuth consent screen and callback URL, then connect through `/oauth/gmail/start`.
7. Use short Pub/Sub retention and configure billing alerts at 50%, 80% and 100%; alerts do not stop spend, so keep service quotas and `max=2`.

The practical least-privilege Gmail scope is `gmail.readonly`: metadata-only scope cannot retrieve receipt bodies, links or attachments. No Gmail write permission is requested.
