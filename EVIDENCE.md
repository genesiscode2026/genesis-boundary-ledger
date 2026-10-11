# Evidence ledger — 11 October 2026

## Verified locally

- Official dependency: `@armoriq/sdk@0.6.8`.
- SDK runtime export: `VERSION 0.6.8`, `ArmorIQClient` available.
- Automated tests: 12 passed, 0 failed before the final evidence refresh.
- HTTP UI: `GET /` returned the demo application.
- Boundary denial: aliased `terminal` plus nested shell payload returned `BLOCK`, `side_effect_executed: false`.
- MCP discovery: `tools/list` returned `repo.scan`, `fs.write`, `shell.exec`, and `token.approve`.
- Dependency audit at installation: 0 vulnerabilities.

## Evidence boundary

The local suite proves interception order, deterministic local rules, default deny, alias/nested-payload resistance, receipt-chain integrity, ArmorIQ SDK call ordering through a controlled test double, and fail-closed behavior when ArmorIQ denies or is missing.

It does **not** yet prove a live ArmorIQ authorization. That requires a real ArmorIQ account/API key, organization policy, a public MCP endpoint registered with ArmorIQ, and a captured platform audit event. Until those exist, the public UI must remain visibly labeled `LOCAL DEMO MODE`.

## Remaining external evidence

1. Create or authenticate the real ArmorIQ organization.
2. Deploy this service and set `GENESIS_BOUNDARY_MCP_URL` to its `/mcp` endpoint.
3. Validate/register `armoriq.yaml` with the official CLI.
4. Run one allowed and three prohibited live calls.
5. Capture ArmorIQ audit records and public deployment URL.
6. Publish the repository and demo video only after those claims are verified.
