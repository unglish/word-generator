# Unglish × Chimera vocal demo

Playable page at `vocal.html`: generates an Unglish nonce word, or free-verse poetry composed from a scored Unglish lexicon (1.2k→5k words; phonetic beauty ranker, neural-ranker-ready), and speaks IPA with a vendored slice of [Chimera](https://github.com/jamesondh/chimera-vocal-synth) (physical-modeling voice, MIT).

**Mode → Poem** builds a four-line stanza (two nonce words per line) and speaks each line as its own Chimera phrase with ~0.55s inter-line pauses (`speakIpaLines` in `chimera/ui/speech.ts`). Syllable dots (`.`) still do not create pauses.

## Layout

- `main.ts` — UI glue (generate + speak + poem mode + head mount)
- `chimera/` — speak-path + 3D head sources + `chimera.wasm` from Chimera (see `chimera/LICENSE`, `chimera/SOURCE.txt`)
- `chimera/ui/headView.ts` — vanilla WebGL mount for `Anatomy3D`, restyled grayscale

Voice presets (adult male / female / child) are `BodyMix` + default f0 in `main.ts` (`BODIES`). Retune f0 Hz there; blend `female`/`child` weights for in-between bodies.

## Open Graph loop

`../vocal-og-loop.mp4` + `../vocal-og-poster.png` are the link-preview assets referenced from `vocal.html`. Regenerate with:

```sh
# video (1080²) + poster (1200×630 with headline/CTA)
node scripts/vocal-og/capture.mjs --serve

# poster only
node scripts/vocal-og/capture.mjs --serve --poster-only
```

That boots a noindex capture page (`vocal-og-capture.html`) which mounts the same Anatomy3D head, loops nonsense IPA, and burns in the Unglish wordmark. Poster mode (`?mode=poster`) lays out conversion copy for the 1.91:1 card crop.

Rebuild the wasm from upstream when bumping Chimera:

```sh
# in a chimera checkout with Rust wasm32 + bun
bun run wasm
cp src/wasm/chimera.wasm /path/to/word-generator/demo/vocal/chimera/wasm/
# refresh the matching .ts files under demo/vocal/chimera/ as needed
```
