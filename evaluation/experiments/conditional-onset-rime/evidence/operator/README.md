# Registered conditional onset–rime experiment

This experiment evaluates an offline conditional corpus model. It does not activate new generator weights or establish human judgments of generated words.

The committed preimplementation registration fixes the dictionary revision and byte hash, selection policy, spelling-group split, inferred syllabification, conditioning variables, smoothing grid and evaluation measures. The builder accepts only that registration and the pinned dictionary. It requires committed, unchanged implementation inputs and creates a fresh output exclusively; protected source directories and existing files cannot be overwritten.

Run from the measured checkout, with the pinned dictionary already available:

```sh
node --import tsx evaluation/corpus/conditional-cli.ts --source /absolute/path/cmudict.dict --out /absolute/path/fresh-result.json
```

The source population consists of dictionary types, with one compatible first pronunciation per normalized spelling. It includes names, loans and inflected forms. Neither morphology-family labels nor running-text token frequencies are available. Consequently, disjoint spellings do not guarantee disjoint morphological families.

Initial-onset support is learned from training entries alone. All splits use the same frozen inferred syllabification. Stress retains the native 0/1/2 distinctions; nucleus classes are broad ARPAbet groupings, rather than a universal dialect-specific account of vowel quantity or tenseness. Independent initial and final flags preserve the special context of monosyllables.

Both models share an open-support base distribution over consonant sequences and within-class vowels. The baseline conditions on nucleus class. The candidate additionally conditions on stress and word edges, backing off through stress/class and class. Each row uses `(count + alpha * parentProbability) / (rowTotal + alpha)`. Probabilities are computed in log space without a score floor. Development data choose alpha independently for each model from the registered grid; held-out observations are constructed only after those choices are fixed.

The primary comparison is matched held-out mean negative log likelihood per dictionary word. Reports also retain per-word differences and constituent, stress, edge, class and training-frequency strata. These overlapping strata must not be summed as independent populations. Support diagnostics distinguish probability assigned outside observed support from the mass of the ten most probable **observed** tokens; the latter is not a global top-ten concentration estimate for infinite support.

The output retains the selected source identities, splits, integer count tables, every development-grid result, held-out comparisons, license, implementation sources, commit, Node executable hash and lockfile hash. It authenticates source bytes and checks source/runtime state again before writing. Installed loader binaries need a separate execution seal: the lockfile alone does not attest installed dependencies. Independent reconstruction of selection, segmentation, count tables and likelihoods is required before treating an artifact as accepted evidence.

A better held-out score is evidence of better conditional corpus prediction under this protocol. It is not proof of improved generator output, diversity, pronunciation or human wordlikeness. Any runtime use requires a separate deterministic, trace-backed generator experiment.
