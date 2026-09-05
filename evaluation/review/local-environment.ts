import { execFileSync } from "node:child_process";

export function localEnvironment(): { url: string; secret: string; publishable: string } {
  let status: Record<string, string>;
  try {
    status = JSON.parse(execFileSync("npx", ["supabase", "status", "-o", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
  } catch {
    // Status output contains credentials; never include it in an error report.
    throw new Error("Cannot read local Supabase status. Start the local stack and retry.");
  }
  const url = status.API_URL;
  const secret = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
  const publishable = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
  if (!url || !secret || !publishable) throw new Error("Local Supabase credentials are unavailable. Run npx supabase start first.");
  if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url)) throw new Error("Database tests require a local Supabase instance.");
  return { url, secret, publishable };
}
