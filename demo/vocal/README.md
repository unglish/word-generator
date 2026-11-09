# Unglish × Chimera vocal demo

Playable page at `vocal.html`: generates an Unglish nonce word and speaks its IPA with a vendored slice of [Chimera](https://github.com/jamesondh/chimera-vocal-synth) (physical-modeling voice, MIT).

## Layout

- `main.ts` — UI glue (generate + speak + head mount)
- `chimera/` — speak-path + 3D head sources + `chimera.wasm` from Chimera (see `chimera/LICENSE`, `chimera/SOURCE.txt`)
- `chimera/ui/headView.ts` — vanilla WebGL mount for `Anatomy3D`, restyled grayscale

Voice presets (adult male / female / child) are `BodyMix` + default f0 in `main.ts` (`BODIES`). Retune f0 Hz there; blend `female`/`child` weights for in-between bodies.

## Open Graph loop

`../vocal-og-loop.mp4` + `../vocal-og-poster.png` are the link-preview assets referenced from `vocal.html`. Regenerate with:

```sh
node scripts/vocal-og/capture.mjs --serve
```

That boots a noindex capture page (`vocal-og-capture.html`) which mounts the same Anatomy3D head, loops nonsense IPA, and burns in the Unglish wordmark.

Rebuild the wasm from upstream when bumping Chimera:

```sh
# in a chimera checkout with Rust wasm32 + bun
bun run wasm
cp src/wasm/chimera.wasm /path/to/word-generator/demo/vocal/chimera/wasm/
# refresh the matching .ts files under demo/vocal/chimera/ as needed
```
