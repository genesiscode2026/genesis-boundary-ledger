import { ArmorIQClient } from '@armoriq/sdk';
import { evaluateLocalBoundary } from './local-boundary.js';
import { canonicalToolName } from './tool-registry.js';
import { scanSource } from './scanner.js';

const json = (value, status = 200) => new Response(JSON.stringify(value, null, 2), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`;
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(typeof value === 'string' ? value : canonicalize(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function liveConfigured(env) {
  return Boolean(env.ARMORIQ_API_KEY && env.ARMORIQ_USER_EMAIL);
}

async function armorIQAuthorize(env, { intent, tool, args }) {
  const client = new ArmorIQClient({ apiKey: env.ARMORIQ_API_KEY, userId: env.ARMORIQ_USER_ID || 'genesis-boundary-service', agentId: env.ARMORIQ_AGENT_ID || 'genesis-boundary-agent' });
  // Axios defaults Request.cache to "default"; Cloudflare Workers accepts
  // only its supported cache modes. Keep transport uncached for intent tokens.
  if (client.httpClient?.defaults) {
    client.httpClient.defaults.fetchOptions = { cache: 'no-store' };
  }
  const scope = client.forUser(env.ARMORIQ_USER_EMAIL);
  const session = scope.startSession({
    mode: 'proxy',
    defaultMcpName: 'genesis-boundary-mcp',
    llm: 'boundary-ledger'
  });
  let token = null;
  try {
    token = await session.startPlan([{ name: tool, args }], intent);
    const result = await session.dispatch(tool, args);
    return {
      output: result?.data ?? result,
      armor_iq: {
        mode: 'live',
        status: result?.status || 'authorized',
        verified: true,
        token_id: token?.tokenId || null,
        plan_id: token?.planId || null
      }
    };
  } finally {
    if (token?.planId) {
      try { await client.completePlan(token.planId); } catch { /* enforcement remains fail-closed; telemetry is secondary */ }
    }
    try { await session.flushObservability(); } finally { await session.close(); }
  }
}

async function runBoundary(env, input) {
  const intent = String(input.intent || 'No intent supplied');
  const requestedTool = String(input.tool || '');
  const tool = canonicalToolName(requestedTool);
  const args = input.args && typeof input.args === 'object' ? input.args : {};
  let enforcement = evaluateLocalBoundary({ tool, args });
  let output = null;
  let toolExecuted = false;
  let armorIQ = { mode: 'local-demo' };

  if (enforcement.decision === 'ALLOW') {
    if (liveConfigured(env)) {
      try {
        const live = await armorIQAuthorize(env, { intent, tool, args });
        output = live.output;
        armorIQ = live.armor_iq;
        toolExecuted = true;
        enforcement = { decision: 'ALLOW', reason: 'ArmorIQ signed intent and policy enforcement authorized the invocation.', rule: 'ARMORIQ_POLICY_ALLOW' };
      } catch (error) {
        enforcement = { decision: 'BLOCK', reason: `ArmorIQ denied or could not authorize the call: ${error?.constructor?.name || 'Error'}: ${error?.message || 'unknown error'}`, rule: 'ARMORIQ_FAIL_CLOSED' };
        armorIQ = { mode: 'live', error_class: error?.constructor?.name || 'Error' };
      }
    } else {
      output = scanSource(args);
      toolExecuted = true;
      enforcement = { ...enforcement, reason: `${enforcement.reason} Local demonstration mode; no ArmorIQ authorization claimed.` };
    }
  }

  const body = {
    schema: 'genesis.boundary.edge-receipt.v1',
    timestamp: new Date().toISOString(),
    previous_hash: 'STATELESS_EDGE_RECEIPT',
    input_hash: await sha256({ intent, tool, args }),
    intent,
    requested_tool: requestedTool,
    canonical_tool: tool,
    decision: enforcement.decision,
    reason: enforcement.reason,
    policy_rule: enforcement.rule,
    armor_iq: armorIQ,
    tool_executed: toolExecuted,
    mutating_effect_executed: false,
    side_effect_executed: false,
    output_hash: output === null ? null : await sha256(output)
  };
  return { decision: enforcement.decision, output, receipt: { ...body, receipt_hash: await sha256(body) }, mode: liveConfigured(env) ? 'live' : 'local-demo' };
}

function mcpResponse(message) {
  const { id = null, method, params = {} } = message || {};
  const result = (value) => json({ jsonrpc: '2.0', id, result: value });
  if (method === 'initialize') return result({ protocolVersion: params.protocolVersion || '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'genesis-boundary-mcp', version: '0.1.0' } });
  if (method === 'notifications/initialized') return new Response(null, { status: 202 });
  if (method === 'tools/list') return result({ tools: [
    { name: 'repo_scan', description: 'Read-only deterministic scan of supplied MCP source.', inputSchema: { type: 'object', properties: { filename: { type: 'string' }, source: { type: 'string' } }, required: ['source'], additionalProperties: false } },
    { name: 'fs_write', description: 'Boundary-test tool; defense-in-depth denied.', inputSchema: { type: 'object', additionalProperties: true } },
    { name: 'shell_exec', description: 'Boundary-test tool; defense-in-depth denied.', inputSchema: { type: 'object', additionalProperties: true } },
    { name: 'token_approve', description: 'Boundary-test tool; defense-in-depth denied.', inputSchema: { type: 'object', additionalProperties: true } }
  ] });
  if (method === 'tools/call') {
    if (params.name !== 'repo_scan') return result({ content: [{ type: 'text', text: `BLOCKED: ${params.name} is denied by the MCP server.` }], isError: true });
    const scan = scanSource(params.arguments || {});
    return result({ content: [{ type: 'text', text: JSON.stringify(scan) }], structuredContent: scan, isError: false });
  }
  return json({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/api/status') return json({ mode: liveConfigured(env) ? 'live' : 'local-demo', armor_iq_configured: liveConfigured(env), service: 'genesis-boundary-ledger', version: '0.1.0' });
    if (request.method === 'POST' && url.pathname === '/api/run') {
      try {
        const raw = await request.text();
        if (raw.length > 100_000) return json({ error: 'Payload too large' }, 413);
        return json(await runBoundary(env, JSON.parse(raw || '{}')));
      } catch (error) { return json({ error: error.message }, 400); }
    }
    if (request.method === 'POST' && url.pathname === '/mcp') {
      try {
        const raw = await request.text();
        if (raw.length > 100_000) return json({ error: 'Payload too large' }, 413);
        return mcpResponse(JSON.parse(raw || '{}'));
      } catch (error) { return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: error.message } }, 400); }
    }
    return env.ASSETS.fetch(request);
  }
};
