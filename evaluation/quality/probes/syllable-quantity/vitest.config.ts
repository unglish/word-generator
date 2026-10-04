export default {
  test: {
    include: ["evaluation/quality/probes/syllable-quantity/*.test.ts"],
    environment: "node",
    pool: "threads",
  },
};
