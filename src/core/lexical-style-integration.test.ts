import { describe, expect, it } from "vitest";
import { createGenerator, createSeededRng, englishConfig, englishStyleExperiment, englishOriginSources } from "../index.js";
import type { LanguageConfig } from "../config/language.js";
import type { Grapheme, Word } from "../types.js";
import { buildGraphemeMaps } from "../elements/graphemes/index.js";
import { compileLexicalStyle } from "./lexical-style.js";
import { createStyledGraphemeResolver } from "./lexical-style-resolver.js";
import { createGraphemeResolver } from "./grapheme-selection.js";
import { createGraphemeSequenceModel, type SequenceSlot } from "./spelling-sequence-model.js";
import { createSequenceEvidenceSession, verifySequenceEvidence } from "./spelling-sequence-evidence.js";
import { spellingBoundaryContexts } from "./spelling-context.js";

function configured(conditioned = false): LanguageConfig {
  return { ...englishConfig, lexicalStyle: structuredClone(englishStyleExperiment),
    ...(conditioned ? { followingLetters: { targets: [{ phoneme: "s", form: "c" }, { phoneme: "s", form: "sc" }, { phoneme: "dʒ", form: "g" }] } } : {}) };
}
function surface(word: Word) { const copy = structuredClone(word); delete copy.trace; return copy; }
function fixture() {
  const make = (phoneme: string, form: string): Grapheme => ({ phoneme, form, origin: 0, frequency: 100,
    positionScope: "segment", startWord: 1, midWord: 1, endWord: 1, onset: 1, nucleus: 1, coda: 1 });
  const graphemes = [make("f", "f"), make("f", "ph"), make("æ", "a")];
  const config = configured(); config.graphemes = graphemes; Object.assign(config, buildGraphemeMaps(graphemes));
  config.lexicalStyle!.policy.features = config.lexicalStyle!.policy.features.filter(feature => feature.phoneme === "f");
  const phones = ["f", "æ"].map(sound => config.phonemes.find(phone => phone.sound === sound)!);
  const slots: SequenceSlot[] = phones.map((phoneme, index) => ({
    grapheme: { phoneme, prevPhoneme: phones[index - 1], nextPhoneme: phones[index + 1], index, total: 2,
      position: index === 0 ? "onset" : "nucleus", syllableIndex: 0, syllableCount: 1,
      onsetLength: 1, nucleusLength: 1, codaLength: 0, isCluster: false },
    doubling: { phoneme, prevPhoneme: phones[index - 1], nextNucleus: phones[index + 1],
      position: index === 0 ? "onset" : "nucleus", prevReduced: false, isCluster: false,
      isFirstInCoda: false, isLastPhoneme: index === 1, isEndOfWord: true,
      isMonosyllabic: true, nextIsConsonant: false },
  }));
  return { config, slots };
}

describe("inventory uncertainty and opt-in public style", () => {
  it("assesses the complete inventory without guessing a language or changing legacy codes", () => {
    const sources = new Set(englishOriginSources.map(source => source.id));
    for (const grapheme of englishConfig.graphemes) {
      expect(grapheme.originAssessment).toBeDefined();
      expect(grapheme.originAssessment!.legacy.code).toBe(grapheme.origin);
      expect(grapheme.originAssessment!.legacy.status).toBe("unsourced-legacy");
      for (const pathway of grapheme.originAssessment!.pathways) expect(sources.has(pathway.source_id)).toBe(true);
    }
    const mb = englishConfig.graphemes.find(grapheme => grapheme.phoneme === "m" && grapheme.form === "mb")!;
    expect(mb.origin).toBe(5); expect(mb.originAssessment!.legacy.label).toBeNull();
    expect(mb.originAssessment!.pathways.map(pathway => pathway.example)).toEqual(["thumb", "plumb"]);
    const ph = englishConfig.graphemes.find(grapheme => grapheme.phoneme === "f" && grapheme.form === "ph")!;
    expect(ph.originAssessment!.pathways.map(pathway => pathway.example)).toEqual(["philosophy", "nephew"]);
  });
  it("keeps omitted and valid zero policy complete words/traces and RNG state identical", () => {
    for (const conditioned of [false, true]) {
      const base = configured(conditioned); delete base.lexicalStyle;
      const zero = configured(conditioned); zero.lexicalStyle!.policy.strength = 0;
      const baseline = createGenerator(base), disabled = createGenerator(zero);
      for (const seed of [19, 237, 991, 2001]) {
        const a = createSeededRng(seed), b = createSeededRng(seed);
        for (let index = 0; index < 12; index++) {
          expect(disabled.generateWord({ rand: b, morphology: index % 2 === 0, mode: index % 3 === 0 ? "text" : "lexicon", trace: true }))
            .toEqual(baseline.generateWord({ rand: a, morphology: index % 2 === 0, mode: index % 3 === 0 ? "text" : "lexicon", trace: true }));
        }
        expect(b()).toBe(a());
      }
    }
  });
  it("keeps traced/plain output and RNG parity with legal style evidence in both writer paths", () => {
    for (const conditioned of [false, true]) {
      const config = configured(conditioned), generator = createGenerator(config);
      const observed = new Set<string>(); let supported = 0;
      for (let seed = 0; seed < 100; seed++) {
        const a = createSeededRng(seed), b = createSeededRng(seed);
        const traced = generator.generateWord({ rand: a, morphology: seed % 2 === 0, trace: true });
        const plain = generator.generateWord({ rand: b, morphology: seed % 2 === 0 });
        expect(surface(traced)).toEqual(plain); expect(a()).toBe(b());
        const choice = traced.trace!.lexicalStyle!; observed.add(choice.style_id);
        for (const selection of traced.trace!.graphemeSelections) {
          expect(selection.styleWeights!.every(weight => Number.isFinite(weight.final_weight) && weight.final_weight > 0)).toBe(true);
          for (const weight of selection.styleWeights!) {
            const feature = config.lexicalStyle!.policy.features.find(value => value.phoneme === weight.phoneme && value.form === weight.form);
            const multiplier = feature?.associations.find(value => value.style_id === choice.style_id)?.multiplier ?? 1;
            expect(weight.multiplier).toBe(multiplier); expect(weight.final_weight).toBe(weight.base_weight * multiplier);
            if (feature) supported++;
          }
        }
        if (conditioned) {
          const runtime = compileLexicalStyle(config.lexicalStyle!.policy, config.lexicalStyle!.id, config.graphemes)!;
          const resolve = createStyledGraphemeResolver(createGraphemeResolver(config), runtime, choice);
          const contexts = spellingBoundaryContexts(traced.trace!.baseSpelling!.phones);
          const model = createGraphemeSequenceModel(config, contexts.map(entry => ({ grapheme: entry.slot, doubling: entry.doubling })), config.followingLetters!.targets, resolve);
          verifySequenceEvidence(model, traced.trace!.graphemeSelections.map(selection => selection.conditionedSelection!));
        }
      }
      expect(observed).toEqual(new Set(["plain", "marked"])); expect(supported).toBeGreaterThan(0);
    }
  });
  it("takes one extra neutral-style draw per requested word even when length retries are forced", () => {
    const base = { ...englishConfig, syllableStructure: { ...englishConfig.syllableStructure,
      letterLengthTargets: { 1: [100, 101, 102, 103] as [number, number, number, number] } } };
    const styled = { ...base, lexicalStyle: structuredClone(englishStyleExperiment) };
    for (const feature of styled.lexicalStyle.policy.features) for (const association of feature.associations) association.multiplier = 1;
    let baseDraws = 0, styledDraws = 0;
    const a = createGenerator(base).generateWord({ rand: () => { baseDraws++; return .25; }, syllableCount: 1, morphology: false, trace: true });
    const b = createGenerator(styled).generateWord({ rand: () => { styledDraws++; return .25; }, syllableCount: 1, morphology: false, trace: true });
    expect(surface(b)).toEqual(surface(a)); expect(styledDraws - baseDraws).toBe(1);
    expect(b.trace!.lexicalStyle!.style_id).toBe("plain");
    expect(baseDraws).toBeGreaterThan(100);
  });
  it("rejects a feature outside the configured inventory even at zero strength", () => {
    const config = configured(); config.lexicalStyle!.policy.features[0].form = "not-in-inventory";
    expect(() => createGenerator(config)).toThrow("configured grapheme inventory");
    config.lexicalStyle!.policy.strength = 0;
    expect(() => createGenerator(config)).toThrow("configured grapheme inventory");
  });
});

describe("actual styled conditioned-sequence probability law", () => {
  it("uses analytically known styled mass rather than the unstyled resolver law", () => {
    const { config, slots } = fixture();
    const runtime = compileLexicalStyle(config.lexicalStyle!.policy, config.lexicalStyle!.id, config.graphemes)!;
    const resolve = createStyledGraphemeResolver(createGraphemeResolver(config), runtime, runtime.choose(() => .75));
    const model = createGraphemeSequenceModel(config, slots, [], resolve);
    const first = model.edges(0, model.initial);
    const phMass = first.filter(edge => edge.choice.selected === "ph").reduce((sum, edge) => sum + Math.exp(edge.logProbability), 0);
    expect(phMass).toBeCloseTo(.6, 12);
    const session = createSequenceEvidenceSession(model);
    expect(session.next(.5).choice.selected).toBe("ph"); session.next(.5); session.finish();
  });
  it("still excludes a globally incompatible styled spelling without relaxing its obligation", () => {
    const { config, slots } = fixture();
    config.graphemes[1].reading = { kind: "following-letter", require: ["e"] };
    const runtime = compileLexicalStyle(config.lexicalStyle!.policy, config.lexicalStyle!.id, config.graphemes)!;
    const resolve = createStyledGraphemeResolver(createGraphemeResolver(config), runtime, runtime.choose(() => .75));
    const model = createGraphemeSequenceModel(config, slots, [{ phoneme: "f", form: "ph" }], resolve);
    const session = createSequenceEvidenceSession(model), first = session.next(.99);
    expect(first.choice.selected).toBe("f"); expect(first.logSequenceMass).toBeCloseTo(Math.log(.4), 12);
    expect(first.logConditionalProbability).toBeCloseTo(0, 12); session.next(.5); session.finish();
  });
});
