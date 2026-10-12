'use strict';

// The Cloudflare connector supplies a short-lived Pages upload token over stdin.
// It stays in memory and is inherited only by the official Wrangler uploader.
const path = require('node:path');
const readline = require('node:readline');
const { spawn } = require('node:child_process');

// Disable terminal echo before receiving the credential from a PTY.
if (process.stdin.isTTY) process.stdin.setRawMode(true);
const input = readline.createInterface({ input: process.stdin, terminal: false });
const timeout = setTimeout(() => {
  input.close();
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
  process.stderr.write('Timed out waiting for the Pages upload credential.\n');
  process.exitCode = 1;
}, 120000);

process.stdout.write('Ready for Pages upload credential on stdin.\n');
input.once('line', token => {
  clearTimeout(timeout);
  input.close();
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
  if (!token || token.includes(' ')) {
    process.stderr.write('Invalid Pages upload credential.\n');
    process.exitCode = 1;
    return;
  }
  const child = spawn(process.execPath, [
    path.join(__dirname, 'node_modules', 'wrangler', 'bin', 'wrangler.js'),
    'pages', 'project', 'upload', 'cloudflare-site',
    '--output-manifest-path', '.wrangler/pages-manifest.json',
  ], {
    cwd: __dirname,
    env: {
      ...process.env,
      CF_PAGES_UPLOAD_JWT: token,
      WRANGLER_LOG_PATH: path.join(__dirname, '.wrangler', 'logs'),
      WRANGLER_SEND_METRICS: 'false',
    },
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  child.once('error', () => {
    process.stderr.write('Unable to start Wrangler.\n');
    process.exitCode = 1;
  });
  child.once('exit', code => { process.exitCode = code ?? 1; });
});
