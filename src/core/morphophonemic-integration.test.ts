import { readFileSync } from "node:fs";
import type { Word } from "../types.js";
import type { MorphologyPlan } from "./morphology/plan.js";
import { describe, it, expect } from "vitest";
import { englishConfig } from "../config/english.js";
import type { Affix, MorphophonemicRule, MorphologyConfig } from "../config/language.js";
import type { WordGenerationContext } from "../types.js";
import { createGenerator } from "./generate.js";
import { createSeededRng } from "../utils/random.js";
import { buildClusterRuntime } from "./cluster-runtime.js";
import { bindMorphophonemicGuard } from "./morphophonemic-guard.js";
import { FinalPhones } from "./final-phones.js";
import { TraceCollector } from "./trace.js";
import { prepareMorphology, writeMorphology } from "./morphology/attach.js";
import { replayMorphologyPreparation } from "./morphology/preparation-evidence.js";

const observedRoots: Array<{
  policy: string;
  profile: string;
  seed: number;
  drawIndex: number;
  before: Word;
  template: MorphologyPlan["template"];
  configurationIndices: { prefix?: number; suffix?: number };
}> = JSON.parse(
  readFileSync(
    new URL(
      "../../evaluation/experiments/morphophonemic-cluster-legality/observed-collision-roots.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

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
  const rt = buildClusterRuntime(config);
  const syllables = [
    {
      onset: [],
      nucleus: [rt.phonemeBySound.get("aʊ")!],
      coda: coda.map((sound) => rt.phonemeBySound.get(sound)!),
    },
  ];
  const ledger = new FinalPhones(),
    ids = ledger.register("root", syllables);
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
    finalPhoneState: { ledger, ids },
    rand: () => {
      draws++;
      return 0.5;
    },
  };
  const runtime = {
    config,
    ...(guarded
      ? { evaluateMorphophonemicReplacement: bindMorphophonemicGuard(rt) }
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
  it("restores inventory identities when replay uses fallback sonority", () => {
    const config = structuredClone(englishConfig);
    delete config.clusterLimits!.attestedOnsets;
    delete config.clusterLimits!.attestedCodas;
    config.morphology!.suffixes = [{ type: "suffix", written: "x", phonemes: [], syllableCount: 0,
      stressEffect: "none", frequency: 1,
      morphophonemicRules: [{ name: "nuclear-replay-probe", target: "nucleus", replaceSound: "i:" }] }];
    for (const mode of ["lexicon", "text"] as const) config.morphology!.templateWeights[mode] = { bare: 0, prefixed: 0, suffixed: 1, both: 0 };
    const generator = createGenerator(config), rand = createSeededRng(20261005);
    for (let index = 0; index < 3; index++) {
      const word = generator.generateWord({ rand, trace: true, syllableCount: 1 });
      expect(() => replayMorphologyPreparation(word, config)).not.toThrow();
      if (index === 2) {
        expect(word.trace!.morphologyPreparation!.prepared!.evaluations![0].outcome).toBe("accepted");
        expect(word.trace!.morphologyPreparation!.prepared!.evaluations![0].guard!.syllableBefore.coda).toEqual(["k", "s", "f"]);
        const forged = structuredClone(word);
        forged.trace!.morphologyPreparation!.before.syllables[0].coda[0].voiced = true;
        expect(() => replayMorphologyPreparation(forged, config)).toThrow(/outside the configured inventory/);
      }
    }
  });
  it("rejects a malformed policy at public generator construction", () => {
    const config = structuredClone(englishConfig);
    config.morphology!.morphophonemicPolicy = { preserveClusterLegality: "false" } as unknown as MorphologyConfig["morphophonemicPolicy"];
    expect(() => createGenerator(config)).toThrow(/must be boolean/);
  });
  it("preserves complete public output, trace, and RNG use when the policy is omitted or false", () => {
    const omitted = structuredClone(englishConfig), disabled = structuredClone(englishConfig);
    delete omitted.morphology!.morphophonemicPolicy;
    disabled.morphology!.morphophonemicPolicy = { preserveClusterLegality: false };
    const a = createGenerator(omitted), b = createGenerator(disabled);
    const randA = createSeededRng(20261004), randB = createSeededRng(20261004);
    for (let index = 0; index < 50; index++) {
      expect(a.generateWord({ rand: randA, trace: true })).toEqual(b.generateWord({ rand: randB, trace: true }));
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
  it.each(observedRoots)(
    "blocks the authenticated $policy/$profile/$seed/$drawIndex collision root",
    (witness) => {
      const config = structuredClone(englishConfig),
        rt = buildClusterRuntime(config);
      const word = structuredClone(witness.before),
        ledger = new FinalPhones(),
        ids = ledger.register("root", word.syllables);
      const trace = new TraceCollector();
      const context: WordGenerationContext = {
        word,
        trace,
        finalPhoneState: { ledger, ids },
        syllableCount: word.syllables.length,
        currSyllableIndex: 0,
        rand: () => {
          throw new Error("Witness attachment must not introduce a draw.");
        },
      };
      const plan: MorphologyPlan = {
        template: witness.template,
        ...(witness.configurationIndices.prefix === undefined
          ? {}
          : {
            prefix:
                config.morphology!.prefixes[
                  witness.configurationIndices.prefix
                ],
          }),
        ...(witness.configurationIndices.suffix === undefined
          ? {}
          : {
            suffix:
                config.morphology!.suffixes[
                  witness.configurationIndices.suffix
                ],
          }),
      };
      const prepared = prepareMorphology(
        {
          config,
          evaluateMorphophonemicReplacement: bindMorphophonemicGuard(rt),
        },
        context,
        plan,
      )!;
      const rejected = prepared.evaluations!.find(
        (row) => row.rule === "ity-velar-softening",
      )!;
      expect(rejected.outcome).toBe("rejected");
      expect(rejected.guard!.syllableBefore.coda).toEqual(["s", "k"]);
      expect(rejected.guard!.syllableProposed.coda).toEqual(["s", "s"]);
      expect(
        rejected.guard!.rejections.some((row) => row.reason === "repetition"),
      ).toBe(true);
      const target = rejected.guard!.assembledTarget;
      expect(
        context.word.syllables[target.syllableIndex].coda.map(
          (phone) => phone.sound,
        ),
      ).toEqual(["s", "k"]);
      expect(
        prepared.rules.some((row) => row.rule.name === "ity-velar-softening"),
      ).toBe(false);
    },
  );

  it("rejects the sound, ledger replacement, and written half together without draws", () => {
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
    expect(prepared.selectionPhones).toEqual(prepared.phoneAssembly);
    const written = writeMorphology(context, prepared);
    expect(written.parts.find((part) => part.role === "root")!.text).toBe(
      "ask",
    );
    expect(draws()).toBe(0);
  });
  it("accepts ordinary single-coda softening with one retained identity", () => {
    const { context, prepared, draws } = fixture(["k"], [softening]);
    expect(context.word.syllables[0].coda.map((p) => p.sound)).toEqual(["s"]);
    expect(prepared.evaluations![0].outcome).toBe("accepted");
    expect(prepared.phoneAssembly!.initial.length).toBe(
      prepared.selectionPhones!.initial.length,
    );
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
  it("replays decisions and rejects forged eligibility or target coordinates", () => {
    const { context, config } = fixture(["s", "k"], [softening]);
    const word = { ...context.word, trace: context.trace!.toTrace(true) };
    expect(() => replayMorphologyPreparation(word, config)).not.toThrow();
    for (const mutate of [
      (copy: typeof word) => {
        copy.trace.morphologyPreparation!.prepared!.evaluations![0].outcome =
          "accepted";
      },
      (copy: typeof word) => {
        copy.trace.morphologyPreparation!.prepared!.evaluations![0].target!.index = 99;
      },
      (copy: typeof word) => {
        copy.trace.morphologyPreparation!.prepared!.evaluations![0].guard!.rejections =
          [];
      },
    ]) {
      const copy = structuredClone(word);
      mutate(copy);
      expect(() => replayMorphologyPreparation(copy, config)).toThrow(
        /replay mismatch/,
      );
    }
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
      prepareMorphology({ config }, context, {
        template: "suffixed",
        suffix: config.morphology!.suffixes[0],
      }),
    ).toThrow(/guard runtime/);
  });
  it("keeps enabled public trace/plain output and RNG draw counts equal", () => {
    const generator = createGenerator(englishConfig);
    const plain = createSeededRng(20261003),
      traced = createSeededRng(20261003);
    let plainCalls = 0,
      tracedCalls = 0;
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
});
