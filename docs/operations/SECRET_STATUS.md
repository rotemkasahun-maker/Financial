# Family Finance Secret Status

Status date: 2026-08-30

## Finance state

- Live state: `.local/fresh-missing-receipt-state.enc`
- Status: `LOCKED — VERIFIED KEY VALUE LOST AFTER REBOOT`
- The former live process key was verified before reboot: decrypt PASS, parse PASS, schema PASS, integrity PASS.
- Current value availability: `LOST`

## Former PID 18844 key

- Status: `VERIFIED BEFORE REBOOT`
- Source: former live process environment; value is intentionally not recorded here.

## Repository `.env` key

- Status: `KNOWN WRONG FOR ALL CURRENT FINANCE STATE CANDIDATES`
- It remains usable for the separate Gmail state only.

## Gmail

- Status: `repository .env key successfully decrypts Gmail state`
- Gmail state is not a replacement finance baseline.

## Secret Manager

- Status: `DOES NOT MATCH`
- Secret `family-finance-alpha-state-encryption-key`, version `1`, is enabled and was tested privately against the live finance blob; decrypt failed.
- It is the only existing version. No Secret Manager version was created, changed, disabled, or deleted.

## Recovery boundary

- No replacement key, plaintext secret, reconstructed finance state, migration, or cloud deployment is permitted until the verified key has a durable secure source.
