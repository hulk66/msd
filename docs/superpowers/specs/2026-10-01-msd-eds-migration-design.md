# msd.com Migration to Adobe Edge Delivery Services — Design

Date: 2026-10-01
Status: Approved design, pending spec review

## 1. Overview

Migrate msd.com from WordPress to Adobe Edge Delivery Services (EDS, aem.live),
keeping the current design 1:1. After migration, a non-technical content team
edits all content directly in Google Docs.

### Scope

| Dimension | Decision |
|---|---|
| Source platform | WordPress, single market, 100–500 pages |
| Content type | Purely content pages — no forms, search, or dynamic features |
| Design fidelity | Current design kept 1:1 |
| Authoring | Google Docs, edited by non-technical content team |
| SEO / URLs | Not critical; no redirect map required |
| Out of scope | Forms, site search, personalization, multi-market, redesign, new content |

### Approach

Automated pipeline (approved):

1. Audit the current site and build a block library mapping every recurring
   design pattern to an EDS block.
2. Export content via the WordPress REST API and script the conversion of each
   page into a Google Doc using EDS block conventions.
3. Human review pass per page to fix conversion artifacts.

## 2. Architecture

**Platform:** Adobe EDS (aem.live). Site code lives in a GitHub repository;
publishing runs through aem.live's build and delivery pipeline with a custom
domain for msd.com.

**Content flow:**

- All content lives as Google Docs in a shared Google Drive folder structure
  (one folder per top-level site section).
- The Drive folder is shared with the EDS service account; aem.live indexes the
  docs and serves each as an HTML page.
- The content team edits Docs and uses the aem.live Sidekick browser extension
  to preview and publish. No developer involvement for day-to-day content
  changes.

**Repository structure:**

```
/blocks/<block-name>/   One folder per block (JS + CSS), EDS boilerplate layout
/styles/                Global CSS rebuilt 1:1 from the current site
/scripts/               EDS boilerplate scripts
/tools/                 Migration scripts (WP export, HTML→Doc converter);
                        used during migration only
```

**Environments:** `main` branch → production; feature branches → preview URLs
for reviewing block changes before they ship.

## 3. Block Library & Styling

**Discovery first:** Crawl the current msd.com and inventory every distinct
visual component across all page templates (header, footer, hero, teasers,
cards, accordions, image+text, quotes, tables, etc.). This inventory becomes
the block library spec — nothing is built that does not exist on the current
site, and nothing on the current site is missed.

**Block library:**

- Each current design pattern maps to one EDS block with a stable name
  (e.g. `hero`, `cards`, `accordion`, `columns`).
- Ungrouped content renders as plain styled text — most paragraph content
  needs no block, keeping Docs editor-friendly.
- Blocks are configured by their table header row in the Doc (standard EDS
  convention).

**Styling 1:1:**

- Global styles extracted from the current site's CSS: fonts (self-hosted,
  licensed for EDS), color variables, spacing scale, breakpoints.
- Header and footer are auto-blocks loaded from dedicated `nav` and `footer`
  Docs, editable by the content team like any page.
- Fidelity check per block: side-by-side screenshot comparison of the current
  WordPress page vs. the EDS version at desktop/tablet/mobile widths, signed
  off before the block is considered done.

**Section metadata:** Background variants (dark sections, tinted bands) are
set via section metadata in the Doc.

## 4. Content Pipeline (WordPress → Google Docs)

**Step 1 — Export.** A script pulls all pages from the WordPress REST API
(content HTML, title, slug, featured image, menu structure, media). Media
assets are downloaded and uploaded to the EDS Drive.

**Step 2 — Convert.** A conversion script transforms each page's HTML into
EDS Doc format:

- Recognized HTML patterns (from the Section 3 inventory) become block
  tables; everything else becomes clean Doc text/headings.
- Page metadata (title, description, template hints) goes into the Doc's
  metadata table.
- Output: one Google Doc per page, created via the Google Drive/Docs API,
  placed in the matching Drive folder, named by slug.

**Step 3 — Review pass.** Each converted Doc is checked side-by-side against
the live page, fixing block misclassifications and formatting artifacts. A
review checklist and progress tracker are produced so the work can be
partially delegated to the content team. This is the main labor cost at
100–500 pages.

**Step 4 — Publish.** Reviewed Docs are published via Sidekick; old WordPress
paths are retired. A sitemap update is included even though redirects are not
required.

**Idempotency:** The converter can be re-run per page without duplicating
Docs — useful when block mappings improve mid-migration.

## 5. Content Team Enablement

**Authoring guide:** A concise, task-oriented "Editing msd.com in Google
Docs" guide covering the blocks editors will actually use (typically 8–15),
section metadata, the metadata table, image handling, and preview/publish
with Sidekick.

**Training:** One walkthrough session using real migrated pages: editing
text, adding a card, changing a section background, publishing, error
handling, and revert (aem.live keeps publish history).

**Guardrails:** Editors compose only from the existing block library — no
free-form styling in Docs. The guide states which block to use for which
purpose so pages stay on-pattern.

**Ongoing ownership:** New page types or blocks after launch are developer
work via a small change-request process; everything within the existing
block library is self-service.

## 6. Testing & Cutover

**Per-block testing:** Each block verified against the design inventory with
side-by-side screenshots at desktop/tablet/mobile before being marked done.

**Per-page review:** The Step 3 review pass doubles as content QA, checked
against a checklist: all sections present, images loading, block types
correct, metadata set.

**Pre-launch checks:** Full crawl of the EDS site compared against the
WordPress sitemap — every page present, no broken links or images,
Lighthouse performance/accessibility spot checks.

**Cutover:**

1. Publish all content to the aem.live production domain.
2. Point msd.com DNS at the EDS production host.
3. Keep WordPress frozen (read-only) for a grace period as reference, then
   retire it.

**Rollback:** DNS can be pointed back to WordPress at any time during the
grace period; the two sites run independently until cutover.

## 7. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Auto-conversion misclassifies blocks | Human review pass per page; converter is re-runnable per page |
| Design drift from 1:1 goal | Block-by-block screenshot sign-off; editors limited to the block library |
| Google Docs conventions too complex for editors | Guide covers only the blocks in actual use; training on real pages |
| Media/licensing issues with fonts and images | Fonts self-hosted with verified licensing during styling phase |
| Scope creep (forms, search, new content) | Explicitly out of scope; change-request process post-launch |
