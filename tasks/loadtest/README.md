# Load Tests — NFR-002

This folder contains a simple Socket.IO-based load scenario to exercise NFR-002 targets.

- Script: `socketio-room-100.js`
- Requirements: Node 20+

Examples:

- Local API:
  - `node tasks/loadtest/socketio-room-100.js --api=http://localhost:3000 --count=100 --path=/api/socket.io`
- Against staging (example):
  - `API_URL=https://staging.example.com node tasks/loadtest/socketio-room-100.js --count=100`

The script writes a JSON report to `tasks/loadtest/out/` and prints the path.

To correlate with server-side timings, query `GET /metrics` on the API during/after the run.

