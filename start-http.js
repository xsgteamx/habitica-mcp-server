#!/usr/bin/env node

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = path.dirname(fileURLToPath(import.meta.url));
const portText = process.env.PORT || process.env.MCP_PORT || '8000';
const port = Number.parseInt(portText, 10);
const mcpPath = process.env.MCP_PATH || '/mcp';
const logLevel = process.env.MCP_LOG_LEVEL || 'info';
const stateful = process.env.MCP_STATEFUL === 'true';
const sessionTimeout = process.env.MCP_SESSION_TIMEOUT || '600000';

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`Invalid PORT/MCP_PORT: ${portText}`);
  process.exit(1);
}

if (!mcpPath.startsWith('/') || /[\s?#]/.test(mcpPath)) {
  console.error('MCP_PATH must start with / and cannot contain spaces, ? or #.');
  process.exit(1);
}

if (!['debug', 'info', 'none'].includes(logLevel)) {
  console.error('MCP_LOG_LEVEL must be debug, info or none.');
  process.exit(1);
}

const executable = path.join(
  projectDir,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'supergateway.cmd' : 'supergateway'
);

const args = [
  '--stdio',
  'node index.js',
  '--outputTransport',
  'streamableHttp',
  '--port',
  String(port),
  '--streamableHttpPath',
  mcpPath,
  '--logLevel',
  logLevel,
];

if (stateful) {
  args.push('--stateful', '--sessionTimeout', sessionTimeout);
}

if (mcpPath === '/mcp') {
  console.error(
    'Warning: MCP_PATH is using the public default /mcp. Use a long random path when exposing this personal server without OAuth.'
  );
}

const child = spawn(executable, args, {
  cwd: projectDir,
  env: process.env,
  stdio: 'inherit',
  shell: false,
});

const forwardSignal = (signal) => {
  if (!child.killed) {
    child.kill(signal);
  }
};

process.once('SIGINT', () => forwardSignal('SIGINT'));
process.once('SIGTERM', () => forwardSignal('SIGTERM'));

child.once('error', (error) => {
  console.error('Failed to start Supergateway:', error);
  process.exit(1);
});

child.once('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
