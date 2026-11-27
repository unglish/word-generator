import { execFileSync } from "node:child_process";

let repositoryVariables: string[] | undefined;

/**
 * Run git in `cwd` as a standalone command. A caller such as a git hook may export
 * repository-local variables (GIT_DIR, GIT_INDEX_FILE, ...); inheriting them would point
 * these commands at the caller's repository and index instead of the checkout in `cwd`.
 */
export function gitBytes(cwd: string, ...args: string[]): Buffer {
  repositoryVariables ??= execFileSync("git", ["rev-parse", "--local-env-vars"], { encoding: "utf8" }).split("\n").filter(Boolean);
  const env = { ...process.env };
  for (const name of repositoryVariables) delete env[name];
  return execFileSync("git", args, { cwd, env, maxBuffer: 20 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
}

export function git(cwd: string, ...args: string[]): string {
  return gitBytes(cwd, ...args).toString("utf8").trim();
}
