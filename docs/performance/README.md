# Performance Budget

listhq.com.au is guarded by Lighthouse CI on every push to `main`, every PR targeting `main`, and daily at 14:00 UTC (00:00 AEST) via scheduled cron.

## Gates (build fails if any breach)

| Metric | Desktop | Mobile |
|---|---|---|
| Performance score | ≥ 95 | ≥ 92 |
| Accessibility score | ≥ 95 | ≥ 95 |
| Best Practices score | ≥ 95 | ≥ 92 |
| SEO score | ≥ 95 | ≥ 95 |
| LCP | ≤ 1.8s | ≤ 2.5s |
| CLS | ≤ 0.05 | ≤ 0.1 |
| TBT | ≤ 200ms | ≤ 300ms |
| FCP | ≤ 1.2s | ≤ 1.8s |
| Speed Index | ≤ 2.5s | ≤ 3.4s |
| Initial JS bundle (gzipped) | ≤ 180KB | ≤ 180KB |

Configs: [`lighthouserc.json`](../../lighthouserc.json), [`lighthouserc.mobile.json`](../../lighthouserc.mobile.json)
Workflow: [`.github/workflows/lighthouse-ci.yml`](../../.github/workflows/lighthouse-ci.yml)

## When the gate fails

1. Check the failed run output in GitHub Actions.
2. Identify which audit regressed (LCP, TBT, bundle size, etc).
3. Inspect the recent commits — find the change that added bytes or blocked the main thread.
4. Either revert, optimise, OR (if intentional and unavoidable) raise the threshold with team sign-off.

**Do not silence the gate without team review.**

## Required GitHub Secrets

Set under repo **Settings → Secrets and variables → Actions**:

- `LHCI_GITHUB_APP_TOKEN` — optional; install the [Lighthouse CI GitHub App](https://github.com/apps/lighthouse-ci) and paste the token here. Lets LHCI post status checks back to PRs.
- `PERF_REGRESSION_WEBHOOK_URL` — optional; Slack/Discord webhook fired on failure. Skip if you don't want notifications.

The gate works without these — they only enable PR status checks and notifications.

## Branch protection (one-time setup)

After the first green run on `main`:

1. Open GitHub repo **Settings → Branches → Branch protection rules → `main`**
2. Enable **Require status checks to pass before merging**
3. Add as required checks:
   - `lighthouse-desktop`
   - `lighthouse-mobile`
   - `bundle-size`
4. Save.

This prevents any PR from being merged if performance regresses.

## Baseline snapshots

Run `node scripts/save-baseline.mjs` after a passing run to capture a versioned baseline in this folder (`baseline-YYYY-MM-DD.json`). Commit it. Future investigations can diff against the last known-good baseline.
