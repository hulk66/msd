// Drive smoke test: authorizes via OAuth, creates a scratch folder, syncs
// one doc twice (idempotency contract), prints the doc URL.
import { getGoogleClients } from './google-auth.js';
import { syncDocs } from './create-docs.js';

const clients = await getGoogleClients();

// Find or create the scratch folder.
const drive = clients.drive;
const q = await drive.files.list({
  q: "mimeType='application/vnd.google-apps.folder' and name='msd-migration-smoke' and trashed=false",
  fields: 'files(id,name)',
});
let folderId = q.data.files?.[0]?.id;
if (!folderId) {
  const folder = await drive.files.create({
    requestBody: { name: 'msd-migration-smoke', mimeType: 'application/vnd.google-apps.folder' },
    fields: 'id',
  });
  folderId = folder.data.id;
}
console.log('folder:', `https://drive.google.com/drive/folders/${folderId}`);

const model = {
  slug: 'smoke-test',
  title: 'Smoke Test Page',
  description: 'Verifies the WordPress→Docs pipeline end to end.',
  sections: [
    {
      blocks: [{ name: 'hero', variant: ['full'], rows: [['https://www.msd.com/favicon.ico', 'Smoke headline', 'Smoke sub', 'https://www.msd.com/']] }],
      plain: [{ type: 'paragraph', text: 'If you can read this in the Doc, text insertion works.' }],
      metadata: { style: 'dark' },
    },
  ],
};

const mapping1 = await syncDocs([model], { folderId, ...clients });
console.log('run 1:', mapping1['smoke-test']?.url);
const mapping2 = await syncDocs([model], { folderId, ...clients });
console.log('run 2:', mapping2['smoke-test']?.url);

// Idempotency contract (recreate strategy): exactly ONE live doc per slug —
// the old file is trashed, the mapping points at the new one.
const live = await drive.files.list({
  q: "name='Smoke Test Page' and trashed=false and mimeType='application/vnd.google-apps.document'",
  fields: 'files(id)',
});
const trashedOld = await drive.files.get({ fileId: mapping1['smoke-test'].fileId, fields: 'trashed' });
console.log('live docs with this title:', live.data.files.length);
console.log('run-1 doc trashed:', trashedOld.data.trashed);
console.log(live.data.files.length === 1 && trashedOld.data.trashed
  ? 'IDEMPOTENT: one live doc per slug, old version trashed'
  : 'FAILED: duplicate live docs');
console.log('folderId for full run:', folderId);
