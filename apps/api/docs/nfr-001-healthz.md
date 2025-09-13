# NFR-001: Health Endpoint `/healthz`

- Path: `GET /healthz` (unprefixed) and `GET /api/healthz` (Nest controller)
- Response: `200 OK` with JSON `{ "ok": true }`

Notes:
- The unprefixed `/healthz` is registered at bootstrap using the underlying HTTP adapter so load balancers and k8s probes can use a stable path regardless of the API prefix.
- The controller-backed `/api/healthz` remains for internal checks and testing.

Quick check:

```
curl -i http://localhost:3000/healthz
curl -i http://localhost:3000/api/healthz
```

