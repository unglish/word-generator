export interface DistributionQuality {
  unionKeyCount: number;
  unionPearsonR: number;
  jensenShannonBits: number | null;
  missingReferenceMassPct: number;
  nonReferenceMassPct: number;
}

export function pearson(xs: number[], ys: number[]): number {
  if (xs.length !== ys.length || xs.length < 2) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let covariance = 0;
  let varianceX = 0;
  let varianceY = 0;
  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    covariance += dx * dy;
    varianceX += dx * dx;
    varianceY += dy * dy;
  }
  return varianceX && varianceY ? covariance / Math.sqrt(varianceX * varianceY) : 0;
}

export function toPercentMap(counts: Record<string, number>): Record<string, number> {
  const values = Object.values(counts);
  if (values.some(value => !Number.isFinite(value) || value < 0)) throw new Error("Distribution counts must be finite and nonnegative.");
  const scale = values.reduce((max, value) => Math.max(max, value), 0);
  const total = scale ? values.reduce((sum, value) => sum + value / scale, 0) : 0;
  return Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, total ? value / scale / total * 100 : 0]));
}

export function compareDistributions(generated: Record<string, number>, reference: Record<string, number>): DistributionQuality {
  const p = toPercentMap(generated);
  const q = toPercentMap(reference);
  const keys = [...new Set([...Object.keys(p), ...Object.keys(q)])].filter(key => p[key] > 0 || q[key] > 0).sort();
  const hasGenerated = Object.values(p).some(value => value > 0);
  const hasReference = Object.values(q).some(value => value > 0);
  let divergence = 0;
  let missingReferenceMassPct = 0;
  let nonReferenceMassPct = 0;
  for (const key of keys) {
    const a = (p[key] ?? 0) / 100;
    const b = (q[key] ?? 0) / 100;
    const midpoint = (a + b) / 2;
    if (a) divergence += a * Math.log2(a / midpoint) / 2;
    if (b) divergence += b * Math.log2(b / midpoint) / 2;
    if (!a) missingReferenceMassPct += b * 100;
    if (!b) nonReferenceMassPct += a * 100;
  }
  return {
    unionKeyCount: keys.length,
    unionPearsonR: pearson(keys.map(key => p[key] ?? 0), keys.map(key => q[key] ?? 0)),
    jensenShannonBits: hasGenerated && hasReference ? Math.max(0, Math.min(1, divergence)) : null,
    missingReferenceMassPct,
    nonReferenceMassPct,
  };
}
