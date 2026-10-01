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
          src: img.getAttribute('data-src') || img.getAttribute('src') || '',
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
        src: el.getAttribute('data-src') || el.getAttribute('src') || '',
        alt: el.getAttribute('alt') || '',
      });
    } else {
      ops.push({ type: 'list', items: el.querySelectorAll('li').map((li) => li.text.trim()) });
    }
  }
  return ops;
}

// A block row summarizes the source block for the Doc: one row per
// "column" the block library defines. Until per-block extractors land
// (Task 8/9), rows carry the block's text content and first image.
function blockToRows(el, name) {
  const img = firstImage(el);
  const heading = el.querySelector('h1, h2, h3, h4');
  const text = (el.text || '').replace(/\s+/g, ' ').trim().slice(0, 500);
  const link = el.querySelector('a[href]');
  const row = [];
  if (img) row.push(img.src);
  if (heading) row.push(heading.text.trim());
  if (text) row.push(text);
  const href = link?.getAttribute('href');
  if (href) row.push(href);
  return row.length ? [row] : [[el.text.trim().slice(0, 200) || ' ']];
}

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
  return {
    slug: page.slug,
    title: page.title,
    description: page.excerpt || '',
    sections,
  };
}
