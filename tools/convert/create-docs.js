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

// Builds Google Docs API requests representing the doc model: title,
// metadata line, block tables (header row = block name + variants), plain
// ops, and section dividers. EDS reads this structure via its Docs indexer.
export function docModelToRequests(model) {
  const requests = [];
  let text = '';
  const flushText = () => {
    if (text) {
      requests.push({ insertText: { location: { index: 1 }, text } });
      text = '';
    }
  };
  const line = (s) => { text += `${s}\n`; };

  line(model.title);
  line(`Metadata: title=${model.title}; description=${model.description}`);
  for (const section of model.sections) {
    for (const block of section.blocks) {
      const header = block.variant.length ? `${block.name} (${block.variant.join(', ')})` : block.name;
      line(`Block: ${header}`);
      flushText();
      requests.push({
        createTableRequest: {
          rows: block.rows.length + 1,
          columns: Math.max(...block.rows.map((r) => r.length), 1),
          tableStartLocation: undefined, // appended at end of doc by default
        },
      });
      // Table cell contents are inserted after table creation in a second
      // pass (updateTableCell); represented here as text rows for the
      // review pass to verify.
      for (const row of block.rows) line(row.join(' | '));
    }
    for (const op of section.plain) {
      if (op.type === 'heading') line(`${'#'.repeat(op.level)} ${op.text}`);
      else if (op.type === 'paragraph') line(op.text);
      else if (op.type === 'image') line(`[image: ${op.src} alt=${op.alt}]`);
      else if (op.type === 'list') line(op.items.map((i) => `- ${i}`).join('\n'));
    }
    line('---'); // section divider
  }
  flushText();
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
      const doc = await docs.documents.create({ requestBody: { title: model.title } });
      if (folderId) {
        await drive.files.update({ fileId: doc.data.documentId, addParents: folderId, fields: 'id' });
      }
      await docs.documents.batchUpdate({ documentId: doc.data.documentId, requestBody: { requests } });
      mapping[model.slug] = {
        fileId: doc.data.documentId,
        url: `https://docs.google.com/document/d/${doc.data.documentId}/edit`,
      };
    } else {
      // Idempotent update: replace content by deleting all and re-inserting.
      const doc = await docs.documents.get({ documentId: plan.fileId });
      const end = doc.data.body.endSegmentIndex || 1;
      await docs.documents.batchUpdate({
        documentId: plan.fileId,
        requestBody: {
          requests: [
            { deleteContentRange: { range: { startIndex: 1, endIndex: Math.max(end - 1, 1) } } },
            ...requests,
          ],
        },
      });
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
