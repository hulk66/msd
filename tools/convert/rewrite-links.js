// One-time content fix: the WP→Doc converter wrote every internal link as an
// absolute URL on the original site (absUrl against WP_BASE_URL), so the
// migrated pages link back to www.msd.com. This rewrites those links in the
// Google Docs themselves:
//   - plain-text URL cells (what blocks turn into anchors) become relative
//     paths on the new site, including the `-overview` renames resolved by
//     resolve-conflicts.js (a Drive folder shadows a doc of the same name);
//   - rich links (nav menu items) become absolute URLs on the live host,
//     because the Docs API mangles relative link URLs (`/x` -> `http:///x`).
// The old→new path map comes from the live sitemap: a path is rewritten when
// it exists there as-is or with an `-overview` suffix; anything else (story
// posts, /news/, wp-content media, query-string junk) is left untouched and
// keeps working against the still-live WordPress site.
//
// Usage:
//   node tools/convert/rewrite-links.js            dry-run: print the plan
//   node tools/convert/rewrite-links.js --apply    write the changes
//   node tools/convert/rewrite-links.js --models   also rewrite the URL
//                                                  strings in the doc models
import { readFileSync, writeFileSync } from 'node:fs';
import { getGoogleClients } from './google-auth.js';
import { loadMapping, throttleDocs } from './create-docs.js';

const OLD_ORIGIN = 'https://www.msd.com';
const LIVE_HOST = 'https://main--msd--hulk66.aem.live';
// Old-site path prefixes that were restructured under a different name.
const ALIASES = [
  ['/investor-information/', '/investor-relations/'],
];

async function loadSitemapPaths(base = LIVE_HOST) {
  const res = await fetch(`${base}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap fetch failed: HTTP ${res.status}`);
  const xml = await res.text();
  const paths = new Set(['/']);
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    let p = new URL(m[1]).pathname;
    if (p.length > 1) p = p.replace(/\/+$/, '') || '/';
    paths.add(p);
  }
  return paths;
}

// Maps an old absolute URL to the new site path, or null to leave it alone.
// Trailing punctuation (`/.`, `/,`) is punctuation after a link in a sentence,
// not part of the URL: it is stripped for the lookup and reported separately.
export function mapUrl(url, paths) {
  if (!url.startsWith(OLD_ORIGIN)) return null;
  const rest = url.slice(OLD_ORIGIN.length);
  if (!rest.startsWith('/') || rest.includes('/wp-content/') || rest.includes('?')) return null;
  const punct = rest.match(/[.,]*$/)[0];
  let path = rest.slice(0, rest.length - punct.length);
  if (path.length > 1) path = path.replace(/\/+$/, '') || '/';
  for (const [from, to] of ALIASES) {
    if (path.startsWith(from)) path = to + path.slice(from.length);
  }
  if (paths.has(path)) return { path, punct };
  if (paths.has(`${path}-overview`)) return { path: `${path}-overview`, punct };
  return null;
}

// Collects the exact spans of old URLs in plain text and the ranges of rich
// links pointing at the old site. Ranged replacement (not replaceAllText) so
// an unmapped longer URL is never damaged by a shorter match.
function collect(doc, paths) {
  const ops = [];
  const richLinks = [];
  const walk = (els) => {
    for (const el of els || []) {
      if (el.paragraph) {
        for (const e of el.paragraph.elements || []) {
          if (e.textRun) {
            const content = e.textRun.content || '';
            for (const m of content.matchAll(/https:\/\/www\.msd\.com\S*/g)) {
              const mapped = mapUrl(m[0], paths);
              if (mapped) {
                ops.push({
                  startIndex: e.startIndex + m.index,
                  endIndex: e.startIndex + m.index + m[0].length,
                  from: m[0],
                  text: mapped.path + mapped.punct,
                });
              }
            }
            const lu = e.textRun.textStyle?.link?.url;
            if (lu?.startsWith(OLD_ORIGIN)) {
              const mapped = mapUrl(lu, paths);
              if (mapped) richLinks.push({ startIndex: e.startIndex, endIndex: e.endIndex, url: `${LIVE_HOST}${mapped.path}` });
            }
          }
        }
      }
      if (el.table) for (const row of el.table.tableRows) for (const c of row.tableCells) walk(c.content);
    }
  };
  walk(doc.data.body.content);
  return { ops, richLinks };
}

export async function rewriteDocs({ apply = false, slugs } = {}) {
  const mapping = loadMapping();
  const paths = await loadSitemapPaths();
  const { docs } = await getGoogleClients();
  const throttled = throttleDocs(docs);

  const targets = slugs || Object.keys(mapping);
  let changed = 0;
  for (const slug of targets) {
    const fileId = mapping[slug]?.fileId;
    if (!fileId) continue;
    const doc = await docs.documents.get({ documentId: fileId });
    const { ops, richLinks } = collect(doc, paths);
    if (!ops.length && !richLinks.length) continue;
    changed += 1;
    console.log(`${slug}:`);
    for (const op of ops) console.log(`  text  ${op.from} -> ${op.text}`);
    for (const r of richLinks) console.log(`  link  ${r.startIndex}-${r.endIndex} -> ${r.url}`);
    if (!apply) continue;
    // Style updates first (they use indices from this fetch and don't change
    // lengths), then text replacements in descending start order so each
    // delete/insert only shifts positions after the already-processed ones.
    const requests = [
      ...richLinks.map((r) => ({
        updateTextStyle: {
          range: { startIndex: r.startIndex, endIndex: r.endIndex },
          textStyle: { link: { url: r.url } },
          fields: 'link',
        },
      })),
      ...ops
        .sort((a, b) => b.startIndex - a.startIndex)
        .flatMap((op) => [
          { deleteContentRange: { range: { startIndex: op.startIndex, endIndex: op.endIndex } } },
          { insertText: { location: { index: op.startIndex }, text: op.text } },
        ]),
    ];
    await throttled.documents.batchUpdate({ documentId: fileId, requestBody: { requests } });
  }
  console.log(`\n${changed} docs ${apply ? 'updated' : 'would be updated'}`);
  return changed;
}

// Rewrites page-URL strings inside the doc models so a future re-sync does
// not reintroduce old-site links. Image/media URLs are left alone.
export function rewriteModels(paths, files = ['export/doc-models.json', 'export/home-model.json']) {
  let count = 0;
  const fixCell = (cell) => {
    if (typeof cell !== 'string' || !cell.startsWith(OLD_ORIGIN)) return cell;
    const mapped = mapUrl(cell, paths);
    if (!mapped) return cell;
    count += 1;
    return mapped.path + mapped.punct;
  };
  for (const file of files) {
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    const models = Array.isArray(parsed) ? parsed : [parsed];
    for (const model of models) {
      for (const section of model.sections) {
        for (const block of section.blocks) {
          block.rows = block.rows.map((row) => row.map(fixCell));
        }
        section.plain = section.plain.map((op) => {
          if (op.link?.startsWith(OLD_ORIGIN)) {
            const mapped = mapUrl(op.link, paths);
            if (mapped) {
              count += 1;
              return { ...op, link: mapped.path };
            }
          }
          return op;
        });
      }
    }
    writeFileSync(file, JSON.stringify(models, null, 2));
  }
  console.log(`models: ${count} URLs rewritten`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const doModels = args.includes('--models');
  const slugs = args.filter((a) => !a.startsWith('--'));
  const paths = await loadSitemapPaths();
  if (!doModels) await rewriteDocs({ apply, slugs: slugs.length ? slugs : undefined });
  if (doModels) rewriteModels(paths);
}
