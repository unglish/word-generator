import type { SpellingPhone } from "./base-spelling.js";
import type { GraphemeSlot } from "./grapheme-selection.js";
import type { DoublingSlot } from "./spelling-doubling.js";

export interface SpellingBoundaryContext {
  slot: GraphemeSlot;
  doubling: Omit<DoublingSlot, "form" | "nucleusForm">;
}

/** Derive all fixed eligibility inputs from the detached, actual writer boundary. */
export function spellingBoundaryContexts(phones: readonly SpellingPhone[]): SpellingBoundaryContext[] {
  const syllableCount = phones.reduce((count, phone) => Math.max(count, phone.syllableIndex + 1), 0);
  const shapes = Array.from({ length: syllableCount }, () => ({ onset: 0, nucleus: 0, coda: 0 }));
  for (const [index, phone] of phones.entries()) {
    if (!phone.boundary || phone.id !== index || phone.soundAtSpelling !== phone.boundary.phoneme.sound ||
        !shapes[phone.syllableIndex] || phone.segmentIndex !== shapes[phone.syllableIndex][phone.segment]) {
      throw new Error("Invalid spelling evidence: writer boundary");
    }
    shapes[phone.syllableIndex][phone.segment]++;
  }
  return phones.map((entry, index) => {
    const previous = phones[index - 1];
    const next = phones[index + 1];
    const phoneme = entry.boundary!.phoneme;
    const prevPhoneme = previous?.boundary!.phoneme;
    const stress = entry.boundary!.stress;
    const position = entry.segment;
    const syllableIndex = entry.syllableIndex;
    const isCluster = (previous?.syllableIndex === syllableIndex && previous.segment === position) ||
      (next?.syllableIndex === syllableIndex && next.segment === position);
    const shape = shapes[syllableIndex];
    return {
      slot: { phoneme, prevPhoneme, nextPhoneme: next?.boundary!.phoneme,
        index, total: phones.length, position, syllableIndex, syllableCount,
        onsetLength: shape.onset, nucleusLength: shape.nucleus, codaLength: shape.coda, isCluster, stress },
      doubling: { phoneme, position, prevPhoneme,
        nextNucleus: phones.slice(index + 1).find(phone => phone.segment === "nucleus")?.boundary!.phoneme,
        stress, prevReduced: prevPhoneme?.reduced ?? false, isCluster,
        isFirstInCoda: position === "coda" && previous?.segment !== "coda",
        isLastPhoneme: index === phones.length - 1, isEndOfWord: syllableIndex === syllableCount - 1,
        isMonosyllabic: syllableCount === 1,
        nextIsConsonant: next?.segment === "onset" || (next?.syllableIndex === syllableIndex && next.segment === "coda") },
    };
  });
}
