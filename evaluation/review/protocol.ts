export const LEGACY_RUBRIC = {
  version: "written-v1",
  question: "How plausible is this spelling as an English word?",
  labels: [
    "Very implausible",
    "Somewhat implausible",
    "Neither plausible nor implausible",
    "Somewhat plausible",
    "Very plausible",
  ],
  familiarity: "I knew this as an English word before this review.",
};

export const RUBRIC = {
  version: "written-v2",
  question: "How much does this look like an English word?",
  labels: ["Not at all", "A little", "Moderately", "Very much", "Completely"],
  familiarity: "I recognize this as an existing English word.",
  instruction:
    "It can be made up. Go with your first impression of the spelling.",
};

export type Rubric = typeof LEGACY_RUBRIC & { instruction?: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

export function supportedRubric(value: unknown): value is Rubric {
  if (!isRecord(value)) return false;
  const rubrics: Rubric[] = [LEGACY_RUBRIC, RUBRIC];
  return rubrics.some(
    (rubric) =>
      value.version === rubric.version &&
      value.question === rubric.question &&
      value.familiarity === rubric.familiarity &&
      value.instruction === rubric.instruction &&
      JSON.stringify(value.labels) === JSON.stringify(rubric.labels),
  );
}

export type Answer = { comment?: string | null } & (
  | { status: "rated"; rating: number; familiar: boolean }
  | { status: "skipped"; rating: null; familiar: null }
);

export interface Assignment {
  rubric: Rubric;
  items: { position: number; sample_id: string; spelling: string }[];
}

export type Continuation =
  | { exhausted: true }
  | {
      exhausted: false;
      session_id: string;
      submission_token: string;
      assignment: Assignment;
    };

export function parseContinuation(value: unknown): Continuation {
  const result = isRecord(value) ? value : null;
  if (result?.exhausted === true) return { exhausted: true };
  if (
    result?.exhausted !== false ||
    typeof result.session_id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      result.session_id,
    ) ||
    typeof result.submission_token !== "string" ||
    !/^[0-9a-f]{64}$/.test(result.submission_token)
  ) {
    throw new Error(
      "The server returned an invalid continuation. Please retry.",
    );
  }
  return {
    ...result,
    exhausted: false,
    session_id: result.session_id,
    submission_token: result.submission_token,
    assignment: parseAssignment(result.assignment),
  };
}

export type Submission = Answer & {
  session_id: string;
  submission_token: string;
  response_id: string;
  position: number;
};

export function validAnswer(answer: unknown): answer is Answer {
  if (!isRecord(answer)) return false;
  if (
    answer.comment != null &&
    (typeof answer.comment !== "string" || answer.comment.length > 2000)
  )
    return false;
  if (answer.status === "skipped")
    return answer.rating === null && answer.familiar === null;
  return (
    answer.status === "rated" &&
    Number.isInteger(answer.rating) &&
    Number(answer.rating) >= 1 &&
    Number(answer.rating) <= 5 &&
    typeof answer.familiar === "boolean"
  );
}

function assertAssignment(
  assignment: unknown,
): asserts assignment is Assignment {
  if (
    !isRecord(assignment) ||
    !supportedRubric(assignment.rubric) ||
    !Array.isArray(assignment.items) ||
    assignment.items.length < 1 ||
    assignment.items.length > 20
  ) {
    throw new Error(
      "This study uses an unsupported review format. Please contact the study owner.",
    );
  }
  const spellings = new Set<string>();
  assignment.items.forEach((item: unknown, index) => {
    if (
      !isRecord(item) ||
      item.position !== index ||
      typeof item.sample_id !== "string" ||
      typeof item.spelling !== "string" ||
      !item.spelling.length ||
      spellings.has(item.spelling)
    ) {
      throw new Error(
        "The study returned an invalid assignment. Please contact the study owner.",
      );
    }
    spellings.add(item.spelling);
  });
}

export function parseAssignment(value: unknown): Assignment {
  assertAssignment(value);
  return value;
}
