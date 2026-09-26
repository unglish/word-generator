import { describe, expect, it } from "vitest";
import { canonical, digest } from "./serialization.js";

describe("benchmark serialization", () => {
  it("orders objects and maps while retaining regexp and array semantics", () => {
    const first = { z: new Map([["b", 2], ["a", 1]]), a: /a+/gi, absent: undefined };
    const second = { a: /a+/gi, z: new Map([["a", 1], ["b", 2]]) };
    expect(canonical(first)).toEqual({ a: { $type: "RegExp", source: "a+", flags: "gi" }, z: { $type: "Map", entries: [["a", 1], ["b", 2]] } });
    expect(digest(first)).toBe(digest(second));
    expect(digest([1, 2])).not.toBe(digest([2, 1]));
    expect(digest(/a+/i)).not.toBe(digest(/a+/g));
  });

  it("rejects values that cannot be represented faithfully", () => {
    for (const value of [NaN, Infinity, undefined, () => 1]) expect(() => canonical(value)).toThrow();
  });
});
