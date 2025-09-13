/*
  NFR-002 load scenario: 100 participants in a room
  - Creates a room via REST to acquire host session cookie
  - Spawns N Socket.IO clients (1 host + N-1 participants)
  - All participants join, cast a vote, then host triggers reveal
  - Measures reveal latency from host emit -> first/last room:state receive

  Usage:
    node tasks/loadtest/socketio-room-100.js \
      --api=http://localhost:3000 \
      --count=100 \
      --vote=5 \
      --path=/api/socket.io

  Output: writes JSON report to tasks/loadtest/out/nfr-002-<ts>.json
*/
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');
const { io } = require('socket.io-client');

const args = process.argv.slice(2).reduce((acc, kv) => {
  const m = kv.match(/^--([^=]+)=(.*)$/);
  if (m) acc[m[1]] = m[2];
  return acc;
}, {});

const API = args.api || process.env.API_URL || 'http://localhost:3000';
const COUNT = Number(args.count || process.env.LOAD_COUNT || 100);
const VOTE = args.vote || process.env.LOAD_VOTE || '5';
const IO_PATH = args.path || '/api/socket.io';
const ROOM_ID = args.room || '';

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function createRoom() {
  if (ROOM_ID) return { id: ROOM_ID, cookie: '' };
  const res = await fetch(`${API}/rooms`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ hostName: 'LoadHost' }),
  });
  const setCookie = res.headers.get('set-cookie') || '';
  const json = await res.json();
  return { id: json.id, cookie: setCookie.split(';')[0] || '' };
}

async function main() {
  const startedAt = Date.now();
  const { id: roomId, cookie } = await createRoom();
  console.log(`Room: ${roomId}`);

  const sockets = [];
  const revealMarks = { hostEmitAt: 0, firstRecvAt: 0, lastRecvAt: 0 };
  let receivedCount = 0;

  // Host
  const host = io(API, { path: IO_PATH, extraHeaders: cookie ? { Cookie: cookie } : undefined });
  sockets.push(host);
  await new Promise((resolve) => host.on('connect', resolve));
  host.emit('room:join', { roomId, name: 'LoadHost' });
  host.on('room:state', (room) => {
    if (!revealMarks.hostEmitAt) return;
    if (!revealMarks.firstRecvAt) revealMarks.firstRecvAt = Date.now();
    receivedCount++;
    revealMarks.lastRecvAt = Date.now();
  });

  // Participants
  const others = COUNT - 1;
  for (let i = 0; i < others; i++) {
    const s = io(API, { path: IO_PATH });
    sockets.push(s);
    await new Promise((resolve) => s.on('connect', resolve));
    s.emit('room:join', { roomId, name: `LoadUser${i + 1}` });
    s.on('room:state', () => {
      if (!revealMarks.hostEmitAt) return;
      if (!revealMarks.firstRecvAt) revealMarks.firstRecvAt = Date.now();
      receivedCount++;
      revealMarks.lastRecvAt = Date.now();
    });
  }

  // Cast votes with a small spread
  for (let i = 0; i < sockets.length; i++) {
    const s = sockets[i];
    if (s === host) continue;
    setTimeout(() => s.emit('vote:cast', { value: VOTE }), Math.random() * 1000);
  }

  // Wait a short moment then reveal
  await sleep(1500);
  revealMarks.hostEmitAt = Date.now();
  host.emit('vote:reveal', {});

  // Wait until we see at least COUNT room:state after reveal, or timeout
  const until = Date.now() + 5000;
  while (Date.now() < until && receivedCount < COUNT) {
    await sleep(25);
  }

  const endedAt = Date.now();
  const p95approx = 0; // server provides accurate p95 via /metrics; keep here for completeness
  const report = {
    meta: { api: API, count: COUNT, vote: VOTE, path: IO_PATH },
    roomId,
    timings: {
      reveal_first_ms: revealMarks.firstRecvAt ? revealMarks.firstRecvAt - revealMarks.hostEmitAt : -1,
      reveal_last_ms: revealMarks.lastRecvAt ? revealMarks.lastRecvAt - revealMarks.hostEmitAt : -1,
      duration_ms: endedAt - startedAt,
      recv_count: receivedCount,
    },
  };

  const outDir = path.join(__dirname, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `nfr-002-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2));
  console.log('Wrote', file);

  sockets.forEach((s) => s.disconnect());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
