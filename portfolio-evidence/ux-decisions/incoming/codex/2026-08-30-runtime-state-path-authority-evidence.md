# Runtime state-path assumption correction

- Primary outcome: EVIDENCE_UPDATE
- Proposed canonical target: shared-canonical-household-state
- Decision type: System Trust / Validation
- Status: incoming only; canonical records and prior feature validation remain unchanged.
- Visibility: internal evidence clarification. No secrets, financial contents, raw process environment, or private blob fingerprints included. Local runtime details remain private; not public portfolio proof.

## USER-STATED NEED

Trace the running backend's launch context, storage path and encryption source without restarting, attaching a debugger, changing state, or beginning migration. A previous candidate-key failure against the assumed canonical file must not be mistaken for corruption or proof of the effective runtime key.

## DESIGN INFERENCE

Because a filename assumed to be canonical can differ from a running instance's configured persistence target, migration authority must be established from process configuration and state validation together. A configured path alone does not establish complete real-household contents or justify replacing the preserved canonical source.

## IMPLEMENTED

No product behavior changed. A temporary local read-only diagnostic inspected bounded Windows process parameters and emitted only an allowlisted command line, relevant environment names, non-secret storage settings, and input-artifact booleans. It was removed after inspection.

## VERIFIED

- Windows process inspection identified the expected Node instance, repository working directory, direct TypeScript backend entry point, and explicit local finance-state path override.
- The override resolves to a different existing encrypted file from the assumed canonical file used in prior decryption attempts.
- The two files differ in size, modification time and SHA-256 fingerprint. No contents were decrypted in this task.
- Current storage/configuration/crypto logic and the last committed versions before process startup agree on path override, relative-path handling and key decoding. This does not recover the exact uncommitted source loaded at startup.
- Sysinternals Handle found no matching open encrypted-file handles at inspection time. This does not establish historical file usage.
- The preserved finance file, Gmail file and configured alternate file retained identical before/after SHA-256 values during the inspection.

## Failures and limitations

Initial Windows CIM/Handle queries were denied; explicitly authorized elevated read-only retries succeeded. The parent PID was identified but its launcher identity was not recovered. Prior manually entered key text was not retained; its exact formatting cannot be retrospectively checked. The native environment value had no edge whitespace or newline, but it is not proof of the application's retained key object.

## Validation ceiling

Narrow local runtime configuration evidence only; no new SYNTHETIC TEST, DEVICE E2E, or REAL HOUSEHOLD USE claim. Existing canonical validation remains unchanged. No successful decryption, parsing or schema check against the configured alternate file was performed. Canonical household completeness and the active-finance-key recovery blocker remain unresolved.

## Next boundary

Separately verify the recovered candidate, in memory and read-only, against the newly identified configured file with decrypt, parse, schema and existing integrity checks. Do not promote that file to household authority, restart, rotate, migrate or deploy on the strength of path evidence alone.
