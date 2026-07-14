import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function stopProcess(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  child.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    sleep(3000).then(() => {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill('SIGKILL');
      }
    }),
  ]);
}

test('Streamable HTTP endpoint completes MCP initialization', { timeout: 30000 }, async () => {
  const port = 18000 + (process.pid % 1000);
  const mcpPath = '/mcp-integration-test';
  let output = '';

  const child = spawn(process.execPath, ['start-http.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HABITICA_USER_ID: 'test-user-id',
      HABITICA_API_TOKEN: 'test-api-token',
      MCP_LANG: 'en',
      MCP_LOG_LEVEL: 'none',
      MCP_PATH: mcpPath,
      PORT: String(port),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });

  const requestBody = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: {
        name: 'habitica-mcp-integration-test',
        version: '1.0.0',
      },
    },
  };

  try {
    let response;
    let responseText = '';
    let lastError;

    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (child.exitCode !== null) {
        assert.fail(`HTTP server exited before initialization.\n${output}`);
      }

      try {
        response = await fetch(`http://127.0.0.1:${port}${mcpPath}`, {
          method: 'POST',
          headers: {
            Accept: 'application/json, text/event-stream',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(3000),
        });
        responseText = await response.text();

        if (response.ok) {
          break;
        }

        lastError = new Error(`HTTP ${response.status}: ${responseText}`);
      } catch (error) {
        lastError = error;
      }

      await sleep(300);
    }

    assert.ok(response, `No HTTP response received. Last error: ${lastError}\n${output}`);
    assert.equal(response.ok, true, `Initialization failed: HTTP ${response.status}\n${responseText}\n${output}`);
    assert.match(responseText, /habitica-mcp-server/i, `Unexpected MCP response:\n${responseText}`);
    assert.match(responseText, /jsonrpc|serverInfo|protocolVersion/i, `Response is not an MCP initialization result:\n${responseText}`);
  } finally {
    await stopProcess(child);
  }
});
