// Typecheck the generated ABI, including structured packet/results types.
import init, { RepairConfig } from "../../dist/wasm/unglish_wasm.js";
const configured = new RepairConfig(3, new Uint32Array([0, 1]));
const cuts: Uint32Array = configured.repair(new Uint32Array([1, 0]), false);
void cuts;
void init({ module_or_path: new Uint8Array() });
configured.free();
