export class ArmorIQAdapter {
  constructor({ client, userEmail, mcpId = 'genesis-boundary-mcp', model = 'boundary-ledger-planner' }) {
    this.client = client;
    this.userEmail = userEmail;
    this.mcpId = mcpId;
    this.model = model;
  }

  static async fromEnvironment(env = process.env) {
    if (!env.ARMORIQ_API_KEY) throw new Error('ARMORIQ_API_KEY is required; live enforcement fails closed.');
    if (!env.ARMORIQ_USER_EMAIL) throw new Error('ARMORIQ_USER_EMAIL is required for auditable user scoping.');
    const { ArmorIQClient } = await import('@armoriq/sdk');
    const client = new ArmorIQClient({
      apiKey: env.ARMORIQ_API_KEY,
      userId: env.ARMORIQ_USER_ID || 'genesis-boundary-service',
      agentId: env.ARMORIQ_AGENT_ID || 'genesis-boundary-agent'
    });
    return new ArmorIQAdapter({ client, userEmail: env.ARMORIQ_USER_EMAIL });
  }

  async authorize({ intent, tool, args }) {
    const planDefinition = {
      goal: intent,
      steps: [{ action: tool, mcp: this.mcpId, params: args }]
    };
    const plan = this.client.capturePlan(this.model, intent, planDefinition);
    const token = await this.client.getIntentToken(plan, { validitySeconds: 120 });
    const result = await this.client.invokeWithPolicy(
      this.mcpId,
      tool,
      token,
      args,
      { userEmail: this.userEmail, waitForApproval: false }
    );
    return {
      decision: 'ALLOW',
      reason: 'ArmorIQ signed intent and policy enforcement authorized the invocation.',
      rule: 'ARMORIQ_POLICY_ALLOW',
      armor_iq: {
        mode: 'live',
        status: result?.status || 'authorized',
        token_id: token?.tokenId || null,
        plan_hash: plan?.planHash || null,
        merkle_root: plan?.merkleRoot || null
      },
      externalExecution: true,
      output: result?.data ?? result
    };
  }
}

export function classifyArmorIQError(error) {
  const name = error?.constructor?.name || 'ArmorIQError';
  return {
    decision: 'BLOCK',
    reason: `ArmorIQ denied or could not authorize the call: ${name}: ${error?.message || 'unknown error'}`,
    rule: 'ARMORIQ_FAIL_CLOSED',
    armor_iq: { mode: 'live', error_class: name }
  };
}
