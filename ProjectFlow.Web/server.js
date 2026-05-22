// =============================================================
//  ProjectFlow – IISNode Production Entry Point
//  Works with: IISNode Named Pipes + Standard TCP ports
// =============================================================
'use strict';

const path = require('path');

// ── 1. Working Directory ──────────────────────────────────────
const dir = path.join(__dirname);
process.chdir(__dirname);
process.env.NODE_ENV = 'production';

// ── 2. Named Pipe Detection ───────────────────────────────────
// IISNode feeds a Windows Named Pipe path (e.g. \\.\pipe\...) as
// process.env.PORT instead of a numeric port number.
// Number('\\.\pipe\...') === NaN, so isNaN() detects this safely.
const rawPort = process.env.PORT;
const isNamedPipe = rawPort && isNaN(Number(rawPort));
const currentPort = isNamedPipe
  ? rawPort                                       // pass pipe path as-is
  : (parseInt(rawPort, 10) || 3000);              // fallback to 3000

const hostname = process.env.HOSTNAME || '0.0.0.0';

// ── 3. Keep-Alive Timeout ─────────────────────────────────────
let keepAliveTimeout = parseInt(process.env.KEEP_ALIVE_TIMEOUT, 10);
if (isNaN(keepAliveTimeout) || !isFinite(keepAliveTimeout) || keepAliveTimeout < 0) {
  keepAliveTimeout = undefined;
}

// ── 4. Start Next.js Standalone Server ───────────────────────
const { startServer } = require('next/dist/server/lib/start-server');

startServer({
  dir,
  isDev: false,
  hostname,
  port: currentPort,
  allowRetry: false,
  keepAliveTimeout,
}).catch((err) => {
  console.error('[ProjectFlow] Fatal – Next.js server failed to start:');
  console.error(err);
  process.exit(1);
});
