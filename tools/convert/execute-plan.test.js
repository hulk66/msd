import { describe, it, expect } from 'vitest';
import { rmSync } from 'node:fs';
import { executePlan, syncDocs } from './create-docs.js';

// Fake Docs client that models the body end index the way the real API does:
// insertText with newlines grows the body; insertTable places the table at
// location.index + 1 ("a newline will be inserted before the table").
function fakeDocs() {
  const calls = [];
  let end = 1; // body.endSegmentIndex
  let tableStart = null;
  return {
    calls,
    documents: {
      batchUpdate: async ({ requestBody }) => {
        calls.push(...requestBody.requests);
        for (const r of requestBody.requests) {
          if (r.insertText) end += r.insertText.text.length;
          if (r.insertTable) tableStart = r.insertTable.location.index + 1;
        }
        return { data: {} };
      },
      get: async () => ({
        data: {
          body: {
            endSegmentIndex: end,
            content: tableStart === null ? [] : [
              {
                startIndex: tableStart,
                endIndex: tableStart + 15,
                table: {
                  tableRows: [
                    { tableCells: [{ content: [{ startIndex: tableStart + 1, endIndex: tableStart + 2 }] }, { content: [{ startIndex: tableStart + 2, endIndex: tableStart + 3 }] }] },
                    { tableCells: [{ content: [{ startIndex: tableStart + 4, endIndex: tableStart + 5 }] }, { content: [{ startIndex: tableStart + 5, endIndex: tableStart + 6 }] }] },
                    { tableCells: [{ content: [{ startIndex: tableStart + 7, endIndex: tableStart + 8 }] }, { content: [{ startIndex: tableStart + 8, endIndex: tableStart + 9 }] }] },
                  ],
                },
              },
            ],
          },
        },
      }),
    },
  };
}

describe('executePlan appends at the true end index (no hand-tracked cursor)', () => {
  it('inserts text inside the final paragraph, sequentially', async () => {
    const docs = fakeDocs();
    await executePlan(
      [{ type: 'text', text: 'abc\n' }, { type: 'text', text: 'de\n' }],
      'doc1',
      docs,
    );
    const inserts = docs.calls.filter((r) => r.insertText);
    expect(inserts[0].insertText.location.index).toBe(1); // max(end(1)-1, 1)
    expect(inserts[1].insertText.location.index).toBe(4); // end(5) - 1
  });

  it('inserts tables at end-1 and fills cells from the fetched table', async () => {
    const docs = fakeDocs();
    await executePlan(
      [{ type: 'table', header: 'cards', rows: [['a', 'b'], ['c', 'd']] }],
      'doc1',
      docs,
    );
    const create = docs.calls.find((r) => r.insertTable);
    expect(create.insertTable.location.index).toBe(1); // end(1) - 1... floored
    expect(create.insertTable.rows).toBe(3); // header + 2 rows
    const cellInserts = docs.calls.filter((r) => r.insertText && r.insertText.text);
    // Descending index order: last cell filled first so earlier inserts
    // never shift later target indices within the sequential batch.
    expect(cellInserts.map((r) => r.insertText.text)).toEqual(['d', 'c', 'b', 'a', 'cards']);
  });

  it('emits insertInlineImage with uri', async () => {
    const docs = fakeDocs();
    await executePlan([{ type: 'image', url: 'https://x/pic.jpg', alt: 'P' }], 'doc1', docs);
    const img = docs.calls.find((r) => r.insertInlineImage);
    expect(img.insertInlineImage.uri).toBe('https://x/pic.jpg');
  });
});

describe('syncDocs update path (no deleteTable in the API — recreate instead)', () => {
  function fakeClients() {
    const docs = fakeDocs();
    const trashed = [];
    const drive = {
      files: {
        update: async (opts) => { trashed.push({ fileId: opts.fileId, t: opts.requestBody?.trashed }); return { data: {} }; },
      },
    };
    let nextId = 100;
    docs.documents.create = async () => ({ data: { documentId: `new-${++nextId}` } });
    return { docs, drive, trashed };
  }

  it('trashes the old doc and creates a fresh one, keeping the mapping current', async () => {
    rmSync('/tmp/test-mapping.json', { force: true });
    const { docs, drive, trashed } = fakeClients();
    const mapping = await syncDocs(
      [{ slug: 'a', title: 'A', description: '', sections: [] }],
      { docs, drive, mappingFile: '/tmp/test-mapping.json' },
    );
    expect(mapping.a.fileId).toBe('new-101');
    expect(trashed).toEqual([]); // create path: nothing trashed

    const mapping2 = await syncDocs(
      [{ slug: 'a', title: 'A v2', description: '', sections: [] }],
      { docs, drive, mappingFile: '/tmp/test-mapping.json' },
    );
    expect(mapping2.a.fileId).toBe('new-102');
    expect(trashed).toEqual([{ fileId: 'new-101', t: true }]);
  });
});
