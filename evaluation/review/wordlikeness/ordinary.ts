import { buildReference, sha256, type ReferenceModel } from "./model.js";

export interface OrdinaryReference extends ReferenceModel {
  spellingCorpus: { sha256: string; accepted: number };
}

/** Preserve the historical sound model and fit boundary-aware character counts to ordinary spellings. */
export function buildOrdinaryReference(text: string, revision: string, spellingList: string): OrdinaryReference {
  const model = buildReference(text, revision);
  const words = spellingList.trimEnd().split("\n");
  const characters: ReferenceModel["characters"] = {};
  for (const word of words) {
    const padded = `^^${word}$`;
    for (let i = 2; i < padded.length; i++) {
      const context = padded.slice(i - 2, i);
      const bucket = characters[context] ??= { total: 0, counts: {} };
      const letter = padded[i];
      bucket.counts[letter] = (bucket.counts[letter] ?? 0) + 1;
      bucket.total++;
    }
  }
  return { ...model, characters, spellingCorpus: { sha256: sha256(spellingList), accepted: words.length } };
}
