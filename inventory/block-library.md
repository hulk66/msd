# msd.com Block Library (contract for EDS implementation)

Source of truth: the WordPress theme's block registry, extracted from
stylesheet links (`/wp-content/themes/cex-wpvip-mhh-mhh2-mcc-theme/blocks/mccberg/<name>/`)
across all 185 crawled URLs, cross-checked with class-frequency analysis.
Usage counts are page-hits across the crawl.

## EDS block mapping

Each WordPress block family maps to one EDS block. Variants are expressed as
block class modifiers in the Doc (e.g. `hero (full)`, `content-block (right)`).

| EDS block | WordPress source families (hits) | Notes |
|---|---|---|
| `hero` | hero-block (261), article-hero-block (86), text-hero-block (8), featured-banner (24), stock-ticker-hero (1) | Image, text, and video variants; `full` modifier for full-bleed |
| `cards` | content-teaser-cards (114), f3-more-stories (52), feature-stories (2), e2-all-stories (4), b13-3-card-block (1) | Teaser card grids; one row per card |
| `content-block` | content-block (108) | Image + heading + description + CTA; `left`/`right`/`negative` modifiers |
| `title` | title-block (66), g5 title containers | Section heading band |
| `bio-highlights` | f9-bio-highlights (62) | Leadership bio cards |
| `accordion` | b6-accordion-list (39) | Accordion list |
| `statistics` | statistics-content (22), article-statistics-content (20) | Stat number + label grid |
| `tabs` | tabs-block (20), tab-block (10) | Tabbed content |
| `columns` | three-column-content (19), two-column-content (8), four-column-content (4), two-column-video (1) | N-column layout; column count from row length |
| `article-images` | article-images (19) | Image gallery for articles |
| `video` | b25-homepage-light-text-over-dark-video (8), hero-video-player (2) | Video with text overlay |
| `featured-stories` | b24-homepage-no-hero-block (8) | Homepage story grid |
| `related-links` | b7-related-links (6) | Link list |
| `download-list` | g5-download-list (6) | File download list |
| `slideshow` | f11-article-slideshow (6), carousel (2) | Image carousel |
| `listicle` | f7-listicle (6) | Numbered list sections |
| `quote` | article-quote (8) | Pull quote |
| `contact-banner` | contact-us-banner (4), g4-contact-list (2) | Contact info banner (content only, no form) |
| `bento-box` | bento-box (4) | Bento grid |
| `timeline` | timeline (2), timeline-year (2) | Year-marked timeline |
| `buttons` | f2-buttons-link (2) | CTA button row |
| `vertical-scroll` | f6-vertical-in-page-scrolling (2) | In-page section scroller |
| `modal` | modal-block (1) | Modal content |

**Out of scope (dynamic investor feeds):** all `q4-*` families (events-list,
featured-event, news-list, statements-list, quarterly-reports-list,
stock-info, dividend-history, analyst-coverage). These render live data from
the Q4 investor-relations API at request time. The spec excludes dynamic
features; these sections ship as a `related-links` block pointing at the
investor-relations pages, or are dropped with stakeholder sign-off.

## Canonical source samples

### hero (from mco-b2-hero-block)

```html
<div id="mco-b2-hero-block-block_…" class="mco-b2-hero-block full mccberg-block mb-2">
  <div class="mco-b2-hero-block-wrapper">
    <div class="mco-b2-hero-block-image-section">
      <div class="mco-b2-hero-block-image-container">
        <picture>
          <source media="(max-width: 767px)" data-srcset="…/B2-We-are-driven…jpg?w=768&quality=70">
          <source media="(min-width: 768px) and (max-width: 1199px)" data-srcset="…">
          <img …>
        </picture>
      </div>
      …heading/copy/CTA section…
```

EDS shape: first cell = image (optional), remaining cells = heading, copy,
CTA link. Modifiers: `full` (full-bleed).

### content-block (from mco-b5-content-block)

```html
<div id="mco-b5-content-block-block_…" class="mco-b5-content-block mccberg-block mt-2 mb-2 negative right">
  <div class="wrapper">
    <div class="mco-b5-content-block-image-section">
      <picture aria-label="Scientist reviewing test tubes">…</picture>
    …
```

EDS shape: row 1 header `content-block (right, negative)`; row 2 = image |
heading | description | CTA text+link. Modifiers: image side (`left`/`right`),
`negative` (dark background).

### columns (from mco-three-column-content-block)

```html
<div id="mco-three-column-content-block-block_…" class="mco-three-column-content-block mccberg-block mt-2 mb-2">
  <div class="mco-three-column-content-heading-container">…</div>
  <div class="mco-three-column-content-columns-container">
    <div class="mco-three-column-content-column" role="link" data-href="https://www.msd.com/patients/">
      <div class="mco-three-column-content-col-img-container"><figure>…picture…</figure></div>
      …column copy…
```

EDS shape: header row `columns (linked)`; one row per column: image | title |
description | link. Column count derives from row length.

### featured-stories / cards (from mco-b24 / mco-featured-stories-e1)

```html
<div class="mco-b24-homepage-no-hero-container …">
  <div class="mco-g5-title-container"><h2>Explore our stories</h2></div>
  <div class="mco-b24-content-section">
    <div class="mco-b24-homepage-block-image-section-column">
      <a href="…/stories/…"><picture>…</picture> …title… </a>
```

EDS shape: header row `cards`; one row per story: image | title | description |
link.

## Editor-facing subset

The content team guide (Task 12) covers only: `hero`, `content-block`,
`columns`, `cards`, `accordion`, `title`, `quote`, `statistics`,
`related-links`, `download-list`, `buttons`. The remaining blocks exist for
migrated pages and are maintained by developers on request.

## Detection patterns (converter contract)

`mco-<family>-` class prefixes map to EDS block names as above. The converter
(Task 5) recognizes `mco-<fam>-content-block`, `mco-<fam>-hero-block`,
`mco-<fam>-block`, and the theme registry names above; anything else is plain
content. Full mapping table lives in `tools/convert/block-map.js` (added in
Task 5).
