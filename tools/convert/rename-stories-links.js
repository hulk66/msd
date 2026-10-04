// One-off: the /stories landing doc was renamed to stories-overview (it
// conflicted with the new stories/ folder). Rewrite exact '/stories' links
// (plain-text cells and rich links) across all docs.
// Usage: node tools/convert/rename-stories-links.js [--apply]
import { readFileSync } from 'node:fs';
import { getGoogleClients } from './google-auth.js';
import { loadMapping, throttleDocs } from './create-docs.js';

const OLD = '/stories';
const NEW = '/stories-overview';

function collect(doc) {
  const ops = [];
  const richLinks = [];
  const walk = (els) => {
    for (const el of els || []) {
      if (el.paragraph) {
        for (const e of el.paragraph.elements || []) {
          if (e.textRun) {
            const content = e.textRun.content || '';
            for (const m of content.matchAll(/\/stories(?=\/?$|\/$|[\s.,;)])/g)) {
              ops.push({ startIndex: e.startIndex + m.index, endIndex: e.startIndex + m.index + m[0].length });
            }
            const lu = e.textRun.textStyle?.link?.url;
            if (lu && new URL(lu, 'https://x').pathname.replace(/\/$/, '') === OLD) {
              richLinks.push({ startIndex: e.startIndex, endIndex: e.endIndex });
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

if (import.meta.url === `file://${process.argv[1]}`) {
  process.chdir('/Users/715618/AI/msd');
  const apply = process.argv.includes('--apply');
  const mapping = loadMapping();
  const { docs } = await getGoogleClients();
  const throttled = throttleDocs(docs);
  let changed = 0;
  for (const [slug, info] of Object.entries(mapping)) {
    const doc = await docs.documents.get({ documentId: info.fileId });
    const { ops, richLinks } = collect(doc);
    if (!ops.length && !richLinks.length) continue;
    changed += 1;
    console.log(`${slug}: ${ops.length} text, ${richLinks.length} links`);
    if (!apply) continue;
    const requests = [
      ...richLinks.map((r) => ({
        updateTextStyle: {
          range: { startIndex: r.startIndex, endIndex: r.endIndex },
          textStyle: { link: { url: `https://main--msd--hulk66.aem.live${NEW}` } },
          fields: 'link',
        },
      })),
      ...ops
        .sort((a, b) => b.startIndex - a.startIndex)
        .flatMap((op) => [
          { deleteContentRange: { range: { startIndex: op.startIndex, endIndex: op.endIndex } } },
          { insertText: { location: { index: op.startIndex }, text: NEW } },
        ]),
    ];
    await throttled.documents.batchUpdate({ documentId: info.fileId, requestBody: { requests } });
  }
  console.log(`${changed} docs ${apply ? 'updated' : 'would be updated'}`);
}
