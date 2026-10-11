export function scanSource({ filename = 'server.js', source = '' } = {}) {
  const findings = [];
  const rules = [
    ['CRITICAL', 'SHELL_EXECUTION', /(?:child_process|execSync|shell\s*:\s*true|eval\s*\()/i],
    ['HIGH', 'SECRET_EXPOSURE', /(?:api[_-]?key|private[_-]?key|bearer)\s*[:=]\s*['"][^'"]{12,}/i],
    ['HIGH', 'PATH_TRAVERSAL', /(?:readFile|writeFile).*?(?:\.\.\/|args\.|filename|filepath)/is]
  ];
  for (const [severity, rule, pattern] of rules) {
    if (pattern.test(source)) findings.push({ severity, rule, filename });
  }
  return { filename, finding_count: findings.length, findings, verdict: findings.length ? 'REVIEW' : 'PASS' };
}
