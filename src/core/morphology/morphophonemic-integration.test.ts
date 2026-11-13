import { describe, it, expect } from "vitest";
import { englishConfig } from "../../config/english.js";
import type {
  Affix,
  MorphophonemicRule,
  MorphologyConfig,
} from "../../config/language.js";
import type { WordGenerationContext } from "../../types.js";
import { createGenerator } from "../generate.js";
import { createSeededRng } from "../../utils/random.js";
import { TraceCollector } from "../trace.js";
import { prepareMorphology, writeMorphology } from "./attach.js";
import {
  bindMorphophonemicGuard,
  buildMorphophonemicGuardRuntime,
} from "./morphophonemic-guard.js";

function fixture(coda: string[], rules: MorphophonemicRule[], guarded = true) {
  const config = structuredClone(englishConfig);
  config.morphology!.morphophonemicPolicy = {
    preserveClusterLegality: guarded,
  };
  const suffix: Affix = {
    type: "suffix",
    written: "x",
    phonemes: [],
    syllableCount: 0,
    frequency: 1,
    stressEffect: "none",
    morphophonemicRules: rules,
  };
  config.morphology!.suffixes = [suffix];
  const guardRt = buildMorphophonemicGuardRuntime(config);
  const syllables = [
    {
      onset: [],
      nucleus: [guardRt.phonemeBySound.get("aʊ")!],
      coda: coda.map((sound) => guardRt.phonemeBySound.get(sound)!),
    },
  ];
  const trace = new TraceCollector();
  trace.morphologyTrace = {
    template: "suffixed",
    suffix: "x",
    syllableReduction: 0,
  };
  let draws = 0;
  const context: WordGenerationContext = {
    word: {
      syllables,
      written: { clean: "ask", hyphenated: "ask" },
      pronunciation: "",
    },
    trace,
    syllableCount: 1,
    currSyllableIndex: 0,
    rand: () => {
      draws++;
      return 0.5;
    },
  };
  const runtime = {
    config,
    phonemeBySound: guardRt.phonemeBySound,
    ...(guarded
      ? { evaluateMorphophonemicReplacement: bindMorphophonemicGuard(guardRt) }
      : {}),
  };
  const prepared = prepareMorphology(runtime, context, {
    template: "suffixed",
    suffix,
  })!;
  return { config, context, prepared, draws: () => draws };
}

const softening: MorphophonemicRule = {
  name: "soften",
  replaceSound: "s",
  writtenMatch: /k$/,
  writtenReplace: "s",
};

describe("atomic morphophonemic legality", () => {
  it("rejects a malformed policy at public generator construction", () => {
    const config = structuredClone(englishConfig);
    config.morphology!.morphophonemicPolicy = {
      preserveClusterLegality: "false",
    } as unknown as MorphologyConfig["morphophonemicPolicy"];
    expect(() => createGenerator(config)).toThrow(/must be boolean/);
  });

  it("preserves complete public output, trace, and RNG use when the policy is omitted or false", () => {
    const omitted = structuredClone(englishConfig);
    const disabled = structuredClone(englishConfig);
    delete omitted.morphology!.morphophonemicPolicy;
    disabled.morphology!.morphophonemicPolicy = {
      preserveClusterLegality: false,
    };
    const a = createGenerator(omitted);
    const b = createGenerator(disabled);
    const randA = createSeededRng(20261004);
    const randB = createSeededRng(20261004);
    for (let index = 0; index < 50; index++) {
      expect(a.generateWord({ rand: randA, trace: true })).toEqual(
        b.generateWord({ rand: randB, trace: true }),
      );
    }
    expect(randA()).toBe(randB());
  });

  it("records unmatched conditions independently of legality rejection", () => {
    const { prepared } = fixture(
      ["k"],
      [
        {
          ...softening,
          phonologicalCondition: { position: "preceding", sounds: ["g"] },
        },
      ],
    );
    expect(prepared.evaluations![0].outcome).toBe("condition-not-matched");
    expect(prepared.evaluations![0].guard).toBeUndefined();
    expect(prepared.rules).toEqual([]);
  });

  it("rejects the sound and written half together without draws for /sk/→/ss/", () => {
    const { context, prepared, draws } = fixture(["s", "k"], [softening]);
    expect(context.word.syllables[0].coda.map((p) => p.sound)).toEqual([
      "s",
      "k",
    ]);
    expect(prepared.rules).toEqual([]);
    expect(prepared.evaluations![0].outcome).toBe("rejected");
    expect(
      prepared.evaluations![0].guard!.rejections.some(
        (row) => row.reason === "repetition",
      ),
    ).toBe(true);
    expect(prepared.evaluations![0].guard!.syllableBefore.coda).toEqual([
      "s",
      "k",
    ]);
    expect(prepared.evaluations![0].guard!.syllableProposed.coda).toEqual([
      "s",
      "s",
    ]);
    const written = writeMorphology(context, prepared);
    expect(written.parts.find((part) => part.role === "root")!.text).toBe(
      "ask",
    );
    expect(draws()).toBe(0);
  });

  it("accepts ordinary single-coda softening", () => {
    const { context, prepared, draws } = fixture(["k"], [softening]);
    expect(context.word.syllables[0].coda.map((p) => p.sound)).toEqual(["s"]);
    expect(prepared.evaluations![0].outcome).toBe("accepted");
    expect(
      writeMorphology(context, prepared).parts.find(
        (part) => part.role === "root",
      )!.text,
    ).toBe("ass");
    expect(draws()).toBe(0);
  });

  it("orders later conditions against the last accepted root state", () => {
    const { context, prepared } = fixture(
      ["s", "k"],
      [
        { ...softening, priority: 1 },
        { name: "stop-after-rejection", replaceSound: "t", priority: 2 },
        { ...softening, name: "soften-after-acceptance", priority: 3 },
      ],
    );
    expect(
      prepared.evaluations!.map((row) => [row.soundBefore, row.outcome]),
    ).toEqual([
      ["k", "rejected"],
      ["k", "accepted"],
      ["t", "rejected"],
    ]);
    expect(context.word.syllables[0].coda.map((p) => p.sound)).toEqual([
      "s",
      "t",
    ]);
    expect(prepared.rules.map((row) => row.rule.name)).toEqual([
      "stop-after-rejection",
    ]);
  });

  it("distinguishes identity, written-only, and unknown inventory proposals", () => {
    const { context, prepared } = fixture(
      ["k"],
      [
        {
          name: "identity",
          replaceSound: "k",
          writtenMatch: /k$/,
          writtenReplace: "z",
        },
        { name: "written", writtenMatch: /z$/, writtenReplace: "v" },
        {
          name: "unregistered",
          replaceSound: "q",
          writtenMatch: /v$/,
          writtenReplace: "q",
        },
      ],
    );
    expect(prepared.evaluations!.map((row) => row.outcome)).toEqual([
      "identity",
      "written-only",
      "rejected",
    ]);
    expect(
      prepared.evaluations![2].guard!.rejections.some(
        (row) => row.reason === "inventory",
      ),
    ).toBe(true);
    expect(
      writeMorphology(context, prepared).parts.find(
        (part) => part.role === "root",
      )!.text,
    ).toBe("asv");
  });

  it("keeps the legacy omitted/disabled policy permissive", () => {
    const { context, prepared } = fixture(["s", "k"], [softening], false);
    expect(context.word.syllables[0].coda.map((p) => p.sound)).toEqual([
      "s",
      "s",
    ]);
    expect(prepared.evaluations).toBeUndefined();
    expect(
      writeMorphology(context, prepared).parts.find(
        (part) => part.role === "root",
      )!.text,
    ).toBe("ass");
  });

  it("fails visibly when enabled without a guard instead of silently bypassing it", () => {
    const { config, context } = fixture(["k"], []);
    expect(() =>
      prepareMorphology({ config: { phonemes: config.phonemes, morphology: config.morphology } }, context, {
        template: "suffixed",
        suffix: config.morphology!.suffixes[0],
      }),
    ).toThrow(/guard runtime/);
  });

  it("keeps enabled public trace/plain output and RNG draw counts equal", () => {
    const generator = createGenerator(englishConfig);
    const plain = createSeededRng(20261003);
    const traced = createSeededRng(20261003);
    let plainCalls = 0;
    let tracedCalls = 0;
    for (let index = 0; index < 100; index++) {
      const a = generator.generateWord({
        rand: () => {
          plainCalls++;
          return plain();
        },
      });
      const b = generator.generateWord({
        trace: true,
        rand: () => {
          tracedCalls++;
          return traced();
        },
      });
      const withoutTrace = { ...b };
      delete withoutTrace.trace;
      expect(a).toEqual(withoutTrace);
      expect(plainCalls).toBe(tracedCalls);
    }
    expect(plain()).toBe(traced());
  });

  it("blocks ity-velar-softening on /sk/ roots under English policy", () => {
    const config = structuredClone(englishConfig);
    const ity = config.morphology!.suffixes.find((s) => s.written === "ity")!;
    const guardRt = buildMorphophonemicGuardRuntime(config);
    const syllables = [
      {
        onset: [guardRt.phonemeBySound.get("b")!],
        nucleus: [guardRt.phonemeBySound.get("æ")!],
        coda: [
          guardRt.phonemeBySound.get("s")!,
          guardRt.phonemeBySound.get("k")!,
        ],
      },
    ];
    const context: WordGenerationContext = {
      word: {
        syllables,
        written: { clean: "bask", hyphenated: "bask" },
        pronunciation: "",
      },
      syllableCount: 1,
      currSyllableIndex: 0,
      rand: () => 0.5,
    };
    const prepared = prepareMorphology(
      { config, ...guardRt },
      context,
      { template: "suffixed", suffix: ity },
    )!;
    const rejected = prepared.evaluations!.find(
      (row) => row.rule === "ity-velar-softening",
    )!;
    expect(rejected.outcome).toBe("rejected");
    expect(rejected.guard!.syllableBefore.coda).toEqual(["s", "k"]);
    expect(rejected.guard!.syllableProposed.coda).toEqual(["s", "s"]);
    expect(context.word.syllables[0].coda.map((p) => p.sound)).toEqual([
      "s",
      "k",
    ]);
    expect(
      prepared.rules.some((row) => row.rule.name === "ity-velar-softening"),
    ).toBe(false);
    writeMorphology(context, prepared);
    expect(context.word.written.clean).toBe("baskity");
    expect(
      context.word.syllables.flatMap((s) =>
        [...s.onset, ...s.nucleus, ...s.coda].map((p) => p.sound),
      ),
    ).toEqual(["b", "æ", "s", "k", "ɪ", "t", "i:"]);
  });
});
