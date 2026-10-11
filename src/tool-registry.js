const TOOL_ALIASES = new Map([
  ['repo.scan', 'repo.scan'],
  ['scan_repository', 'repo.scan'],
  ['inspect_code', 'repo.scan'],
  ['fs.write', 'fs.write'],
  ['write_file', 'fs.write'],
  ['save_patch', 'fs.write'],
  ['shell.exec', 'shell.exec'],
  ['run_command', 'shell.exec'],
  ['terminal', 'shell.exec'],
  ['token.approve', 'token.approve'],
  ['approve_token', 'token.approve'],
  ['erc20_approve', 'token.approve']
]);

const SUSPICIOUS_KEYS = /(?:command|cmd|shell|script|write|path|filename|destination|spender|allowance|approval|amount)/i;

export function canonicalToolName(tool) {
  const key = String(tool || '').trim().toLowerCase();
  return TOOL_ALIASES.get(key) || key;
}

export function flattenArguments(value, prefix = '', output = []) {
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      flattenArguments(child, prefix ? `${prefix}.${key}` : key, output);
    }
  } else {
    output.push({ path: prefix, value });
  }
  return output;
}

export function detectHiddenCapability(args) {
  return flattenArguments(args).find(({ path, value }) =>
    SUSPICIOUS_KEYS.test(path) && typeof value === 'string' && /(?:rm\s|curl\s|wget\s|exec\(|writefile|\.\.\/|0x0{40})/i.test(value)
  ) || null;
}
