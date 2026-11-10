#!/usr/bin/env bash
# Usage: inject-slowdown.sh <checkout> <fraction>
# Makes generateWords do `fraction` extra real generation work per call.
set -euo pipefail
dir=$1; frac=$2
sed -i 's|^export { createGenerator, generateWord, generateWords } from "./core/generate.js";|export { createGenerator, generateWord } from "./core/generate.js";\nimport { generateWords as realGenerateWords, generateWord as extraWord } from "./core/generate.js";\nexport function generateWords(...args: Parameters<typeof realGenerateWords>): ReturnType<typeof realGenerateWords> {\n  const out = realGenerateWords(...args);\n  const extra = Math.round(args[0] * '"$frac"');\n  for (let i = 0; i < extra; i++) extraWord({ seed: 7_000_000 + i });\n  return out;\n}|' "$dir/src/index.ts"
grep -n realGenerateWords "$dir/src/index.ts" | head -2
