# msd.com → Adobe EDS Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate msd.com from WordPress to Adobe Edge Delivery Services with 1:1 design fidelity and Google Docs authoring, via an automated WordPress→Google Docs pipeline.

**Architecture:** An EDS site repo (blocks + styles + boilerplate scripts) plus a Node.js migration toolkit (`/tools`) that exports WordPress content, converts HTML to EDS Doc structure, and writes Google Docs via the Google API. A crawl/inventory step feeds the block library; a review checklist and pre-launch crawl comparison close the QA loop.

**Tech Stack:** Adobe EDS (aem-boilerplate, aem.live), Node.js 20+, `googleapis` (Drive + Docs API), Playwright (crawl/screenshots), Vitest (unit tests).

**Spec:** `docs/superpowers/specs/2026-10-01-msd-eds-migration-design.md`

## Global Constraints

- Design fidelity is 1:1 with the current WordPress site — no redesign.
- Content-only: no forms, search, personalization, multi-market, or new content.
- Editors are non-technical: all authoring happens in Google Docs using the block library only; no free-form styling.
- Every block must come from the crawled component inventory — no invented blocks, no missed patterns.
- Block configuration follows standard EDS conventions (table header rows, section metadata, `nav`/`footer` auto-blocks).
- Converter must be idempotent per page: re-running never duplicates Google Docs.
- Fonts self-hosted with verified licensing; no CDN font loading.
- Node.js 20+; all tool code in `/tools` with unit tests in `/tools/__tests__`; run tests with `npx vitest run`.
- Commit after every task; conventional commit messages (`feat:`, `test:`, `docs:`, `chore:`).

## Review Focus

The five failure modes most likely to bite, each pinned by a test in the owning task:

1. **Converter misclassifies HTML patterns as blocks** (wrong block, or block table where plain text belongs) → Task 5 unit tests pin detection for every inventory pattern class plus the "plain content" fallback.
2. **Re-running the converter duplicates or clobbers Google Docs** → Task 6 tests pin idempotency via the slug→fileId mapping store (same slug re-run = update, not create).
3. **Pages silently missing content after conversion** (dropped sections, images, metadata) → Task 5 test asserts element-count preservation between source HTML and doc model; Task 11 crawl comparison catches it end-to-end.
4. **Unlicensed or CDN-loaded fonts break 1:1 styling** → Task 3 step asserts no external font URLs in shipped CSS and that `fonts/` contains the self-hosted files.
5. **Editor-unfriendly docs** (deeply nested or exotic block tables the content team can't maintain) → Task 10's checklist includes a "blocks used are in the editor guide" check, and Task 5 tests assert every detected block name exists in the inventory list.

---

### Task 1: Scaffold the EDS project

**Files:**
- Create: repo scaffold from `https://github.com/adobe/aem-boilerplate` (all boilerplate files)
- Create: `package.json` additions (dev deps: `vitest`, `playwright`)
- Create: `vitest.config.js`

**Interfaces:**
- Produces: a running EDS dev server (`npm run dev` on :3000) and a test runner (`npx vitest run`) that all later tasks use.

- [ ] **Step 1: Clone the boilerplate into this repo**

```bash
git clone --depth 1 https://github.com/adobe/aem-boilerplate /tmp/aem-boilerplate
rsync -a --exclude .git /tmp/aem-boilerplate/ ./
rm -rf /tmp/aem-boilerplate
```

- [ ] **Step 2: Install dependencies and add dev tooling**

```bash
npm install
npm install -D vitest@2 playwright@1
```

- [ ] **Step 3: Add vitest config**

Create `vitest.config.js`:

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tools/**/*.test.js', 'tests/**/*.test.js'],
    environment: 'node',
  },
});
```

- [ ] **Step 4: Verify dev server and tests**

Run: `npm run dev &` then `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/`
Expected: `200`
Run: `npx vitest run`
Expected: `no test files found` (exit code tolerated for now) — confirms runner works.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold EDS project from aem-boilerplate"
```

---

### Task 2: Crawl the WordPress site and produce the component inventory

**Files:**
- Create: `tools/crawl-site.js`
- Create: `tools/crawl.test.js`
- Create (generated, committed): `inventory/inventory.json`, `inventory/screenshots/`

**Interfaces:**
- Consumes: `WP_BASE_URL` env var (the WordPress site's base URL).
- Produces: `inventory/inventory.json` — array of `{ url, title, components: [{ kind, selector, htmlSample }] }` where `kind` is a normalized component class (`hero`, `cards`, `accordion`, `columns`, `image-text`, `quote`, `table`, `media`, `plain`). Later tasks (3, 8, 9, 10) read this file.

- [ ] **Step 1: Write the failing test**

Create `tools/crawl.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { classifyComponent } from './crawl-site.js';

describe('classifyComponent', () => {
  it('classifies a hero section', () => {
    const el = { tagName: 'DIV', className: 'wp-block-cover hero-banner', querySelector: () => null };
    expect(classifyComponent(el)).toBe('hero');
  });
  it('classifies a card grid', () => {
    const el = { tagName: 'UL', className: 'cards-grid', querySelector: () => null };
    expect(classifyComponent(el)).toBe('cards');
  });
  it('falls back to plain for unrecognized content', () => {
    const el = { tagName: 'P', className: '', querySelector: () => null };
    expect(classifyComponent(el)).toBe('plain');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tools/crawl.test.js`
Expected: FAIL — `classifyComponent` not exported.

- [ ] **Step 3: Implement the crawler**

Create `tools/crawl-site.js`:

```js
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const CLASS_MAP = [
  [/hero|banner|cover/i, 'hero'],
  [/card|teaser|tile/i, 'cards'],
  [/accordion|collapse|faq/i, 'accordion'],
  [/column|split|two-col/i, 'columns'],
  [/image.?text|media.?text/i, 'image-text'],
  [/quote|testimonial|pullquote/i, 'quote'],
  [/\btable\b/i, 'table'],
  [/video|embed|gallery/i, 'media'],
];

export function classifyComponent(el) {
  const hay = `${el.tagName} ${el.className || ''}`;
  for (const [re, kind] of CLASS_MAP) if (re.test(hay)) return kind;
  return 'plain';
}

export async function crawl(baseUrl, { outDir = 'inventory' } = {}) {
  mkdirSync(`${outDir}/screenshots`, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  // Discover internal links up to 500 pages.
  const urls = new Set([baseUrl]);
  const queue = [baseUrl];
  while (queue.length && urls.size < 500) {
    const current = queue.shift();
    await page.goto(current, { waitUntil: 'networkidle' });
    const links = await page.$$eval('a[href]', (as) =>
      as.map((a) => a.getAttribute('href')).filter(Boolean),
    );
    for (const href of links) {
      const abs = new URL(href, current).toString().split('#')[0];
      if (abs.startsWith(baseUrl) && !urls.has(abs) && !/\.(pdf|jpg|png|svg|zip)$/i.test(abs)) {
        urls.add(abs);
        queue.push(abs);
      }
    }
  }

  const inventory = [];
  for (const url of urls) {
    await page.goto(url, { waitUntil: 'networkidle' });
    const slug = new URL(url).pathname.replace(/\//g, '_') || 'home';
    await page.screenshot({ path: `${outDir}/screenshots/${slug}.png`, fullPage: true });
    const components = await page.$$eval(
      'main section, main > div, article > div',
      (els) =>
        els.slice(0, 200).map((el) => ({
          kind: classifyComponent(el),
          selector: el.className || el.tagName,
          htmlSample: el.outerHTML.slice(0, 2000),
        })),
    );
    inventory.push({ url, title: await page.title(), components });
  }
  await browser.close();
  writeFileSync(`${outDir}/inventory.json`, JSON.stringify(inventory, null, 2));
  return inventory;
}

if (process.argv[1] && process.argv[1].endsWith('crawl-site.js')) {
  crawl(process.env.WP_BASE_URL).then((inv) =>
    console.log(`Crawled ${inv.length} pages -> inventory/inventory.json`),
  );
}
```

- [ ] **Step 4: Run tests, then run the crawl**

Run: `npx vitest run tools/crawl.test.js`
Expected: PASS (3 tests)
Run: `WP_BASE_URL=https://www.msd.com node tools/crawl-site.js`
Expected: console reports page count; `inventory/inventory.json` and screenshots exist.

- [ ] **Step 5: Summarize the inventory into the block library spec**

Manually review `inventory.json`: list distinct `kind` values with real frequency counts and pick the canonical HTML sample per kind. Save as `inventory/block-library.md` with one section per block: name, purpose, source HTML sample, EDS table shape. This file is the contract for Tasks 8–9.

- [ ] **Step 6: Commit**

```bash
git add tools/ inventory/
git commit -m "feat: WordPress site crawl and component inventory"
```

---

### Task 3: Global styles and self-hosted fonts

**Files:**
- Create: `styles/tokens.css`
- Modify: `styles/styles.css` (import tokens, map extracted values)
- Create: `fonts/` (self-hosted font files)
- Create: `tools/extract-styles.js`

**Interfaces:**
- Consumes: `inventory/inventory.json` + screenshots (Task 2), the live site's CSS.
- Produces: `styles/tokens.css` custom properties (`--color-*`, `--font-*`, `--spacing-*`, breakpoints) consumed by all block CSS in Tasks 8–9.

- [ ] **Step 1: Extract design values from the live site**

Using Playwright (reuse Task 2's browser setup), read `getComputedStyle` values from the live site's `body`, headings, buttons, and links; download the font files the site uses (verify license permits self-hosting — record the license in `fonts/LICENSE.md`; if not permitted, pick the closest licensed face and note the substitution in `inventory/block-library.md`).

- [ ] **Step 2: Write tokens.css**

Create `styles/tokens.css` with the extracted values, e.g.:

```css
:root {
  /* Colors — exact values from msd.com computed styles */
  --color-background: #ffffff;
  --color-text: #1a1a1a;
  --color-brand-primary: #00857c; /* replace with extracted value */
  --color-brand-dark: #005a94;    /* replace with extracted value */

  /* Type */
  --font-family-body: 'BodyFont', sans-serif;   /* self-hosted */
  --font-family-heading: 'HeadingFont', serif;  /* self-hosted */
  --font-size-body: 1rem;
  --font-size-h1: 2.5rem;

  /* Spacing & breakpoints */
  --spacing-section: 4rem;
  --breakpoint-tablet: 768px;
  --breakpoint-desktop: 900px;
}
```

(Values marked "replace with extracted value" MUST be replaced with the actual computed values from Step 1 before commit — no placeholder values may ship.)

- [ ] **Step 3: Wire fonts and tokens into styles.css**

Add to the top of `styles/styles.css`:

```css
@font-face {
  font-family: 'BodyFont';
  src: url('../fonts/body.woff2') format('woff2');
  font-display: swap;
}
@import './tokens.css';
```

- [ ] **Step 4: Verify no external font URLs and visual parity**

Run: `grep -rn "fonts.googleapis\\|fonts.adobe\\|typekit" styles/ scripts/ blocks/ || echo CLEAN`
Expected: `CLEAN`
Run: `npm run dev`, open `http://localhost:3000/`, compare against the Task 2 screenshot of the home page at 375px, 768px, 1280px. Fix token values until global typography/colors match.

- [ ] **Step 5: Commit**

```bash
git add styles/ fonts/
git commit -m "feat: design tokens and self-hosted fonts from msd.com"
```

---

### Task 4: WordPress content export

**Files:**
- Create: `tools/export-wp.js`
- Create: `tools/export-wp.test.js`
- Create (generated): `export/pages.json`, `export/media/`

**Interfaces:**
- Consumes: `WP_BASE_URL` env var.
- Produces: `export/pages.json` — array of `{ slug, title, excerpt, html, featuredImage, menuOrder, parent }`; media files under `export/media/`. Task 5 consumes `pages.json`; Task 6 consumes media files.

- [ ] **Step 1: Write the failing test**

Create `tools/export-wp.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { extractSlug, collectImageUrls } from './export-wp.js';

describe('extractSlug', () => {
  it('derives slug from link', () => {
    expect(extractSlug({ link: 'https://x.com/about/team/' })).toBe('about/team');
  });
  it('maps root to home', () => {
    expect(extractSlug({ link: 'https://x.com/' })).toBe('home');
  });
});

describe('collectImageUrls', () => {
  it('finds img srcs in html', () => {
    const html = '<p><img src="https://x.com/a.png"></p>';
    expect(collectImageUrls(html)).toEqual(['https://x.com/a.png']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tools/export-wp.test.js`
Expected: FAIL — exports missing.

- [ ] **Step 3: Implement the exporter**

Create `tools/export-wp.js`:

```js
import { mkdirSync, writeFileSync } from 'node:fs';

export function extractSlug(page) {
  const path = new URL(page.link).pathname.replace(/^\/|\/$/g, '');
  return path || 'home';
}

export function collectImageUrls(html) {
  return [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]);
}

export async function exportPages(baseUrl) {
  const pages = [];
  let page = 1;
  for (;;) {
    const res = await fetch(
      `${baseUrl}/wp-json/wp/v2/pages?per_page=100&page=${page}&_fields=link,title,content,excerpt,featured_media,menu_order,parent`,
    );
    if (!res.ok) break;
    const batch = await res.json();
    if (!batch.length) break;
    pages.push(...batch);
    page++;
  }
  mkdirSync('export/media', { recursive: true });
  for (const p of pages) {
    p.slug = extractSlug(p);
    p.title = p.title.rendered;
    p.html = p.content.rendered;
    for (const url of collectImageUrls(p.html)) {
      const file = `export/media/${p.slug}/${url.split('/').pop()}`;
      mkdirSync(`export/media/${p.slug}`, { recursive: true });
      const img = await fetch(url);
      if (img.ok) writeFileSync(file, Buffer.from(await img.arrayBuffer()));
    }
  }
  writeFileSync('export/pages.json', JSON.stringify(pages, null, 2));
  return pages;
}

if (process.argv[1] && process.argv[1].endsWith('export-wp.js')) {
  exportPages(process.env.WP_BASE_URL).then((pages) =>
    console.log(`Exported ${pages.length} pages -> export/pages.json`),
  );
}
```

- [ ] **Step 4: Run tests, then run the export**

Run: `npx vitest run tools/export-wp.test.js`
Expected: PASS (3 tests)
Run: `WP_BASE_URL=https://www.msd.com node tools/export-wp.js`
Expected: `export/pages.json` exists with all pages; media downloaded.

- [ ] **Step 5: Commit**

```bash
git add tools/ export/
git commit -m "feat: WordPress REST API content export"
```

---

### Task 5: HTML → EDS Doc model converter

**Files:**
- Create: `tools/convert/html-to-doc-model.js`
- Create: `tools/convert/html-to-doc-model.test.js`

**Interfaces:**
- Consumes: `pages.json` entries (`html`, `slug`, `title`, `excerpt`); block names from `inventory/block-library.md`.
- Produces: `convertPage(page) → docModel` where `docModel = { slug, title, description, blocks: [{ name, rows: [[cells]], variant? }], sections: [{ blocks, metadata }], plain: [docops] }`. `docops` is an ordered list of `{ type: 'heading'|'paragraph'|'image'|'list', level?, text?, src?, alt?, items? }`. Task 6 consumes `docModel`.

- [ ] **Step 1: Write the failing tests**

Create `tools/convert/html-to-doc-model.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { convertPage, detectBlock, htmlToDocOps } from './html-to-doc-model.js';

describe('detectBlock', () => {
  it('detects hero from class', () => {
    expect(detectBlock('<div class="hero-banner"><h1>Hi</h1></div>')).toBe('hero');
  });
  it('returns null for plain content', () => {
    expect(detectBlock('<p>Just text</p>')).toBe(null);
  });
  it('never returns a block name missing from the library', () => {
    const library = new Set(['hero', 'cards', 'accordion', 'columns', 'image-text', 'quote', 'table', 'media']);
    expect(library.has(detectBlock('<div class="hero-banner">x</div>'))).toBe(true);
  });
});

describe('htmlToDocOps', () => {
  it('converts headings, paragraphs, images, lists', () => {
    const ops = htmlToDocOps(
      '<h2>T</h2><p>Hello</p><img src="a.png" alt="A"><ul><li>one</li><li>two</li></ul>',
    );
    expect(ops).toEqual([
      { type: 'heading', level: 2, text: 'T' },
      { type: 'paragraph', text: 'Hello' },
      { type: 'image', src: 'a.png', alt: 'A' },
      { type: 'list', items: ['one', 'two'] },
    ]);
  });
});

describe('convertPage preserves content', () => {
  it('keeps every top-level element accounted for', () => {
    const html = '<div class="hero"><h1>H</h1></div><p>body</p><ul><li>x</li></ul>';
    const model = convertPage({ slug: 's', title: 'T', excerpt: 'e', html });
    const blockEls = model.sections.flatMap((s) => s.blocks).length;
    const plainOps = model.sections.flatMap((s) => s.plain).length;
    expect(blockEls + plainOps).toBe(3); // hero block + p + ul
    expect(model.slug).toBe('s');
    expect(model.title).toBe('T');
    expect(model.description).toBe('e');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tools/convert/html-to-doc-model.test.js`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement the converter**

Create `tools/convert/html-to-doc-model.js`:

```js
// Minimal dependency-free HTML walking. Uses regex-free DOM via a tiny
// parser: we depend on 'node-html-parser' (npm i node-html-parser).
import { parse } from 'node-html-parser';

const BLOCK_PATTERNS = [
  [/hero|banner|cover/i, 'hero'],
  [/card|teaser|tile/i, 'cards'],
  [/accordion|collapse|faq/i, 'accordion'],
  [/column|split|two-col/i, 'columns'],
  [/image.?text|media.?text/i, 'image-text'],
  [/quote|testimonial|pullquote/i, 'quote'],
  [/\btable\b/i, 'table'],
  [/video|embed|gallery/i, 'media'],
];

export function detectBlock(html) {
  const root = parse(html);
  const el = root.firstElementChild;
  if (!el) return null;
  const hay = `${el.tagName} ${el.getAttribute('class') || ''}`;
  for (const [re, name] of BLOCK_PATTERNS) if (re.test(hay)) return name;
  return null;
}

export function htmlToDocOps(html) {
  const root = parse(html);
  const ops = [];
  for (const el of root.querySelectorAll('h1, h2, h3, h4, h5, h6, p, img, ul, ol')) {
    if (el.tagName.match(/^H[1-6]$/)) {
      ops.push({ type: 'heading', level: Number(el.tagName[1]), text: el.text.trim() });
    } else if (el.tagName === 'P') {
      const img = el.querySelector('img');
      if (img) {
        ops.push({ type: 'image', src: img.getAttribute('src'), alt: img.getAttribute('alt') || '' });
        const text = el.text.trim();
        if (text) ops.push({ type: 'paragraph', text });
      } else if (el.text.trim()) {
        ops.push({ type: 'paragraph', text: el.text.trim() });
      }
    } else if (el.tagName === 'IMG') {
      ops.push({ type: 'image', src: el.getAttribute('src'), alt: el.getAttribute('alt') || '' });
    } else {
      ops.push({ type: 'list', items: el.querySelectorAll('li').map((li) => li.text.trim()) });
    }
  }
  return ops;
}

export function convertPage(page) {
  const root = parse(page.html);
  const sections = [];
  let current = { blocks: [], plain: [], metadata: {} };
  const flush = () => { if (current.blocks.length || current.plain.length) sections.push(current); };

  for (const child of root.querySelectorAll(':scope > body > *, body > *')) {
    const html = child.outerHTML;
    const name = detectBlock(html);
    if (name) {
      current.blocks.push({ name, rows: [[html.slice(0, 500)]] }); // refined per block in Task 8/9
    } else {
      current.plain.push(...htmlToDocOps(html));
    }
  }
  flush();
  return {
    slug: page.slug,
    title: page.title,
    description: page.excerpt || '',
    sections,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tools/convert/html-to-doc-model.test.js`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add tools/convert/
git commit -m "feat: HTML to EDS doc model converter with block detection"
```

---

### Task 6: Google Docs writer (idempotent)

**Files:**
- Create: `tools/convert/create-docs.js`
- Create: `tools/convert/create-docs.test.js`
- Create (generated): `export/doc-mapping.json`

**Interfaces:**
- Consumes: `docModel` from Task 5; Google service-account credentials at `GOOGLE_APPLICATION_CREDENTIALS` env var; `DRIVE_FOLDER_ID` env var.
- Produces: `syncDocs(models)` — creates/updates one Google Doc per model, maintains `export/doc-mapping.json` (`{ [slug]: { fileId, url } }`), returns the mapping. Re-running with the same slugs updates existing docs (idempotency contract).

- [ ] **Step 1: Write the failing tests**

Create `tools/convert/create-docs.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { docModelToRequests, planSync } from './create-docs.js';

describe('docModelToRequests', () => {
  it('emits title, metadata, blocks and plain ops in order', () => {
    const model = {
      slug: 'about', title: 'About', description: 'd',
      sections: [
        { blocks: [{ name: 'hero', rows: [['Headline', 'Sub']] }], plain: [], metadata: {} },
        { blocks: [], plain: [{ type: 'heading', level: 2, text: 'Sec' }, { type: 'paragraph', text: 'Body' }], metadata: {} },
      ],
    };
    const reqs = docModelToRequests(model);
    const text = reqs.filter((r) => r.insertText).map((r) => r.insertText.text).join('');
    expect(text).toContain('About');
    expect(text).toContain('hero');
    expect(text).toContain('Sec');
    expect(text).toContain('Body');
  });
});

describe('planSync is idempotent', () => {
  it('creates when slug unknown, updates when known', () => {
    const create = planSync({ slug: 'a' }, {});
    const update = planSync({ slug: 'a' }, { a: { fileId: 'f1' } });
    expect(create.action).toBe('create');
    expect(update.action).toBe('update');
    expect(update.fileId).toBe('f1');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tools/convert/create-docs.test.js`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement the writer**

Create `tools/convert/create-docs.js`:

```js
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { google } from 'googleapis';

const MAPPING_FILE = 'export/doc-mapping.json';

export function loadMapping() {
  return existsSync(MAPPING_FILE) ? JSON.parse(readFileSync(MAPPING_FILE, 'utf8')) : {};
}

export function planSync(model, mapping) {
  const known = mapping[model.slug];
  return known
    ? { action: 'update', slug: model.slug, fileId: known.fileId }
    : { action: 'create', slug: model.slug };
}

export function docModelToRequests(model) {
  const requests = [];
  const insert = (text, style) =>
    requests.push({ insertText: { location: { index: 1 }, text } }, ...(style ? [style] : []));

  insert(`${model.title}\n`);
  insert(`Metadata: title=${model.title}; description=${model.description}\n`);
  for (const section of model.sections) {
    for (const block of section.blocks) {
      insert(`Block: ${block.name}\n`);
      for (const row of block.rows) insert(`${row.join(' | ')}\n`);
    }
    for (const op of section.plain) {
      if (op.type === 'heading') insert(`${'#'.repeat(op.level)} ${op.text}\n`);
      else if (op.type === 'paragraph') insert(`${op.text}\n`);
      else if (op.type === 'image') insert(`[image: ${op.src} alt=${op.alt}]\n`);
      else if (op.type === 'list') insert(`${op.items.map((i) => `- ${i}`).join('\n')}\n`);
    }
    insert(`---\n`); // section divider
  }
  return requests;
}

export async function syncDocs(models, { folderId } = {}) {
  const auth = await google.auth.getClient({
    scopes: ['https://www.googleapis.com/auth/documents', 'https://www.googleapis.com/auth/drive'],
  });
  const docs = google.docs({ version: 'v1', auth });
  const drive = google.drive({ version: 'v3', auth });
  const mapping = loadMapping();

  for (const model of models) {
    const plan = planSync(model, mapping);
    const requests = docModelToRequests(model);
    if (plan.action === 'create') {
      const doc = await docs.documents.create({
        requestBody: { title: model.title },
      });
      if (folderId) {
        await drive.files.update({ fileId: doc.data.documentId, addParents: folderId, fields: 'id' });
      }
      await docs.documents.batchUpdate({ documentId: doc.data.documentId, requestBody: { requests } });
      mapping[model.slug] = { fileId: doc.data.documentId, url: `https://docs.google.com/document/d/${doc.data.documentId}/edit` };
    } else {
      await docs.documents.batchUpdate({ documentId: plan.fileId, requestBody: { requests } });
    }
  }
  writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2));
  return mapping;
}

if (process.argv[1] && process.argv[1].endsWith('create-docs.js')) {
  const models = JSON.parse(readFileSync('export/doc-models.json', 'utf8'));
  syncDocs(models, { folderId: process.env.DRIVE_FOLDER_ID }).then((m) =>
    console.log(`Synced ${Object.keys(m).length} docs`),
  );
}
```

Note: the request builder above writes a readable text representation of blocks; the polished block-table formatting (real Google Docs tables) is added per block in Tasks 8–9, extending `docModelToRequests` with table requests (`createTableRequest`) for block rows.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tools/convert/create-docs.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Smoke-test against a scratch Drive folder**

Create a service account in Google Cloud, enable Docs + Drive APIs, share a scratch folder with the service account email, then:

```bash
GOOGLE_APPLICATION_CREDENTIALS=creds.json DRIVE_FOLDER_ID=<id> \
  node -e "import('./tools/convert/create-docs.js').then(m => m.syncDocs([{slug:'smoke',title:'Smoke',description:'',sections:[{blocks:[],plain:[{type:'paragraph',text:'hello'}],metadata:{}}]}], {folderId: process.env.DRIVE_FOLDER_ID}))"
```

Run it twice. Expected: second run logs the same doc count (no duplicate).

- [ ] **Step 6: Commit**

```bash
git add tools/convert/ export/doc-mapping.json
git commit -m "feat: idempotent Google Docs writer for migrated pages"
```

---

### Task 7: Nav and footer auto-blocks

**Files:**
- Create: `blocks/nav/nav.js`, `blocks/nav/nav.css`
- Create: `blocks/footer/footer.js`, `blocks/footer/footer.css`
- Create: `nav.docx` and `footer.docx` content plan in `inventory/block-library.md`

**Interfaces:**
- Consumes: design tokens (Task 3); WP menu structure from `export/pages.json` (`menuOrder`, `parent`).
- Produces: `decorateHeader()` / `decorateFooter()` wired in `scripts/scripts.js` per boilerplate convention; content sourced from `nav` and `footer` Docs.

- [ ] **Step 1: Generate nav.docx and footer.docx content**

From `export/pages.json`, emit the top-level menu tree as the `nav` doc content (one `<nav>` wrapper with nested `<ul>` per boilerplate convention) and the footer columns as the `footer` doc content. Save generation as `tools/gen-nav-footer.js` reading `pages.json`.

- [ ] **Step 2: Implement nav block**

`blocks/nav/nav.js` — follow the aem-boilerplate `nav` pattern: fetch `/nav.plain.html`, wrap brand + sections + tools, add mobile hamburger toggling `aria-expanded` on the `nav` element. `nav.css` styles it with tokens to match the current header 1:1.

- [ ] **Step 3: Implement footer block**

`blocks/footer/footer.js` — fetch `/footer.plain.html`, render columns; `footer.css` matches current footer styling.

- [ ] **Step 4: Verify against screenshots**

Run: `npm run dev`. Compare rendered header/footer against Task 2 screenshots at 375/768/1280px. Adjust CSS until parity.

- [ ] **Step 5: Commit**

```bash
git add blocks/nav blocks/footer tools/gen-nav-footer.js
git commit -m "feat: nav and footer auto-blocks matching current design"
```

---

### Task 8: Exemplar block — hero (establishes the block workflow)

**Files:**
- Create: `blocks/hero/hero.js`, `blocks/hero/hero.css`
- Create: `tools/compare-screenshots.js`
- Create: `tests/blocks/hero.test.js`

**Interfaces:**
- Consumes: tokens (Task 3); inventory hero sample (Task 2).
- Produces: the repeatable block workflow (test → implement → screenshot compare → sign off) used for every remaining block in Task 9; `tools/compare-screenshots.js` reused by every block.

- [ ] **Step 1: Write the failing test**

Create `tests/blocks/hero.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildHeroBlock } from '../../blocks/hero/hero.js';

describe('hero block', () => {
  it('wraps first image as background and content as copy', () => {
    const el = document.createElement('div');
    el.innerHTML = '<picture><img src="/h.jpg"></picture><h1>Title</h1><p>Sub</p>';
    const block = buildHeroBlock(el);
    expect(block.querySelector('.hero-picture img').getAttribute('src')).toBe('/h.jpg');
    expect(block.querySelector('.hero-copy h1').textContent).toBe('Title');
  });
});
```

(Add `vitest` jsdom environment for this file via `// @vitest-environment jsdom` comment; `npm i -D jsdom`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/blocks/hero.test.js`
Expected: FAIL — `buildHeroBlock` missing.

- [ ] **Step 3: Implement the hero block**

`blocks/hero/hero.js`:

```js
export function buildHeroBlock(el) {
  const block = document.createElement('div');
  block.className = 'hero block';
  const picture = el.querySelector('picture');
  const copy = document.createElement('div');
  copy.className = 'hero-copy';
  copy.append(...el.children);
  if (picture) {
    const bg = document.createElement('div');
    bg.className = 'hero-picture';
    bg.append(picture);
    block.append(bg);
  }
  block.append(copy);
  return block;
}

export default async function decorate(block) {
  const rebuilt = buildHeroBlock(block);
  block.replaceWith(rebuilt);
}
```

`blocks/hero/hero.css` styles `.hero` using tokens to match the inventory hero sample (background image cover, copy overlay position, responsive sizes at the token breakpoints).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/blocks/hero.test.js`
Expected: PASS

- [ ] **Step 5: Screenshot comparison sign-off**

Create `tools/compare-screenshots.js` (Playwright): loads a local page using the block and the corresponding live WordPress URL, captures both at 375/768/1280px into `inventory/compare/hero/`, and prints the file paths for human side-by-side review. Run it, review, adjust CSS until signed off.

- [ ] **Step 6: Commit**

```bash
git add blocks/hero tests/blocks tools/compare-screenshots.js
git commit -m "feat: hero block with screenshot comparison workflow"
```

---

### Task 9: Complete the block library from the inventory

**Files (per block, repeat):**
- Create: `blocks/<name>/<name>.js`, `blocks/<name>/<name>.css`
- Create: `tests/blocks/<name>.test.js`

**Interfaces:**
- Consumes: `inventory/block-library.md` (Task 2) — the authoritative list of blocks and their table shapes; Task 8 workflow and `tools/compare-screenshots.js`.
- Produces: every block named in `inventory/block-library.md`, each with: unit test, JS decoration, CSS matching the live design, and a signed-off screenshot comparison. Also extends `docModelToRequests` (Task 6) with real table formatting per block's documented shape.

- [ ] **Step 1: Enumerate blocks from block-library.md**

List every block name from `inventory/block-library.md` except `hero` (done in Task 8). Track them in this plan file as a checklist appended below this task.

- [ ] **Step 2: For each block, run the Task 8 workflow**

For each block `<name>`:
1. Write `tests/blocks/<name>.test.js` covering: correct DOM restructuring, use of tokens (no hard-coded colors/fonts), and — for content-bearing blocks — that no source content is dropped (assert text/image counts in == out).
2. Run: `npx vitest run tests/blocks/<name>.test.js` — verify FAIL.
3. Implement `blocks/<name>/<name>.js` + `.css` per its block-library.md table shape.
4. Run: `npx vitest run tests/blocks/<name>.test.js` — verify PASS.
5. Run `tools/compare-screenshots.js` for the block; adjust until signed off.
6. Commit: `git commit -m "feat: <name> block"`.

- [ ] **Step 3: Extend the Docs writer with block tables**

For each block, extend `docModelToRequests` in `tools/convert/create-docs.js` so the block's `rows` render as a real Google Docs table with the header row `<name>` per EDS convention. Add a unit test per block shape in `tools/convert/create-docs.test.js` asserting the table request structure.

- [ ] **Step 4: Full test run**

Run: `npx vitest run`
Expected: PASS — all block tests, converter tests, docs-writer tests.

- [ ] **Step 5: Commit**

```bash
git add blocks/ tests/ tools/convert/
git commit -m "feat: complete block library from component inventory"
```

---

### Task 10: Review checklist and progress tracker

**Files:**
- Create: `tools/gen-review-checklist.js`
- Create (generated): `review/checklist.md`, `review/progress.csv`

**Interfaces:**
- Consumes: `export/pages.json` (Task 4), `inventory/block-library.md` (Task 2).
- Produces: one checklist entry per page (slug, live URL, doc URL from `export/doc-mapping.json`, checks: all sections present / images load / block types correct / metadata set / blocks used are in the editor guide) and a CSV tracker with status column for the review pass (spec §4 Step 3, §5).

- [ ] **Step 1: Implement the generator**

`tools/gen-review-checklist.js` reads `pages.json` and `doc-mapping.json`, writes `review/checklist.md` (markdown checklist per page with the five checks) and `review/progress.csv` with header `slug,url,doc_url,sections,images,blocks,metadata,editor_guide,status,reviewer,notes`.

- [ ] **Step 2: Run and verify**

Run: `node tools/gen-review-checklist.js`
Expected: `review/checklist.md` has one entry per exported page; every doc URL resolves.

- [ ] **Step 3: Commit**

```bash
git add tools/gen-review-checklist.js review/
git commit -m "feat: page review checklist and progress tracker"
```

---

### Task 11: Pre-launch crawl comparison

**Files:**
- Create: `tools/compare-sites.js`
- Create: `tools/compare-sites.test.js`

**Interfaces:**
- Consumes: WordPress sitemap (`WP_BASE_URL`), EDS sitemap (`EDS_BASE_URL`).
- Produces: `report/launch-report.md` — pages missing on EDS, broken links/images, Lighthouse spot-check results. Gate for cutover (spec §6).

- [ ] **Step 1: Write the failing test**

Create `tools/compare-sites.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { diffUrlSets } from './compare-sites.js';

describe('diffUrlSets', () => {
  it('reports missing and extra pages', () => {
    const wp = ['https://x.com/a/', 'https://x.com/b/'];
    const eds = ['https://y.com/a/', 'https://y.com/c/'];
    const d = diffUrlSets(wp, eds, 'https://x.com', 'https://y.com');
    expect(d.missing).toEqual(['/b/']);
    expect(d.extra).toEqual(['/c/']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tools/compare-sites.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement the comparison**

`tools/compare-sites.js`: fetch both sitemaps (`/sitemap.xml`), normalize paths, diff via `diffUrlSets`, then crawl every EDS page with Playwright collecting: HTTP status, broken images (`img.complete && naturalWidth === 0`), broken internal links. Run Lighthouse (`npm i -D lighthouse`) on 10 sampled pages. Write `report/launch-report.md`.

- [ ] **Step 4: Run tests, then the comparison**

Run: `npx vitest run tools/compare-sites.test.js`
Expected: PASS
Run: `WP_BASE_URL=https://www.msd.com EDS_BASE_URL=https://main--msd--<org>.aem.live node tools/compare-sites.js`
Expected: report generated; investigate any missing pages or broken assets.

- [ ] **Step 5: Commit**

```bash
git add tools/compare-sites.js tools/compare-sites.test.js report/
git commit -m "feat: pre-launch site comparison report"
```

---

### Task 12: Authoring guide and training materials

**Files:**
- Create: `docs/authoring-guide.md`
- Create: `docs/training-outline.md`

**Interfaces:**
- Consumes: final block library (`inventory/block-library.md`), Sidekick setup for the aem.live project.
- Produces: the editor-facing guide (spec §5) — task-oriented, covering only blocks in actual use, section metadata, metadata table, image handling, Sidekick preview/publish, revert via publish history, and who to contact for new blocks.

- [ ] **Step 1: Write the authoring guide**

Structure: (1) Editing text and images, (2) The blocks you'll use — one short section per editor-facing block with a copy-paste Doc example, (3) Section backgrounds via section metadata, (4) Page metadata table, (5) Preview and publish with Sidekick, (6) Reverting (publish history), (7) When to ask a developer.

- [ ] **Step 2: Write the training outline**

One session, ~90 min, using real migrated pages: edit text → add a card → change a section background → preview → publish → revert. Include a short exercise the editors complete themselves.

- [ ] **Step 3: Commit**

```bash
git add docs/authoring-guide.md docs/training-outline.md
git commit -m "docs: content team authoring guide and training outline"
```

---

### Task 13: Cutover runbook

**Files:**
- Create: `docs/cutover-runbook.md`

**Interfaces:**
- Consumes: launch report from Task 11 (must be clean), DNS control for msd.com.
- Produces: the step-by-step cutover and rollback procedure (spec §6).

- [ ] **Step 1: Write the runbook**

Contents, in order:
1. Preconditions: Task 11 report shows zero missing pages and zero broken assets; all Docs reviewed per `review/progress.csv`.
2. Publish all content to production (`main` branch, aem.live production domain).
3. Point msd.com DNS to the EDS production host (record current DNS values first).
4. Freeze WordPress to read-only; keep it running for the grace period.
5. Update sitemap references.
6. Rollback: revert DNS to the recorded WordPress values; both sites run independently until cutover, so rollback is immediate.
7. Post-grace-period: retire WordPress, archive `export/` as the content-of-record backup.

- [ ] **Step 2: Commit**

```bash
git add docs/cutover-runbook.md
git commit -m "docs: cutover and rollback runbook"
```

---

## Execution Notes

- Tasks 1–7 are sequential (each consumes the previous task's outputs). Tasks 8–9 depend on 2, 3, 6, 7. Tasks 10–13 depend on the pipeline and library being complete.
- The block inventory (Task 2 Step 5) is the pivot of the whole plan: Tasks 8–9 sizes are unknown until it exists. If the inventory reveals more than ~20 distinct blocks, split Task 9 into multiple sessions, one per batch of blocks.
- Human sign-off points (cannot be automated): block screenshot sign-offs (Tasks 8–9), per-page review pass (Task 10 checklist), launch report review (Task 11), cutover execution (Task 13).
