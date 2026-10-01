import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { google } from 'googleapis';

const MAPPING_FILE = 'export/doc-mapping.json';

export function loadMapping(path = MAPPING_FILE) {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
}

export function saveMapping(mapping, path = MAPPING_FILE) {
  writeFileSync(path, JSON.stringify(mapping, null, 2));
}

export function planSync(model, mapping) {
  const known = mapping[model.slug];
  return known
    ? { action: 'update', slug: model.slug, fileId: known.fileId }
    : { action: 'create', slug: model.slug };
}

// Builds an ordered plan of doc steps. The executor turns these into Google
// Docs API requests with a running insertion cursor, so section order is
// preserved and tables land where EDS's indexer expects them.
export function buildDocPlan(model) {
  const plan = [];
  const metaRows = [
    ['title', model.title],
    ['description', model.description],
  ];
  plan.push({ type: 'table', header: 'Metadata', rows: metaRows });

  for (const section of model.sections) {
    for (const block of section.blocks) {
      const header = block.variant.length ? `${block.name} (${block.variant.join(', ')})` : block.name;
      plan.push({ type: 'table', header, rows: block.rows });
    }
    for (const op of section.plain) {
      if (op.type === 'heading') plan.push({ type: 'text', text: `${'#'.repeat(op.level)} ${op.text}\n` });
      else if (op.type === 'paragraph') plan.push({ type: 'text', text: `${op.text}\n` });
      else if (op.type === 'image') plan.push({ type: 'image', url: op.src, alt: op.alt });
      else if (op.type === 'list') plan.push({ type: 'text', text: `${op.items.map((i) => `- ${i}`).join('\n')}\n` });
    }
    const smRows = Object.entries(section.metadata || {});
    if (smRows.length) plan.push({ type: 'table', header: 'Section Metadata', rows: smRows });
    plan.push({ type: 'text', text: '---\n' }); // section divider
  }
  return plan;
}

// Executes a doc plan against a Docs API client, keeping a running cursor
// so every insert lands after the previous one. Tables are created first
// and filled from a fresh document fetch (the API assigns cell indices).
export async function executePlan(plan, documentId, docs) {
  let cursor = 1;
  for (const step of plan) {
    if (step.type === 'text') {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: { requests: [{ insertText: { location: { index: cursor }, text: step.text } }] },
      });
      cursor += step.text.length;
    } else if (step.type === 'table') {
      const columns = Math.max(...step.rows.map((r) => r.length), step.header ? 1 : 0, 1);
      const rows = step.rows.length + (step.header ? 1 : 0);
      await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [{
            createTableRequest: {
              rows,
              columns,
              tableStartLocation: { index: cursor },
            },
          }],
        },
      });
      // Fill cells: fetch the doc, locate the table at the cursor, insert
      // text into each cell (cell content starts at cellStartIndex + 1).
      const doc = await docs.documents.get({ documentId });
      const table = (doc.data.body.content || []).find(
        (el) => el.table && el.startIndex === cursor,
      )?.table;
      if (table) {
        // Insert cell text using the API's cell start locations.
        const cellRequests = [];
        const allRows = step.header ? [[step.header], ...step.rows] : step.rows;
        let ri = 0;
        for (const row of table.tableRows) {
          const rowTexts = allRows[ri] || [];
          let ci = 0;
          for (const cell of row.tableCells) {
            const text = rowTexts[ci] ?? '';
            if (text) {
              cellRequests.push({
                insertText: { location: { index: cell.content[0].endIndex - 1 }, text },
              });
            }
            ci += 1;
          }
          ri += 1;
        }
        if (cellRequests.length) {
          await docs.documents.batchUpdate({ documentId, requestBody: { requests: cellRequests } });
        }
      }
      // Table footprint: each cell contributes at least 1 char; advance past it.
      cursor += rows * columns + rows + 2;
    } else if (step.type === 'image') {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [{
            insertInlineImage: {
              uri: step.url,
              objectSize: { height: { magnitude: 200, unit: 'PT' } },
              location: { index: cursor },
            },
          }],
        },
      });
      cursor += 1;
    }
  }
}

export async function syncDocs(models, { folderId, docs: docsOverride, drive: driveOverride } = {}) {
  let docs = docsOverride;
  let drive = driveOverride;
  if (!docs || !drive) {
    const auth = await google.auth.getClient({
      scopes: ['https://www.googleapis.com/auth/documents', 'https://www.googleapis.com/auth/drive'],
    });
    docs = docs || google.docs({ version: 'v1', auth });
    drive = drive || google.drive({ version: 'v3', auth });
  }
  const mapping = loadMapping();

  for (const model of models) {
    const plan = planSync(model, mapping);
    let fileId;
    if (plan.action === 'create') {
      const doc = await docs.documents.create({ requestBody: { title: model.title } });
      fileId = doc.data.documentId;
      if (folderId) {
        await drive.files.update({ fileId, addParents: folderId, fields: 'id' });
      }
      mapping[model.slug] = {
        fileId,
        url: `https://docs.google.com/document/d/${fileId}/edit`,
      };
      // Persist immediately so a mid-run failure never duplicates docs (C2).
      saveMapping(mapping);
    } else {
      fileId = plan.fileId;
      await clearDocument(fileId, docs);
    }
    await executePlan(buildDocPlan(model), fileId, docs);
  }
  saveMapping(mapping);
  return mapping;
}

// Clears a document completely (text + tables) before re-inserting content.
// Tables must be deleted individually; a deleteContentRange spanning one is
// rejected by the API.
export async function clearDocument(documentId, docs) {
  const doc = await docs.documents.get({ documentId });
  const content = doc.data.body.content || [];
  const requests = [];
  for (const el of [...content].reverse()) {
    if (el.table) {
      requests.push({ deleteTableRequest: { tableStartLocation: { index: el.startIndex } } });
    } else if (el.paragraph && el.endIndex > el.startIndex + 1) {
      requests.push({
        deleteContentRange: { range: { startIndex: el.startIndex, endIndex: el.endIndex - 1 } },
      });
    }
  }
  if (requests.length) {
    await docs.documents.batchUpdate({ documentId, requestBody: { requests } });
  }
}

if (process.argv[1] && process.argv[1].endsWith('create-docs.js')) {
  const models = JSON.parse(readFileSync('export/doc-models.json', 'utf8'));
  syncDocs(models, { folderId: process.env.DRIVE_FOLDER_ID }).then((m) =>
    console.log(`Synced ${Object.keys(m).length} docs`),
  );
}
