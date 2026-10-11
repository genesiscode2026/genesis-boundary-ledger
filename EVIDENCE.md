# Evidence ledger — 11 October 2026

## Verified locally

- Official dependency: `@armoriq/sdk@0.6.10`.
- Automated tests: 12 passed, 0 failed after the final live-integration refresh.
- HTTP UI: `GET /` returned the demo application.
- Boundary denial: aliased `terminal` plus nested shell payload returned `BLOCK`, `side_effect_executed: false`.
- MCP discovery: `tools/list` returned `repo_scan`, `fs_write`, `shell_exec`, and `token_approve`.
- Dependency audit at installation: 0 vulnerabilities.
- Public deployment: `https://genesis-boundary-ledger.genesisagenttools.workers.dev`.
- Cloudflare deployment version: `e4cb7880-ff31-4524-b661-02f864ad6532`.
- Public status verified: `mode: live`, `armor_iq_configured: true`.
- Public boundary test verified: renamed `terminal` call with nested shell payload returned `BLOCK`, `tool_executed: false`, `side_effect_executed: false`.
- Public MCP call verified: `repo_scan` detected the supplied `eval(input)` as `SHELL_EXECUTION` / `CRITICAL`.
- ArmorIQ GitHub authentication verified for `genesiscode2026`; the CLI identity is authenticated in the matching workspace. The private account email is intentionally omitted from this public evidence file.
- Official ArmorIQ CLI 0.6.10 validation passed: API key authenticated, public MCP reachable, 4 tools discovered, all policy references valid.
- ArmorIQ MCP inventory re-scan passed: endpoint healthy and all four underscore-safe tool identifiers discovered.
- Active ArmorIQ policy: `Flow State — GENESIS Least Privilege`, target `genesis-boundary-mcp`, `repo_scan` allowed, `fs_write`, `shell_exec`, and `token_approve` blocked, every unlisted tool blocked by default.
- Allowed live call verified end-to-end: signed intent token issued, `repo_scan` dispatched through ArmorIQ, MCP result returned, `verified: true`, no mutating or side effect executed.
- Remote ArmorIQ policy probes verified: `fs_write`, `shell_exec`, and `token_approve` each returned a policy block before MCP execution.
- Public boundary probes verified: the aliases `write_file`, `run_command`, and `approve_token` normalized to the canonical prohibited tools, returned `BLOCK`, and recorded both `tool_executed: false` and `side_effect_executed: false`.
- ArmorIQ observability dashboard verified after explicit flush: 4 sessions and 4 traces for `genesis-boundary-agent`, with 0 reported execution errors.
- Machine-readable redacted summary: `evidence/live-verification.json`. The older `receipts.jsonl` entries are retained only as local-development provenance and are not evidence of the final live deployment.

## Evidence boundary

The local suite proves interception order, deterministic rules, default deny, alias/nested-payload resistance, receipt-chain integrity, SDK call ordering through a controlled test double, and fail-closed behavior when ArmorIQ denies or is missing. The external checks prove the deployed path independently: live policy authorization and dispatch for the single read-only tool, remote policy rejection for all three prohibited tools, and backend observability ingestion.

## Remaining external evidence

1. Record the demo using only the verified claims above.
2. Publish the video and finalize the Flow State submission only if the organizer approves the account-registration exception.
