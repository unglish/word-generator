import type { StressMark } from "./stress-pattern.js";
import type { RNG } from "../utils/random.js";
import { RootStressLawError } from "./root-stress-law-types.js";
import type { RootBackwardChoice, RootComponentDraw, RootCountAnalysis, RootLawWork, RootLogMass, RootPatternMass, RootPatternSample, RootStressComponent, RootStressLaw, RootStressLawInput } from "./root-stress-law-types.js";

const ZERO = -Infinity;
const LOG_HUNDRED = Math.log(100);
const MIN_NORMAL = 2 ** -1022;
const MAX_LOG_MAGNITUDE = 1024;
type Bit = 0 | 1;
const BITS = [0, 1] as const;
interface Component { identity: RootStressComponent; logPrior: number; explicitIndex: number | null }
interface Model {
  n: number;
  primary: number;
  lambda: number;
  rhythmic: RootStressLawInput["rhythmic"];
  rhythmLogs: readonly [number, number];
  components: Component[];
}
interface Messages { last: Float64Array; slices?: Float64Array[]; work: RootLawWork }

function invalid(message: string): never {
  throw new RootStressLawError("invalid-input", message);
}
function outOfRange(message: string): never {
  throw new RootStressLawError("unsupported-numerical-range", message);
}
function logAdd(a: number, b: number): number {
  if (a === ZERO) return b;
  if (b === ZERO) return a;
  const hi = Math.max(a, b);
  return hi + Math.log1p(Math.exp(Math.min(a, b) - hi));
}
function mass(value: number): RootLogMass {
  if (value === ZERO) return { status: "zero" };
  if (!Number.isFinite(value)) outOfRange("A computed log mass is not finite.");
  return { status: "finite", value };
}
function percentLogs(percent: number): readonly [number, number] {
  // Dividing a subnormal percentage by 100 would erase real positive support.
  return [percent === 100 ? ZERO : Math.log(100 - percent) - LOG_HUNDRED,
    percent === 0 ? ZERO : Math.log(percent) - LOG_HUNDRED];
}
function validPercent(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 100) invalid(`${label} must be a finite percentage in [0, 100].`);
}
function validWeight(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) invalid(`${label} must be a finite nonnegative weight.`);
}
function validMarks(marks: readonly StressMark[], label: string): void {
  if (!Array.isArray(marks)) invalid(`${label} must be an array of marks.`);
  for (const mark of marks) if (mark !== "unmarked" && mark !== "primary" && mark !== "secondary") invalid(`${label} contains an invalid mark encoding.`);
}

function componentsFor(input: RootStressLawInput, primary: number): Component[] {
  const n = input.afterPrimary.length;
  const none: Component = { identity: { kind: "no-explicit-mark" }, logPrior: 0, explicitIndex: null };
  if (n === 1 || !input.secondary.enabled) return [none];
  const indices = Array.from({ length: input.secondary.candidateWindow === "first-three" ? Math.min(n, 3) : n }, (_, i) => i)
    .filter(i => i !== primary);
  if (!indices.length) return [none];
  const weights = indices.map(i => input.operationalHeavy[i] ? input.secondary.heavyWeight : input.secondary.lightWeight);
  let total = 0;
  let logTotal = ZERO;
  for (const weight of weights) {
    const next = total + weight;
    if (!Number.isFinite(next)) outOfRange("The legacy ordered candidate weight sum overflows.");
    if (weight > 0 && next === total) outOfRange("A positive candidate weight is absorbed by the legacy ordered sum.");
    total = next;
    if (weight > 0) logTotal = logAdd(logTotal, Math.log(weight));
  }
  if (total > 0 && total < MIN_NORMAL) outOfRange("The legacy ordered positive weight total is subnormal.");
  const [failure, success] = percentLogs(input.secondary.probability);
  none.logPrior = failure;
  return [none, ...indices.map((syllableIndex, i): Component => {
    const selection = total === 0 ? (i === indices.length - 1 ? 0 : ZERO)
      : weights[i] === 0 ? ZERO : Math.log(weights[i]) - logTotal;
    return { identity: { kind: "explicit-mark", syllableIndex }, explicitIndex: syllableIndex,
      logPrior: success === ZERO || selection === ZERO ? ZERO : success + selection };
  })];
}

function buildModel(input: RootStressLawInput): Model {
  if (!input || !input.secondary || !input.rhythmic) invalid("A complete root stress law input is required.");
  validMarks(input.beforePrimary, "beforePrimary");
  validMarks(input.afterPrimary, "afterPrimary");
  const n = input.beforePrimary.length;
  if (n < 1 || input.afterPrimary.length !== n || input.beforePrimary.some(mark => mark !== "unmarked")) {
    invalid("The root must be nonempty and entirely unmarked before primary assignment.");
  }
  const primaries = input.afterPrimary.flatMap((mark, i) => mark === "primary" ? [i] : []);
  if (primaries.length !== 1 || input.afterPrimary.includes("secondary")) invalid("Exactly one primary and otherwise unmarked root positions are required.");
  if (!Array.isArray(input.operationalHeavy) || input.operationalHeavy.length !== n || Array.from(input.operationalHeavy).some(value => typeof value !== "boolean")) {
    invalid("Operational heavy classifications must align with every root position.");
  }
  if (typeof input.secondary.enabled !== "boolean" || typeof input.rhythmic.enabled !== "boolean" || typeof input.rhythmic.requireUnstressedNeighbors !== "boolean") {
    invalid("Enabled and neighbor settings must be booleans.");
  }
  if (input.secondary.candidateWindow !== "first-three" && input.secondary.candidateWindow !== "all-nonprimary") invalid("Unknown secondary candidate window.");
  validPercent(input.secondary.probability, "Secondary probability");
  validPercent(input.rhythmic.probability, "Rhythmic probability");
  validWeight(input.secondary.heavyWeight, "Heavy weight");
  validWeight(input.secondary.lightWeight, "Light weight");
  if (!Number.isFinite(input.lambda) || input.lambda < 0) invalid("Lambda must be finite and nonnegative.");
  const components = componentsFor(input, primaries[0]);
  const rhythmLogs = percentLogs(input.rhythmic.probability);
  const largestLogMagnitude = (logs: readonly number[]): number => logs.reduce((largest, value) => value === ZERO ? largest : Math.max(largest, Math.abs(value)), 0);
  const bound = largestLogMagnitude(components.map(component => component.logPrior))
    + Math.max(n - 2, 0) * largestLogMagnitude(rhythmLogs) + (n - 1) * input.lambda;
  if (!Number.isFinite(bound) || bound > MAX_LOG_MAGNITUDE) outOfRange("The conservative accumulated log-magnitude bound exceeds 1024.");
  return { n, primary: primaries[0], lambda: input.lambda, rhythmic: { ...input.rhythmic }, rhythmLogs, components };
}

function initialMark(model: Model, component: Component, i: number): Bit {
  return i === model.primary || i === component.explicitIndex ? 1 : 0;
}
function transition(model: Model, component: Component, i: number, left: Bit, marked: Bit): number {
  const initial = initialMark(model, component, i);
  if (i === 0 || i === model.n - 1 || !model.rhythmic.enabled || initial === 1) return marked === initial ? 0 : ZERO;
  if (model.rhythmic.requireUnstressedNeighbors && (left === 1 || initialMark(model, component, i + 1) === 1)) return marked === 0 ? 0 : ZERO;
  return model.rhythmLogs[marked];
}
function emptyWork(): RootLawWork {
  return { componentPasses: 0, positions: 0, statesVisited: 0, transitionsConsidered: 0, allocatedCells: 0, peakRetainedCells: 0 };
}
function addWork(total: RootLawWork, part: RootLawWork): void {
  total.componentPasses += part.componentPasses;
  total.positions += part.positions;
  total.statesVisited += part.statesVisited;
  total.transitionsConsidered += part.transitionsConsidered;
  total.allocatedCells += part.allocatedCells;
  total.peakRetainedCells = Math.max(total.peakRetainedCells, part.peakRetainedCells);
}
function countCheck(model: Model, count: number): void {
  if (!Number.isInteger(count) || count < 0 || count >= model.n) invalid("Secondary count must be an integer between zero and root length minus one.");
}
function messagePass(model: Model, component: Component, count: number, retain: boolean): Messages {
  const width = count + 1;
  const cells = width * 2;
  const work = emptyWork();
  work.componentPasses = 1;
  work.positions = model.n;
  const allocate = (): Float64Array => {
    work.allocatedCells += cells;
    return new Float64Array(cells).fill(ZERO);
  };
  let previous = allocate();
  previous[0] = 0;
  const slices = retain ? [previous] : undefined;
  let next = allocate();
  for (let i = 0; i < model.n; i++) {
    next.fill(ZERO);
    for (const left of BITS) {
      for (let k = 0; k <= count; k++) {
        const prefix = previous[left * width + k];
        if (prefix === ZERO) continue;
        work.statesVisited++;
        for (const marked of BITS) {
          work.transitionsConsidered++;
          const increment = i === model.primary ? 0 : marked;
          if (k + increment > count) continue;
          const step = transition(model, component, i, left, marked);
          if (step === ZERO) continue;
          const index = marked * width + k + increment;
          next[index] = logAdd(next[index], prefix + step - model.lambda * left * marked);
        }
      }
    }
    if (slices) {
      slices.push(next);
      previous = next;
      if (i + 1 < model.n) next = allocate();
    } else {
      [previous, next] = [next, previous];
    }
  }
  work.peakRetainedCells = retain ? (model.n + 1) * cells : 2 * cells;
  return { last: previous, slices, work };
}

function countAnalysis(model: Model, count: number): RootCountAnalysis {
  countCheck(model, count);
  const work = emptyWork();
  let partition = ZERO;
  const components = model.components.map(component => {
    let tilted = ZERO;
    if (component.logPrior !== ZERO) {
      const pass = messagePass(model, component, count, false);
      addWork(work, pass.work);
      const terminal = logAdd(pass.last[count], pass.last[2 * count + 1]);
      if (terminal !== ZERO) tilted = component.logPrior + terminal;
    }
    partition = logAdd(partition, tilted);
    return { component: { ...component.identity }, prior: mass(component.logPrior), tiltedMassAtK: mass(tilted) };
  });
  return { secondaryCount: count, logPartition: mass(partition), components, work };
}

function patternAnalysis(model: Model, marks: readonly StressMark[]): RootPatternMass {
  validMarks(marks, "Pattern");
  if (marks.length !== model.n || marks[model.primary] !== "primary" || marks.some((mark, i) => i !== model.primary && mark === "primary")) {
    invalid("A pattern must retain the root's one primary at its assigned position.");
  }
  let secondaryCount = 0;
  let adjacentMarkedPairs = 0;
  for (let i = 0; i < marks.length; i++) {
    if (marks[i] === "secondary") secondaryCount++;
    if (i > 0 && marks[i - 1] !== "unmarked" && marks[i] !== "unmarked") adjacentMarkedPairs++;
  }
  let prior = ZERO;
  for (const component of model.components) {
    let path = component.logPrior;
    let left: Bit = 0;
    for (let i = 0; i < model.n && path !== ZERO; i++) {
      const marked = marks[i] === "unmarked" ? 0 : 1;
      const step = transition(model, component, i, left, marked);
      path = step === ZERO ? ZERO : path + step;
      left = marked;
    }
    prior = logAdd(prior, path);
  }
  return { secondaryCount, adjacentMarkedPairs, priorLogMass: mass(prior),
    tiltedLogMass: mass(prior === ZERO ? ZERO : prior - model.lambda * adjacentMarkedPairs) };
}

/** Compare against a binary conditional threshold without exponentiating a tiny mass. */
function chooseFirst(first: number, second: number, uniform: number): boolean {
  const total = logAdd(first, second);
  return first <= second ? Math.log(uniform) < first - total : Math.log1p(-uniform) > second - total;
}
function draw(rand: RNG): number {
  const value = rand();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RootStressLawError("invalid-rng", "The opt-in sampler requires finite RNG values in [0, 1).");
  return value;
}

function samplePattern(model: Model, count: number, rand: RNG): RootPatternSample {
  if (typeof rand !== "function") invalid("A sampling RNG function is required.");
  const analysis = countAnalysis(model, count);
  if (analysis.logPartition.status === "zero") throw new RootStressLawError("zero-support", "The requested secondary count has zero declared-law support.");
  const positive = analysis.components.flatMap((component, index) => component.tiltedMassAtK.status === "finite" ? [{ index, value: component.tiltedMassAtK.value }] : []);
  const tails = new Array<number>(positive.length).fill(ZERO);
  for (let i = positive.length - 1; i >= 0; i--) tails[i] = logAdd(positive[i].value, tails[i + 1] ?? ZERO);
  const componentDraws: RootComponentDraw[] = [];
  let ordinal = 0;
  let selectedComponentIndex = positive[positive.length - 1].index;
  let componentTermination: RootPatternSample["componentTermination"] = positive.length === 1 ? "only-positive" : "last-positive";
  for (let i = 0; i < positive.length - 1; i++) {
    const uniform = draw(rand);
    const takeCandidate = chooseFirst(positive[i].value, tails[i + 1], uniform);
    componentDraws.push({ candidateIndex: positive[i].index, remainingFromIndex: positive[i + 1].index,
      logCandidateMass: positive[i].value, logRemainingMass: tails[i + 1], uniform, drawOrdinal: ordinal++, takeCandidate });
    if (takeCandidate) {
      selectedComponentIndex = positive[i].index;
      componentTermination = "accepted-candidate";
      break;
    }
  }
  const component = model.components[selectedComponentIndex];
  const pass = messagePass(model, component, count, true);
  const work = { ...analysis.work };
  addWork(work, pass.work);
  const marks: StressMark[] = new Array(model.n).fill("unmarked");
  const backward: RootBackwardChoice[] = [];
  let marked = initialMark(model, component, model.n - 1); // The right edge is deterministic within each component.
  let remaining = count;
  for (let i = model.n - 1; i >= 0; i--) {
    marks[i] = i === model.primary ? "primary" : marked === 1 ? "secondary" : "unmarked";
    const previousCount = remaining - (i === model.primary ? 0 : marked);
    if (previousCount < 0) throw new Error("Root stress sampler reached a negative predecessor count.");
    const candidates = BITS.map(left => {
      const prefix = pass.slices![i][left * (count + 1) + previousCount];
      const step = transition(model, component, i, left, marked);
      return prefix === ZERO || step === ZERO ? ZERO : prefix + step - model.lambda * left * marked;
    });
    let previous: Bit;
    if (candidates[0] === ZERO && candidates[1] === ZERO) throw new Error("Root stress sampler reached an unsupported predecessor state.");
    if (candidates[0] === ZERO || candidates[1] === ZERO) {
      previous = candidates[0] === ZERO ? 1 : 0;
      backward.push({ kind: "forced", syllableIndex: i, previousMarked: previous === 1, remainingSecondaryCount: remaining });
    } else {
      const uniform = draw(rand);
      previous = chooseFirst(candidates[0], candidates[1], uniform) ? 0 : 1;
      backward.push({ kind: "drawn", syllableIndex: i, previousMarked: previous === 1, remainingSecondaryCount: remaining,
        logUnmarkedMass: candidates[0], logMarkedMass: candidates[1], uniform, drawOrdinal: ordinal++ });
    }
    remaining = previousCount;
    marked = previous;
  }
  if (remaining !== 0 || marked !== 0) throw new Error("Root stress sampler failed to reach its initial state.");
  const pattern = patternAnalysis(model, marks);
  if (pattern.priorLogMass.status === "zero" || pattern.tiltedLogMass.status === "zero") throw new Error("Root stress sampler produced an unsupported pattern.");
  return { marks, count: analysis, selectedComponentIndex, componentTermination, componentDraws, backward,
    selectedPatternPriorLogMass: pattern.priorLogMass.value,
    selectedPatternConditionalLogMass: pattern.tiltedLogMass.value - analysis.logPartition.value, work };
}

/** Pure count-conditioned law. This does not execute the legacy proposal or mutate a word. */
export function createRootStressLaw(input: RootStressLawInput): RootStressLaw {
  const model = buildModel(input);
  return {
    analyzeCount: count => countAnalysis(model, count),
    analyzePattern: marks => patternAnalysis(model, marks),
    sample: (count, rand) => samplePattern(model, count, rand),
  };
}
