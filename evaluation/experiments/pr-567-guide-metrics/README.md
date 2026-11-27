# PR #567 evidence: guide metrics (#555 E1b)

- `control-packet.md`, `control-packet.json.gz`: `quality:uci` run on two separate captures of main `f70b0b38`. The capture commands were `npm run quality:capture -- --id main-a|main-b --generator-root <origin/main worktree>`. Both arms were labelled `legacy-weighted`. Every UCI and guide metric is identical across the two captures. Running the packet twice gave byte-identical output.
- `probe-archive.ts`: a one-off probe that computes the guide metrics over the archived #553 draws (`uci-generated.csv.gz` from `archive/pr-553`). The pinned version of this check is in `verify-archive`.
