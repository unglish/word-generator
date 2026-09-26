# Source-review fixture and CLI matrix

Freeze these definitions before any full success run. Synthetic scoring only is permitted before source review.

- Pure scoring: both boundaries for one phone; repeated phones; absent pairs; denominator changes; exact old-model parity; immutable detached tables; reject native vocabulary, nonfinite/noninteger/zero counts, incorrect totals and complete-table marginal-preserving swaps against externally trusted input.
- Projection: aligned null never deleted; empty vector; ambiguous ɜ versus resolved ɚ; AH/ER potential versus observed merger; aspiration symbol/flag; notation aliases; multi-nuclei; unmarked/invalid stress; retained source order.
- Evidence: duplicate/missing/reordered rows and shards; summary-preserving row swap; altered loss mask/denominator/nonfinite result; wrong model/parent/protocol/engine/implementation identity; file and ancestor symlinks; source mutation; exact before/after closure.
- Publication: no args, unknown/repeated/missing flags, wrong source/observer/freeze, existing output/file/symlink/hardlink/dangling leaf and alias/protected source/archive paths fail without a completed report; late failure retains incomplete evidence. CLI commands are direct node --import tsx with absolute entrypoint from repository and unrelated cwd. No npm script migration.
- Formal acceptance after review only: two fresh complete runs; every raw English/generated row independently reconstructed in Python; exact counts and identities, numeric tolerance 1e-10 + 1e-12*abs(reference); both maximum absolute and relative discrepancy coordinates retained, sign-boundary disagreements reported separately.
