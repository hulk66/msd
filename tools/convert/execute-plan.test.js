import { describe, it, expect } from 'vitest';
import { executePlan, clearDocument } from './create-docs.js';

function fakeDocs() {
  const calls = [];
  let tableStart = 5; // a table exists by default (update-path scenarios)
  return {
    calls,
    documents: {
      batchUpdate: async ({ requestBody }) => {
        calls.push(...requestBody.requests);
        for (const r of requestBody.requests) {
          if (r.createTableRequest) tableStart = r.createTableRequest.tableStartLocation.index;
        }
        return { data: {} };
      },
      get: async () => ({
        data: {
          body: {
            content: [
              { startIndex: 0, endIndex: tableStart, paragraph: {} },
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

describe('executePlan (C2: sequential cursor, real cell insertion)', () => {
  it('inserts text at advancing indices in plan order', async () => {
    const docs = fakeDocs();
    await executePlan(
      [
        { type: 'text', text: 'abc\n' },
        { type: 'text', text: 'de\n' },
      ],
      'doc1',
      docs,
    );
    const inserts = docs.calls.filter((r) => r.insertText);
    expect(inserts[0].insertText.location.index).toBe(1);
    expect(inserts[1].insertText.location.index).toBe(5); // 1 + len('abc\n')
  });

  it('creates tables with tableStartLocation and fills cells from fetched doc', async () => {
    const docs = fakeDocs();
    await executePlan(
      [{ type: 'table', header: 'cards', rows: [['a', 'b'], ['c', 'd']] }],
      'doc1',
      docs,
    );
    const create = docs.calls.find((r) => r.createTableRequest);
    expect(create.createTableRequest.tableStartLocation.index).toBe(1);
    expect(create.createTableRequest.rows).toBe(3); // header + 2 rows
    const cellInserts = docs.calls.filter(
      (r) => r.insertText && r.insertText.location.index > 1 && r.insertText.text,
    );
    // EDS block tables: one value per cell, header row names the block.
    expect(cellInserts.map((r) => r.insertText.text)).toEqual(['cards', 'a', 'b', 'c', 'd']);
  });

  it('emits insertInlineImage with uri', async () => {
    const docs = fakeDocs();
    await executePlan([{ type: 'image', url: 'https://x/pic.jpg', alt: 'P' }], 'doc1', docs);
    const img = docs.calls.find((r) => r.insertInlineImage);
    expect(img.insertInlineImage.uri).toBe('https://x/pic.jpg');
  });
});

describe('clearDocument (C2: update path deletes tables individually)', () => {
  it('deletes tables via deleteTableRequest, not a spanning range', async () => {
    const docs = fakeDocs();
    await clearDocument('doc1', docs);
    expect(docs.calls.some((r) => r.deleteTableRequest)).toBe(true);
    expect(docs.calls.some((r) => r.deleteContentRange)).toBe(true);
  });
});
