# Evidence for #429

Actions run 42856033744 on branch exp/cache-calibration, workflow .github/workflows/exp-cache.yml (this commit). jobs.json has per-step timings: seed (miss + save), hit x4 (restore, npm ci skipped), baseline x4 (cache: npm + npm ci).
