# Candidate implementation checkpoint

The final-vowel contract is implemented on the Q10b2 branch. The original preimplementation registration is retained byte-for-byte in measurement-preimplementation.json. The executable registration adds only protocol-path and active-policy-reference hash bindings; sample counts and endpoints are unchanged. Formal default and active-policy control/candidate captures remain necessary.

LanguageConfig.finalNucleus.checkedVowels stores explicit sound objects. The default policy lists /ɪ ɛ æ ʌ ʊ/, independent of tense metadata. An exposed unalternated root nucleus is repaired after assembly and final stress, before spelling. Eligible positive weights are nucleus × endWord; primary stress bans and an applicable initial-edge exclusion remain enforced. Root views synchronize with the writer. Checked-vowel and stress repairs have separate phone-history changes.

A final affix or derived-root violation raises an explicit configuration error. This guarantees no silently rewritten allomorph, but does not claim every contradictory custom configuration can generate a word. Internal open root vowels and closed checked nuclei remain legal. Surface reduction filters illegal final targets before the probability draw, records a blocked-target event, and asserts the final contract. Pronunciation and final nucleus replay use the same policy.

41 focused tests pass, including a 1,000-word public trace/RNG matrix and public legal/invalid affix fixtures. TypeScript passes. With the policy disabled, 10,000 complete traced public outputs match the fixed Q02 generator, with draw-count and next-probe equality. These are implementation checks, not a completed distribution study or an overall-quality claim.

The capture runner uses the same source/dependency/environment freeze and clean-checkout safeguards as Q02, adapted to two policies and two arms. Default and active policy each retain four profiles, five development seeds and 10,000 words per replicate. A separate fixed-control checkout is pinned to #349. All 400,000 words per arm are still required; existing failures will be retained.
