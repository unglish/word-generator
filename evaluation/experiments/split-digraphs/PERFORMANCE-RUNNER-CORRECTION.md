# Performance runner v2 correction

The first formal performance dispatch failed before its first timed operation:
`createGenerator()` returns `generateWord`, not `generateWords`. No performance
result was produced. Retain `/private/tmp/q14a-performance-v1` and its log as
failed preparation evidence. The pinned v1 tool files remain unchanged.

Versioned v2 tools use a shared-RNG loop over the public configured
`generateWord` API for both A and B. Three 64-word traced streams exactly match
the default public batch API, including the next RNG value. This adds the same
per-word option-resolution/adapter overhead to both variants; it is a configured
batch-equivalent workload, not the optimized default batch call itself. Samples,
seeds, paired order, speed floor and variance thresholds remain unchanged.

The registered candidate corpus completed before this correction with source
and input closure verified. No generator source, policy or corpus bytes change.
V2 performance tools are additional post-capture measurement preparation, not
retroactively claimed as the pre-capture tool pins. Record their hashes with the
performance evidence and retain this deviation in the final report.
