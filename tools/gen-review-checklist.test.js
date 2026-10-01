import { describe, it, expect } from 'vitest';
import { buildChecklistEntry, buildProgressRow } from './gen-review-checklist.js';

describe('buildChecklistEntry', () => {
  it('includes the five checks per page', () => {
    const entry = buildChecklistEntry({
      slug: 'about', url: 'https://www.msd.com/about/',
      docUrl: 'https://docs.google.com/document/d/f1/edit',
    });
    expect(entry).toContain('/about/');
    expect(entry).toContain('https://docs.google.com/document/d/f1/edit');
    expect(entry).toContain('sections present');
    expect(entry).toContain('images load');
    expect(entry).toContain('block types correct');
    expect(entry).toContain('metadata set');
    expect(entry).toContain('blocks used are in the editor guide');
  });
});

describe('buildProgressRow', () => {
  it('emits csv row with all columns', () => {
    const row = buildProgressRow({
      slug: 'about', url: 'https://www.msd.com/about/',
      docUrl: 'https://docs.google.com/document/d/f1/edit',
    });
    expect(row).toBe('about,https://www.msd.com/about/,https://docs.google.com/document/d/f1/edit,,,,,,,open,');
  });
});
