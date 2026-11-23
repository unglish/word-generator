# Grapheme legality and position

The current pipeline writes the generated base before affix attachment.
Word-edge positions here therefore describe that base; final affixed-word
alignment is handled by a separate follow-up. The one exception is the base's
last grapheme, which sees the planned suffix's spelling as its right letter
context (`notRightGraphemeContext`, below).

The writer filters by hard context, constituent, cluster, and positional
constraints before sampling positive finite weights. An empty set is no longer
replaced with the original candidates. Invalid custom configurations throw a
`No legal grapheme` error identifying the sound, segment, syllable, and failed
stage. Negative and nonfinite inventory weights fail during construction.

`Grapheme.positionScope` says whether `startWord`, `midWord`, and `endWord` refer
to a literal segment or to its containing syllable. A zero weight excludes that
candidate in the selected scope; positive values are relative preferences.
The English consonant inventories use segment scope except `ck`: its large
final weight is a final-rime preference (including /ks/, as in necks). It is
licensed in first-syllable codas as well, with a separate literal-start ban.
The vowel and rhotic inventories retain their existing syllable scope: a final-syllable `igh` in
`night` is not the final segment. They declare `isolatedSyllableWeight`
explicitly. Where an inventory already
contained spellings allowed at both edges, those remain the ordinary isolated
pool. Where no spelling had that intersection (/eɪ/), explicit isolated weights
use the previous maximum-weight formula. This retains established vowel pools
without reviving failed context conditions.
Custom inventories without explicit scope retain syllable scope, but must satisfy both edge bans
unless they declare a separate isolated-syllable weight.

`GraphemeCondition.segmentPosition` enforces literal word edges. The existing
`wordPosition` field retains its historical syllable-level meaning for custom
configurations. English `kn`, `wr`, `wh`, final `mb`, final `k`, final vowel `y`,
and final rhotic `eir` now state literal segment restrictions explicitly.

Fallback-only graphemes have their own full conditions and weights and can be
selected only when no ordinary candidate survives. English declares two narrow
fallbacks: initial or isolated /ʊ/ after /g/ can use `oo`, and a one-syllable
base ending in /i:/ before a vowel-initial suffix can use `ee` (`ea` is the only
ordinary isolated /i:/ spelling, and it may not precede a vowel letter; see
below). These preserve the existing contextual bans. A third fallback, initial
or isolated /ɛ/ before /t/ as `ea`, was retired once ordinary `e` became legal
before /t/ (see [below](#ordinary-e-before-t-312)): every /ɛ/
then has a positive ordinary spelling, so it could no longer fire.
The inventory also permits `n`/`ng` in legal /ŋ/ clusters (think, length) and
final /dʒ/→`ge` after tense vowels (age), removing contradictory exclusions that
previously depended on implicit restoration.

## Ordinary `e` before /t/ (#312)

/ɛ/ → `e` is legal before /t/, within a syllable (*pet*) and across a syllable
boundary (*letter*). It used to be banned there, so every such /ɛ/ was written `ea`.
`ea` stays available with unchanged weights: English has both *wet* and *sweat*,
and no corpus ratio between them is claimed.

The `magic-e` spelling rule turns a split vowel digraph into vowel + consonant + e
(*tiem* → *time*). It checks which phonemes own the letters it matches, through the
rule's `letterRoles` (see [Spelling rule letter roles](#spelling-rule-letter-roles)),
so a consonantal `y` is not read as a vowel (*yet* stays *yet*, not *yte*).

Evidence (measurements against main, quality comparison, calibration, the
original probe) is kept at tag `archive/pr-312`:

```sh
git fetch origin tag archive/pr-312
git show archive/pr-312:evaluation/quality/experiments/ordinary-et-rebased/README.md
```

## Spelling rule letter roles

A spelling rule with `scope: "syllable"` may declare `letterRoles`: for each listed
capture group, the syllable segment (`onset`, `nucleus` or `coda`) whose phonemes
must own every letter of that group. Ownership comes from the base-spelling
alignment (`BaseSpelling.segmentAt`). The capture groups must spell the whole match.
A match whose letters have the wrong roles is left unchanged and draws no
probability roll. English `magic-e` matches `([aiouy])(e)(C)$` and requires nucleus,
nucleus, coda. A role may also list `sounds`: the owning phonemes must then be one
of those (`BaseSpelling.soundAt`). Since #470 `magic-e` splits only /aɪ eɪ u əʊ ɑ/
nuclei. /i:/ `ie` stays whole, since a split read /aɪ/ (`vutice` → `vutiek`, as in
*shriek*; `urlifeful` → `urliefful`, as in *chief*).

## `ea` context (#381)

English does not write `ea` before a doubled consonant (*head*, not *headd*) or
before another vowel letter. Two configured rules enforce this:

- `GraphemeCondition.notRightGraphemeContext` bans listed letters directly after
  the grapheme. It is checked only where that letter is fixed when the grapheme
  is chosen: at the end of a base, the first letter of its planned suffix. Every
  ordinary `ea` uses the English alias `notBeforeVowelLetter` (`a e i o u`).
- `doubling.neverDoubleAfter: ["ea"]` vetoes doubling of a consonant written
  directly after an `ea` nucleus (trace reason `never-double-after`; like the
  other doubling skips, no roll is drawn). It also drops directly chosen doubled spellings (`ck`, `ssi`)
  there while another candidate remains; the trace records
  `preferenceRelaxed: "never-double-after"` if none does.

Measurements and side effects are kept at tag `archive/evidence-pre-cleanup`
(see [Evidence](#evidence)).

## Word-final /s/ after r, n, l (#389)

A word ending in a bare `s` after `r`, `n` or `l` reads as an inflection
(*cars*, *pens*, *bells*). English writes a final /s/ there with an `e`:
*dance*, *sense*, *false*, *horse*, *force*, *nurse*. In `fricatives.ts`:

- `GraphemeCondition.wordFinal` is `true` when the grapheme spells the base's
  last segment and no suffix follows, and `false` otherwise.
- Bare `s` has three entries split by the letter before it. After `r`, `n` or
  `l`, a word-final `s` has weight 10; everywhere else it keeps 1000.
- Word-final /s/ after /n l r ɚ/, written with `r`, `n` or `l`, can be `ce` or
  `se`, conditioned on the phoneme: `n` → `ce` 300, `se` 100; `l` → `se` 400;
  `r`/`ɚ` → `se` 300, `ce` 100. Unlike the general `ce`, these are legal in a
  coda cluster (/ns/, /ls/, /rs/).

A root-final /s/ followed by a suffix keeps the ordinary weights, and the
suffix's own `s` is unaffected. Roots ending in `e` do not yet join every suffix
cleanly (plural `-es` keeps the `e`: *spece* + *es* → *specees*), so the
preference is limited to unsuffixed roots.

Magic-e does not add its `e` marker when the coda spelling already ends in `e`
(`ce`, `se`, `ge`): *pace*, not *pacee*. It still swaps the vowel spelling
(`igh` + `ce` → `ice`).

Trace `selection` records actual segment and syllable positions, stage counts,
the fallback reason, and any relaxation of the soft consonant-doubling quota.
All traced weights, including singleton pools, are actual configured weights.
Tracing consumes no random draws. A missing `selection` record in an old trace
means the new diagnostics are unobserved, not zero.

This enforces selection legality. Later string repairs and spelling/pronunciation
alignment remain separate quality questions.

## The /gz/ and /ks/ routes

Before legal selection, /gz/ before a vowel reached the `gz-to-x` rule only
through an illegal zero-weight `ze` (`mexeocowt`, with a stray `e`). Legal
selection writes that medial /z/ as `s`, which the rule does not match.
Medial coda /z/ after /g/ is therefore written `z` (`fricatives.ts`), so
`gz-to-x` writes `x` as in *exact* and *exist*. Widening the rule to `gs` was
rejected because letters cannot separate /gz/ from /gs/. A cluster-level
/gz/→`x` spelling with segment ownership remains possible future work.

Final-rime /k/→`ck` keeps its syllable-scoped preference (`itipacrex`). But /k/
before a word-final /s/ is a medial segment, so `c` competes at its mid-word
weight and fewer `k`/`ck` spellings reach `ks-to-x`: word-final /ks/ is written
`x` less often than before legal selection. Since #469 the hard-`c` rule
respells a final `cs` as `ks` or `cks` before word rules run, so `ks-to-x`
reaches it again (see [below](#root-final-k-469)). `ks-to-x` applies only after
a vowel letter, a vowel + `c`, or `n` (*box*, *nex*, *jinx*): after another
consonant English keeps `ks` (*desks*, *milks*), not `sx` or `rx`.
Other rules still write `x` after a consonant, as on main: `cst-to-xt` from
`rcst`/`lcst` (`gerxt`) and `gz-to-x` (`infurxority`). That is a separate
follow-up.

The `c` spelling also left /kst/ as `cst` (`twecst`, `hucstanitilid`), which
neither `ks-to-x` nor `cx-to-x` matches. English almost never writes `cst` (5 of
635k CMU trigrams) and writes /kst/ as `xt` (*next*, *text*). `cst-to-xt`
rewrites `cs` before `t` as `x` in every bare word. Word rules run on the root
before a suffix is attached, so a root ending in `cs` before a `t`-initial
suffix (`snocs` + `tion`) is not rewritten.

## /eɪ/ `ay`/`ey` open-syllable only (#459)

English writes /eɪ/ as `ay`/`ey` almost only at word end (*they*, *grey*,
*play*) or before a suffix (*plays*, *greyness*). Both spellings now carry
`syllableShape: { coda: "empty" }`, so a same-syllable coda blocks them —
including a root coda of exactly /s/ or /z/, which can look plural-like but is
still root-internal. An open root-final syllable before a suffix keeps
`ay`/`ey`. Closed finals use `ai` (`endWord` now positive) and a
closed-final `ae` entry limited to a one-consonant coda, which the magic-e
rule splits (`pae`+`n` → `pane`). A bare `a` there would read /æ/
(`bepan`), and magic-e cannot split a cluster, so clusters take `ai`
(`paint`). `syllableShape.onset`/`coda` accept a segment count (`1`) or
`{ min, max }` range for this, like `nucleusLength`. Isolated
monosyllable `ay`/`ey` weights stay 0; monosyllables get `ay` from open `ai`
through the no-final-i rule (`flai` → `flay`).

Four syllable rules around magic-e finish closed `ae`. Before it, a hard `c`
becomes `k` (`batace` → `batake`) and `aeg` becomes `ague` (`bovages` →
`bovagues`), since magic-e would put an `e` after the `c` or `g` and soften
it. After it, before one consonant already spelled with a final `e` (`ge`,
`ce`, `gue`) or before `nge`, `ae` drops its own `e`, since the coda's `e` marks
the vowel (`ataege` → `atage`, `snaenge` → `snange`). Other clusters would not
read /eɪ/ (`faelse` would become *false*), so they fall through. Any closed `ae`
still unsplit then becomes `ai`: magic-e cannot cross a digraph coda (`fubaech`
→ `fubaich`) or one ending in a vowel letter (`ezaessier` → `ezaissier`), and
misses 5% of the time (`bepaen` → `bepain`).

## /ɚ/ `re` only in an open final syllable (#471)

English writes /ɚ/ as `re` only at the end of a word (*centre*, *acre*,
*ogre*), and keeps it before a suffix (*acres*, *centred*). Inside a closed
syllable the letters read /rɛ/ (`kalmrel`, `packirzrem`). `re` now carries
`syllableShape: { coda: "empty" }` and `midWord: 0`, so only an open final
syllable can choose it; its `endWord` and the `notLeftContext: ["l", "r"]` ban
are unchanged. Other /ɚ/ spellings take its share in proportion to their
weights.

## /aɪ/ `ie` needs an onset (#472)

No English word starts with `ie`; English writes /aɪ/ as `ie` after a consonant
(*pie*, *tried*). An onsetless `ie` started words with it (`iesitur`, `iekay`)
or left a hiatus after a prefix (`iniesewnly`). `ie` now requires
`syllableShape: { onset: "nonEmpty" }`, so an onsetless /aɪ/ takes `i` (*idle*,
*iron*) or `eye`. /aɪ/ → `is` now requires an onsetless /aɪ/ before /l/ (*isle*,
*island*). Without that, much of the old onsetless `ie` share went to `is`
(`israke`), and after an onset `is` reads /ɪs/ (`lisltig`). `eye` has
`startWord: 1` (was 2), so it moves back toward English's rate (CMU about
6.6%): 9.4% of word-initial onsetless /aɪ/. At 2 it rose from 6.8% to 14.8%
(`eyetornful`).

The trade-off: before a single coda consonant, an onsetless `ie` used to give
*ice*-type `i_e` through magic-e. Those words now read as a short `i`: on seed
2002174 the rejected variant described next wrote `imeenory` where #472 writes
`imenory` (before #472 the seed gave `eamersory`). Keeping a separate onsetless
`ie` for that case was measured and rejected. About 25 of its 43 root-initial
uses put magic-e's `e` before a vowel letter (`iseiloo`, `ileoshize`), and
removing it scored better on the CMU letter-trigram model.

## /ɔɪ/ `oy` open-syllable only; /aʊ/ `ou` before /t/ (#473)

As for `ay`/`ey` (#459), English writes /ɔɪ/ as `oy` at word end or before a
vowel or suffix (*boy*, *royal*, *toys*, *enjoyed*) and as `oi` before a coda
(*point*, *moist*). `oy` now carries `syllableShape: { coda: "empty" }`, so a
closed /ɔɪ/ is written `oi` (`laroynt` → `laroint`). An open root-final /ɔɪ/
before a suffix keeps `oy`. A root-final `oi` before a suffix is not always
rewritten to `oy` (`frois`, `heltwois`).

English writes /aʊ/ before /t/ as `ou` (*out*, *doubt*, *shout*); CMU has
574 `out` letter trigrams to 20 `owt`. `ow` now has `notRightContext: ["t"]`
(`razowtity` → `razoutity`) and stays before /n l d z/ and vowels (*town*,
*owl*, *crowd*, *tower*). /p/ and /m/ are left alone: there `ou` reads /u:/
(*soup*, *group*) and made `-oum` endings common, and /aʊ/ before them is rare
in English anyway.

## Triple letters, `quu`, and mid-word `gn` (#474)

- **Triple letters at a suffix join.** A root ending in a double consonant
  before a suffix starting with the same letter wrote three letters
  (`melillly` = `ll` + `-ly`, `yaffful`, `ownosssion`). The consonant-initial
  suffixes (`-tion`, `-sion`, `-ly`, `-ness`, `-ment`, `-ful`, `-less`) now add
  a `collapse-triple-letter` boundary transform after `y-to-i`. It drops one
  letter of a root-final double of the suffix's first letter, as English does
  (*full* + *-ly* → *fully*). `-s` does not need it: a root ending in /s/ takes
  the `-es` allomorph. Vowel triples (`ploo` + `-ous` → `plooous`, `pre` +
  `eems`) are left alone: there the letters spell two vowels, so dropping one
  would change the reading.
- **`quu`.** `cw-to-qu` wrote `quu` before a `u` that spells the vowel
  (`squuce`, `dilquung`). `cw-before-u-to-kw` now runs first and writes that
  /kw/ as `kw` (`skwuce`, `dilkwung`), and `cw-to-qu` skips `cw` before `u`.
- **Mid-word `gn`.** /n/ → `gn` had `midWord: 1` (`amgny`, `vadgnidal`). English
  writes `gn` for /n/ only at a word edge (*gnome*, *sign*), apart from derived
  forms (*signer*), so `midWord` is now 0. Removing the candidate leaves many
  medial /n/ pools with a single spelling, which draws no random number. The
  later draws of that word shift, so about 17% of seeded words come out
  different (about 3,300 of 20k).

## Hard `c` before e, i and y (#460)

`c` for /k/ reads /s/ before the letters e, i and y. Selection blocks /k/ → `c`
before front-vowel *sounds* (`c-soft-vowel`), but it cannot see the letters
that follow: a schwa written `e` or `i` (`ececoontion`), /j/ → `y`
(`facyorck`), the `e` that magic-e or silent-e adds (`brice`), or an e/i/y-initial
suffix (`winwocive`). Vowel-suffix boundary transforms spell final hard `c`
as `ck` in the cases described below.

`writtenFormConstraints.hardLetters` declares such letters. The English
`hard-c` rule runs once the root is written (after syllable rules, magic-e and
silent-e, before word rules) and checks every `c` that the base-spelling
alignment traces to /k/ (`BaseSpelling.letterSource`). It looks at the root as
the planned affixes will attach it (`attachRootWritten`, the same step
`writeMorphology` runs): a silent e that the suffix's `drop-silent-e`
transform removes is not "the next letter" (`edice` + `al` keeps `edical`, as
*medical*), and a /k/ that an affix rule re-sounds is left to that rule
(`-ity` velar softening: `chace` + `ity` → `chacity`, with /s/). When the next letter, or the suffix's first letter, is e, i or y,
the `c` becomes:

- `ck` after a single vowel letter spelling a short vowel (/ɪ ɛ æ ʌ ɑ ɔ ʊ ə/;
  a vowel letter of the previous syllable does not make a digraph: *maniac*),
  if the root has no other doubled consonant (`doubling.maxPerWord`):
  `unoreckifeen`, `brockest`, `panic` + `ing` → `panicking`;
- `k` elsewhere: after a consonant (`satkiprenal`, `sk` for `sc`), a vowel
  digraph or a long vowel (`vutike`, `kitomiddinikes`).

A `c` for /s/ before e/i/y (*cell*, *acid*) is untouched. The respell draws no
random numbers. It is recorded as a `hardLetter:hard-c` base-spelling edit and
repair (with the reason and next letter in `detail`), and on the /k/ grapheme
selection as `letterRespelled`.

## Root-final /k/ (#469)

The default /k/ → `c` entry has `endWord: 10` and plain final `k` only
`endWord: 2`, so a root-final /k/ after a consonant or a long vowel was written
`c` (`molstisc`, `ceglerlc`, `isheec`), and before a final /s/, where /k/ is a
medial segment, `cs` (`urcs`, `wascs`). English ends a word in `c` almost only in
*-ic* and *-ac*. Grapheme conditions see phonemes, not the letters that decide
this (`ur` for lax /ɚ/, vowel digraphs, silent-e), so the `hard-c` rule's
`rootFinal` option decides from the written root instead.

A `c` for /k/ that ends the root, alone or before a root-final `s` or `se`, is
respelled unless it follows a short single `i` or `a` (*panic*, *maniacs*):

- `k` after a consonant (`sk`, `lk`, `rk`), a vowel digraph (`isheek`,
  `yezook`, and `ow`/`aw` for /aʊ ɔ/ in `larowk`), or a long single vowel
  (`iniftok`);
- `ck` after another short single vowel letter (`odortheck`, `inscock`), within
  the doubling limit.

`ks-to-x` may then write a final /ks/ as `x` (`sotoniloux`). A bare root-final
`c` stays before a suffix that starts with `t`, `a`, `o` or `u` (*action*,
*medical*, *raucous*); a root-final `cs` or `cse` is respelled there too
(`nadocksal`, `alksous`). Before other consonant suffixes a bare final `c` is
respelled (`boskly`, as *briskly*). With `onlyAfterShortVowel`, a `ck` selected after
anything but a short single vowel letter becomes `k` (`caferck` → `caferk`,
`bavrarcks` → `bavrarks`): `ck` after `er`/`ur`/`or` came from the lax /ɚ/.
These respells are recorded like the soft-letter ones, with reason
`root-final` or `not-after-short-vowel`.

## Long vowels as one letter read long (#470)

A single vowel letter spells a long vowel only where an English reader gives it
that value: in an open syllable (*ti-ger*, *ba-con*), or before a few codas
(*kind*, *wild*, *pint*). Before any other coda it reads short: `liskicky`
/laɪz/ read `lis-`, `kalmrel` /keɪl/ read `kal-`, `celstorn` /si:lz/ read
`cels-`, in every syllable, not only the last.

The bare letters /aɪ/ `i`, /eɪ/ `a`, /i:/ `e` and /u/ `u` now carry an
`openReading` condition. It holds in three cases:

- the syllable has no coda;
- the coda is one listed for that letter;
- the coda is one consonant and a vowel follows it, so a reader moves the
  consonant across (`edatraps`, *ti-ger*).

The writer knows the following vowel when it selects the nucleus: either the
next syllable has no onset, or the root's suffix spelling starts with a vowel
letter. The suffix's consonant doubling does not fire after a long vowel
(#513), so the consonant stays single and the vowel still reads long
(`skiping` /ˈskaɪp.ɪŋ/, not `skipping`). One-consonant codas spelled as digraphs
(/ŋ ʃ tʃ θ ð/) stay in the syllable (*singer*, *bishop*), so they do not count.

| Letter | Listed codas (any syllable) | English |
|---|---|---|
| /aɪ/ `i` | nd, ld, nt; /ŋ/ (+s/z) | *kind*, *wild*, *pint* |
| /eɪ/ `a` | /dʒ/, /ndʒ/ | *age*, *change*, *angel* |
| /u/ `u` | /dʒ/ | *huge* |
| /i:/ `e` | none | |

After a long vowel, /dʒ/ is spelled `ge`, and that `e` is the split marker.
English has no spelling for /aɪŋ/ (#463), and `ie` would become `iing` through
`eng-to-ing`, so `i` stays there.

Elsewhere, closed syllables take a long spelling from the existing inventory,
limited to where it reads long:

- /aɪ/:
  - `ie` after an onset (#472) and before one coda consonant that is not a
    digraph, where magic-e splits it (`lisekicky`, *time*);
  - final `igh` before /t/ (*night*).

  Before a cluster, `ie` would read /i:/ (*field*; `fiechloties`). Closed `ai`
  and `is` read /eɪ/ and /ɪz/, so both are open-only. No English spelling
  reads /aɪ/ before most other clusters, before a digraph coda or /g/ (where
  `ige` would read /dʒ/), or in an onsetless closed syllable, so a
  `fallbackOnly` bare `i` covers those cases (`fichlaties`, `pigvanting`). The trace marks it `selection.fallback`.
- /eɪ/: `ae`, which magic-e splits (`kalemorl`) or the #459 `ae` rules finish
  as `a`/`ai` (`mainsboless`).
- /i:/: `ea` and `ee`. A closed first-syllable `ee` entry after an onset joins
  `ea` (*needle*, *freedom*; `ceelstorn`). `ei` is open-only, because closed
  `ei` reads /eɪ/ or /aɪ/ (*rein*, *heist*; `heintanstommed`). Closed `ie` is
  kept to the codas English gives it: a cluster (*field*, *priest*) or one
  /f v k dʒ/ (*chief*, *believe*, *shriek*, *siege*). Before other single
  codas an unsplit `ie` reads with an extra syllable (`edien`, as in *alien*;
  `fatmiet`, as in *diet*; word-final `-ier` and `-ies` read as in *copier*,
  *studies* or *flies*), so `ee`/`ea` take them.
- /u/:
  - `ue`, now also in first syllables, where magic-e splits it before one
    non-digraph consonant (*rude*, *duke*, *use*);
  - `ew`, after an onset and before one alveolar (*newt*, *lewd*);
  - a closed first-syllable `oo` entry after an onset, except before /k/ and
    /r/ (*booster*; not *book*, *door*).

  Where none of these is legal, a `fallbackOnly` bare `u` covers it. That is
  mostly an onsetless closed first syllable before a cluster or one held
  consonant or /g/, and sometimes a syllable after an onset before a /k/- or
  /r/-initial cluster (`suctuzenely`, `unfurnpy`). After /g/, the fallback
  is `oo`.

Spelling rules finish the job:

- `ie-ue-hard-c-to-k` spells a /k/ `c` after a closed `ie`/`ue` as `k` before
  magic-e, so the split gives *bike*, *duke*, not `bices` or `mucetuns`, which
  read /s/. /i:/ `ie` keeps its digraph, so it becomes `iek` (/i:k/, *shriek*). Closed `ie`/`ue` are not chosen before /g/, where the split would
  read /dʒ/ (`pigevanting`).
- `magic-e-ie-ue` splits a closed /aɪ/ `ie` or /u/ `ue` that magic-e's 5% miss
  left unsplit. Unsplit, these read /i:/ or /ju/ (`cieftow`, as in *chief*).
  `ie-ue-before-e-coda` drops the digraph's `e` before a coda spelled with a
  final `e` (`fliece` → `flice`). Both use `letterRoles.sounds`, so /i:/ `ie`
  (*field*, *chief*) is not touched. /k/ `lk` and /b/ `pb` are not used after an
  `e`-final vowel, since magic-e cannot cross them (`wielkar`). A few
  two-letter codas still block the split (`ch`, `gh`, `mn`, `lm`, `gn`; about
  8 per 100k words).
- Silent-e has a `codaLimit` for these four vowels. It swaps a digraph for a
  split vowel (`oo` → `u_e`) only across one consonant that is not held, plus
  /eɪ/ + /n dʒ/ or /s t/ (*change*, *paste*). Across a cluster or a digraph
  consonant the split reads short (`snunde`, `bakadse`), so the digraph stays
  (`snoond`, `bakaids`).
  The swap's random draw is still taken.

/əʊ/ `o` is unchanged (*most*, *folk*, *control*).

## /ɑ/ `au` in final syllables

Plain `au` for /ɑ/ had `endWord: 0`, so a final syllable could only choose the
split spelling `aue` (*cause*, *sauce*). Before a coda cluster, `aue`
exceeds the vowel-letter cap and the repair deletes its `e`. That deletion was
the only way `au` reached a final syllable (`snaunt`, `straurf`), although
English writes it there often (*haunt*, *vault*, *launch*). `au` is now legal in
final syllables (weight 10, as mid-word) with `wordFinal: false`, so it never
ends a word (*tau*).

The common-word rewrite fixtures now start from legal ordinary spellings.
They previously forced an `mc`-conditioned `c` into *could*, excluded first-syllable
`ee` into *people*, and excluded isolated `ee`/`ou` spellings into other examples;
the old empty-set restoration masked those invalid setups. Their final lexical
rewrite expectations are unchanged. Tests that expected hard-ban restoration
and treated a monosyllable's coda as word-initial have been replaced with
trace-based checks of the intended positional contract.

## Final e before suffixes (#506)

The silent-e rule for `-es`, `-ist`, `-ism`, `-ian`, and `-ial` requires a
closed root whose spelling ends in a consonant followed by e. The transform
checks the written suffix after allomorph selection, so *face* + *es* becomes
*faces* and *cake* + *s* becomes *cakes*. The spelling-only y→i override still
produces *cries* with the nonsyllabic /z/ allomorph.

Suffixes with an existing final-e deletion keep their spelling-only rule,
including the shared e in *free* + *ed* → *freed*. That deletion still blocks
consonant doubling.

## Consonant doubling before vowel suffixes (#513)

The `double-consonant` boundary transform on `-ing`, `-ed`, `-er`, `-est` and
`-able` used to look only at letters. It doubled every root that ended in a
consonant, one vowel letter and one consonant, whatever the stress or the
vowel: `letterred`, `bratratted`, and `batted` for /beɪt/. English doubles only
when the root's final syllable is stressed and its vowel reads short:
*commit* → *committed*, but *visit* → *visited* and *letter* → *lettered*.

`BoundaryTransform.boundarySyllable` is a list of phonological conditions
(stress levels, a nucleus selector, and a final coda phoneme selector).
The transform fires only if the root syllable at the join meets at least
one of them: the root's final syllable for
a suffix, its first for a prefix. `attachRootWritten` passes that syllable from
the lexical root being spelled. English doubles in these cases:

- **Primary stress** (monosyllabic roots included) on a full short vowel
  /ɪ ɛ æ ʌ ʊ ɑ ɔ ɜ/, or on /ɚ/: `stopping`, `fratter`, *occurred*,
  `naturred` /næˈtʰɚd/.
- **Secondary stress** on a full short vowel, as in *kidnapped*,
  *handicapped* and *zigzagged*: `pirtwigger` /ˈpʰɪrˌtʰwɪg.ɚ/. The English
  stress policy reserves secondary stress for full vowels.

The letter and sound also matter (#518). A final `s` doubles when it spells
/s/ (*bus* → *bussed*). When `s` spells /z/, it stays single. Final `h` stays
single. Final `c` spelling /k/ takes `ck` under the same stress and vowel
conditions. Final `-ic` spelling /ɪk/ also takes `ck` before e- and i-initial
suffixes in this group, even when unstressed (*picnic* → *picnicked*).

- Ordinary consonant doubling requires stress. This is the American rule
  (*worshiped*, *traveled*). British spelling doubles `l` (*travelled*).
- A long vowel or diphthong keeps its one letter reading long (`bated`
  /ˈbeɪt.əd/, `skiping`), which matches the open-reading rule above.
- Schwa never doubles (*galloped*).

These boundary transforms draw no random numbers, and no other transform is
blocked by `double-consonant`. English favors secondary stress on full short
root-final vowels, so a retained vowel can trigger doubling before a suffix.
Surface vowel reduction runs after spelling and can reduce an unstressed vowel
at the root edge, including before a syllabic suffix.

## Evidence

Measurements for legal grapheme selection (the original frozen comparison, the
rebased comparison against main after #309), the preregistered selection probe,
and the `ea` context change (#381) are kept at tag `archive/evidence-pre-cleanup`:

```sh
git fetch origin tag archive/evidence-pre-cleanup
git show archive/evidence-pre-cleanup:evaluation/experiments/legal-grapheme-selection/comparison.md
git show archive/evidence-pre-cleanup:evaluation/quality/experiments/legal-grapheme-selection-rebased/README.md
git show archive/evidence-pre-cleanup:evaluation/quality/probes/grapheme-selection/README.md
git show archive/evidence-pre-cleanup:evaluation/quality/experiments/ea-spelling-381/README.md
```
