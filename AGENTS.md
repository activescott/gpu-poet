# Agent Instructions

This file contains instructions and context for LLM agent sessions working with this repository.

## Additional Agents and Skills

The private `gpu-poet-data` repo at `../gpu-poet-data/` contains agents and skills that apply to this project. Check `.claude/agents/` in that repo when looking for skills related to news articles, GPU specs, benchmarks, or data management.

## Data Sync from gpu-poet-data

GPU specs, model specs, and benchmark data are authored in the private `gpu-poet-data` repo. Its `sync-to-gpu-poet.yaml` workflow rsyncs `data/benchmark-data`, `data/gpu-data` and `data/model-data` into this repo's `main` daily at 06:00 UTC, and the push triggers `build.yaml`, which builds and deploys the site. The rsync uses `--delete`, so edits to those directories here are overwritten.

Agents never copy or commit those data files here, and never open a gpu-poet PR for a data fix. Fix the data in `gpu-poet-data`, merge it there, and the next sync ships it. To ship a merged fix sooner:

```bash
gh workflow run sync-to-gpu-poet.yaml --repo activescott/gpu-poet-data
gh run list --repo activescott/gpu-poet --limit 3
```

`data/metric-definitions/` is not covered by the workflow. For changes there, run `gpu-poet-data/scripts/copy-to-gpu-poet.sh`, then commit and push the synced files here.

## Important Instructions

- Always use scripts/dev to start the dev environment:
  - Don't use kind/skaffold commands directly to start it.
  - Run `./scripts/dev` directly without output redirection - it provides all needed output
  - Don't redirect output (e.g., `> /tmp/file.log`) - it causes permission prompts
  - To stop: `./scripts/dev stop`
  - To restart: `./scripts/dev stop && ./scripts/dev`
  - The dev environment takes ~33s to start. Start it in background and use `sleep 33` right away.
  - The app runs on a shared local `kind` cluster (also used by other local projects) at `http://gpupoet.localhost:3400`, not `localhost:3000`.
- Always use `kubectl --context kind-kind` for the correct context.
- Save all approved plans to `/Users/scott/src/activescott/gpu-poet-data/docs/plans/` with format `YYYY-MM-DD-plan-name.md`.
- **Taking screenshots**: Use `./scripts/screenshot <url> [output-dir]` to capture pages for visual verification. It auto-splits long pages into viewport-sized chunks. Dev environment must be running first. Use `SELECTOR='.my-class'` to capture a specific element.

## Database Query Gotchas

### How to Query Postgres
- Always use `./scripts/psql` (dev database) or `./scripts/psql-prod` (production) — never `psql` directly and never read `.env` for connection strings.
- dev takes the query on stdin: `echo 'SELECT ...' | ./scripts/psql`
- prod takes the query as an argument: `./scripts/psql-prod 'SELECT ...'`
- Prefer read-only `SELECT` queries. The dev database is usually empty of listings — use prod for real listing/price data.

### Query Filter Rules
- Queries for **current/active listings** should filter `archived = false` AND `exclude = false`
- Queries for **historical analysis** (market report charts, price trends) should **NOT** filter on `archived` — listings are archived after just 6 hours off eBay, so all past-month data is archived
- **All queries** must filter `exclude = false` to remove data quality issues (scams, accessories, box-only, etc.)
- Use `cachedAt` (not `createdAt`) for date ranges — `cachedAt` captures "what was on the market during this period" including carry-over listings from prior months still active. `createdAt` only records when a listing was first seen.
- The `priceValue` column is stored as string/Decimal — always cast with `::float` in ORDER BY to avoid alphabetical sorting

## Adding New Metrics (Specs or Benchmarks)

**Important:** Do NOT hardcode benchmark names, spec names, or slug mappings in TypeScript code. All metric definitions are data-driven from YAML files and loaded into the database at seed time.

**To add a new GPU spec metric:**
1. Add the field to GPU spec YAML files in `/data/gpu-specs/`
2. Add metadata to `/data/metric-definitions/specs.yaml` (slug, name, unit, description)
3. Run `npx prisma db seed` (or restart the dev environment)

**To add a new gaming benchmark:**
1. Add benchmark YAML file to `/data/benchmark-data/`
2. Map GPU names in `/data/benchmark-data/gpu-name-mapping.yaml`
3. Add the field mapping in `prisma/seed.ts` (`benchmarkFieldMap` for GPU model field, `getBenchmarkGpuField` for slug-to-field mapping)
4. Run `npx prisma db seed`

The `MetricDefinition` table stores all metric metadata and the `gpuField` column maps URL slugs to TypeScript GPU model field names. This allows adding new metrics without code changes to routes or components.

## Listing Exclusion Benchmark

Before changing the rules in `packages/web-app/src/pkgs/server/listingFilters.ts`, score them with `LOG_LEVEL=silent npx tsx src/scripts/exclusion-benchmark.ts` from `packages/web-app`, and again after, and put both sets of numbers in the PR. The fixture in `src/pkgs/server/exclusionBenchmark/` is production's excluded listings (positives) and live listings (negatives). Every live listing has already passed the current rules, so false rejects only appear once you change a rule. Refresh the fixture with `src/scripts/export-exclusion-benchmark.ts` against a read-only prod role. Suspected label errors go in `labelReview.json`, never as edits to `listings.jsonl`.

## Working with Data Files

### News Articles
**IMPORTANT:** When updating news articles in `/data/news-data/`:
- **ALWAYS update the `updatedAt` field** to the current timestamp
- The database seed script uses `updatedAt` to determine which articles need updating
- If `updatedAt` is not changed, the seed script will NOT update the database with your changes
- Format: ISO 8601 timestamp (e.g., `2025-11-24T10:30:00Z`)

## Migration Pitfalls

**Creating Migrations:** When you run `./scripts/prisma-migrate migrate dev --name your_migration`, the script:
1. Runs `prisma migrate dev` inside the Kubernetes container
2. Automatically copies any new migration files back to your local `packages/web-app/prisma/migrations/` directory
3. Reminds you to commit the new migration files

**Automatic Migration Behavior:** Migrations and seeding run automatically when containers start (via `docker/docker-entrypoint.sh`). This applies to both local development and Kubernetes production environments.

**Testing Migrations:** To test new migrations locally, stop the `scripts/dev` process and restart it. The container will restart and run any pending migrations on startup.

**CRITICAL - Migration File Requirement:** When modifying `schema.prisma`, you MUST create a migration file before deploying to production. If you reset the dev database (`prisma migrate reset`) after modifying the schema, the dev database will be in sync with your schema changes, but NO migration file is created. Running `prisma migrate dev` will report "Already in sync" even though production doesn't have the new columns. In this case, you must manually create the migration file:

```bash
mkdir -p packages/web-app/prisma/migrations/YYYYMMDDHHMMSS_migration_name
echo 'ALTER TABLE "TableName" ADD COLUMN "columnName" TYPE;' > packages/web-app/prisma/migrations/YYYYMMDDHHMMSS_migration_name/migration.sql
```

## Amazon Searcher Testing

The amazon-searcher microservice runs in the local kind cluster alongside the main app. Code lives in `packages/amazon-searcher/`. Oxylabs proxy credentials go in `k8s/overlays/dev/.env.dev.app` (see `.env.dev.app.example`).

- **Test a search**: `./scripts/test-amazon-searcher` (random GPU) or `./scripts/test-amazon-searcher "AMD Radeon RX 9070 XT"`
- **Test full revalidation flow**: `./scripts/test-amazon-revalidation`
- **Debug 0-result searches**: `./scripts/amazon-debug-trace` pulls the Playwright trace from the pod. Traces are auto-saved when a search returns 0 results (dev mode only).
- **Iterative debugging**: Use `/test-amazon-searcher` skill for the full test-diagnose-fix workflow when searches fail or Amazon changes their HTML.

## Production Deployment (K8s Manifests)

K8s manifests exist in **two places** that must be kept in sync:
- **`gpu-poet/k8s/base/`** — used by local dev (kind via skaffold)
- **`home-infra-k8s-flux/apps/base/gpupoet/`** — used by production (Flux GitOps)

When changing CronJobs, ingress rules, deployments, or services, update both repos.

**Deployment order matters** when changes include new endpoints:
1. Push `gpu-poet` first — triggers GitHub Actions CI to build and publish the container image
2. Wait for CI to complete (`gh run list --repo activescott/gpu-poet --limit 1`)
3. Then push `home-infra-k8s-flux` — Flux deploys the new manifests referencing the new endpoints

If flux is pushed before the new container is live, CronJobs may hit endpoints that don't exist yet.

## PostHog Analytics

**Server-side PostHog pitfall:** Do NOT use `posthog-node` to send experiment exposure events (`$feature_flag_called`) from the server. The events will carry the server's IP address instead of the real visitor's IP. If the server IP matches a PostHog test account filter (e.g. `50.46.x.x`), all experiment exposures get silently filtered out — resulting in 0 data.

Instead, evaluate feature flags client-side using `useFeatureFlagVariantKey` from `posthog-js/react`. This ensures `$feature_flag_called` events are sent from the browser with the correct IP, host, and session context.

## Experiments

All experiments (SEO, UX, Performance, Conversion) are tracked in `../gpu-poet-data/docs/experiments/`. At session start, check for experiments with status "Observing" whose observation period has ended — pull results from the relevant source (GSC for SEO, PostHog for UX, etc.) and prompt the user to record conclusions. See the README there for process details and `_template.md` for the experiment format. SEO insights (ad-hoc analysis) are in `../gpu-poet-data/docs/seo/insights/`.

## Alerting

Alert rules and Alertmanager config (Telegram notifications) are in the flux repo:
- **Rules**: `home-infra-k8s-flux/apps/production/monitoring/prometheus/helmrelease.yaml` under `serverFiles.alerting_rules.yml`
- **Routing/Telegram**: Same file under `alertmanagerFiles.alertmanager.yml`
- **Secrets**: `kustomization.yaml` generates `alertmanager-secrets` from `.env.secret.alertmanager.encrypted`
