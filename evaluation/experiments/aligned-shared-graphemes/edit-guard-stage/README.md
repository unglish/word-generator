# Q13b generic-edit guard — preparation stage

BaseSpelling.edit now returns an acceptance flag. With shared constructions
present it checks their complete live output extent, ordered ownership and
configured reading support on the proposed surface before mutating. Refused
edits leave cells, units and edit/cell IDs unchanged and retain an event-time
guard record. Both observer adapters propagate the flag. Identical-text no-ops
preserve existing ownership without creating a guard or edit event.

The guard refuses overlap with shared cells, insertion inside a multi-cell
construction, newly initial x and loss of authenticated following-vowel context.
It permits unrelated prefix/coda changes when the shared reading remains
supported. The proposed part calculation is shared with the actual ledger edit,
so same-part rewrites retain scope-relative position. The original configured
formation probability is checked for eligibility without sampling again.

The regex writer honors explicit false by retaining the matched text and not
advancing its offset delta. Existing probability draws still happen before the
observer; refusing a generic rewrite does not retroactively refund a draw.
Two integration cases verify correct offsets when the refused match precedes
or follows an accepted length-changing match. applySpellingRules is exported
from its internal module for composable testing, not from the package entry.

All 262 targeted tests pass across seven suites; fourteen added guard/writer
cases supplement the existing formation tests. Strict TypeScript and changed
source lint pass. Three test logs and both typecheck logs are retained alongside
lint. Eleven preregistered files remain unchanged. Focused simplification extracts
complete live construction validation and the common edit-part calculation.

This does not complete preservation integration. Other writer mutation paths
still ignore observer refusal, paired silent-e edits require transaction handling,
whole-word gap replacement needs explicit supersession, and coverage/normalization
need joint-unit and neighboring-reading handling. Full v4 replay and writer-slot
activation are also pending. The public generator has not enabled shared mode.
No corpus or human-quality improvement is claimed. The previous full-suite
failure record remains valid for its earlier source; the full suite was not rerun
for this stage, which has the targeted and static checks listed above.
