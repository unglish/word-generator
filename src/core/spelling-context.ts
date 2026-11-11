import type { Phoneme } from "../types.js";
import type { SpellingPhone } from "./base-spelling.js";
import type { GraphemeSlot } from "./grapheme-selection.js";
import type { DoublingSlot } from "./spelling-doubling.js";

export interface SpellingBoundaryContext {
  slot: GraphemeSlot;
  doubling: Omit<DoublingSlot, "form" | "nucleusForm">;
}

interface BoundaryEntry {
  phoneme: Phoneme;
  position: SpellingPhone["segment"];
  syllableIndex: number;
  stress?: string;
  nextWritten?: string;
}

/** Live syllable counts include empty syllables; detached evidence counts only recorded phones. */
export function deriveSpellingBoundaryContext(
  entries: readonly BoundaryEntry[],
  index: number,
  syllableCount: number,
  shape: { onset: number; nucleus: number; coda: number },
  nextWritten?: string,
): SpellingBoundaryContext {
  const entry = entries[index];
  const previous = entries[index - 1];
  const next = entries[index + 1];
  const { phoneme, position, syllableIndex, stress } = entry;
  const prevPhoneme = previous?.phoneme;
  const isCluster =
    (previous?.syllableIndex === syllableIndex &&
      previous.position === position) ||
    (next?.syllableIndex === syllableIndex && next.position === position);
  let nextNucleus: Phoneme | undefined;
  for (let i = index + 1; i < entries.length; i++) {
    if (entries[i].position === "nucleus") {
      nextNucleus = entries[i].phoneme;
      break;
    }
  }
  // Property order and conditional keys are part of detached certificate serialization.
  return {
    slot: {
      phoneme,
      prevPhoneme,
      nextPhoneme: next?.phoneme,
      index,
      total: entries.length,
      position,
      syllableIndex,
      syllableCount,
      onsetLength: shape.onset,
      nucleusLength: shape.nucleus,
      codaLength: shape.coda,
      isCluster,
      stress,
      ...(previous ? { previousPosition: previous.position } : {}),
      ...(nextWritten !== undefined ? { nextWritten } : {}),
    },
    doubling: {
      phoneme,
      position,
      prevPhoneme,
      nextNucleus,
      stress,
      prevReduced: prevPhoneme?.reduced ?? false,
      isCluster,
      isFirstInCoda: position === "coda" && previous?.position !== "coda",
      isLastPhoneme: index === entries.length - 1,
      isEndOfWord: syllableIndex === syllableCount - 1,
      isMonosyllabic: syllableCount === 1,
      nextIsConsonant:
        next?.position === "onset" ||
        (next?.syllableIndex === syllableIndex && next.position === "coda"),
    },
  };
}

/** Derive all fixed eligibility inputs from the detached, actual writer boundary. */
export function spellingBoundaryContexts(
  phones: readonly SpellingPhone[],
): SpellingBoundaryContext[] {
  const syllableCount = phones.reduce(
    (count, phone) => Math.max(count, phone.syllableIndex + 1),
    0,
  );
  const shapes = Array.from({ length: syllableCount }, () => ({
    onset: 0,
    nucleus: 0,
    coda: 0,
  }));
  const entries: BoundaryEntry[] = [];
  for (const [index, phone] of phones.entries()) {
    const boundary = phone.boundary;
    if (
      !boundary ||
      phone.id !== index ||
      phone.soundAtSpelling !== boundary.phoneme.sound ||
      !shapes[phone.syllableIndex] ||
      phone.segmentIndex !== shapes[phone.syllableIndex][phone.segment]
    ) {
      throw new Error("Invalid spelling evidence: writer boundary");
    }
    shapes[phone.syllableIndex][phone.segment]++;
    entries.push({
      phoneme: boundary.phoneme,
      position: phone.segment,
      syllableIndex: phone.syllableIndex,
      stress: boundary.stress,
      nextWritten: boundary.nextWritten,
    });
  }
  return entries.map((entry, index) =>
    deriveSpellingBoundaryContext(
      entries,
      index,
      syllableCount,
      shapes[entry.syllableIndex],
      entry.nextWritten || undefined,
    ),
  );
}
