/** Experimental, explicitly initialized repair backend. No runtime npm dependencies. */
import type { LanguageConfig } from "../config/language.js";
import { expandClusterConstraintBans } from "../config/language.js";
import type { Syllable } from "../types.js";
import type { TraceCollector } from "../core/trace.js";

export interface ClusterRepairBackend {
  readonly name: "rust-wasm-v1";
  /** Configuration identity is part of the contract; never reuse across configs. */
  readonly config: LanguageConfig;
  /** Nonempty segment arrays must be distinct; phoneme objects may be shared. */
  repair(syllables: Syllable[], trace?: TraceCollector): void;
  dispose(): void;
}

export interface RustRepairInitialization {
  /**
   * Absolute URL of the generated `unglish_wasm.js` bindings (shipped in
   * `dist/wasm`). Required: a default relative to this module would resolve
   * against the consumer's bundle, where bundlers do not emit these assets.
   */
  bindingsUrl: URL;
  /** Node callers supply bytes; browsers default to the adjacent .wasm URL. */
  wasm?: Uint8Array;
}

const bindingInitialization = Symbol.for("@unglish/word-generator/rust-repair-initialization-v1");

/** Describes the actual generated typed-array ABI, not an untyped serde value. */
interface RepairBindings {
  default: {
    (options: { module_or_path: Uint8Array | URL }): Promise<unknown>;
    [bindingInitialization]?: Promise<unknown>;
  };
  RepairConfig: new (inventorySize: number, pairs: Uint32Array) => {
    repair(packet: Uint32Array, dropOnset: boolean): Uint32Array;
    free(): void;
  };
}

const MAX_U32 = 0xffffffff;
function u32(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > MAX_U32) {
    throw new RangeError("Rust repair input exceeds the u32 packet format");
  }
  return value;
}

/** Initialize asynchronously, then repair synchronously until dispose(). */
export async function initializeRustRepair(
  config: LanguageConfig,
  options: RustRepairInitialization,
): Promise<ClusterRepairBackend> {
  if (!(options?.bindingsUrl instanceof URL)) {
    throw new TypeError("initializeRustRepair requires options.bindingsUrl pointing at the deployed unglish_wasm.js");
  }
  const ids = new Map<string, number>();
  for (const phoneme of config.phonemes) {
    if (typeof phoneme.sound !== "string" || phoneme.sound.includes("|")) {
      throw new TypeError("Rust repair requires inventory sound strings without '|'");
    }
    if (!ids.has(phoneme.sound)) ids.set(phoneme.sound, u32(ids.size));
  }
  const policy = config.clusterConstraint ? config.clusterConstraint.repair : "drop-coda";
  if (policy !== "drop-coda" && policy !== "drop-onset") throw new TypeError("Invalid repair policy");
  const pairs: number[] = [];
  for (const [a, b] of expandClusterConstraintBans(config)) {
    // Unreachable symbols are equally ineffective in the TypeScript banned set.
    const left = ids.get(a), right = ids.get(b);
    if (left !== undefined && right !== undefined) pairs.push(left, right);
  }
  const url = options.bindingsUrl;
  const bindings: RepairBindings = await import(/* @vite-ignore */ url.href);
  const initialize = bindings.default;
  let initialized = initialize[bindingInitialization];
  if (!initialized) {
    // Store state on the shared initializer so independent adapter bundles also
    // avoid replacing Wasm exports while configs still hold old instance pointers.
    initialized = initialize({ module_or_path: options.wasm ?? new URL("unglish_wasm_bg.wasm", url) })
      .catch(error => { delete initialize[bindingInitialization]; throw error; });
    initialize[bindingInitialization] = initialized;
  }
  await initialized;
  const compiled = new bindings.RepairConfig(u32(ids.size), new Uint32Array(pairs));
  let disposed = false;
  return {
    name: "rust-wasm-v1",
    config,
    dispose() {
      if (!disposed) { compiled.free(); disposed = true; }
    },
    repair(syllables, trace) {
      if (disposed) throw new Error("Rust repair backend has been disposed");
      const count = u32(syllables.length);
      let length = 2 + count * 3;
      for (const syl of syllables) {
        length += u32(syl.onset.length) + u32(syl.nucleus.length) + u32(syl.coda.length);
      }
      // Write directly into the ABI buffer instead of growing a number array
      // and then copying it into a second allocation.
      const packet = new Uint32Array(length);
      packet[0] = 1;
      packet[1] = count;
      let cursor = 2;
      const segments: Syllable["onset"][] = [];
      let largeSegments: Set<Syllable["onset"]> | undefined;
      for (const syl of syllables) {
        packet[cursor++] = syl.onset.length;
        packet[cursor++] = syl.nucleus.length;
        packet[cursor++] = syl.coda.length;
        for (const segment of [syl.onset, syl.nucleus, syl.coda]) {
          // Snapshot cuts cannot preserve sequential mutation through aliases.
          if (segment.length > 0) {
            if (largeSegments ? largeSegments.has(segment) : segments.includes(segment)) {
              throw new TypeError("Rust repair requires distinct nonempty segment arrays");
            }
            if (largeSegments) largeSegments.add(segment);
            else {
              segments.push(segment);
              // Bound short identity scans; larger inputs retain linear validation.
              if (segments.length === 8) largeSegments = new Set(segments);
            }
          }
          for (const phoneme of segment) {
            const id = ids.get(phoneme.sound);
            if (id === undefined) throw new TypeError(`Rust repair: unknown inventory sound '${phoneme.sound}'`);
            packet[cursor++] = id;
          }
        }
      }
      // Validation/conversion completes before any mutation. Only Rust chooses cuts.
      const cuts = compiled.repair(packet, policy === "drop-onset");
      if (cuts.length % 3 !== 0) throw new Error("Invalid Rust repair result");
      // Validate the entire result before modifying the caller's arrays.
      let previous = -1;
      for (let k = 0; k < cuts.length; k += 3) {
        const i = cuts[k], codaLen = cuts[k + 1], onsetStart = cuts[k + 2];
        if (i <= previous || i + 1 >= syllables.length || codaLen > syllables[i].coda.length
          || onsetStart > syllables[i + 1].onset.length
          || (policy === "drop-coda" ? onsetStart !== 0 : codaLen !== syllables[i].coda.length)) {
          throw new Error("Invalid Rust repair cuts");
        }
        previous = i;
      }
      for (let k = 0; k < cuts.length; k += 3) {
        const i = cuts[k], codaLen = cuts[k + 1], onsetStart = cuts[k + 2];
        const coda = syllables[i].coda, onset = syllables[i + 1].onset;
        const before = trace ? `${coda.map(p => p.sound).join(",")}|${onset.map(p => p.sound).join(",")}` : "";
        if (codaLen < coda.length) coda.length = codaLen;
        if (onsetStart > 0) onset.splice(0, onsetStart);
        trace?.recordRepair("repairClusters", before,
          `${coda.map(p => p.sound).join(",")}|${onset.map(p => p.sound).join(",")}`,
          `boundary ${i}→${i + 1}, strategy: ${policy}`);
      }
    },
  };
}
