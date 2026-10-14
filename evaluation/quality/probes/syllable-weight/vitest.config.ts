export default {
  test: {
    include: ["evaluation/quality/probes/syllable-weight/*.test.ts"],
    environment: "node",
    pool: "threads",
  },
};
