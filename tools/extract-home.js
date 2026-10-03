// Extracts the msd.com homepage's server-rendered sections from the live DOM
// (Playwright) and writes export/home-model.json — a doc model for the index
// page that matches the source structure: video, columns, cards, slideshow.
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('https://www.msd.com/', { waitUntil: 'load', timeout: 45000 });
await page.waitForTimeout(3000);

const model = await page.evaluate(() => {
  const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const img = (el) => {
    const s = el?.querySelector('source[data-srcset], source[srcset]');
    if (s) return (s.getAttribute('data-srcset') || s.getAttribute('srcset')).split(',')[0].trim().split(/\s+/)[0];
    const i = el?.querySelector('img[data-src], img[src]');
    return i?.getAttribute('data-src') || i?.getAttribute('src') || '';
  };
  const sections = [];

  // b25 video block
  const video = document.querySelector('[class*="b25"]');
  if (video) {
    sections.push({
      blocks: [{ name: 'video', variant: [], rows: [[img(video), txt(video.querySelector('h1, h2')) || 'MSD', txt(video.querySelector('p')), '']] }],
      plain: [],
      metadata: { style: 'dark' },
    });
  }

  // three-column
  const tc = document.querySelector('[class*="three-column-content-block"]');
  if (tc) {
    const cols = [...tc.querySelectorAll('[class*="content-column"]')].map((col) => [
      img(col), txt(col.querySelector('h3')), txt(col.querySelector('p')), col.getAttribute('data-href') || '',
    ].filter((v) => v !== ''));
    sections.push({ blocks: [{ name: 'columns', variant: [], rows: cols }], plain: [], metadata: {} });
  }

  // featured stories (b24) → cards
  const b24 = document.querySelector('[class*="b24-homepage-no-hero-container"], [class*="b24-homepage-block-all-slides"]');
  if (b24) {
    const title = txt(b24.querySelector('h2'));
    const cards = [...b24.querySelectorAll('[class*="content-item"]')].map((item) => {
      const a = item.querySelector('a[href]');
      return [img(item), txt(item.querySelector('h3')), txt(item.querySelector('p')), a?.getAttribute('href') || ''].filter((v) => v !== '');
    }).filter((r) => r.length > 1);
    sections.push({ blocks: [{ name: 'title', variant: [], rows: [[title]] }], plain: [], metadata: {} });
    sections.push({ blocks: [{ name: 'cards', variant: [], rows: cards }], plain: [], metadata: {} });
  }

  // b5 content blocks
  document.querySelectorAll('[id*="b5-content-block"]').forEach((b5) => {
    const variant = [...b5.classList].filter((c) => ['right', 'left', 'negative'].includes(c));
    sections.push({
      blocks: [{ name: 'content-block', variant, rows: [[img(b5), txt(b5.querySelector('h2, h3')), txt(b5.querySelector('p')), b5.querySelector('a[href]')?.getAttribute('href') || ''].filter((v) => v !== '')] }],
      plain: [],
      metadata: {},
    });
  });

  return { slug: 'index', title: 'MSD | Home', description: 'Read more stories', sections };
});

await browser.close();
writeFileSync('export/home-model.json', JSON.stringify(model, null, 2));
console.log('sections:', model.sections.length, '| blocks:', model.sections.map((s) => s.blocks.map((b) => `${b.name}(${b.rows.length}r)`).join(',')).join(' | '));
