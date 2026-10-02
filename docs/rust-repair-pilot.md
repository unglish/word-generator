# Experimental Rust repair pilot (#342)

This pilot keeps the synchronous TypeScript API and default backend. Rust only
handles cross-syllable `repairClusters`; it does not port other repairs, RNG,
spelling, stress, or morphology. Verification is implementation evidence, not
linguistic quality evidence.

## Contract and portability

Input is an ordered array of syllables, each with ordered onset, nucleus, and
coda IDs; an ordered banned-pair list; and `drop-coda` or `drop-onset`. IDs are
assigned to distinct sound strings in first-occurrence inventory order, starting
at zero. Duplicate sound strings share IDs, matching TypeScript's sound-based
pair comparison. No hash-map iteration determines ordering. The configuration
object must be the same object used to initialize the adapter. Treat configuration
as immutable for the instance lifetime, as with the existing compiled generator.

For each boundary with initially nonempty sides, return its zero-based boundary
index, retained coda prefix length, and dropped onset prefix length. These are
original **phoneme positions**, not UTF-16 or UTF-8 offsets. Deleted coda positions
are `[retained length, original length)`; deleted onset positions are `[0, dropped
length)`. Only the selected side shrinks, until one side is empty or the exposed
pair is legal. Every exposed pair deleted was banned: no gratuitous deletions.
Nuclei, order, and unselected segments remain unchanged. The TypeScript adapter
splices the original arrays, preserving surviving phoneme references, stress,
other metadata, and syllable identity. It reproduces `recordRepair` before/after
sound strings and details. Initially empty boundaries produce no event; unchanged
nonempty boundaries produce a core result but no collected repair, because the
existing collector filters equal before/after strings. Data is idempotent; trace
collection behavior is checked separately.

The native core accepts arbitrary u32 IDs. The adapter assigns zero-based IDs
below an inventory size representable by u32 (at most 2^32−1 distinct sounds).
Sequence lengths/counts must fit the u32 packet format and available memory. These are representation/resource
limits, not English inventory limits. There is no 4-phoneme/3-symbol restriction
in native or Wasm code. Built-in English has 41 distinct sound strings (the
fixture inventory is the authoritative list); custom inventories/configurations
use the same mapping. Inventory sounds containing `|` are explicitly rejected,
because the existing banned-set encoding is ambiguous for those sounds. Unknown
word sounds and malformed packets are rejected before mutation. No silent fallback
or truncation occurs. Wasm allocation exhaustion is a resource failure, not a
successful repair. The packet decoder validates counts before allocating and
uses checked additions when reading lengths.

## ABI and initialization

`unglish-core` has no runtime dependencies. It reads borrowed syllable slices and
returns an allocation-free iterator of cuts. The adapter owns the validated packet
and borrows its IDs without reconstructing phonemes or copying segment vectors. `unglish-wasm` depends on the core and
`wasm-bindgen`. Packet version 1 is a `Uint32Array`:

```
[1, syllableCount,
 onsetLength, nucleusLength, codaLength, ...onsetIDs, ...nucleusIDs, ...codaIDs,
 ...otherSyllables]
```

Return triples are `[boundaryIndex, retainedCodaLength, droppedOnsetLength]`.
The reusable `RepairConfig` compiles the banned relation once. One packet/call
per attempted word avoids per-phoneme FFI calls; batches keep the original shared
sequential generator RNG. Generated `.d.ts` files describe this typed-array ABI.
No serde objects cross the runtime boundary. The Rust hot loop compares numerically
packed full-width ID pairs without changing the tuple input API. The bridge reserves
exactly one result triple per initially nonempty boundary; no per-segment output
allocation is needed. See the further Rust measurements in the results report.

```ts
import { initializeRustRepair, createGenerator, englishConfig } from '@unglish/word-generator';
const backend = await initializeRustRepair(englishConfig);
try {
  const generator = createGenerator(englishConfig, { experimentalRepair: backend });
  const words = generator.generateWords(10, { seed: 342, trace: true });
  console.log(generator.repairBackend, words[0].trace?.repairBackend);
} finally {
  backend.dispose();
}
```

Initialization returns a promise; loading/compilation/validation errors reject
it. Calls are synchronous after initialization. Each backend owns a Rust config
allocation. `dispose()` frees it, is idempotent, and subsequent repair calls throw.
The compiled Wasm module is shared by the generated bindings; repeated initialization
reuses it. Dispose does not unload the module. A Node consumer passes Wasm bytes:

```js
import { readFile } from 'node:fs/promises';
const bindingsUrl = new URL('./node_modules/@unglish/word-generator/dist/wasm/unglish_wasm.js', import.meta.url);
const wasm = await readFile(new URL('unglish_wasm_bg.wasm', bindingsUrl));
const backend = await initializeRustRepair(englishConfig, { bindingsUrl, wasm });
```

For bundlers/browser deployments, copy the entire generated `dist/wasm` directory
and pass its bindings URL. Vite's pilot copies it to `repair-wasm/` and resolves it
relative to `BASE_URL`; browser tests serve a production build at the GitHub Pages
`/word-generator/` prefix. The experimental page uses a **module worker**, which
loads the same assets by an absolute URL passed from its parent. Existing classic
demo workers retain their loading behavior and TypeScript backend; enabling Rust
there would require a separate worker protocol change. The pilot exercises this
explicit worker choice without changing the production generator's default.

## Measurement plan (established before benchmarking)

Correctness is mandatory: exact structure/output/trace parity, no extra RNG draws,
explicit errors, and complete bounded proofs. Compare 488 frozen focused/generated
repair cases in native, Node, browser, and worker; compare 3,456 generated words
per environment across seeds 42/342/1337, text/lexicon, automatic/1/3/7 syllables,
morphology and trace on/off, both policies and a custom banned relation. Checks
compare complete words after removing only the experimental provenance field.
Human review studies remain frozen and unchanged; this pilot's fixture corpus and
measurements have separate source/config/backend identifiers.

Record cold import+initialization, warm raw Wasm calls, TypeScript repair-only,
adapter conversion+repair with trace on/off, full seeded generator batches,
release native core time, bytes/gzip of bindings and Wasm, and memory when practical.
Use five samples after warmup, 20,000 repair calls/sample and 2,000 words/sample.
Alternate backend order for whole-generator samples. Initial budgets for considering
retention are <=100 ms local cold initialization, <=100 KiB combined gzipped assets,
<=20% full-generator median overhead, and <=300 s proof execution. Network latency,
low-end devices and CI cold installation costs need separate observations. A fast
native function alone does not justify migration; record end-to-end crossing costs.
A proof-only boundary result does not justify a default backend switch.

## Reproducible tools and checks

```
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
npm run check:repair-wasm
npm run test:repair-wasm
npx playwright install chromium
npm run test:repair-browser
npm run test:repair-kani
npm run bench:repair
```

The workspace pins Rust 1.85.1, declares the same minimum supported Rust version,
and commits `Cargo.lock`. Crates inherit dependency versions and Rust lints from
the workspace; handwritten unsafe code is forbidden. The shipping toolchain
includes rustfmt and Clippy, and CI checks formatting plus native and Wasm lints.
The Wasm boundary maps validation errors to `JsValue` only after native validation;
native tests exercise the same configuration/packet validation and repair path,
compare all 488 packet results, and check that decoded segments borrow the input.
Kani 0.65.0 sets up its own
pinned nightly-2025-08-06 compiler (Rust 1.91.0-nightly) and CBMC 6.7.1; this is
verification tooling, not the shipping compiler. Use `KANI_HOME` for installations
outside your home directory if needed. Proof harnesses are `cfg(kani)` only and
cannot ship in release Wasm. `fixtures:repair` explicitly regenerates only the
pilot corpus. CI checks that regeneration is identical.

## Proof scope

`boundary_contract` runs on the actual shipping `repair_boundary`, with arbitrary
side lengths 0..4, repeated symbols from 0..2, arbitrary 3×3 banned relation, and
both policies. Harness-only sentinel `(3,3)` represents absent relation entries;
it is unreachable from valid symbolic inputs. Unwind 12 completely covers the
4 deletions and 9-entry membership scan. The verifier checks unwinding assertions,
indexing, pointer and arithmetic safety, legal exposed pairs, selected-side cuts,
decreasing deletion bound, idempotence, and minimality. Prefix/suffix cuts encode
survivor ordering; the function never receives nuclei or metadata. The word-level
wrapper only combines independent adjacent boundary results and never mutates
input. `word_contract` verifies the shipping wrapper for empty/single/two-syllable
words, sides of length 0..1 over symbols 0..1, arbitrary 2×2 relations, both policies, and one
arbitrary u32 nucleus per syllable. The two-syllable view has one boundary,
empty outer segments, and either side may be empty. Unwind 5 covers all loops.
It checks exactly
one ordered result per initially nonempty boundary, bounded/selected-side cuts,
legal exposed pairs, idempotent ranges, and unchanged input including nuclei.
Survivors are slices of the original ordered sequences; no output representation
can reorder or invent phonemes. The adapter's reference-preserving slice application
is integration-tested, outside Kani. Shared fixtures exercise longer words, larger
inventories, multiple boundaries, nuclei and range application. These bounds do
not establish unbounded word-level correctness. Rust's read-only type boundary
also excludes nuclear/metadata mutation from repair.

An unwinding failure or timeout fails CI. No experimental loop contracts or
proof-only replacement implementation are used. Kani's compilation may report
unsupported caller-location/foreign-function constructs; the proof must also pass
their reachability checks. No Wasm compiler, loader, adapter, RNG, regex, or entire
generator correctness is claimed by these proofs.

## Dependencies and maintenance

| Dependency | Purpose / license | Target/features | Proof interaction |
| --- | --- | --- | --- |
| Rust standard library | vectors/slices and ordered relation / MIT or Apache-2.0 | native + wasm32-unknown-unknown | boundary slice operations checked by Kani |
| wasm-bindgen 0.2.100 | generated JS/types and Wasm ABI / MIT or Apache-2.0 | defaults disabled, `std`; native + wasm32 | outside isolated core proof |
| serde_json 1.0.140 (dev only) | native fixture JSON parsing / MIT or Apache-2.0 | test builds only | not reached by harness; not in release Wasm |
| Kani 0.65.0 (tool only) | bounded verification / MIT or Apache-2.0 | separate compiler/CBMC | development/CI only |

wasm-bindgen is actively maintained upstream; this pilot intentionally pins an
older compatible release rather than tracking latest. Its runtime tree contains
cfg-if, once_cell and wasm-bindgen-macro; build/proc-macro dependencies include
wasm-bindgen-backend/shared/macro-support, bumpalo, log, proc-macro2, quote, syn and
unicode-ident. Exact transitive versions/features are in `Cargo.lock` and
`cargo tree -e features -p unglish-wasm`. serde_json's dev tree adds serde/core,
itoa, memchr and ryu (derive tooling is lockfile-only unless enabled). No runtime
npm dependencies are introduced. `serde`/`serde-wasm-bindgen` were considered and
excluded: typed arrays suffice and avoid a dynamic serialization/proof boundary.
Asset size is measured separately rather than inferred from dependency count.

Releases must regenerate bindings with the matching CLI, ship declarations and
`.wasm` together, check manifest hashes in all destinations, and run a packed npm
consumer. Native/core changes also require proofs and parity checks; config changes
require explicit fixture review. Do not change Mulberry32/draw order to adopt a
randomness crate. A spelling/morphology port must separately assess JS lookaround,
replacement syntax, UTF-16 indices vs Rust UTF-8, and custom RNG callbacks. Rust's
usual regex crate is not a compatible drop-in.

## Evidence and decision

See [repair-pilot-results.md](repair-pilot-results.md) for measured results and the
migration decision. Default backend changes, browser threading, Rayon and native
Node addons remain separately scoped decisions.
