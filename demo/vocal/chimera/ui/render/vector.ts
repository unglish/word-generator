/**
 * Minimal vector helpers for anatomy3d (Chaikin corner-cutting).
 * Chimera's full phosphor beam/label/Glow kit is not needed for the Unglish 3D head.
 */

export type Pt = [number, number];

/** Chaikin corner-cutting: softens a polyline (used for tongue/velum ribbons). */
export function chaikin(p: Pt[], it = 2): Pt[] {
  let pts = p;
  for (let n = 0; n < it; n++) {
    if (pts.length < 2) return pts;
    const out: Pt[] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i],
        b = pts[i + 1];
      out.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]]);
      out.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
    }
    out.push(pts[pts.length - 1]);
    pts = out;
  }
  return pts;
}
