import { digest } from "./serialization.js";
import type { Manifest, RunEnvironment } from "./model.js";

export type ReferenceRole = "baseline" | "previous";

export interface EnvironmentDifference {
  role: ReferenceRole;
  runId: string;
  generation: { reference: RunEnvironment; candidate: RunEnvironment };
  evaluation: { reference: RunEnvironment; candidate: RunEnvironment };
  /** Run captured in the candidate's environment whose fidelity probe reproduced the reference. */
  fidelityProbeRunId: string;
}

const evaluationEnvironment = (manifest: Manifest): RunEnvironment => manifest.evaluationEnvironment ?? manifest.environment;

function sameRuntime(a: RunEnvironment, b: RunEnvironment): boolean {
  return a.node === b.node && a.packageLockDigest === b.packageLockDigest;
}

function sameEnvironment(a: Manifest, b: Manifest): boolean {
  return sameRuntime(a.environment, b.environment) && sameRuntime(evaluationEnvironment(a), evaluationEnvironment(b));
}

function strictRefusal(reference: Manifest, candidate: Manifest): Error {
  return sameRuntime(reference.environment, candidate.environment)
    ? new Error("Evaluation runtime or dependency lock differs. Rescore both archives under the same environment before comparing.")
    : new Error("Runtime or dependency lock differs. Reproduce under the same environment before comparing.");
}

/**
 * Runs from one environment pass unchanged. A reference from another environment is
 * accepted only when a run captured in the candidate's environment passed the fidelity
 * probe against that exact reference manifest; the difference is then disclosed.
 * `strict` restores the unconditional refusal.
 */
export function environmentDifferences(
  references: ReadonlyArray<{ role: ReferenceRole; manifest: Manifest }>,
  candidate: Manifest,
  evidence: readonly Manifest[],
  strict: boolean,
): EnvironmentDifference[] {
  const differences: EnvironmentDifference[] = [];
  for (const { role, manifest } of references) {
    if (sameEnvironment(manifest, candidate)) continue;
    if (strict) throw strictRefusal(manifest, candidate);
    const target = digest(manifest);
    const probe = evidence.find(run => sameEnvironment(run, candidate) && run.fidelityProbes?.some(item => item.manifestDigest === target));
    if (!probe) {
      throw new Error(`The ${role} run ${manifest.id} comes from a different runtime or dependency lock, and no run captured in the candidate's environment passed a fidelity probe against it. Regenerate that revision with --generator-root, pass such a run with --probe, or compare runs captured together.`);
    }
    differences.push({
      role, runId: manifest.id,
      generation: { reference: manifest.environment, candidate: candidate.environment },
      evaluation: { reference: evaluationEnvironment(manifest), candidate: evaluationEnvironment(candidate) },
      fidelityProbeRunId: probe.id,
    });
  }
  return differences;
}
