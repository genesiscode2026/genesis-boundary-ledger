# GENESIS Boundary Ledger

Flow State 2026 submission candidate: a read-only MCP security agent whose actions are intercepted before execution, evaluated against an explicit boundary, and written to a hash-chained evidence ledger.

Public demo: https://genesis-boundary-ledger.genesisagenttools.workers.dev

Public MCP endpoint: `https://genesis-boundary-ledger.genesisagenttools.workers.dev/mcp`

## What is real today

- The local boundary engine, alias normalization, nested-argument detection, pre-effect blocking, scanner demo, receipt chain and UI are implemented and tested.
- The official `@armoriq/sdk` is integrated through its session → plan → policy dispatch → plan completion → observability flush lifecycle.
- Live mode fails closed if ArmorIQ credentials, policy or MCP registration are absent.
- Local demo mode is visibly labeled and never claims ArmorIQ authorization.
- The public Cloudflare deployment runs in verified live ArmorIQ mode. Its least-privilege policy permits only `repo_scan`; `fs_write`, `shell_exec`, `token_approve`, and every unlisted tool are blocked.

## Run

```bash
npm install
npm test
npm start
```

Open `http://127.0.0.1:8789`. The default is `local-demo` mode.

For live ArmorIQ enforcement, configure a real ArmorIQ account and registered MCP endpoint, then run:

```bash
ARMORIQ_API_KEY=... ARMORIQ_USER_EMAIL=... BOUNDARY_MODE=live npm start
```

## Boundary proof

The demo contains one allowed read-only scan and blocked attempts for filesystem mutation, shell execution and token approval. Aliases and nested payloads are normalized before policy evaluation. A blocked call never reaches an executor. Each result includes input/output hashes, the exact rule and a hash pointer to the previous receipt.

## Provenance

| Component | Status | Provenance |
|---|---|---|
| Original GENESIS MCP Scanner | Prior work | Existing private control-plane service; not represented as new contest work |
| Original GENESIS Transaction Guard | Prior work | Existing private control-plane service; not represented as new contest work |
| Boundary interception engine | New Flow State work | Implemented in this directory on 11 Oct 2026 |
| ArmorIQ SDK adapter and policy manifest | New Flow State work | Implemented from official ArmorIQ TypeScript documentation |
| Alias/nested bypass defenses | New Flow State work | Implemented in this directory |
| Tamper-evident receipt chain | New Flow State work | Implemented in this directory |
| Demo UI and boundary scenarios | New Flow State work | Implemented in this directory |

Live ArmorIQ enforcement was verified on 11 Oct 2026: the read-only scanner executed through the signed policy path, three prohibited synthetic calls were blocked by ArmorIQ before execution, and all four traces appeared in the organization observability dashboard. Secrets remain only in the local credential store and Cloudflare's encrypted secret store.

## Official references

- https://docs.armoriq.ai/platform/sdk-cli/typescript-sdk
- https://docs.armoriq.ai/platform/sdk-cli/quickstart
- https://docs.armoriq.ai/platform/sdk-cli/armoriq-yaml
- https://docs.armoriq.ai/platform/observability/typescript-sdk
