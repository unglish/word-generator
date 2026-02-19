# 🧠 `agents.md` — Contributing Guidance for Human & Machine Agents

Welcome, agent. Whether you're a human developer, an AI model (e.g. Codex), or a hybrid system, this document outlines the principles and protocols for collaborating with the `unglish/word-generator` library—the engine behind the phonetically valid nonsense language of Unglish.

## 📚 Linguistic Orientation

This project is grounded in the principles of **linguistic research**, particularly **generative phonology**—the study of how phonological forms are rule-governed and systematically structured. Agents working on this codebase are encouraged to draw from linguistic theory, especially when proposing new features, constraints, or representations.

Key concepts that may inform contributions include:

* Phonotactic constraints
* Syllable structure (onset–nucleus–coda)
* Sonority hierarchy
* Stress assignment
* Rule-based transformations

This orientation ensures our nonsense words remain phonologically valid while retaining creative flexibility.

## 🌟 Project Purpose

This module generates English-sounding nonsense words based on phonotactic rules. It powers creative experiments, performances, and generative art tools in the Unglish project.

Its goal is not to model "real" English—but to convincingly echo its sound patterns through a configurable, deterministic, and reusable API.

---

## ✅ Core Design Goals

| Principle                    | Description                                                                                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Modern TypeScript**        | Use idiomatic, strongly typed TypeScript (ESM-first, strict mode, helpful types).                                                               |
| **Minimal Dependencies**     | Avoid bloated libraries. Favor zero-dependency utilities when possible.                                                                         |
| **Deterministic Generation** | Support repeatable word generation. “Deterministic” in this context means a given configuration and seed will always result in the same output. |
| **Phonological Fidelity**    | Obey plausible English phonotactics while allowing stylized nonsense.                                                                           |
| **Composable API**           | Each unit (syllable, phoneme, rule) should be a testable, reusable function.                                                                    |
| **Multimodal Output**        | Expose interfaces usable in CLI, Web, and other environments without bias.                                                                      |

---

## 🛠️ Implementation Notes

### TypeScript Best Practices

* Define helper functions (e.g., `isOnset(p: Phoneme): boolean`) to clarify phoneme roles.
* Use `export type` and `export interface` liberally to describe internal structures (`Phoneme`, `Syllable`, `Word`, etc.).
* Core phonological data is represented as structured objects (see `phonemes.ts`), not union literals.
* Phoneme categories like "onset", "coda", or "vowel" are derived via filtering logic (e.g. `phoneme.onset > 0`).
* Prefer helper functions for filtering or classification (e.g. `isOnset(p: Phoneme): boolean`).
* Prefer named exports from modules; avoid excessive default exports unless justified.
* Use union and literal types when modeling constrained static categories (e.g. CLI modes, config fields).
* Embrace immutability and pure functions wherever feasible. to describe internal structures (`Phoneme`, `Syllable`, `Word`, etc.).
* Keep `strict` mode enabled.

### Code Structure

* Core logic lives in `/src`, separated by linguistic unit:

  * `/phonemes` – inventories and distributions
  * `/syllables` – construction and combination logic
  * `/words` – final output assembly
* Tests live alongside the source files they are testing, using the `.test.ts` naming convention.

### Testing & Benchmarking

* Example: Generate 5 deterministic words from a fixed seed

```ts
const words = generateWords({ count: 5, seed: 42 });
```

* All critical modules should be covered by test harnesses that verify both structure and behavior.
* Use property-based or generative tests to ensure word outputs remain phonotactically valid across a range of inputs.
* Benchmarking should be run regularly for core modules (`syllable`, `word`, `phoneme`) to track performance regressions.
* If introducing new logic, include a benchmark comparison against the prior version where practical.
* Use `vitest`'s built-in benchmarking or integrate simple timing diagnostics via CLI when debugging performance edge cases.

---

### Dependencies

* Keep the dependency tree small. If a task can be done with native JavaScript or a utility under 200 lines, prefer that.
* It’s okay to use experimental or emerging standards, as long as they are implemented by Chromium.
* Use:

  * [`vitest`](https://vitest.dev) for tests
  * [`typescript`](https://www.typescriptlang.org/) as the only compiler dependency
* Avoid:

  * Large runtime frameworks (e.g. lodash, moment)
  * Bundlers unless needed for the demo.&#x20;

## 🔁 Tasks for Codex Agents

When acting as a Codex agent (or similar automated system), you are expected to:

| Task                    | Guidance                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------- |
| Generate new words      | Use the existing API (no hacks or direct array calls).                                 |
| Create new phoneme sets | Place them in `/phonemes/`, ensure they obey structure of `{ label, symbol, weight }`. |
| Add new syllable rules  | Define them clearly, export them cleanly, and test coverage should follow.             |
| Refactor for clarity    | Submit diffs that reduce complexity without obscuring linguistic intent.               |
| Add CLI flags or modes  | Be minimal. Favor UNIX-like composability. Document them.                              |

---

## 🔍 Trace-First Diagnostics Requirement

When diagnosing n-gram outliers, use generation with `trace: true` by default and
ground root-cause claims in `WordTrace` evidence (`stages`, `graphemeSelections`,
`structural`, `repairs`, `morphology`). Do not rely on surface string inspection alone.

## 🧰 Tooling Expectations & Downstream Use Cases

> 🤖 Codex agents: Prefer explicit, composable logic. Avoid random branching or undocumented output variations.
> This library is intentionally scoped to **word generation only**. It defines the phonological logic and rules needed to generate English-like nonce words. However, it is expected to live alongside other libraries in a growing ecosystem.

Agents and contributors should anticipate additional tooling that will:

* Visualize and audit generated words (e.g. syllable trees, sonority profiles, phoneme histograms)
* Translate or annotate words for poetic, interpretive, or scholarly use
* Provide UI components for editing, seeding, filtering, and remixing generated outputs
* Enable integration into performance art, games, conlangs, and experimental writing tools

This separation of concerns keeps the word engine lean and composable, while supporting rich multimodal experiences elsewhere in the stack.

Word outputs may optionally include structure like `{ text: string, phonemes: string[], syllables: Syllable[] }`, and support helpers like `.toJSON()` or `.toIPA()` for downstream tooling.

---

## 📜 License & Usage

This library is open to creative and experimental use. Word outputs are not copyrighted, but contributions to core logic are MIT-licensed.

---

## 📌 Considerations for the Future

We want to grow the flexibility and expressive range of the generator. Planned capabilities include:

* **Customizable phoneme and grapheme sets** — allowing users to define their own inventories, alphabets, or symbol systems.
* **Flexible phonotactics** — support for reconfigurable syllable structures and phonological rules to model languages beyond English.
* These features will support multilingual experiments, user-defined conlangs, and dialectal or stylistic variation.

---

— The Unglish Engine Custodians
