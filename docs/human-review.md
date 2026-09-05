# Anonymous written-word review

The first study collects perceived **written wordlikeness** from readers comfortable with English. It does not test the generator's intended pronunciation. The frozen baseline contains 200 consecutive, unfiltered generator draws with seed `20260904`, lexicon mode, morphology enabled, and traces enabled. Each anonymous session reviews 20 distinct spellings.

The review question is “How much does this look like an English word?” Ratings are 1 Not at all, 2 A little, 3 Moderately, 4 Very much, and 5 Completely. The instruction is “It can be made up. Go with your first impression of the spelling.” Reviewers can flag prior familiarity or skip. No answer is preselected. Reviewers receive no results, history, diagnostics, or account.

Graded wordlikeness judgments have linguistic precedent ([Frisch et al., 2000](https://pmc.ncbi.nlm.nih.gov/articles/PMC3129706/)). Reading and spelling consistency are related, distinct measurements ([Wiley et al., 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11362297/)). This particular written rubric is a pilot instrument, not a validated universal Englishness scale.

## Owner setup

Use Node.js 22 or newer. Install dependencies with `npm ci`.

Create an owner-controlled Supabase project. No reviewer Auth configuration is necessary. Apply `supabase/migrations/20260904000000_review.sql` through the project's SQL editor, or link the Supabase CLI to the intended project and run `npx supabase db push`. Review the target project before applying migrations. Only `public` should be exposed to the Data API; never expose the `private` implementation schema.

Copy `.env.example` to `.env.local` and fill in:

```dotenv
VITE_REVIEW_SUPABASE_URL=https://PROJECT.supabase.co
VITE_REVIEW_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_REVIEW_STUDY_ID=written-v2-baseline
SUPABASE_URL=https://PROJECT.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

Keep `.env.local` private. The owner commands load it automatically. Vite reads the same root-level file, but only `VITE_*` values enter the browser. Never give an owner key a `VITE_*` name. The build rejects a secret key or a legacy service-role JWT in the reviewer-key setting. New Supabase keys belong in the `apikey` header, not a bearer header.

Import the already-frozen baseline:

```sh
npm run review:import -- --file evaluation/review/studies/written-v2-baseline.json
```

The importer checks the snapshot and every existing row, inserts missing samples into a closed study, reads them back, then opens enrollment. Identical imports are safe to repeat; altered content requires a new study ID. Never regenerate or curate the baseline because some outputs look poor. Duplicate spellings retain their original draw multiplicity.

Run `npm run dev` and open `/review.html`. For GitHub Pages, set these **repository Actions variables** (not the owner secret):

- `VITE_REVIEW_SUPABASE_URL`
- `VITE_REVIEW_SUPABASE_PUBLISHABLE_KEY`
- `VITE_REVIEW_STUDY_ID`

The existing Pages deployment builds the review page alongside the demo. Share the deployed site's `review.html` URL after a live smoke test. Without configuration the review page explains that the study is unavailable; the rest of the build remains usable.

## Access and storage

Four tables store studies, complete sampled draws, sessions, and responses. All have RLS enabled and no reviewer table grants or policies. Only two public RPC wrappers are callable by the anonymous role. Their privileged implementations live in an unexposed schema with an empty search path and qualified relations.

`start_review` accepts a study ID, random session UUID, and random 32-byte submission token. The server hashes the token and persists an ordered assignment. A matching retry returns the same words and rubric, never responses or progress. Selection prioritizes fewer completed ratings, then fewer assignments, with random ties and presentation order. It uses counts rather than score values. Equal spellings use the earliest draw as their representative ID.

`submit_review_response` verifies the token and position, derives the sample ID server-side, and inserts once. Exact retries acknowledge the same response ID; changed payloads or IDs for an occupied position fail. Acknowledgements contain no judgments or result counts. A session is complete when every position has a rating or skip.

The browser saves credentials before requesting an assignment and saves responses before advancing. IndexedDB transactions and revision numbers protect competing tabs and asynchronous acknowledgements. Responses leave the outbox only after server acknowledgement. Transient delivery failures retry with bounded backoff and on reconnection; a retry button is also available. Permanent failures preserve the outbox and pause further advancement. Clearing site storage loses unsent responses; there is deliberately no server history-recovery endpoint.

The application does not collect names, emails, IP addresses, user-agent strings, or a cross-session identity. Hosting providers may retain operational logs. Session tokens authorize submissions but do not establish that sessions belong to distinct people or prevent one person from starting multiple sessions. This is a small shared-link pilot, not a public survey with identity or abuse detection.

## Inspect, close, and export

Only the owner uses the Supabase dashboard or owner CLI. To close enrollment in the SQL editor:

```sql
update public.review_studies
set enrollment_open = false
where id = 'written-v2-baseline';
```

Set the flag to `true` to reopen. Existing sessions can recover assignments and flush saved responses after enrollment closes. Closing enrollment therefore does not freeze in-flight submissions.

Export into a new ignored directory, then report:

```sh
npm run review:export -- --study written-v2-baseline --out review-exports/baseline-001
npm run review:report -- --input review-exports/baseline-001/export.json --out review-exports/baseline-001/summary
```

The JSON export contains the manifest, all sampled draws, ordered assignments, and responses. The CSV contains one row per response, including the spelling and all matching draw indices. Token hashes are excluded. Pagination retrieves every page; exports collect responses received before the export began. Because collection may still be active, repeat the export into a new directory after pending sessions finish for the final dataset. Files are never silently overwritten. Store exports outside published assets and do not commit real judgments.

The report includes all-rating and unfamiliar-only distributions, 4–5 and 1–2 shares, coverage, skips, familiarity, per-spelling histograms, and length/syllable/morphology strata. For each view it averages the per-spelling score proportions using original draw multiplicities. Unequal reviewer counts do not give a spelling extra weight. Skips are excluded, missing scores remain missing, and every stratum includes denominators. Equal spellings share judgments across their originating draws, including when those draws have different morphology.

Start reviewing the pilot data when every distinct spelling has three non-skipped ratings from separate sessions. This is a coverage target, not statistical validation. Sessions are not verified independent people. No population confidence intervals, automatic reviewer rejection, or generator pass/fail thresholds are produced.

## Freeze future studies

```sh
npm run review:freeze -- --study written-v1-next --seed 20260904 --count 200
```

The command uses the public generator API and records full generated Word objects, explicit options, serialized effective configuration, source contents/digest, commit, and relevant working-tree patch. Maps and regular expressions are preserved explicitly. IDs derive from the content digest and draw index. Creation fails if the file already exists. A changed generator or rubric must receive a new study ID. Builds and CI never regenerate the production study.

## Verification

```sh
npm run test:review
npm run review:typecheck
npm run lint
npx playwright install chromium
npm run test:review:e2e
npx supabase start
npm run test:review:db
npm run test:review:smoke
npm test
npm run build
npm run demo:check-worker-sync
```

Docker is required for local Supabase tests. The DB runner reads local CLI credentials without printing them and refuses a hosted test target. Tests create synthetic `test-*` studies and clean them up. Browser tests mock network failures, exercise desktop and mobile flows, and save light/dark captures under the ignored `.impeccable/review/` directory. CI runs both browser and actual database API checks without production credentials.

The local stack enables Supabase's Auth service to issue its API keys, with both normal and anonymous signups disabled. The reviewer never calls Auth or creates a user.

The smoke command starts an isolated local review page and completes two real browser sessions against Supabase, including a deliberately lost acknowledgement. It exercises the owner import/export/report commands, verifies 40 stored responses, and removes its synthetic database study. Inspect its ignored artifacts in `review-exports/test-smoke-*/`. Response positions in exports are zero-based.

Before sharing the production link, use a separate synthetic study to verify two browser sessions, lost acknowledgements, direct anonymous table denial, owner exports, and deployment configuration. Remove the synthetic study or close it after the check. Do not mix smoke-test judgments into the production baseline.

Implementation is complete only after the live collection path and owner export are verified. A passing local test suite alone does not establish deployment or a generator acceptance threshold.

## Revised wording and comments

`written-v2-baseline` reuses the original 200 frozen words, configuration, and generator provenance. Only the study ID, rubric, digest, and sample IDs change. Do not regenerate these words. Keep v1 and v2 ratings in separate reports; the wording and optional comment prompt differ. Both snapshots remain supported by owner exports and reports.

Apply all migrations in order, including `20260905000000_review_v2.sql`, before publishing v2. Import v2 and change the public study setting to `written-v2-baseline`. After publication, close v1 enrollment; existing v1 sessions can still submit and retry. On the same browser, unfinished v1 assignments resume with their original wording and no comment prompt; after completion, reviewers can start v2.

Each v2 word has an optional comment, limited to 2,000 characters, saved with either a rating or a skip. Submitted comments are immutable, included in JSON/CSV owner exports, and excluded from numeric score calculations. Blank comments are null. Comments share the response’s local outbox and idempotent retry behavior. Older clients may omit the comment parameter.

CSV cells beginning with spreadsheet formula markers are prefixed with an apostrophe for safe viewing. JSON retains the exact submitted comment.

After all 20 responses are acknowledged, reviewers may choose “Review 20 more words”. Each continuation creates a separate anonymous session. A repeated click or competing tab reuses the newly created local session, and unsent responses cannot be discarded to start another batch. Assignment coverage balancing still applies across the study; words may recur across batches. Multiple sessions must not be interpreted as independent reviewers.
