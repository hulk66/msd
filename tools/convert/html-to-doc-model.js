import { parse } from 'node-html-parser';
import { detectBlockName } from './block-map.js';

export { EDS_BLOCKS } from './block-map.js';

export function detectBlock(html) {
  const root = parse(html);
  const el = root.firstElementChild;
  if (!el) return null;
  const classes = `${el.getAttribute('class') || ''} ${el.id || ''}`;
  for (const token of classes.split(/\s+/)) {
    const name = detectBlockName(token);
    if (name) return name;
  }
  return null;
}

export function detectVariant(el) {
  const classes = el.getAttribute('class') || '';
  const known = ['full', 'negative', 'right', 'left', 'dark', 'light'];
  return classes.split(/\s+/).filter((c) => known.includes(c));
}

function firstImage(el) {
  const img = el.querySelector('img');
  if (img) return { src: img.getAttribute('data-src') || img.getAttribute('src') || '', alt: img.getAttribute('alt') || '' };
  const source = el.querySelector('source');
  if (source) {
    const set = source.getAttribute('data-srcset') || source.getAttribute('srcset') || '';
    const url = set.split(',')[0].trim().split(/\s+/)[0];
    return { src: url, alt: el.getAttribute('aria-label') || '' };
  }
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
        ops.push({
          type: 'image',
          src: absUrl(img.getAttribute('data-src') || img.getAttribute('src') || ''),
          alt: img.getAttribute('alt') || '',
        });
        const text = el.text.trim();
        if (text) ops.push({ type: 'paragraph', text });
      } else if (el.text.trim()) {
        ops.push({ type: 'paragraph', text: el.text.trim() });
      }
    } else if (el.tagName === 'IMG') {
      ops.push({
        type: 'image',
        src: absUrl(el.getAttribute('data-src') || el.getAttribute('src') || ''),
        alt: el.getAttribute('alt') || '',
      });
    } else {
      ops.push({ type: 'list', items: el.querySelectorAll('li').map((li) => li.text.trim()) });
    }
  }
  return ops;
}

// Per-block extractors: turn a block element into structured table rows,
// one row per item the block renders (card, column, accordion entry...).
// This is what keeps block-internal content out of the review pass.
const text = (el) => (el?.text || '').replace(/\s+/g, ' ').trim();

const WP_BASE = process.env.WP_BASE_URL || 'https://www.msd.com';

function absUrl(url) {
  if (!url) return '';
  try {
    return new URL(url, WP_BASE).toString();
  } catch {
    return url;
  }
}

function imgOf(el) {
  const img = el.querySelector('img');
  if (img) return absUrl(img.getAttribute('data-src') || img.getAttribute('src') || '');
  const source = el.querySelector('source');
  if (source) {
    const set = source.getAttribute('data-srcset') || source.getAttribute('srcset') || '';
    return absUrl(set.split(',')[0].trim().split(/\s+/)[0] || '');
  }
  return '';
}

function linkOf(el) {
  const a = el.querySelector('a[href]');
  return a ? a.getAttribute('href') : '';
}

const EXTRACTORS = {
  hero: (el) => [[imgOf(el), text(el.querySelector('h1, h2')), text(el.querySelector('p')), linkOf(el)].filter((v) => v !== '')],
  'content-block': (el) => [[imgOf(el), text(el.querySelector('h1, h2, h3')), text(el.querySelector('p')), linkOf(el)].filter((v) => v !== '')],
  columns: (el) => [...el.querySelectorAll('[class*="column"]')].map((col) => [
    imgOf(col), text(col.querySelector('h3, h2')), text(col.querySelector('p')), linkOf(col),
  ].filter((v) => v !== '')),
  cards: (el) => [...el.querySelectorAll('[class*="card"], [class*="item"], [class*="story"]')].map((card) => [
    imgOf(card), text(card.querySelector('h3, h2')), text(card.querySelector('p')), linkOf(card),
  ].filter((v) => v !== '')),
  accordion: (el) => [...el.querySelectorAll('[class*="item"], [class*="accordion"]')].map((item) => [
    text(item.querySelector('h3, h2, h4, summary')), text(item.querySelector('p, div:not(:has(h3))')),
  ].filter((v) => v !== '')),
  title: (el) => [[text(el.querySelector('h1, h2, h3'))]],
  quote: (el) => {
    const paras = [...el.querySelectorAll('p')].map(text).filter(Boolean);
    return [paras.length > 1 ? [paras[0], paras[paras.length - 1]] : [paras[0] || '']];
  },
  statistics: (el) => [...el.querySelectorAll('[class*="stat"], [class*="item"]')].map((stat) => {
    const paras = [...stat.querySelectorAll('p')].map(text);
    return [paras[0] || '', paras[1] || ''];
  }),
  'related-links': (el) => [...el.querySelectorAll('a[href]')].map((a) => [text(a), a.getAttribute('href')]),
  'download-list': (el) => [...el.querySelectorAll('a[href]')].map((a) => [text(a), a.getAttribute('href')]),
  buttons: (el) => [...el.querySelectorAll('a[href]')].map((a) => [text(a), a.getAttribute('href')]),
  'contact-banner': (el) => [[imgOf(el), text(el.querySelector('h1, h2, h3')), text(el.querySelector('p')), linkOf(el)].filter((v) => v !== '')],
  'bio-highlights': (el) => [...el.querySelectorAll('[class*="bio"], [class*="item"]')].map((bio) => [
    imgOf(bio), text(bio.querySelector('h3, h2')), text(bio.querySelector('p')),
  ].filter((v) => v !== '')),
  tabs: (el) => [...el.querySelectorAll('[class*="tab"]')].map((tab) => [text(tab.querySelector('h3, h2, [role="tab"]')), text(tab.querySelector('p'))]),
  'article-images': (el) => [...el.querySelectorAll('img, picture')].map((img) => [imgOf(img.parentElement || img)]),
  video: (el) => [[imgOf(el), text(el.querySelector('h1, h2, h3')), linkOf(el)].filter((v) => v !== '')],
  slideshow: (el) => [...el.querySelectorAll('img, picture')].map((img) => [imgOf(img.parentElement || img)]),
  listicle: (el) => [...el.querySelectorAll('li')].map((li) => [text(li)]),
  'bento-box': (el) => [...el.querySelectorAll('[class*="cell"], [class*="item"], [class*="box"]')].map((cell) => [
    imgOf(cell), text(cell.querySelector('h3, h2')), text(cell.querySelector('p')), linkOf(cell),
  ].filter((v) => v !== '')),
  timeline: (el) => [...el.querySelectorAll('[class*="year"], [class*="item"]')].map((item) => [
    text(item.querySelector('h3, h2, [class*="year"]')), text(item.querySelector('p')),
  ].filter((v) => v !== '')),
  'vertical-scroll': (el) => [...el.querySelectorAll('section, [class*="section"]')].map((s) => [
    text(s.querySelector('h3, h2')), text(s.querySelector('p')),
  ].filter((v) => v !== '')),
  modal: (el) => [[text(el.querySelector('h1, h2, h3')), text(el.querySelector('p'))].filter((v) => v !== '')],
};

function blockToRows(el, name) {
  const extract = EXTRACTORS[name];
  if (extract) {
    const rows = extract(el).filter((row) => row.some((v) => v !== ''));
    if (rows.length) return rows;
  }
  // Fallback for blocks without an extractor: single summary row.
  const img = imgOf(el);
  const heading = text(el.querySelector('h1, h2, h3, h4'));
  const body = text(el).slice(0, 500);
  const href = linkOf(el);
  const row = [img, heading, body, href].filter((v) => v !== '');
  return [row.length ? row : [' ']];
}

const stripTags = (s) => String(s).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();

export function convertPage(page) {
  const root = parse(`<body>${page.html}</body>`);
  const body = root.querySelector('body');
  const sections = [];
  let current = { blocks: [], plain: [], metadata: {} };
  const flush = () => {
    if (current.blocks.length || current.plain.length) sections.push(current);
  };

  for (const child of body.childNodes) {
    if (child.nodeType === 3) {
      const text = (child.text || '').trim();
      if (text) current.plain.push({ type: 'paragraph', text });
      continue;
    }
    if (child.nodeType !== 1) continue;
    if (child.tagName === 'HR') {
      flush();
      current = { blocks: [], plain: [], metadata: {} };
      continue;
    }
    const name = detectBlock(child.outerHTML);
    if (name) {
      current.blocks.push({
        name,
        variant: detectVariant(child),
        rows: blockToRows(child, name),
      });
    } else {
      current.plain.push(...htmlToDocOps(child.outerHTML));
    }
  }
  flush();
  // WP excerpts arrive as {rendered: html} objects; coerce to plain text.
  const excerpt = typeof page.excerpt === 'string'
    ? page.excerpt
    : stripTags(page.excerpt?.rendered ?? '');
  return {
    slug: page.slug,
    title: typeof page.title === 'string' ? page.title : stripTags(page.title?.rendered ?? ''),
    description: excerpt,
    sections,
  };
}
