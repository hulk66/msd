// Resolves doc/folder path conflicts: a Drive folder and doc with the same
// path can't coexist (the folder shadows the doc → 404). Renames conflicting
// docs to `<slug>-overview` and updates doc-mapping.json keys accordingly.
import { readFileSync, writeFileSync } from 'node:fs';
import { getGoogleClients } from './google-auth.js';

const ROOT_FOLDER = '1MZexbvQFeFmqdFycqtHPmMQB1wGe2a0E';
const CONFLICTS = process.argv.slice(2); // slugs whose docs need renaming

const mapping = JSON.parse(readFileSync('export/doc-mapping.json', 'utf8'));
const { drive } = await getGoogleClients();

// Build the set of folder paths that exist (parents of mapped slugs).
const folderPaths = new Set();
for (const slug of Object.keys(mapping)) {
  const segs = slug.split('/');
  for (let i = 1; i < segs.length; i += 1) folderPaths.add(segs.slice(0, i).join('/'));
}

for (const slug of CONFLICTS.length ? CONFLICTS : Object.keys(mapping)) {
  const isConflict = folderPaths.has(slug)
    || (CONFLICTS.length && CONFLICTS.includes(slug));
  if (!isConflict) continue;
  const newName = `${slug}-overview`;
  const segs = newName.split('/');
  const docName = segs[segs.length - 1];
  const info = mapping[slug];
  try {
    await drive.files.update({
      fileId: info.fileId,
      requestBody: { name: docName },
      fields: 'id',
    });
    mapping[newName] = info;
    delete mapping[slug];
    console.log(`renamed: ${slug} -> ${newName}`);
  } catch (err) {
    console.error(`ERROR ${slug}: ${err.message.split('\n')[0]}`);
  }
}
writeFileSync('export/doc-mapping.json', JSON.stringify(mapping, null, 2));
console.log('mapping updated');
