# Experimental Rust repair

The opt-in Rust/Wasm backend handles cross-syllable cluster repair. TypeScript
remains the default. Retain this pilot and pause further migration; evaluation
history, benchmarks, and the rationale are recorded on
[PR #343](https://github.com/unglish/word-generator/pull/343).

## Usage and lifetime

Initialize asynchronously, then use the backend synchronously with the same
configuration object. Treat the configuration as immutable for its lifetime.
`bindingsUrl` is required: deploy the generated `dist/wasm` directory alongside
your app and pass the absolute URL of its `unglish_wasm.js`. There is no default,
because a URL relative to the library resolves against a bundler's output chunk,
where `vite build`, `vite dev` and webpack do not emit these assets.

```ts
import { initializeRustRepair, createGenerator, englishConfig } from '@unglish/word-generator';

const bindingsUrl = new URL('/repair-wasm/unglish_wasm.js', location.href);
const backend = await initializeRustRepair(englishConfig, { bindingsUrl });
try {
  const generator = createGenerator(englishConfig, { experimentalRepair: backend });
  const words = generator.generateWords(10, { seed: 342, trace: true });
  console.log(generator.repairBackend, words[0].trace?.repairBackend);
} finally {
  backend.dispose();
}
```

Concurrent calls using the same bindings module share initialization, while each
backend owns a separate Rust configuration. Failed loads may be retried.
Loading, compilation, and configuration errors reject initialization. `dispose()`
frees the instance's Rust configuration, is idempotent, and causes subsequent
repair calls to throw. Generated bindings share the compiled module; disposal
does not unload it. Node callers supply Wasm bytes:

```js
import { readFile } from 'node:fs/promises';
const bindingsUrl = new URL('./node_modules/@unglish/word-generator/dist/wasm/unglish_wasm.js', import.meta.url);
const wasm = await readFile(new URL('unglish_wasm_bg.wasm', bindingsUrl));
const backend = await initializeRustRepair(englishConfig, { bindingsUrl, wasm });
```

For browser/bundler deployment, copy the generated `dist/wasm` directory and pass
its bindings URL. The Vite pilot uses `repair-wasm/` relative to `BASE_URL` and
passes an absolute bindings URL to its module worker. Existing classic demo
workers keep their TypeScript backend and `importScripts` loading.

## Repair contract and ABI

Inputs are ordered syllables with onset/nucleus/coda ID slices, an ordered banned
pair list, and `drop-coda` or `drop-onset`. Native IDs are arbitrary u32 values.
The adapter assigns IDs to distinct sound strings in first-occurrence inventory
order; duplicate sounds share an ID. It rejects inventory sounds containing `|`,
unknown word sounds, invalid policies, and malformed packets before mutation.
Nonempty segment arrays must be distinct, including across onset, nucleus, and
coda positions; shared arrays raise `TypeError` before mutation or trace events.
Shared phoneme objects and empty segment arrays remain supported.
Counts and lengths must fit the u32 ABI and available memory. Proof harness bounds
do not restrict runtime inputs. Allocation exhaustion is a resource failure.

For each initially nonempty boundary, Rust returns its index, retained coda prefix
length, and dropped onset prefix length. Only the selected side shrinks, until
either side is empty or the exposed pair is legal. Cuts are original phoneme
positions, not string offsets. Surviving phoneme references, order, nuclei,
stress, and metadata remain intact. Initially empty boundaries produce no event;
unchanged nonempty boundaries return cuts but the trace collector omits unchanged
repairs. Repaired data is idempotent; trace collection is checked separately.

The core borrows inputs and returns an allocation-free iterator. The Wasm decoder
borrows segment IDs from a validated packet. Packet version 1 is a `Uint32Array`:

```text
[1, syllableCount,
 onsetLength, nucleusLength, codaLength, ...onsetIDs, ...nucleusIDs, ...codaIDs,
 ...otherSyllables]
```

Output triples are `[boundaryIndex, retainedCodaLength, droppedOnsetLength]`.
`RepairConfig` retains the banned relation for reuse. One call per attempted word
avoids per-phoneme transfers. The adapter applies cuts to the original arrays and
preserves repair trace values and the shared sequential RNG stream.

## Build and checks

Rust 1.85.1 and wasm-bindgen CLI 0.2.100 build the shipping assets. Kani 0.65.0
sets up its own nightly-2025-08-06 compiler and CBMC 6.7.1 for verification.

```sh
rustup toolchain install 1.85.1 --profile minimal --target wasm32-unknown-unknown
cargo +1.85.1 install wasm-bindgen-cli --version 0.2.100 --locked
cargo +1.85.1 install kani-verifier --version 0.65.0 --locked
cargo kani setup
npm ci
cd rust
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo clippy --workspace --lib --target wasm32-unknown-unknown --locked -- -D warnings
cd ..
npm run test:repair-native
npm run build:repair-wasm
npm run build
npm run test:repair-types
npm run check:repair-wasm
npm run demo:check-worker-sync
npm run test:repair-wasm
npx playwright install chromium
npm run test:repair-browser
npm run test:repair-package
npm run test:repair-kani
```

The workspace pins its compiler/MSRV, inherits dependencies and lints, commits
`Cargo.lock`, and forbids handwritten unsafe code. The core has no runtime
dependencies. `wasm-bindgen` uses disabled defaults with `std`; `serde_json` is
test-only. Kani harnesses are compiled only under `cfg(kani)`.

Core/adapter changes require proofs and native/Node/browser/worker/package parity.
Releases regenerate matching bindings and Wasm, verify manifest hashes in every
destination, and test an unpacked npm consumer. TypeScript development needs no
Rust installation; publishing and Pages deployment build the experimental assets.
`fixtures:repair` regenerates only the pilot corpus; CI checks it against the
committed fixtures. Existing frozen studies remain unchanged.

## Proof scope

Both harnesses call the shipping core. `boundary_contract` covers sides of length
0–4, symbols 0–2, arbitrary 3×3 relations, both policies, and unwind 12.
`word_contract` covers empty/single/two-syllable words, sides of length 0–1,
symbols 0–1, arbitrary 2×2 relations, both policies, arbitrary u32 nuclei,
empty outer segments, and unwind 5. Sentinel relation entries cannot match valid
harness symbols.

Checks cover indexing/arithmetic safety, legal exposed boundaries, selected-side
cuts, deletion bounds/minimality, idempotence, ordered result emission, and
unchanged inputs. Prefix/suffix slices preserve survivor order. Unwinding failures,
reachable unsupported constructs, and timeouts fail verification. These bounds
do not prove arbitrary word-level composition. Wasm compilation, loading, trace
application, and the full generator are covered by integration tests rather than
these proofs; linguistic quality requires separate evaluation.

## Benchmarks

After building, `npm run bench:repair` writes ignored local measurements. Historical
reports and baseline sources are linked from PR #343. To compare adapters, download
its archived `optimization-results.json` and provide it explicitly:

```sh
npm run bench:repair-optimization -- --baseline-report /path/to/optimization-results.json
```

Add `--verify-only` to check baseline/current parity without timing. The Rust
comparison accepts separately built binding directories:

```sh
node evaluation/repair-pilot/measure-rust-optimization.mjs BASE_DIR RETAINED_DIR
```

Use the same toolchain, compiler settings, workload, and CPU affinity for comparisons.
Measure native repair separately from complete JS/Wasm calls and whole generation.
