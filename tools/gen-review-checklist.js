import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';

const EDITOR_GUIDE_BLOCKS = new Set([
  'hero', 'content-block', 'columns', 'cards', 'accordion', 'title',
  'quote', 'statistics', 'related-links', 'download-list', 'buttons',
]);

export function buildChecklistEntry({ slug, url, docUrl }) {
  return [
    `## ${slug}`,
    `- Live: ${url}`,
    `- Doc: ${docUrl || 'NOT CREATED'}`,
    `- [ ] all sections present`,
    `- [ ] images load`,
    `- [ ] block types correct`,
    `- [ ] metadata set`,
    `- [ ] blocks used are in the editor guide`,
    '',
  ].join('\n');
}

export function buildProgressRow({ slug, url, docUrl }) {
  return `${slug},${url},${docUrl || ''},,,,,,,open,`;
}

export function main() {
  const pages = JSON.parse(readFileSync('export/pages.json', 'utf8'));
  const mapping = existsSync('export/doc-mapping.json')
    ? JSON.parse(readFileSync('export/doc-mapping.json', 'utf8'))
    : {};
  mkdirSync('review', { recursive: true });

  const checklist = ['# Page review checklist', ''];
  const rows = ['slug,url,doc_url,sections,images,blocks,metadata,editor_guide,status,reviewer,notes'];
  for (const p of pages) {
    const docUrl = mapping[p.slug]?.url;
    checklist.push(buildChecklistEntry({ slug: p.slug, url: p.link, docUrl }));
    rows.push(buildProgressRow({ slug: p.slug, url: p.link, docUrl }));
  }
  writeFileSync('review/checklist.md', checklist.join('\n'));
  writeFileSync('review/progress.csv', `${rows.join('\n')}\n`);
  console.log(`checklist: ${pages.length} pages, ${Object.keys(mapping).length} docs mapped`);
}

if (process.argv[1] && process.argv[1].endsWith('gen-review-checklist.js')) {
  main();
}
