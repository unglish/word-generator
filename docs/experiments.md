# Archived experiments

These experiments from the [linguistic improvement plan](./linguistic-improvement-plan.md)
were closed without merging on 2026-10-19. In each case the experiment's own
measurements argued against adopting it, or the PR only refined or supported
one that was closed. The code and complete evidence are kept in annotated tags
named `archive/pr-<number>`:

```sh
git fetch origin 'refs/tags/archive/*:refs/tags/archive/*'
git show archive/pr-345:evaluation/experiments/split-digraphs/RESULTS.md
```

A closed experiment is a measured result, not a lost one. Reopening one starts
from its tag and must be measured again against the current `main`, because
the archived evidence describes the generator the experiment was built on.

## Rejected by their own measurements

| PR | Plan ID | Hypothesis | Measured outcome | Results |
|---|---|---|---|---|
| [#335](https://github.com/unglish/word-generator/pull/335) | Q13c | Deduplicating adjacent letters should not erase a separate phone's spelling or cut `th` into `h`. | The deletion defects disappeared, but monosyllable trigram divergence worsened by 0.0067 bits and speed regressed. The PR proposed no merge. | `archive/pr-335:evaluation/experiments/unit-normalization/README.md` |
| [#344](https://github.com/unglish/word-generator/pull/344) | Q13b | Shared constructions such as /ks/→x should keep joint ownership of both phones. | Infeasible-budget words rose 7,910→8,006, and median throughput fell 16.2%. No promotion recommended. | `archive/pr-344:evaluation/experiments/aligned-shared-graphemes/RESULTS.md` |
| [#345](https://github.com/unglish/word-generator/pull/345) | Q14a | Split-vowel spellings (`a…e`) should be completed atomically, with marker ownership surviving repairs. | Infeasible-budget words rose 8,006→8,132, trigram divergence worsened in all four profiles, and median throughput fell 63.4%. The evidence argued against promotion. | `archive/pr-345:evaluation/experiments/split-digraphs/RESULTS.md` |
| [#346](https://github.com/unglish/word-generator/pull/346) | Q14b | Soft c/g spellings should be conditioned on compatible following letters. | The target measure improved, but trigram divergence worsened in all four profiles and median throughput fell 50.8%. No promotion recommended. | `archive/pr-346:evaluation/experiments/following-letter-conditions/RESULTS.md` |
| [#348](https://github.com/unglish/word-generator/pull/348) | Q02 | Final words should record operational cell and phone provenance. | Output parity held, but median throughput fell 13.9% and compressed corpus storage grew about 68%. No adoption recommended. | `archive/pr-348:evaluation/experiments/final-word-ownership/RESULTS.md` |

## Closed with a closed parent

These PRs only made sense on top of an experiment above.

| PR | Depends on | What it did | Results |
|---|---|---|---|
| [#347](https://github.com/unglish/word-generator/pull/347) | #346, #309 | Comparison control composing lexical stress (#309) with the spelling experiments. #309 itself stays open. | `archive/pr-347:evaluation/experiments/spelling-stress-control/CHECKPOINT.md` |
| [#349](https://github.com/unglish/word-generator/pull/349) | #348 | Bounded the trace audit's memory after #348 made traces larger; seeded metrics unchanged. | `archive/pr-349:evaluation/experiments/stream-trace-audit/RESULTS.md` |
| [#366](https://github.com/unglish/word-generator/pull/366) | #348 | Made #348's spelling-history snapshots 26.3% faster to copy. | `archive/pr-366:evaluation/experiments/spelling-history-copy/RESULTS.md` |

### Vowel completion (follow-ups to #345)

Vowel completion code (`src/core/spelling-completion-*.ts`) exists only in #345,
so these follow-ups closed with it.

| PR | What it did | Measured outcome | Results |
|---|---|---|---|
| [#367](https://github.com/unglish/word-generator/pull/367) | Authenticated each selected completion attempt once instead of twice. | +3.65% median throughput, output unchanged. | `archive/pr-367:evaluation/experiments/completion-verification-once/README.md` |
| [#368](https://github.com/unglish/word-generator/pull/368) | Opt-in positional weights so `ai` can complete initial /eɪ/. | Median throughput −4.98%; two quality gates failed. | `archive/pr-368:evaluation/experiments/completion-vowel-support/README.md` |
| [#370](https://github.com/unglish/word-generator/pull/370) | Allowed completion where an earlier rewrite made a neighbor's ownership opaque but every surviving context is unchanged. | See results. | `archive/pr-370:evaluation/experiments/completion-context-preservation/RESULTS.md` |
| [#371](https://github.com/unglish/word-generator/pull/371) | Completion-only initial `oo` support for /u/. | Unresolved root targets 100→58; zero-unresolved target unmet. | `archive/pr-371:evaluation/experiments/completion-u-support/RESULTS.md` |
| [#372](https://github.com/unglish/word-generator/pull/372) | Derived completion context from recorded written boundaries. | Median throughput −0.47%. | `archive/pr-372:evaluation/experiments/completion-prefix-context/RESULTS.md` |
| [#373](https://github.com/unglish/word-generator/pull/373) | Completion-only `oo` for isolated /u/. | Unresolved obligations 22→2. | `archive/pr-373:evaluation/experiments/completion-isolated-u/RESULTS.md` |
| [#374](https://github.com/unglish/word-generator/pull/374) | Atomic nucleus/consonant respelling when completion would break a neighboring consonant reading. | Median throughput −0.66%; small adverse stress, trigram and diversity changes. | `archive/pr-374:evaluation/experiments/completion-joint-neighbor/results.md` |
