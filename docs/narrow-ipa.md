# Narrow IPA export (Chimera interop)

Unglish’s default inventory uses **legacy broad / mixed** English glyphs
(`r`, `əʊ`, `ɜ`, `i:`). Chimera’s IPA tokenizer follows the **IPA chart**:
`r` is a trill, `ɜ` is not a calibrated English vowel target, and `əʊ` is not
a diphthong expand. Vocal Speak therefore needs a small **export projection**
before `tokenizeIpa` — without migrating the generator or rewriting review UIs.

This is an **interop lens**, not a new dialect of generation and **not** an
identity resolution. Scoring, CMU bridges, and
[`phoneme-identity.md`](./phoneme-identity.md) stay on broad legacy glyphs.

## Public API

```ts
import {
  generateWord,
  toNarrowPronunciation,
  toNarrowIpa,
  toNarrowPhones,
  phonesFromWord,
  narrowIpaProfile,
} from "@unglish/word-generator";

const word = generateWord({ seed: 42 });
// Preferred when syllables exist (Speak path):
const speakIpa = toNarrowPronunciation(word);
// Orphan strings / docs:
const also = toNarrowIpa(word.pronunciation);
```

| Surface | Default | Narrow? |
| --- | --- | --- |
| Generator inventory / `Word.pronunciation` | broad | unchanged |
| Human-facing IPA on vocal.html | broad | unchanged in v1 |
| Chimera Speak | must narrow | `toNarrowPronunciation` / `toNarrowIpa` |
| Identity / CMU scoring | broad | **no** auto narrow |

## Profile `chimera-english-v1`

| Broad (Unglish) | Narrow | Notes |
| --- | --- | --- |
| `r` | `ɹ` | Chart `r` is trill; English rhotic is approximant |
| `əʊ` | `oʊ` | Else tokenizes as `ə`+`ʊ` |
| `ɜ` | `ɝ` | **Speakability only** — does **not** resolve `ɜ` for identity/scoring |
| `ɚ` | `ɚ` | Pass-through (Chimera expands to `ɝ`) |
| `i:` / `iː` | `i` | Default `stripFleeceLength: true` |
| `ɡ` | `g` | Notation alias |
| coda `l` | `ɫ` | Only if `darkL: true` **and** phone slots known |
| everything else | unchanged | stress `ˈ ˌ`, `.`, `ʰ`, unknown symbols |

Defaults: `stripFleeceLength: true`, `darkL: false`. Unknown symbols are left
unchanged (never deleted). Already-narrow input (`ɹ`, `oʊ`, `ɝ`, `ɫ`) is
idempotent.

## Contract with phoneme identity

[`phoneme-identity.md`](./phoneme-identity.md) forbids silent `r→ɹ` / `əʊ→oʊ`
inside `observeWordIdentity`. Narrow mode must **not** be folded into that
observer. `ɜ→ɝ` here is an interop choice for Chimera Speak; the legacy `ɜ`
identity remains explicitly ambiguous for scoring.

Do **not**:

- replace inventory `r` with `ɹ` in `phonemes.ts` as a “quick fix”
- patch Chimera so chart `r` means English approximant
- remap inside vendored `demo/vocal/chimera/ui/speech.ts`
- change goldens / CMU baselines because Speak narrowed
- claim narrow output resolves `ɜ` for identity

## Implementation

| Piece | Path |
| --- | --- |
| Module | `src/phonology/narrow-ipa.ts` |
| Tests | `src/phonology/narrow-ipa.test.ts` |
| Speak wire | `demo/vocal/main.ts` (`toNarrowPronunciation`) |
| Plan probes | `scripts/narrow-ipa-chimera-probe.mjs` |

Flapping and inventory migration remain separate product decisions.
