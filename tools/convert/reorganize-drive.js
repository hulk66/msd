// Reorganizes the migrated Google Docs to mirror the site URL structure:
// slug "a/b/c" → folder a/b/ + doc named "c". Uses the Drive API.
// Idempotent: re-running fixes any misplaced/renamed docs.
import { readFileSync } from 'node:fs';
import { getGoogleClients } from './google-auth.js';

const ROOT_FOLDER = process.env.DRIVE_FOLDER_ID || '1MZexbvQFeFmqdFycqtHPmMQB1wGe2a0E';

const mapping = JSON.parse(readFileSync('export/doc-mapping.json', 'utf8'));
const { drive } = await getGoogleClients();

// cache of created folders by path
const folderCache = new Map([[ROOT_FOLDER, ROOT_FOLDER]]);

async function ensureFolder(path) {
  if (!path) return ROOT_FOLDER;
  if (folderCache.has(path)) return folderCache.get(path);
  const parts = path.split('/');
  const name = parts[parts.length - 1];
  const parentPath = parts.slice(0, -1).join('/');
  const parentId = await ensureFolder(parentPath);
  // find existing subfolder
  const q = await drive.files.list({
    q: `name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
  });
  let id = q.data.files?.[0]?.id;
  if (!id) {
    const f = await drive.files.create({
      requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
      fields: 'id',
    });
    id = f.data.id;
  }
  folderCache.set(path, id);
  return id;
}

let moved = 0;
let renamed = 0;
let errors = 0;
for (const [slug, info] of Object.entries(mapping)) {
  try {
    const segments = slug.split('/');
    const docName = segments[segments.length - 1];
    const parentPath = segments.slice(0, -1).join('/');
    const parentId = parentPath ? await ensureFolder(parentPath) : ROOT_FOLDER;

    const meta = await drive.files.get({ fileId: info.fileId, fields: 'name,parents' });
    if (meta.data.name !== docName) {
      await drive.files.update({ fileId: info.fileId, requestBody: { name: docName } });
      renamed += 1;
    }
    if (!meta.data.parents.includes(parentId)) {
      await drive.files.update({
        fileId: info.fileId,
        addParents: parentId,
        removeParents: meta.data.parents.join(','),
        fields: 'id,parents',
      });
      moved += 1;
    }
  } catch (err) {
    errors += 1;
    console.error(`ERROR ${slug}: ${err.message.split('\n')[0]}`);
  }
}
console.log(`done: ${renamed} renamed, ${moved} moved, ${errors} errors`);
