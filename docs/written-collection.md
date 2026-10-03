# Local collection for a frozen blinded comparison

The collector serves the unchanged written-v2 rubric and frozen, counterbalanced
plan. It accepts rated/familiarity answers or explicit skips, one word at a time,
without revealing condition labels, source traces, strata or participant slots.
It is a native Node HTTP service bound to `127.0.0.1`. No cloud account or internet
connection is required after installing the repository dependencies. This supports
controlled local review sessions; it does not provide remote recruitment,
internet hosting, independent person verification or actual human observations.

## Owner workflow

Prepare the two-condition comparison and complete plan using `review:compare`.
Freeze the candidate-selection, population, sampling, missingness and inference
choices before collecting ratings. Human mode also requires the owner-attested
roster with unique person and verification-record hashes for the entire planned
roster. Keep the underlying verification records separately: hashes authenticate
contents, not the existence of a participant.

```sh
node --import tsx evaluation/review/comparison/collection/collection-cli.ts initialize \
  --input private/comparison.json --plan private/plan.json \
  --roster private/roster.json --out private/collection
node --import tsx evaluation/review/comparison/collection/collection-cli.ts serve \
  --input private/collection --port 4179
```

Initialization requires a fresh directory, uses mode 0700 for it and 0600 for
manifest, credentials and journal, and fails rather than overwriting an existing
collection. Actual permissions should be checked on the host used for collection.
Use `credentials.json` privately to give the correct person their token. Open
`http://127.0.0.1:4179/#TOKEN` on the controlled collection computer. The token is
removed from the visible URL and held in that browser tab's session storage so a
refresh can resume. A new token replaces the tab's previous token. The token is
removed from session storage when all that participant's sessions are complete.
A refresh after completion therefore requires the original participant link;
reopening it confirms completion without adding responses.
Do not give a participant the owner token or private source/roster files.

The reviewer explicitly selects one of the five rubric ratings and a yes/no
familiarity answer, or skips. The collector preserves planned session and position
order, including all sessions assigned to the same slot; it does not reshuffle or
replace words after seeing responses. A skip is a received response with null
score and familiarity, not a negative score. An unfinished assignment remains
missing and can be resumed with the same token. Once saved, an answer is immutable:
an identical retry is acknowledged as a duplicate, while a changed retry is
rejected. If a save acknowledgement is lost, the UI retries the identical answer.

```sh
node --import tsx evaluation/review/comparison/collection/collection-cli.ts export \
  --input private/collection --out private/export-01
npm run review:compare -- report --input private/export-01/export.json --out private/report.json
npm run review:compare -- infer --input private/export-01/export.json \
  --roster private/export-01/roster.json --out private/inference.json
```

Export requires a fresh directory and writes the ordinary comparison export, the
full owner audit (manifest and receipt chain), and the bound roster where present.
Development-fixture purpose remains in the export and must never be counted as
human evidence. The authenticated owner-only HTTP endpoints `/api/export` and
`/api/audit` can also retrieve a consistent in-memory export while the server runs,
using the owner token in the `Authorization: Bearer TOKEN` header.

## Persistence, restart and recovery

An answer becomes acknowledged only after appending a complete receipt to
`responses.jsonl` and syncing that file to disk. A response carries its immutable
item/session/position binding, owner slot, server receipt timestamp, sequence and
previous-record hash. The collector validates every receipt against the frozen
plan when restoring. It rejects truncated lines, changed/reordered/duplicate
receipts, foreign assignments and modified answers, including modified receipts
whose own hashes have been recomputed. Hashes protect integrity relative to the
owner-held manifest; they are not independent attestations of a human's identity.

A promise queue serializes concurrent saves; concurrent delivery of the same
answer produces one receipt. An exclusive `writer.lock` permits one writer process
per collection. Stop the server with SIGINT/SIGTERM to finish active requests and
release that lease. A crash can leave the lease in place. Before removing a stale
lease, the owner must verify that its recorded process has stopped and preserve a
copy of the collection. A second writer is refused rather than inferring that an
existing lease is safe to remove.

If a disk append/sync fails, that answer is not acknowledged and the writer refuses
further saves until owner recovery. If the journal disappears, the writer does
not recreate it. A complete receipt whose acknowledgement was lost is recognized
on restore; retrying the same answer does not add another response. An interrupted
trailing record causes restoration to fail. Preserve the original bytes for
inspection; the program does not silently discard that tail or report a complete
export from a corrupted journal.

Back up the private directory, including source manifest, credentials, journal and
roster/verification records, separately from the active directory. Stop the writer
before making a filesystem copy. Restore the complete directory on a fresh host
with compatible Node/dependencies, inspect any stale writer lease, and validate
all receipt/source bindings before resuming. A consistent owner HTTP export is
analysis evidence; it is not a backup of reusable participant credentials.

## Validation status and study limits

Strict review types, touched lint and the 49-test review suite pass, including
packet blinding, token separation, multi-session progress, skipped/missing
accounting, concurrent retries, private permissions, exclusive writer refusal,
durable reload, storage failures, receipt corruption and authenticated HTTP routes.
The actual CLI also passed synthetic initialization, save/retry, graceful restart,
owned-process SIGKILL, stale-lease refusal, explicit recovery and export/report/infer
checks. These process checks do not establish hardware power-loss guarantees.

An actual browser check completed one four-item development-fixture slot. It
rejected incomplete ratings, resumed the acknowledged position after reload,
retained an immutable pending skip while the loopback server was unavailable,
and retried that same skip after restart. The final export and journal contained
exactly four unique synthetic responses: two ratings and two explicit skips.
Completion cleared the tab credential as documented; the original participant
link confirmed the completed state. This establishes the exercised browser path,
not a mobile/accessibility audit or a human-mode enrollment study. Actual host
validation, verified people, calibrated inference and real ratings remain.

There is no synchronization or peer-to-peer transport: one owner-controlled local
journal is authoritative. Direct remote participation would require a separately
reviewed deployment/transport choice; loopback tests cannot prove reachability or
security on other networks. These choices avoid adding a hosted dependency to the
controlled local workflow. The collector remains separate from the generator API,
and cannot establish reader preference, representative recruitment, sufficient
power, bootstrap calibration or default-promotion evidence. Actual enrollment and
observed ratings are still required to complete Q21.
