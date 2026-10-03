export const AUDITORY_RUBRIC = {
  version: "auditory-wordlikeness-v1",
  question: "How much does this sound like an English word?",
  scale: [
    { value: 1, label: "Very unlike an English word" },
    { value: 2, label: "Somewhat unlike an English word" },
    { value: 3, label: "Neither like nor unlike an English word" },
    { value: 4, label: "Somewhat like an English word" },
    { value: 5, label: "Very much like an English word" },
  ],
  familiarity_question: "Did you recognize this sound as a word you already know?",
  instructions: "Listen to the entire recording before rating. Rate the sound you hear. You may skip any item. You will not be shown a spelling.",
} as const;
