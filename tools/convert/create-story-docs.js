// Creates the Google Docs for the migrated /stories/ pages (WordPress
// `story` custom post type) from export/story-models.json.
// Post-processing applied here:
//   - hero rows lose their content_topic link cell (those listing pages are
//     not migrated; the tagline renders as plain text, like a byline);
//   - /stories/... links become site-relative paths.
// Usage:
//   node tools/convert/create-story-docs.js            create all missing
//   node tools/convert/create-story-docs.js <slug>     create one (pilot)
import { readFileSync } from 'node:fs';
import { getGoogleClients } from './google-auth.js';
import { syncDocs, throttleDocs } from './create-docs.js';

const ROOT_FOLDER = '1MZexbvQFeFmqdFycqtHPmMQB1wGe2a0E';
const OLD_ORIGIN = 'https://www.msd.com';

function postProcess(models) {
  for (const model of models) {
    for (const section of model.sections) {
      for (const block of section.blocks) {
        if (block.name === 'hero') {
          block.rows = block.rows.map((row) => row.filter((cell) => !String(cell).startsWith(`${OLD_ORIGIN}/content_topic/`)));
        }
        block.rows = block.rows.map((row) => row.map((cell) => (
          typeof cell === 'string' && cell.startsWith(`${OLD_ORIGIN}/stories/`)
            ? cell.slice(OLD_ORIGIN.length)
            : cell
        )));
      }
    }
  }
  return models;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.chdir('/Users/715618/AI/msd');
  const models = postProcess(JSON.parse(readFileSync('export/story-models.json', 'utf8')));
  const slug = process.argv[2];
  const targets = slug ? models.filter((m) => m.slug === slug) : models;
  if (!targets.length) throw new Error(`no model for ${slug}`);
  const { docs, drive } = await getGoogleClients();
  // find (or create) the stories folder in the Drive root
  const folders = await drive.files.list({
    q: `'${ROOT_FOLDER}' in parents and name = 'stories' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id)',
  });
  let folderId = folders.data.files[0]?.id;
  if (!folderId) {
    const created = await drive.files.create({
      requestBody: { name: 'stories', mimeType: 'application/vnd.google-apps.folder', parents: [ROOT_FOLDER] },
      fields: 'id',
    });
    folderId = created.data.id;
    console.log('created Drive folder stories:', folderId);
  }
  const mapping = await syncDocs(targets, {
    folderId,
    docs: throttleDocs(docs),
    drive,
  });
  console.log(`done, ${Object.keys(mapping).length} docs in mapping`);
}
