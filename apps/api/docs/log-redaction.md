# Log Redaction

Structured logs from API components are sanitized with `redactSecrets`:
- Masks sensitive keys: `secret`, `password`, `token`, `authorization`, `cookie`, `apiKey`, `session`, etc.
- Applies to `RoomsGateway`, `RoomsService`, and `PerfService` timing logs.

Look for `[REDACTED]` in log output for sensitive fields.

