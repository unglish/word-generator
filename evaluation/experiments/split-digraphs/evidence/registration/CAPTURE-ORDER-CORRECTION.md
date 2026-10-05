# Premature capture retained as incomplete

The `75374ed` capture dispatch started before the observer and independent
recount were implemented and pinned. This violates the order required in the
registered `design.md` acceptance section. It is not a completed registered
experiment and will not support a quality claim.

The task stopped its own capture process with SIGINT (exit 130). Its progress
log showed two completed 10,000-word streams; partial files and the initial
input freeze remain at `/private/tmp/q14a-split-vowels-candidate-v1` and the
adjacent `-freeze` directory, including `stopped.json`. No complete manifest or
completion seal was produced. No captured rows or aggregate quality results
were inspected; the earlier 500-word integration tests and 64-word diagnostic
tests had already run.

Finish and test both observers before a new versioned formal capture. Pin their
bytes and the unchanged registered law before dispatch. Preserve this failed
preparation attempt; do not relabel it as the formal experiment. No formation,
completion, seed, sample-size or acceptance-gate change is authorized by this
correction.
