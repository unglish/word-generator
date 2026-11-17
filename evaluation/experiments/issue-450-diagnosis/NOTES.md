---
cursor:
  subagentId: "bc-0b00c679-8337-5549-9a99-d17421a1fae7"
---

# Issue #450 diagnosis — working notes

User-facing report: `/cursor/stores/bc-01a13b7c-29e9-792a-a41d-d3389db3cfc3/docs/issue-450-letter-length-diagnosis.md`

## Layout
- `packets/` — CMU side, gen probes, decomposition, traces, structure
- `scripts/` — local probes (`cmu-side.ts`, `gen-probe.ts`, `cmu-structure.ts`, `trace-graphemes.ts`); also in tag; not for `main`

## Repro
- CMU: curl pinned revision; SHA-256 `81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22`
- Gen: `COUNT_PER_SEED=200000 ONLY=<id> OUT_DIR=... node --import tsx memory/issue-450/gen-probe.ts`
- Conditions: bare-gated-mono, morph-stay-mono, bare-ungated-mono, bare-gated-di, bare-ungated-di

## Decision wait
Stop after report; no generator changes until coordinator/user decides among §7 proposals.
