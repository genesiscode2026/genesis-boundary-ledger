const TOOL_ALIASES = new Map([
  ['repo.scan', 'repo_scan'],
  ['repo_scan', 'repo_scan'],
  ['scan_repository', 'repo_scan'],
  ['inspect_code', 'repo_scan'],
  ['fs.write', 'fs_write'],
  ['fs_write', 'fs_write'],
  ['write_file', 'fs_write'],
  ['save_patch', 'fs_write'],
  ['shell.exec', 'shell_exec'],
  ['shell_exec', 'shell_exec'],
  ['run_command', 'shell_exec'],
  ['terminal', 'shell_exec'],
  ['token.approve', 'token_approve'],
  ['token_approve', 'token_approve'],
  ['approve_token', 'token_approve'],
  ['erc20_approve', 'token_approve']
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
