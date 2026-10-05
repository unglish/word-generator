# Q12c: phoneme-aware consonant doubling

Status: exploratory control audit complete; hypothesis registered before runtime edits. No candidate results or quality improvement claim yet. The independent PR will be stacked on exact #335 (`ce3800dd3454feb33cdb32f8be96cf2fc684c4eb`).

The current sampler chooses an exceptional doubled form by the selected spelling alone. Its documented sound-keyed `doubledForms` lookup actually receives the grapheme form. Thus both /k/ spelled c and /s/ spelled c can become ck. Implicit letter repetition also applies to /z/ and /ʃ/ spelled s, without a lexical license for their resulting ss.

Read [the design](design.md), [registered comparison](protocol.json), and [exploratory evidence](exploration/README.md). The audit observes the sampler's root-before-morphology output. It does not infer final-word pronunciation from a repeated-letter regex.
