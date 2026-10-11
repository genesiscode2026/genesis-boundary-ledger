import test from 'node:test';
import assert from 'node:assert/strict';
import { ArmorIQAdapter } from '../src/armoriq-adapter.js';

test('adapter performs ArmorIQ plan, token and policy invocation in order', async () => {
  const calls = [];
  const client = {
    capturePlan: (llm, prompt, plan) => { calls.push(['capturePlan', llm, prompt, plan]); return { planHash: 'plan-hash', merkleRoot: 'merkle' }; },
    getIntentToken: async (plan, options) => { calls.push(['getIntentToken', plan, options]); return { tokenId: 'token-id' }; },
    invokeWithPolicy: async (...args) => { calls.push(['invokeWithPolicy', ...args]); return { status: 'success' }; }
  };
  const adapter = new ArmorIQAdapter({ client, userEmail: 'builder@example.com' });
  const result = await adapter.authorize({ intent: 'Read source', tool: 'repo.scan', args: { filename: 'a.js' } });
  assert.equal(result.decision, 'ALLOW');
  assert.equal(result.externalExecution, true);
  assert.deepEqual(calls.map((call) => call[0]), ['capturePlan', 'getIntentToken', 'invokeWithPolicy']);
  assert.equal(calls[0][1], 'boundary-ledger-planner');
  assert.equal(calls[0][2], 'Read source');
  assert.equal(calls[2][5].userEmail, 'builder@example.com');
});
