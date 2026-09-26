# Q09a verifier key-order correction

The initial observer fingerprint was `9e13848bab6effd004e40c1ffc9e174956d4bb6128b4be374f4616ba5d0062c6`, declared before the formal capture. Runtime source remains `9a9a352580489152e7cd10d4429b21e94c29b175cc8f37dfbbda8a9a3ab249dc` at `564dc5727bb28d0f421f73092b9bfb05ea9c9938`.

Before any formal observer analysis, a bounded integration check used the pinned control manifest's effective config with live public-API seed 1 (`afinging`). `validateConfiguration` rejected its equal affix form because `JSON.stringify` preserved different object-key order in the canonical archived config versus the live planned syllables. The default-config fixtures had both values in the same construction order, so did not expose this mismatch.

The approved correction replaces only the syllable-array JSON string equality with Node's property-order-independent structural equality. A fixture supplies canonical serialized config and requires the existing generated values to validate. Runtime, RNG, gate/weight settings, metric definitions, denominators, strata, schedule, witness selection and acceptance criteria remain unchanged. The old frozen source snapshot remains preserved; corrected observer bytes receive a newly declared fingerprint before formal observer counts are computed. The completed raw generator capture is unaffected.

Corrected observer fingerprint: `40c7068d486e04533cc3fd700e41debb5852223d0d05ee18f75c5d3bf98c1dba`. Correction/freeze timestamp: `2026-09-26T19:20:35.718Z`. The old and corrected source bundles are retained beside this record. The only changed closure file is `evaluation/quality/probes/stress-pattern-observer/validate.ts`; 34 focused probe fixtures and strict TypeScript/lint passed before formal observer analysis started.
