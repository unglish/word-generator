# Q10b2: final checked-vowel contract — investigation

Control: trace-audit PR #349 at `4a5defa56c7649145bfa9c953e698dc57a2d0acd`. Generator source is byte-identical to measured Q02 snapshot `7e34a17f31d44d1e31420f458bf6e2d99c5fa038`; source-audit.json hashes every source file. Existing Q02 archived active-policy development samples are exploratory evidence, not a prospective Q10b2 candidate study.

## Requirement

Preserve a configured final lexical and surface vowel contract through morphological assembly, final stress repair, and pronunciation, with replayable root/affix ownership. The existing diagnostic set is /ɪ ɛ æ ʌ ʊ/; it excludes schwa, rhotic vowels and the low back vowels. Keep the old diagnostic unchanged for comparisons, and report stress and source ownership separately. Do not infer the class from `Phoneme.tense`: FOOT is currently marked tense, and schwa/rhotic vowels are marked lax.

## Linguistic scope

Duncan (2016), “Tense” /æ/ is still lax: A phonotactics study, https://journals.linguisticsociety.org/proceedings/index.php/amphonology/article/download/3653/3370/0 , distinguishes phonologically active classes from phonetic tenseness. Section 2.2 and its low-back-vowel footnotes motivate a declared dialect/model policy rather than a universal ban inferred from acoustic labels. This reference does not establish the correctness of this generator's transcription or every unstressed ending. Any default restriction must be described as this model's policy, with explicit custom-configuration behavior and no claim that all real English variants follow it.

## Current execution boundaries

1. `runPipeline` performs root generation, coda repairs and root stress repair.
2. `prepareMorphology` assembles phones, resolves attachments and assigns final stress; `FinalPhones` preserves source identities.
3. `repairFinalNuclei` repairs primary-stress bans, updates root views, and records draw tapes plus phone changes. It currently does not restrict open checked endings.
4. Root spelling precedes deferred morphology spelling.
5. `generatePronunciation` applies configured vowel reductions and records phone realization changes. It does not currently enforce a final vowel contract.
6. Final phone and spelling snapshots are produced, with operational source/assembly replay.

A repair performed after spelling would risk stale spelling or affix licensing. A repair applied only in root selection would miss assembled endings and later replacement/reduction. A root-origin phone may also have a derived morphophonemic value; root ownership alone is insufficient permission to overwrite the base lexical source. Preserve explicit root versus derived realization distinctions.

## Investigation and acceptance work

The immutable 200,000-word Q02 archive is being classified by final sound, final stress, morphological template, initial source identity, pre-final-repair status and lexical-root status. Store complete bounded witnesses and archive hashes. Inspect transition evidence before choosing repair placement and weighting.

Implement structured configurable restrictions and validate impossible custom cases explicitly. Preserve legal codas and already legal endpoints. Any sampled repair must use eligible positive weights, consume deterministic draws and replay through the existing final-phone provenance. Affix source values and writer representations must remain coherent; do not silently alter resolved allomorphs. Surface reductions must respect the same final contract. A final assertion is evidence only when earlier generation/realization provides a legal path, not a substitute for that path.

Before candidate generation, register the fixed control, source freeze, policy, unchanged four profiles × five seeds × 10,000 words, target denominators, common quality metrics and required repository gates. Independent archive-only checks must reconstruct final legality and source binding. Include stage-specific counts, conditional parity on unaffected paths, trace-on/off and RNG checks, custom morphological/reduction fixtures, all timing/quality failures, and complete default trace/trigram diagnostics. Inherited failures are retained. No threshold, count, timeout or heap allowance changes.

Q10b1 (#324) supplies root nucleus/coda pair compatibility on another dependency branch. A merge preview exposes conflicts in generation, writing and public exports. Do not treat a conflict-free resolution or final checked-vowel fix as proof of that separate root contract. If integration is required, publish and freeze the dependency control before candidate measurement; otherwise state the distinct scope explicitly.

## Completed exploratory baseline

All 200,000 archived records were processed. Open checked endings: lexicon-default 882/50,000; lexicon-bare 1,347/50,000; monosyllables-bare 240/50,000; text-default 1,152/50,000. The 20 shard hashes and lengths match the sealed archive; the four rates agree exactly with its quality summaries. All 3,621 final nuclei have root segment ownership and a checked ending already exists before final nucleus repair. Their final stress categories are 1,682 primary, 494 secondary and 1,445 unstressed. Among affected outputs, 3,256 already have a checked ending after initial syllable generation; 365 additional affected outputs are checked after root stress repair. These are conditional counts among final affected outputs, not rates over all stage opportunities and not proof that no other transient failures occurred.

There are 39 bounded complete witnesses. A pre-final sound may change to another checked sound; a family-level status match does not imply vowel identity parity. Witnesses therefore retain full records and source coordinates rather than claiming identical pre/post phone values. No affix-owned final failure is observed in this archive, but custom affix and derived-root tests remain required.

`measurement.json` fixes the next control, two policies, sample counts and acceptance endpoints before candidate implementation. Q10b2 is still unpublished and unproved. The existing five-sound diagnostic remains unchanged.
