import { describe, it, expect } from 'vitest';
import { diffUrlSets } from './compare-sites.js';

describe('diffUrlSets', () => {
  it('reports missing and extra pages', () => {
    const wp = ['https://x.com/a/', 'https://x.com/b/'];
    const eds = ['https://y.com/a/', 'https://y.com/c/'];
    const d = diffUrlSets(wp, eds, 'https://x.com', 'https://y.com');
    expect(d.missing).toEqual(['/b/']);
    expect(d.extra).toEqual(['/c/']);
  });
});
