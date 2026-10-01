import { describe, it, expect } from 'vitest';
import { extractSlug, collectImageUrls } from './export-wp.js';

describe('extractSlug', () => {
  it('derives slug from link', () => {
    expect(extractSlug({ link: 'https://x.com/about/team/' })).toBe('about/team');
  });
  it('maps root to home', () => {
    expect(extractSlug({ link: 'https://x.com/' })).toBe('home');
  });
});

describe('collectImageUrls', () => {
  it('finds img srcs in html', () => {
    const html = '<p><img src="https://x.com/a.png"></p>';
    expect(collectImageUrls(html)).toEqual(['https://x.com/a.png']);
  });
  it('finds lazy-loaded data-srcset and source srcset urls', () => {
    const html = '<picture><source media="(max-width:767px)" data-srcset="https://x.com/m.jpg?w=375"><img data-src="https://x.com/big.jpg"></picture>';
    expect(collectImageUrls(html)).toEqual([
      'https://x.com/m.jpg?w=375',
      'https://x.com/big.jpg',
    ]);
  });
});
