# 75-second demo script

1. **0–8s:** Show the public repository provenance table: existing GENESIS components are prior work; boundary enforcement and ArmorIQ integration are new.
2. **8–20s:** Show the live-mode badge and ArmorIQ dashboard policy: only `genesis-boundary-mcp.repo.scan` is allowed.
3. **20–35s:** Run the allowed read-only scan. Show the critical shell-execution finding, ArmorIQ plan/token evidence and receipt hash.
4. **35–47s:** Attempt `write_file`. Show normalization to `fs.write`, denial before execution and `mutating_effect_executed: false`.
5. **47–59s:** Attempt the renamed `terminal` tool with a nested command. Show `NESTED_CAPABILITY_DENY`.
6. **59–69s:** Attempt a nested unlimited token approval. Show deterministic financial denial.
7. **69–75s:** Show the linked receipt hashes and conclude: the agent can act, but intent and policy hold the boundary before effects occur.

Do not record this script in `LOCAL DEMO MODE` as if it were live ArmorIQ enforcement.
