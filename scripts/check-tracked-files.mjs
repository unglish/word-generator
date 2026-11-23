import { execFileSync } from "node:child_process";

const [tree, ...extra] = process.argv.slice(2);
if (extra.length || tree?.startsWith("-")) {
  throw new Error("Omit the revision to check the index, or pass one Git revision to replay a historical tree.");
}
const args = tree ? ["ls-tree", "-rz", "--name-only", tree] : ["ls-files", "--cached", "-z"];
const files = execFileSync("git", args, { encoding: "utf8" }).split("\0");
for (const file of new Set(files)) {
  if (file.split("/").includes("node_modules")) {
    console.error(`${JSON.stringify(file)} is tracked. Remove it with git rm --cached and install dependencies locally with npm ci.`);
    process.exitCode = 1;
  } else if (file === "tasks" || file.startsWith("tasks/")) {
    console.error(`${JSON.stringify(file)} contains local task notes. Remove it with git rm --cached. Put PR evidence in an archive tag.`);
    process.exitCode = 1;
  }
}
