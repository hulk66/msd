import { describe, it, expect } from 'vitest';
import { diffUrlSets, compareSites } from './compare-sites.js';

describe('diffUrlSets', () => {
  it('reports missing and extra pages', () => {
    const wp = ['https://x.com/a/', 'https://x.com/b/'];
    const eds = ['https://y.com/a/', 'https://y.com/c/'];
    const d = diffUrlSets(wp, eds, 'https://x.com', 'https://y.com');
    expect(d.missing).toEqual(['/b/']);
    expect(d.extra).toEqual(['/c/']);
  });
});

describe('sitemap fetch failures must not report a false clean (I5)', () => {
  it('throws when a sitemap is unreachable', async () => {
    await expect(compareSites({ wpBase: 'https://invalid.invalid', edsBase: 'https://invalid.invalid' }))
      .rejects.toThrow(/sitemap/i);
  });
});
