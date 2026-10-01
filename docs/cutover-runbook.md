# msd.com cutover runbook

## Preconditions (all must be true)

- [ ] Real GitHub repo created and connected; placeholder origin
      (`https://github.com/msd-editors/msd-eds.git`) replaced (Task 1 ruling).
- [ ] Google Drive folder shared with the EDS service account; all 116 Docs
      created and synced (`tools/convert/create-docs.js` smoke test passed).
- [ ] `review/progress.csv` shows every page `done` (review pass complete).
- [ ] Block screenshot sign-offs complete (Task 8/9 fidelity gates).
- [ ] `tools/compare-sites.js` report clean: 0 missing pages, 0 broken
      images, 0 broken links, 0 page errors.
- [ ] Font substitution (Inter for Invention) confirmed or replaced by the
      brand team (Task 3 ruling).
- [ ] q4-* investor sections decision signed off (Task 2 ruling).

## Cutover steps (in order)

1. Merge `eds-migration` to `main` — merging main ships code.
2. Publish all content: every reviewed Doc published via Sidekick.
3. Verify the production host serves the site
   (`https://main--msd--<org>.aem.live`).
4. Record current msd.com DNS values (A/CNAME) — required for rollback.
5. Point msd.com DNS at the EDS production host per Adobe's domain setup
   docs (includes TLS provisioning; allow up to 24h propagation).
6. Freeze WordPress to read-only (no new content); keep it running.
7. Update sitemap references / Search Console to the new host.
8. Monitor for 48h: error rates, broken-link reports, analytics.

## Rollback

- Point msd.com DNS back to the recorded WordPress values.
- Propagation is the only delay; the two sites ran independently, so
  WordPress content is intact and current as of the freeze.
- No data loss: EDS content lives in Google Docs; WP content in WordPress.

## Post-grace-period (2–4 weeks)

- Retire the WordPress site (archive a final database dump first).
- Archive `export/` as the content-of-record backup alongside the dump.
- Remove the placeholder origin remote; confirm production remote.
