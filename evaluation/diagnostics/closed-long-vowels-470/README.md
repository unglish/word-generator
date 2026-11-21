# PR #483 evidence (#470 closed long vowels)

Probes and outputs behind the PR description. Seeds 2000000-2019999 with default options unless a file says otherwise. Compared trees: main 81df038c, the stack base 36762bf8 (PR #481), and this PR.

- probes/countout.mts: the issue rule on written output (the probe embedded in the PR body). Usage: node --import tsx countout.mts <checkout> [N] [firstSeed] [--examples]
- probes/dump.mts + count.mjs: trace dump, and the trace-selection count (1,667 -> 412).
- probes/*: ablation, codaLimit, extra-syllable endings, 608-word split, soft c/g, monosyllable and swap-example probes.
- outputs/*.txt: their outputs at the published head; perf-vs-{stack,main}.txt: perf:compare output.
- quality-pr/vs-{main,stack}: npm run quality:pr comparison JSON and Markdown. The raw captures (~400 MB each) are not archived; regenerate them with npm run quality:pr.
