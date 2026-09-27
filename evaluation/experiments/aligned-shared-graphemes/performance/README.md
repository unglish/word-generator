# Fixed paired local performance

Six fresh-process pairs ran in AB, BA, AB, BA, AB, BA order. A is exact #338;
B is the captured active Q13b generator. Every slot ran unchanged `test:perf`.
No controlled corpus scan or other benchmark ran concurrently. External host
activity is not ruled out. All failed gates, exit codes and raw logs are retained.

Median candidate/control throughput ratio is 0.8381764592: a 16.18% decrease.
Pair ratios range 0.7976744186–0.8535254311. The speed floor passes 6/6 control
runs and 0/6 candidate runs. Variance gates pass 6/6 on both. This is a material
local performance regression; rounded printed rates are descriptive, not a
general platform speed claim. Ratio rounding bounds remain in the report.

All 95 control files match exact Git blobs; all 57 control and 72 candidate
archived generator files match their performance checkouts. Source, installed
dependency, Node/npm, harness and effective configuration checks pass before
and after all slots. Separate JavaScript verification agrees with all 12 raw
log hashes, rates, gates, schedule, ratios and median. All 23 synthetic runner
tests pass. Only reviewed authority paths, hashes and labels differ from the
retained Q12c runner; workload, parser, thresholds and ordering are unchanged.

Decompress `.json.gz` transport to its original `.json` name when replaying
historical commands. Measurement metadata records original and packaged hashes.
No slow slot was retried and no fastest-pair selection was used.
