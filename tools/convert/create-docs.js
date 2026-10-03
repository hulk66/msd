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

// Image URLs become real inline images in cells; anything else is text.
const IMAGE_RE = /^https?:\/\/\S+\.(jpe?g|png|webp|gif)(\?|$)/i;
export function isImageUrl(value) {
  return IMAGE_RE.test(value.trim());
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
      if (op.type === 'heading') plan.push({ type: 'heading', level: op.level, text: op.text });
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

// Executes a doc plan by appending every step at the true end of the body.
// A hand-tracked cursor drifts (tables, images, and auto-newlines all change
// the index math), so each step re-fetches body.endSegmentIndex instead.
// Cost: one GET per step — negligible against the batchUpdate per step.
export async function executePlan(plan, documentId, docs) {
  const endIndexOf = async () => {
    const doc = await docs.documents.get({ documentId });
    // Body has no endSegmentIndex field — derive the end from the last
    // element's endIndex (the body always ends with a paragraph).
    const content = doc.data.body.content || [];
    const last = content[content.length - 1];
    return last?.endIndex ?? 1;
  };
  for (const step of plan) {
    const end = await endIndexOf();
    // Insertion must land inside an existing paragraph: endSegmentIndex is
    // one past the last char, so end - 1 is always valid (floored to 1).
    const at = Math.max(end - 1, 1);
    if (step.type === 'text') {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: { requests: [{ insertText: { location: { index: at }, text: step.text } }] },
      });
    } else if (step.type === 'heading') {
      // Real headings: insert the text, then style the paragraph with the
      // named heading style. EDS renders these as h1-h6 (markdown-style
      // '## text' would render as literal text).
      await docs.documents.batchUpdate({
        documentId,
        requestBody: { requests: [{ insertText: { location: { index: at }, text: `${step.text}\n` } }] },
      });
      await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [{
            updateParagraphStyle: {
              range: { startIndex: at, endIndex: at + step.text.length },
              paragraphStyle: { namedStyleType: `HEADING_${Math.min(step.level, 6)}` },
              fields: 'namedStyleType',
            },
          }],
        },
      });
    } else if (step.type === 'table') {
      const columns = Math.max(...step.rows.map((r) => r.length), step.header ? 1 : 0, 1);
      const rows = step.rows.length + (step.header ? 1 : 0);
      await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [{
            insertTable: {
              rows,
              columns,
              location: { index: at },
            },
          }],
        },
      });
      // The API inserts a newline before the table, so the table starts at
      // at + 1. Fill cells from a fresh fetch (the API assigns cell indices).
      const doc = await docs.documents.get({ documentId });
      const table = (doc.data.body.content || []).find(
        (el) => el.table && el.startIndex === at + 1,
      )?.table;
      if (table) {
        // Insert cell text using the API's cell start locations. Cells whose
        // Fill cells one at a time in descending index order: each insert
        // shifts only positions AFTER it, so descending order keeps every
        // target index valid. Images are best-effort: if Google can't fetch
        // the URL (hotlink protection, query params), fall back to the bare
        // URL, then to a text link — a single bad image must not abort the doc.
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
                text,
                index: cell.content[0].endIndex - 1,
                isImage: isImageUrl(text),
              });
            }
            ci += 1;
          }
          ri += 1;
        }
        cellRequests.sort((a, b) => b.index - a.index);
        for (const cr of cellRequests) {
          if (cr.isImage) {
            const bareUrl = cr.text.split('?')[0];
            let inserted = false;
            for (const uri of [cr.text, bareUrl]) {
              try {
                await docs.documents.batchUpdate({
                  documentId,
                  requestBody: {
                    requests: [{
                      insertInlineImage: {
                        uri,
                        objectSize: { height: { magnitude: 150, unit: 'PT' } },
                        location: { index: cr.index },
                      },
                    }],
                  },
                });
                inserted = true;
                break;
              } catch {
                // try next fallback
              }
            }
            if (!inserted) {
              await docs.documents.batchUpdate({
                documentId,
                requestBody: { requests: [{ insertText: { location: { index: cr.index }, text: `[image: ${cr.text}]` } }] },
              });
            }
          } else {
            await docs.documents.batchUpdate({
              documentId,
              requestBody: { requests: [{ insertText: { location: { index: cr.index }, text: cr.text } }] },
            });
          }
        }
      }
    } else if (step.type === 'image') {
      try {
        await docs.documents.batchUpdate({
          documentId,
          requestBody: {
            requests: [{
              insertInlineImage: {
                uri: step.url,
                objectSize: { height: { magnitude: 200, unit: 'PT' } },
                location: { index: at },
              },
            }],
          },
        });
      } catch (err) {
        // Some source images aren't fetchable by Google (relative URLs,
        // hotlink protection). Best-effort: leave a link instead of failing
        // the whole doc; the review pass can re-insert these.
        await docs.documents.batchUpdate({
          documentId,
          requestBody: { requests: [{ insertText: { location: { index: at }, text: `[image: ${step.url}]` } }] },
        });
      }
    }
  }
}

// Wraps a Docs client so write batchUpdates respect the API's write quota
// (60 writes/min/user). Reads are unthrottled.
export function throttleDocs(docs, minIntervalMs = 1100) {
  let last = 0;
  const orig = docs.documents.batchUpdate.bind(docs.documents);
  docs.documents.batchUpdate = async (...args) => {
    const wait = last + minIntervalMs - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
    return orig(...args);
  };
  return docs;
}

export async function syncDocs(models, { folderId, docs: docsOverride, drive: driveOverride, mappingFile = MAPPING_FILE, skipExisting = false } = {}) {
  let docs = docsOverride;
  let drive = driveOverride;
  if (!docs || !drive) {
    const auth = await google.auth.getClient({
      scopes: ['https://www.googleapis.com/auth/documents', 'https://www.googleapis.com/auth/drive'],
    });
    docs = docs || google.docs({ version: 'v1', auth });
    drive = drive || google.drive({ version: 'v3', auth });
  }
  const mapping = loadMapping(mappingFile);

  for (const model of models) {
    if (skipExisting && mapping[model.slug]) continue; // resume: already synced
    const plan = planSync(model, mapping);
    if (plan.action === 'update') {
      // The Docs API has no deleteTable request, so a doc containing tables
      // cannot be emptied in place. Recreate instead: trash the old file,
      // create a fresh one, and keep the mapping pointing at the new doc.
      await drive.files.update({ fileId: plan.fileId, requestBody: { trashed: true }, fields: 'id' });
    }
    const doc = await docs.documents.create({ requestBody: { title: model.title } });
    const fileId = doc.data.documentId;
    if (folderId) {
      await drive.files.update({ fileId, addParents: folderId, fields: 'id' });
    }
    mapping[model.slug] = {
      fileId,
      url: `https://docs.google.com/document/d/${fileId}/edit`,
    };
    // Persist immediately so a mid-run failure never duplicates docs (C2).
    saveMapping(mapping, mappingFile);
    console.log(`[${new Date().toISOString().slice(11, 19)}] ${plan.action}: ${model.slug}`);
    await executePlan(buildDocPlan(model), fileId, docs);
  }
  saveMapping(mapping, mappingFile);
  return mapping;
}

if (process.argv[1] && process.argv[1].endsWith('create-docs.js')) {
  const models = JSON.parse(readFileSync('export/doc-models.json', 'utf8'));
  const { getGoogleClients } = await import('./google-auth.js');
  const clients = await getGoogleClients();
  syncDocs(models, {
    folderId: process.env.DRIVE_FOLDER_ID,
    docs: throttleDocs(clients.docs),
    drive: clients.drive,
    skipExisting: process.env.SKIP_EXISTING === 'true',
  }).then((m) => console.log(`Synced ${Object.keys(m).length} docs`));
}
