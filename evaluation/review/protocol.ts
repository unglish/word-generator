export const RUBRIC = {
  version: "written-v1",
  question: "How plausible is this spelling as an English word?",
  labels: ["Very implausible", "Somewhat implausible", "Neither plausible nor implausible", "Somewhat plausible", "Very plausible"],
  familiarity: "I knew this as an English word before this review.",
};

export type Answer =
  | { status: "rated"; rating: number; familiar: boolean }
  | { status: "skipped"; rating: null; familiar: null };

export interface Assignment {
  rubric: typeof RUBRIC;
  items: { position: number; sample_id: string; spelling: string }[];
}

export interface Submission {
  session_id: string;
  submission_token: string;
  response_id: string;
  position: number;
  status: "rated" | "skipped";
  rating: number | null;
  familiar: boolean | null;
}

export function validAnswer(answer: Pick<Submission, "status" | "rating" | "familiar">): boolean {
  if (answer.status === "skipped") return answer.rating === null && answer.familiar === null;
  return answer.status === "rated" && Number.isInteger(answer.rating) &&
    Number(answer.rating) >= 1 && Number(answer.rating) <= 5 && typeof answer.familiar === "boolean";
}

export function parseAssignment(value: unknown): Assignment {
  const assignment = value as Assignment | null;
  if (!assignment ||
      assignment.rubric?.version !== RUBRIC.version ||
      assignment.rubric.question !== RUBRIC.question ||
      assignment.rubric.familiarity !== RUBRIC.familiarity ||
      JSON.stringify(assignment.rubric.labels) !== JSON.stringify(RUBRIC.labels) ||
      !Array.isArray(assignment.items) || assignment.items.length < 1 || assignment.items.length > 20) {
    throw new Error("This study uses an unsupported review format. Please contact the study owner.");
  }
  const spellings = new Set<string>();
  assignment.items.forEach((item, index) => {
    if (!item || item.position !== index || typeof item.sample_id !== "string" ||
        typeof item.spelling !== "string" || !item.spelling.length || spellings.has(item.spelling)) {
      throw new Error("The study returned an invalid assignment. Please contact the study owner.");
    }
    spellings.add(item.spelling);
  });
  return assignment;
}
