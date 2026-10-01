import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';

// Shared with the browser callback below — keep in sync (the callback runs
// serialized inside the browser and cannot close over module scope).
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

const ASSET_RE = /\.(pdf|jpe?g|png|svg|zip|xlsx?|docx?|pptx?|csv|xml|woff2?|gif|webm|mp4|mp3|txt|ics)$/i;

export async function crawl(baseUrl, { outDir = 'inventory' } = {}) {
  mkdirSync(`${outDir}/screenshots`, { recursive: true });
  const browser = await chromium.launch();

  // Resume support: keep already-crawled pages, skip their URLs.
  const invFile = `${outDir}/inventory.json`;
  const inventory = existsSync(invFile) ? JSON.parse(readFileSync(invFile, 'utf8')) : [];
  const done = new Set(inventory.map((p) => p.url));

  // Discovery pass: lightweight context, block heavy resources.
  const disc = await browser.newPage();
  await disc.route('**/*', (route) => {
    const type = route.request().resourceType();
    if (['image', 'media', 'font'].includes(type)) return route.abort();
    return route.continue();
  });
  const gotoFast = async (url) => {
    await disc.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await disc.waitForTimeout(400);
  };
  const urls = new Set([baseUrl, ...done]);
  const queue = [baseUrl];
  while (queue.length && urls.size < 500) {
    const current = queue.shift();
    try {
      await gotoFast(current);
    } catch {
      continue;
    }
    const links = await disc.$$eval('a[href]', (as) =>
      as.map((a) => a.getAttribute('href')).filter(Boolean),
    );
    for (const href of links) {
      const abs = new URL(href, current).toString().split('#')[0];
      if (abs.startsWith(baseUrl) && !urls.has(abs) && !ASSET_RE.test(abs)) {
        urls.add(abs);
        queue.push(abs);
      }
    }
  }
  await disc.close();

  // Capture pass: full render for screenshots and component extraction.
  const page = await browser.newPage();
  const gotoSettled = async (url) => {
    await page.goto(url, { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(1200);
  };
  for (const url of urls) {
    if (done.has(url)) continue;
    try {
      await gotoSettled(url);
    } catch {
      continue; // skip unreachable page, report at end
    }
    const slug = new URL(url).pathname.replace(/\//g, '_') || 'home';
    await page.screenshot({ path: `${outDir}/screenshots/${slug}.png`, fullPage: true });
    const components = await page.$$eval(
      'main section, main > div, article > div',
      (els) => {
        const classMap = [
          [/hero|banner|cover/i, 'hero'],
          [/card|teaser|tile/i, 'cards'],
          [/accordion|collapse|faq/i, 'accordion'],
          [/column|split|two-col/i, 'columns'],
          [/image.?text|media.?text/i, 'image-text'],
          [/quote|testimonial|pullquote/i, 'quote'],
          [/\btable\b/i, 'table'],
          [/video|embed|gallery/i, 'media'],
        ];
        const classify = (el) => {
          const hay = `${el.tagName} ${el.className || ''}`;
          for (const [re, kind] of classMap) if (re.test(hay)) return kind;
          return 'plain';
        };
        return els.slice(0, 200).map((el) => ({
          kind: classify(el),
          selector: el.className || el.tagName,
          htmlSample: el.outerHTML.slice(0, 2000),
        }));
      },
    );
    inventory.push({ url, title: await page.title(), components });
    // Persist after every page so an interrupted run resumes where it stopped.
    writeFileSync(invFile, JSON.stringify(inventory, null, 2));
  }
  await browser.close();
  return inventory;
}

if (process.argv[1] && process.argv[1].endsWith('crawl-site.js')) {
  crawl(process.env.WP_BASE_URL).then((inv) =>
    console.log(`Crawled ${inv.length} pages -> inventory/inventory.json`),
  );
}
