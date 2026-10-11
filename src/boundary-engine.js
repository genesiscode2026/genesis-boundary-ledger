import { sha256 } from './canonical.js';
import { evaluateLocalBoundary } from './local-boundary.js';
import { classifyArmorIQError } from './armoriq-adapter.js';
import { canonicalToolName } from './tool-registry.js';

export class BoundaryEngine {
  constructor({ ledger, armorIQ = null, mode = 'live', executors = {} }) {
    this.ledger = ledger;
    this.armorIQ = armorIQ;
    this.mode = mode;
    this.executors = executors;
  }

  async run({ intent, tool, args = {} }) {
    const canonicalTool = canonicalToolName(tool);
    const inputHash = sha256({ intent, tool: canonicalTool, args });
    const local = evaluateLocalBoundary({ tool: canonicalTool, args });
    let enforcement = local;

    if (local.decision === 'ALLOW') {
      if (this.mode === 'live') {
        if (!this.armorIQ) {
          enforcement = { decision: 'BLOCK', reason: 'Live ArmorIQ adapter is not configured.', rule: 'ARMORIQ_CONFIGURATION_REQUIRED', armor_iq: { mode: 'unconfigured' } };
        } else {
          try {
            enforcement = await this.armorIQ.authorize({ intent, tool: canonicalTool, args });
          } catch (error) {
            enforcement = classifyArmorIQError(error);
          }
        }
      } else {
        enforcement = { ...local, reason: `${local.reason} Local demonstration mode; no ArmorIQ authorization claimed.`, armor_iq: { mode: 'local-demo' } };
      }
    }

    let output = enforcement.output ?? null;
    let toolExecuted = enforcement.externalExecution === true;
    if (enforcement.decision === 'ALLOW') {
      if (!enforcement.externalExecution) {
        const executor = this.executors[canonicalTool];
        if (!executor) {
          enforcement = { decision: 'BLOCK', reason: `No executor registered for ${canonicalTool}.`, rule: 'EXECUTOR_MISSING' };
        } else {
          output = await executor(args);
          toolExecuted = true;
        }
      }
    }

    const receipt = await this.ledger.record({
      input_hash: inputHash,
      intent,
      requested_tool: String(tool),
      canonical_tool: canonicalTool,
      decision: enforcement.decision,
      reason: enforcement.reason,
      policy_rule: enforcement.rule,
      armor_iq: enforcement.armor_iq || { mode: this.mode === 'live' ? 'unconfigured' : 'local-demo' },
      tool_executed: toolExecuted,
      mutating_effect_executed: false,
      side_effect_executed: false,
      output_hash: output === null ? null : sha256(output)
    });
    return { decision: enforcement.decision, output, receipt };
  }
}
