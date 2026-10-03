import { describe, expect, it } from "vitest";
import { parseCmuRecords, selectCompatibleCmu } from "../corpus/cmu.js";
import { allocatePosTokenMass, FREQUENCY_COLUMNS, joinFrequencyPronunciations, parseFrequencyTable } from "../corpus/frequency-source.js";

const header = FREQUENCY_COLUMNS.join("\t");
const row = (word: string, count = "10", lower = "4") => `${word}\t${count}\t2\t${lower}\t1\t99999\t0\t99\t0`;

describe("raw frequency population", () => {
  it("uses integer token counts, retaining case and source rows instead of rounded/log/CD columns", () => {
    expect(parseFrequencyTable(`${header}\r\n${row("The")}\r\n`)).toEqual([
      { line: 2, label: "The", spelling: "the", count: 10, lowercaseCount: 4 },
    ]);
  });
  it("rejects normalized duplicates, unsupported spelling, invalid counts and malformed columns", () => {
    for (const text of [
      `${header}\n${row("The")}\n${row("the")}`, `${header}\n${row("can't")}`,
      `${header}\n${row("the", "1.5")}`, `${header}\n${row("the", "0", "0")}`,
      `${header}\n${row("the", "9007199254740992")}`, `${header}\n${row("the", "3", "4")}`,
      `${header}\n${row("the")}\textra`, `Word\tSUBTLWF\n${row("the")}`,
    ]) expect(() => parseFrequencyTable(text)).toThrow();
  });
  it("retains unmatched type and token mass before any renormalization, with explicit pronunciation selection", () => {
    const source = selectCompatibleCmu(parseCmuRecords("the DH AH0\nthe(2) DH IY1\ncat K AE1 T\n"));
    const frequency = parseFrequencyTable(`${header}\n${row("The")}\n${row("cat", "7")}\n${row("missing", "5")}`);
    const result = joinFrequencyPronunciations(frequency, source.entries);
    expect(result.coverage).toEqual({ types: 3, tokens: 22, joinedTypes: 2, joinedTokens: 17, missingTypes: 1, missingTokens: 5 });
    expect(result.joined[0].pronunciation.tokens).toEqual(["DH", "AH0"]);
    expect(result.missing[0].spelling).toBe("missing");
    expect(() => joinFrequencyPronunciations(frequency, [...source.entries, source.entries[0]])).toThrow(/unique/);
    expect(() => joinFrequencyPronunciations([...frequency, frequency[0]], source.entries)).toThrow(/Duplicate/);
  });
});

describe("ambiguous POS modeled allocation", () => {
  it("retains a source mass discrepancy and allocates exact rational shares without choosing the dominant tag", () => {
    const allocation = allocatePosTokenMass(10, [{ tag: "Noun", count: 2 }, { tag: "Pronoun", count: 4 }, { tag: "Name", count: 6 }]);
    expect(allocation).toEqual({ interpretation: "modeled-within-row-pos-allocation", wordCount: 10,
      taggedCount: 12, wordMinusTaggedCount: -2, masses: {
        content: { numerator: "5", denominator: "3" }, function: { numerator: "10", denominator: "3" },
        other: { numerator: "5", denominator: "1" }, unknown: { numerator: "0", denominator: "1" },
      } });
    expect(allocatePosTokenMass(20, [{ tag: "Verb", count: 1 }]).wordMinusTaggedCount).toBe(19);
  });
  it("keeps absent and zero POS mass unknown rather than assigning content or function class", () => {
    for (const pos of [null, [], [{ tag: "Noun", count: 0 }]]) {
      const allocation = allocatePosTokenMass(7, pos);
      expect(allocation.masses.unknown).toEqual({ numerator: "7", denominator: "1" });
      expect(allocation.masses.content.numerator).toBe("0");
    }
    expect(allocatePosTokenMass(7, null).taggedCount).toBeNull();
  });
  it("rejects unregistered/repeated tags, noninteger or unsafe masses and overflow", () => {
    for (const pos of [[{ tag: "Alien", count: 1 }], [{ tag: "Noun", count: -1 }], [{ tag: "Noun", count: 0.1 }],
      [{ tag: "Noun", count: 1 }, { tag: "Noun", count: 2 }],
      [{ tag: "Noun", count: Number.MAX_SAFE_INTEGER }, { tag: "Verb", count: 1 }]]) {
      expect(() => allocatePosTokenMass(10, pos)).toThrow();
    }
    expect(() => allocatePosTokenMass(0, null)).toThrow();
  });
});
