import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { inspectWav } from "../../auditory/audio.js";
import { encodeMonoWav } from "./encoding.js";
import { recorderWorklet } from "./worklet.js";

interface Message { kind: string; samples?: ArrayBuffer }
interface Processor { port: { onmessage: (event: { data: string }) => void }; process: (inputs: Float32Array[][]) => boolean }
function processor(limit: number) {
  const messages: Message[] = []; let constructor: new (options: object) => Processor;
  const context = { Float32Array, Number, Math, Error, AudioWorkletProcessor: class { port = { postMessage: (message: Message) => messages.push(message), onmessage: undefined }; },
    registerProcessor: (name: string, factory: typeof constructor) => { expect(name).toBe("first-recording"); constructor = factory; } };
  vm.runInNewContext(recorderWorklet, context);
  const node = new constructor!({ processorOptions: { maximumFrames: limit } });
  return { node, messages, command: (data: string) => node.port.onmessage({ data }) };
}
describe("first recording capture bytes", () => {
  it("writes exact canonical mono PCM headers and asymmetric signed quantization without trimming", () => {
    const raw = encodeMonoWav(new Float32Array([-2, -1, -0.5, 0, 0.125, 0.5, 1, 2]), 8000), view = new DataView(raw);
    expect([...Array(8)].map((_, index) => view.getInt16(44 + index * 2, true))).toEqual([-32768, -32768, -16384, 0, 4096, 16384, 32767, 32767]);
    const facts = inspectWav(new Uint8Array(raw), { method: "recorded-speech", voice: "Synthetic quantization fixture", producer_person_key: "0".repeat(64),
      settings_digest: "0".repeat(64), sample_rate: 8000, maximum_seconds: 2 });
    expect(facts.frames).toBe(8); expect(facts.clipped_samples).toBe(4); expect(facts.peak_absolute_sample).toBe(32768);
    expect(facts.bytes).toBe(60); expect(facts.seconds).toBe(0.001);
  });
  it("rejects nonfinite or empty frames and unsupported sample rates", () => {
    for (const value of [NaN, Infinity, -Infinity]) expect(() => encodeMonoWav(new Float32Array([value]), 8000)).toThrow(/nonfinite/);
    expect(() => encodeMonoWav(new Float32Array(), 8000)).toThrow();
    for (const rate of [7999, 192001, 8000.5]) expect(() => encodeMonoWav(new Float32Array([0]), rate)).toThrow();
  });
  it("captures variable rendering blocks up to the exact registered frame bound and never starts twice", () => {
    const p = processor(5);
    p.node.process([[new Float32Array([99, 99])]]); p.command("start");
    p.node.process([[new Float32Array([1, 2, 3])]]); p.node.process([[new Float32Array([4, 5, 6, 7])]]);
    p.command("start"); p.node.process([[new Float32Array([8, 9])]]); p.command("stop");
    expect(p.messages.map(message => message.kind)).toEqual(["ready", "started", "complete"]);
    expect([...new Float32Array(p.messages[2].samples!)]).toEqual([1, 2, 3, 4, 5]);
  });
  it("manual stop preserves every original frame once and refuses a later retake", () => {
    const p = processor(100); p.command("start"); p.node.process([[new Float32Array([0.1, 0, -0.1])]]); p.command("stop");
    p.command("start"); p.command("stop");
    expect(p.messages.filter(message => message.kind === "complete")).toHaveLength(1);
    expect(new Float32Array(p.messages.find(message => message.kind === "complete")!.samples!)).toEqual(new Float32Array([0.1, 0, -0.1]));
  });
  it("missing input during capture remains an explicit failure with no fabricated PCM", () => {
    const p = processor(10); p.command("start"); p.node.process([]); p.command("stop");
    expect(p.messages.map(message => message.kind)).toEqual(["started", "failed"]);
  });
});
