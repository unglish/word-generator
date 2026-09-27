import assert from "node:assert/strict";
import test from "node:test";
import { planConditionedSequence, type SequenceModel } from "./conditioned-sequence.js";

function close(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} != ${expected}`);
}

test("conditional paths match independent exhaustive multiplication", () => {
  // The next distribution depends on the previous choice; repeated b is illegal.
  const probability = (prefix: string, next: string) => prefix.endsWith("a")
    ? (next === "a" ? 0.8 : 0.2) : (next === "a" ? 0.3 : 0.7);
  const model: SequenceModel<string, string> = {
    length: 4, initial: "", key: s => s,
    edges: (_i, s) => ["a", "b"].map(choice => ({ next: s + choice, choice, logProbability: Math.log(probability(s, choice)) })),
    accepts: s => !s.includes("bb") && s.endsWith("a"),
  };
  const expected = new Map<string, number>();
  for (let bits = 0; bits < 16; bits++) {
    const path = bits.toString(2).padStart(4, "0").replaceAll("0", "a").replaceAll("1", "b");
    if (path.includes("bb") || !path.endsWith("a")) continue;
    let mass = 1;
    for (let i = 0; i < path.length; i++) mass *= probability(path.slice(0, i), path[i]);
    expected.set(path, mass);
  }
  const total = [...expected.values()].reduce((a, b) => a + b, 0);
  const plan = planConditionedSequence(model);
  close(Math.exp(plan.logMass), total);
  for (const [path, mass] of expected) {
    let conditional = 1;
    for (let i = 0; i < path.length; i++) {
      const choices = plan.choices(i, path.slice(0, i));
      close(choices.reduce((sum, edge) => sum + Math.exp(edge.logConditionalProbability), 0), 1);
      conditional *= Math.exp(choices.find(edge => edge.choice === path[i])!.logConditionalProbability);
    }
    close(conditional, mass / total);
  }
});

test("merged states retain duplicate outcome identities and draw boundaries", () => {
  const plan = planConditionedSequence({ length: 1, initial: 0, key: String,
    edges: () => [1, 3].map((weight, choice) => ({ next: 1, choice, logProbability: Math.log(weight / 4) })),
    accepts: () => true });
  assert.equal(plan.states, 2);
  assert.equal(plan.choices(0, 0).length, 2);
  assert.equal(plan.draw(0, 0, 0).choice, 0);
  assert.equal(plan.draw(0, 0, 0.25).choice, 1);
  assert.equal(plan.draw(0, 0, 1 - Number.EPSILON).choice, 1);
});

test("log masses preserve viable sequences whose total probability underflows", () => {
  const plan = planConditionedSequence({ length: 1000, initial: 0, key: String,
    edges: (_i: number, s: number) => [{ next: s + 1, choice: "rare", logProbability: -10 }],
    accepts: () => true });
  assert.equal(plan.logMass, -10000);
  assert.equal(plan.choices(0, 0)[0].logConditionalProbability, 0);
  assert.equal(plan.draw(0, 0, 0.9).choice, "rare");
});

test("impossible and zero-mass paths remain explicit", () => {
  const plan = planConditionedSequence({ length: 1, initial: 0, key: String,
    edges: () => [{ next: 1, choice: "zero", logProbability: -Infinity }], accepts: () => true });
  assert.equal(plan.logMass, -Infinity);
  assert.deepEqual(plan.choices(0, 0), []);
  assert.throws(() => plan.draw(0, 0, 0.5), /No legal/);
  assert.throws(() => plan.draw(0, 0, 1), /Roll/);
});
