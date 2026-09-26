import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { parseCmuPhone, parseCmuRecords, selectCompatibleCmu } from "../corpus/cmu.js";
import { buildReference } from "./wordlikeness/model.js";

describe("lossless CMU source records", () => {
  it.each(["", "\n", "\r\n\n", ";;; note\r\n  Cat K AE1 T  # comment  \nlast L AE1 S T", "a AH0\r"])("retains every input character: %j", text => {
    const records = parseCmuRecords(text);
    expect(records.map(record => record.raw + record.ending).join("")).toBe(text);
    expect(records.map(record => record.line)).toEqual(records.map((_, index) => index + 1));
  });

  it("retains labels, alternatives, comments and uninterpreted tokens", () => {
    const records = parseCmuRecords("  Cat(02) K AE2 T XX  # retained  \r\n;;; whole comment\n\n");
    expect(records[0]).toMatchObject({ kind: "entry", line: 1, label: "Cat(02)", variant: "02", headword: "cat", spelling: null,
      comment: { offset: 20, text: "  # retained  " },
      tokens: [{ raw: "K", phone: { kind: "consonant", base: "K" } }, { raw: "AE2", phone: { kind: "vowel", base: "AE", stress: 2 } },
        { raw: "T", phone: { kind: "consonant", base: "T" } }, { raw: "XX", phone: null }],
    });
    expect(records.slice(1).map(record => record.kind)).toEqual(["comment", "blank"]);
  });

  it.each(["AH", "AH3", "AH10", "B1", "ah0", "X", "1", "", "ER-1"])("does not coerce malformed phone %j", token => {
    expect(parseCmuPhone(token)).toBeNull();
  });

  it.each([0, 1, 2] as const)("keeps vowel stress %s explicit", stress => {
    expect(parseCmuPhone(`AH${stress}`)).toEqual({ kind: "vowel", raw: `AH${stress}`, base: "AH", stress });
    expect(parseCmuPhone(`ER${stress}`)).toEqual({ kind: "vowel", raw: `ER${stress}`, base: "ER", stress });
    expect(parseCmuPhone("R")).toEqual({ kind: "consonant", raw: "R", base: "R" });
  });
});

describe("wordlikeness compatibility population", () => {
  it("retains the first valid unlabelled form and exact first-exclusion order", () => {
    const text = ["bad(2) X", "can't X", "123 AH1", "café K AE1 F EY1", "empty", "cat K XX T", "cat K AE1 T",
      "CAT K AH1 T", "novowel K T", "cat(3) K AE1 T", "other AH0 DH ER0 # comment"].join("\n");
    const selected = selectCompatibleCmu(parseCmuRecords(text));
    expect(selected.entries.map(entry => [entry.spelling, entry.tokens])).toEqual([["cat", ["K", "AE1", "T"]], ["other", ["AH0", "DH", "ER0"]]]);
    expect(selected.excluded).toEqual({ alternate_pronunciation: 2, non_ascii_spelling: 3, unsupported_pronunciation: 2, duplicate_spelling: 1, no_vowel: 1 });
    expect(selected.rejections.map(item => item.line)).toEqual([1, 2, 3, 4, 5, 6, 8, 9, 10]);
    expect(selected.entries.length + selected.rejections.length).toBe(11);
    expect(buildReference(text, "fixture").corpus.excluded).toEqual(selected.excluded);
  });

  it("does not infer a default pronunciation from a numbered alternative", () => {
    const selected = selectCompatibleCmu(parseCmuRecords("only(2) OW1 N L IY0\ninvalid X\ninvalid(2) IH1 N V AE0 L IH0 D"));
    expect(selected.entries).toEqual([]);
    expect(selected.excluded).toEqual({ alternate_pronunciation: 2, unsupported_pronunciation: 1 });
  });

  it("returns detached tokens and phone interpretations", () => {
    const records = parseCmuRecords("cat K AE1 T");
    const before = structuredClone(records);
    const selected = selectCompatibleCmu(records);
    expect(records).toEqual(before);
    selected.entries[0].tokens[0] = "B";
    selected.entries[0].phones[0].base = "B";
    expect(records).toEqual(before);
    expect(selectCompatibleCmu(records).entries[0].tokens).toEqual(["K", "AE1", "T"]);
  });

  it("preserves aggregate order invariance only when selected forms are unchanged", () => {
    const rows = ["cat K AE1 T", "bat B AE1 T", "about AH0 B AW1 T"];
    const a = buildReference(rows.join("\n"), "test");
    const b = buildReference([...rows].reverse().join("\n"), "test");
    expect(b.characters).toEqual(a.characters);
    expect(b.constituents).toEqual(a.constituents);
    expect(b.initial_onsets).toEqual(a.initial_onsets);
    const conflict = ["cat K AE1 T", "CAT K AH1 T"];
    expect(selectCompatibleCmu(parseCmuRecords(conflict.join("\n"))).entries[0].tokens).toEqual(["K", "AE1", "T"]);
    expect(selectCompatibleCmu(parseCmuRecords(conflict.reverse().join("\n"))).entries[0].tokens).toEqual(["K", "AH1", "T"]);
  });
});

describe("source and implementation provenance at the CLI", () => {
  it("rejects wrong or truncated raw input before writing an audit", async () => {
    const directory = await mkdtemp(join(tmpdir(), "cmu-source-test-"));
    try {
      const source = join(directory, "wrong.dict");
      const output = join(directory, "audit.json");
      await writeFile(output, "preserve-existing-output");
      for (const text of ["", "cat K AE1 T\n"]) {
        await writeFile(source, text);
        const result = spawnSync(process.execPath, ["--import", "tsx", "evaluation/corpus/audit.ts", "--source", source, "--out", output], { encoding: "utf8" });
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain("Raw source checksum");
        expect(await readFile(output, "utf8")).toBe("preserve-existing-output");
      }
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it("keeps the historical model tied to its original implementation", async () => {
    const directory = await mkdtemp(join(tmpdir(), "cmu-provenance-test-"));
    try {
      const output = join(directory, "scores.json");
      const result = spawnSync(process.execPath, ["--import", "tsx", "evaluation/review/wordlikeness/cli.ts", "score",
        "--model", "evaluation/review/wordlikeness/artifacts/reference-v1.json",
        "--snapshot", "evaluation/review/studies/written-v1-baseline.json", "--out", output], { encoding: "utf8" });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("Reference model provenance mismatch");
      await expect(readFile(output)).rejects.toMatchObject({ code: "ENOENT" });
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
