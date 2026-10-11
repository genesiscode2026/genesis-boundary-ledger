import { canonicalToolName, detectHiddenCapability, flattenArguments } from './tool-registry.js';

const MAX_UINT256 = (2n ** 256n - 1n).toString();

function findValue(args, pattern) {
  return flattenArguments(args).find(({ path }) => pattern.test(path))?.value;
}

export function evaluateLocalBoundary({ tool, args = {} }) {
  const canonicalTool = canonicalToolName(tool);
  const hidden = detectHiddenCapability(args);

  if (hidden) {
    return {
      decision: 'BLOCK',
      reason: `Nested capability escalation detected at ${hidden.path}.`,
      rule: 'NESTED_CAPABILITY_DENY'
    };
  }

  if (canonicalTool === 'repo.scan') {
    return { decision: 'ALLOW', reason: 'Read-only source inspection is within declared scope.', rule: 'READ_ONLY_SCAN_ALLOW' };
  }
  if (canonicalTool === 'fs.write') {
    return { decision: 'BLOCK', reason: 'Filesystem mutation is outside the read-only remediation scope.', rule: 'FILESYSTEM_MUTATION_DENY' };
  }
  if (canonicalTool === 'shell.exec') {
    return { decision: 'BLOCK', reason: 'Shell execution is outside the declared agent scope.', rule: 'SHELL_EXECUTION_DENY' };
  }
  if (canonicalTool === 'token.approve') {
    const destination = String(findValue(args, /(?:destination|spender)$/i) || '');
    const amount = String(findValue(args, /(?:amount|allowance|approval)$/i) || '');
    if (!/^0x[0-9a-f]{40}$/i.test(destination) || /^0x0{40}$/i.test(destination)) {
      return { decision: 'BLOCK', reason: 'Malformed or zero approval destination.', rule: 'FINANCIAL_DESTINATION_DENY' };
    }
    if (/^(?:max|unlimited|infinite)$/i.test(amount) || amount === MAX_UINT256) {
      return { decision: 'BLOCK', reason: 'Unlimited token approvals are prohibited.', rule: 'UNLIMITED_APPROVAL_DENY' };
    }
    return { decision: 'BLOCK', reason: 'Financial mutation is outside this agent scope.', rule: 'FINANCIAL_MUTATION_DENY' };
  }
  return { decision: 'BLOCK', reason: `Unknown tool "${canonicalTool}" fails closed.`, rule: 'DEFAULT_DENY' };
}
