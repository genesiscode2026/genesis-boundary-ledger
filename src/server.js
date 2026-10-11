import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ArmorIQAdapter } from './armoriq-adapter.js';
import { BoundaryEngine } from './boundary-engine.js';
import { ReceiptLedger } from './receipt-ledger.js';
import { scanSource } from './scanner.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicRoot = join(root, 'public');
const mode = process.env.BOUNDARY_MODE === 'live' ? 'live' : 'local-demo';
let armorIQ = null;
if (mode === 'live') {
  try { armorIQ = await ArmorIQAdapter.fromEnvironment(); } catch (error) { console.error(error.message); }
}
const ledger = new ReceiptLedger({ filePath: join(root, 'evidence', 'receipts.jsonl') });
const engine = new BoundaryEngine({
  ledger,
  armorIQ,
  mode,
  executors: { 'repo.scan': (args) => scanSource(args) }
});

function jsonRpcResult(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function handleMcp(message) {
  const { id = null, method, params = {} } = message || {};
  if (method === 'initialize') {
    return jsonRpcResult(id, { protocolVersion: params.protocolVersion || '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'genesis-boundary-mcp', version: '0.1.0' } });
  }
  if (method === 'notifications/initialized') return null;
  if (method === 'tools/list') {
    return jsonRpcResult(id, { tools: [
      { name: 'repo.scan', description: 'Read-only deterministic scan of supplied MCP source.', inputSchema: { type: 'object', properties: { filename: { type: 'string' }, source: { type: 'string' } }, required: ['source'], additionalProperties: false } },
      { name: 'fs.write', description: 'Boundary-test tool; always denied downstream.', inputSchema: { type: 'object', additionalProperties: true } },
      { name: 'shell.exec', description: 'Boundary-test tool; always denied downstream.', inputSchema: { type: 'object', additionalProperties: true } },
      { name: 'token.approve', description: 'Boundary-test tool; always denied downstream.', inputSchema: { type: 'object', additionalProperties: true } }
    ] });
  }
  if (method === 'tools/call') {
    if (params.name !== 'repo.scan') {
      return jsonRpcResult(id, { content: [{ type: 'text', text: `BLOCKED: ${params.name} is defense-in-depth denied by the MCP server.` }], isError: true });
    }
    const result = scanSource(params.arguments || {});
    return jsonRpcResult(id, { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result, isError: false });
  }
  return { jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } };
}

const contentTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const server = createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/api/status') {
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ mode, armor_iq_configured: Boolean(armorIQ), service: 'genesis-boundary-ledger', version: '0.1.0' }));
    return;
  }
  if (request.method === 'POST' && request.url === '/mcp') {
    let raw = '';
    for await (const chunk of request) {
      raw += chunk;
      if (raw.length > 100_000) { response.writeHead(413).end(); return; }
    }
    try {
      const result = handleMcp(JSON.parse(raw || '{}'));
      if (result === null) { response.writeHead(202).end(); return; }
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify(result));
    } catch (error) {
      response.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: error.message } }));
    }
    return;
  }
  if (request.method === 'POST' && request.url === '/api/run') {
    let raw = '';
    for await (const chunk of request) {
      raw += chunk;
      if (raw.length > 100_000) { response.writeHead(413).end(); return; }
    }
    try {
      const result = await engine.run(JSON.parse(raw || '{}'));
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ ...result, mode }, null, 2));
    } catch (error) {
      response.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ error: error.message }));
    }
    return;
  }
  const path = request.url === '/' ? '/index.html' : request.url;
  if (!/^\/[a-z0-9._/-]+$/i.test(path) || path.includes('..')) { response.writeHead(404).end(); return; }
  try {
    const file = await readFile(join(publicRoot, path));
    response.writeHead(200, { 'content-type': contentTypes[extname(path)] || 'application/octet-stream' });
    response.end(file);
  } catch { response.writeHead(404).end('Not found'); }
});

const port = Number(process.env.PORT || 8789);
server.listen(port, '127.0.0.1', () => console.log(`GENESIS Boundary Ledger (${mode}) on http://127.0.0.1:${port}`));
