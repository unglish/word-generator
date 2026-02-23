/**
 * Parse and validate metric names from CLI args.
 *
 * Empty input resolves to all known metrics. Duplicate names are removed
 * while preserving first-seen order.
 */
export function parseMetrics(raw, metricKeys) {
  const selected = raw
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const effective = selected.length === 0
    ? [...metricKeys]
    : selected.filter((name, idx) => selected.indexOf(name) === idx);
  for (const metric of effective) {
    if (!metricKeys.includes(metric)) {
      throw new Error(`Invalid --metrics entry: ${metric} (expected one of ${metricKeys.join(",")})`);
    }
  }
  return effective;
}

function compilePathAccessor(path) {
  const parts = path.split(".");
  return obj => {
    let curr = obj;
    for (const key of parts) {
      if (curr == null) return undefined;
      curr = curr[key];
    }
    return curr;
  };
}

/**
 * Parse threshold conditions used to fail CI runs.
 *
 * Syntax examples:
 * - `final.hiatusRate<=0.001`
 * - `glide.rootVowelToGlideRate>=0.0005`
 */
export function parseFailOn(raw) {
  if (!raw.trim()) return [];
  return raw
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .map(entry => {
      const match = entry.match(/^([A-Za-z0-9_.]+)\s*(<=|>=|==|<|>)\s*(-?\d+(?:\.\d+)?)$/);
      if (!match) {
        throw new Error(`Invalid --fail-on entry: ${entry}`);
      }
      const [, path, operator, valueRaw] = match;
      return {
        operator,
        value: Number(valueRaw),
        raw: entry,
        accessor: compilePathAccessor(path),
      };
    });
}

function compare(actual, operator, expected) {
  if (operator === "<") return actual < expected;
  if (operator === "<=") return actual <= expected;
  if (operator === ">") return actual > expected;
  if (operator === ">=") return actual >= expected;
  if (operator === "==") return actual === expected;
  return false;
}

/**
 * Validate report thresholds and return failure messages.
 *
 * A condition fails when the path is missing, non-numeric, or the comparison
 * evaluates to false.
 */
export function evaluateFailOn(report, conditions) {
  const failures = [];
  for (const condition of conditions) {
    const actual = condition.accessor(report);
    if (!Number.isFinite(actual)) {
      failures.push(`${condition.raw} (path missing or non-numeric)`);
      continue;
    }
    if (!compare(actual, condition.operator, condition.value)) {
      failures.push(`${condition.raw} (actual=${actual})`);
    }
  }
  return failures;
}
