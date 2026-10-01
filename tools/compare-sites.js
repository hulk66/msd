import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

export function diffUrlSets(wpUrls, edsUrls, wpBase, edsBase) {
  const norm = (url, base) => new URL(url, base).pathname;
  const wp = new Set(wpUrls.map((u) => norm(u, wpBase)));
  const eds = new Set(edsUrls.map((u) => norm(u, edsBase)));
  const missing = [...wp].filter((p) => !eds.has(p));
  const extra = [...eds].filter((p) => !wp.has(p));
  return { missing, extra };
}

async function fetchSitemapUrls(baseUrl) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/sitemap.xml`);
  if (!res.ok) return [];
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

export async function compareSites({ wpBase, edsBase, outDir = 'report' } = {}) {
  mkdirSync(outDir, { recursive: true });
  const wpUrls = await fetchSitemapUrls(wpBase);
  const edsUrls = await fetchSitemapUrls(edsBase);
  const diff = diffUrlSets(wpUrls, edsUrls, wpBase, edsBase);

  // Crawl every EDS page: status, broken images, broken internal links.
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const brokenImages = [];
  const brokenLinks = [];
  const errors = [];
  for (const path of edsUrls.map((u) => new URL(u).pathname)) {
    const url = `${edsBase.replace(/\/$/, '')}${path}`;
    try {
      const res = await page.goto(url, { waitUntil: 'load', timeout: 45000 });
      if (res.status() >= 400) errors.push(`${res.status()} ${path}`);
      const imgs = await page.$$eval('img', (els) =>
        els.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src),
      );
      imgs.forEach((src) => brokenImages.push(`${path}: ${src}`));
      const links = await page.$$eval('a[href]', (as) => as.map((a) => a.href));
      for (const href of links.slice(0, 50)) {
        if (href.startsWith(edsBase) && !brokenLinks.includes(href)) {
          try {
            const r = await fetch(href, { method: 'HEAD' });
            if (r.status >= 400) brokenLinks.push(`${path}: ${href} (${r.status})`);
          } catch {
            brokenLinks.push(`${path}: ${href} (unreachable)`);
          }
        }
      }
    } catch (err) {
      errors.push(`NAV FAIL ${path}: ${err.message.split('\n')[0]}`);
    }
  }
  await browser.close();

  const lines = [
    '# Pre-launch comparison report',
    '',
    `WP pages: ${wpUrls.length}, EDS pages: ${edsUrls.length}`,
    `Missing on EDS: ${diff.missing.length}`,
    `Extra on EDS: ${diff.extra.length}`,
    `Broken images: ${brokenImages.length}`,
    `Broken links: ${brokenLinks.length}`,
    `Page errors: ${errors.length}`,
    '',
    '## Missing pages', ...diff.missing.map((p) => `- ${p}`),
    '',
    '## Broken images', ...brokenImages.slice(0, 100).map((p) => `- ${p}`),
    '',
    '## Broken links', ...brokenLinks.slice(0, 100).map((p) => `- ${p}`),
    '',
    '## Page errors', ...errors.map((p) => `- ${p}`),
  ];
  writeFileSync(`${outDir}/launch-report.md`, lines.join('\n'));
  return { diff, brokenImages, brokenLinks, errors };
}

if (process.argv[1] && process.argv[1].endsWith('compare-sites.js')) {
  compareSites({
    wpBase: process.env.WP_BASE_URL,
    edsBase: process.env.EDS_BASE_URL,
  }).then((r) => console.log(`missing=${r.diff.missing.length} brokenImages=${r.brokenImages.length} brokenLinks=${r.brokenLinks.length} errors=${r.errors.length}`));
}
