# Human Web auth versus Android device-ingestion auth

- **Validation:** DEVICE E2E
- **USER-STATED NEED:** People use Web finance while Android ingests evidence without embedding human credentials.
- **DESIGN INFERENCE:** Separate human sessions from narrow device/connector trust; fetch fresh short-lived sessions rather than persist them.
- **IMPLEMENTED:** Separate Web household auth and Android local BuildConfig/connector maintenance configuration.
- **VERIFIED:** Web auth is synthetically verified; Android SMS/notification flows reached backend using separate device configuration.
- **Evidence:** master handoff §§6,15; continuity §§5,30; `ANDROID_CONTRACT.md`; Android sync/config and reports. Tokens/config/device state are private.
- **Rejected/learning:** APK Web passwords, master/signing/encryption secrets, broad connector privileges.
- **Open:** Production credential issuance/revocation.

