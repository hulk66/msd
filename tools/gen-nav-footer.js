import { parse } from 'node-html-parser';
import { writeFileSync, mkdirSync } from 'node:fs';

export function extractNavTree(html) {
  const root = parse(html);
  const items = [];
  for (const li of root.querySelectorAll('#menuMain > li')) {
    const a = li.querySelector(':scope > a');
    if (!a) continue;
    const children = [...li.querySelectorAll(':scope > ul > li')]
      .map((c) => {
        const ca = c.querySelector(':scope > a');
        return ca ? { title: ca.text.trim(), href: ca.getAttribute('href'), children: [] } : null;
      })
      .filter(Boolean);
    items.push({ title: a.text.trim(), href: a.getAttribute('href'), children });
  }
  return items;
}

export function extractFooterColumns(html) {
  const root = parse(html);
  const footer = root.querySelector('#footerMain') || root.querySelector('footer');
  if (!footer) return [];
  const cols = [];
  // Heading-led groups (e.g. social row), then the flat link list.
  for (const div of footer.querySelectorAll(':scope > div')) {
    const h = div.querySelector('h3, h2, h4');
    const links = [...div.querySelectorAll('a[href]')]
      .map((a) => ({ title: a.getAttribute('aria-label') || a.text.trim(), href: a.getAttribute('href') }))
      .filter((l) => l.title && l.title !== '#');
    if (h || links.length) cols.push({ heading: h ? h.text.trim() : '', links });
  }
  const flat = [...footer.querySelectorAll(':scope > ul li > a[href]')]
    .map((a) => ({ title: a.text.trim(), href: a.getAttribute('href') }))
    .filter((l) => l.title);
  if (flat.length) cols.push({ heading: '', links: flat });
  return cols;
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function toNavDocHtml(tree) {
  const lis = tree
    .map((item) => {
      const sub = item.children.length
        ? `<ul>${item.children
            .map((c) => `<li><a href="${esc(c.href)}">${esc(c.title)}</a></li>`)
            .join('')}</ul>`
        : '';
      return `<li><a href="${esc(item.href)}">${esc(item.title)}</a>${sub}</li>`;
    })
    .join('');
  return `<nav aria-label="main"><ul>${lis}</ul></nav>`;
}

export function toFooterDocHtml(columns) {
  return columns
    .map(
      (col) =>
        `<div><h3>${esc(col.heading)}</h3><ul>${col.links
          .map((l) => `<li><a href="${esc(l.href)}">${esc(l.title)}</a></li>`)
          .join('')}</ul></div>`,
    )
    .join('');
}

export async function main() {
  const baseUrl = process.env.WP_BASE_URL;
  const html = await (await fetch(baseUrl)).text();
  const navHtml = toNavDocHtml(extractNavTree(html));
  const footerHtml = toFooterDocHtml(extractFooterColumns(html));
  mkdirSync('inventory', { recursive: true });
  writeFileSync('inventory/nav-doc.html', navHtml);
  writeFileSync('inventory/footer-doc.html', footerHtml);
  console.log(`nav items: ${extractNavTree(html).length}, footer columns: ${extractFooterColumns(html).length}`);
}

if (process.argv[1] && process.argv[1].endsWith('gen-nav-footer.js')) {
  main();
}
