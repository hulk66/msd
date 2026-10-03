import { getGoogleClients } from './google-auth.js';

const { docs } = await getGoogleClients();
const doc = await docs.documents.create({ requestBody: { title: 'EndIndex Debug' } });
const id = doc.data.documentId;
let d = await docs.documents.get({ documentId: id });
console.log('initial end:', d.data.body.endSegmentIndex);
await docs.documents.batchUpdate({
  documentId: id,
  requestBody: { requests: [{ insertTable: { rows: 2, columns: 2, location: { index: 1 } } }] },
});
d = await docs.documents.get({ documentId: id });
console.log('after table end:', d.data.body.endSegmentIndex);
for (const el of d.data.body.content) {
  console.log(el.table ? `TABLE s=${el.startIndex} e=${el.endIndex}` : `P s=${el.startIndex} e=${el.endIndex}`);
}
