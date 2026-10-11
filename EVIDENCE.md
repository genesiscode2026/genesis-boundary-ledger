# Evidence ledger — 11 October 2026

## Verified locally

- Official dependency: `@armoriq/sdk@0.6.8`.
- SDK runtime export: `VERSION 0.6.8`, `ArmorIQClient` available.
- Automated tests: 12 passed, 0 failed before the final evidence refresh.
- HTTP UI: `GET /` returned the demo application.
- Boundary denial: aliased `terminal` plus nested shell payload returned `BLOCK`, `side_effect_executed: false`.
- MCP discovery: `tools/list` returned `repo.scan`, `fs.write`, `shell.exec`, and `token.approve`.
- Dependency audit at installation: 0 vulnerabilities.
- Public deployment: `https://genesis-boundary-ledger.genesisagenttools.workers.dev`.
- Cloudflare deployment version: `bb3bf9e1-7daf-46ed-9a8f-2beb81e6cc43`.
- Public status verified: `mode: local-demo`, `armor_iq_configured: false`.
- Public boundary test verified: renamed `terminal` call with nested shell payload returned `BLOCK`, `tool_executed: false`, `side_effect_executed: false`.
- Public MCP call verified: `repo.scan` detected the supplied `eval(input)` as `SHELL_EXECUTION` / `CRITICAL`.
- ArmorIQ GitHub authentication verified for `genesiscode2026`; the CLI identity is authenticated in the matching workspace. The private account email is intentionally omitted from this public evidence file.
- Official ArmorIQ CLI 0.6.10 validation passed: API key authenticated, public MCP reachable, 4 tools discovered, all policy references valid.
- ArmorIQ control-plane registration passed: `genesis-boundary-agent` registered, `genesis-boundary-mcp` registered, policy applied with 1 allowed and 3 denied tools, official proxy endpoint returned.

## Evidence boundary

The local suite proves interception order, deterministic local rules, default deny, alias/nested-payload resistance, receipt-chain integrity, ArmorIQ SDK call ordering through a controlled test double, and fail-closed behavior when ArmorIQ denies or is missing.

It does **not** yet prove a successful live ArmorIQ invocation or captured platform audit event. The account, API key, organization policy and public MCP registration now exist, but the runtime secret has not been transmitted to Cloudflare and no live demo payload has been sent. Until both actions are explicitly authorized and verified, the public UI must remain visibly labeled `LOCAL DEMO MODE`.

## Remaining external evidence

1. Store `ARMORIQ_API_KEY` and `ARMORIQ_USER_EMAIL` in Cloudflare's encrypted Worker secret store after explicit authorization.
2. Run one allowed and three prohibited live calls.
3. Capture ArmorIQ audit records and the live public response.
4. Record and publish the demo video only after those claims are verified.
