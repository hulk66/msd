// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { buildArticleImages } from '../../blocks/article-images/article-images.js';

describe('article-images', () => {
  it('renders a figure per image with alt text, nothing dropped', () => {
    const el = document.createElement('div');
    el.innerHTML = '<picture><img src="/1.jpg" alt="First"></picture><picture><img src="/2.jpg" alt="Second"></picture>';
    const block = buildArticleImages(el);
    const figures = block.querySelectorAll('figure');
    expect(figures.length).toBe(2);
    expect(figures[0].querySelector('img').getAttribute('src')).toBe('/1.jpg');
    expect(figures[0].querySelector('figcaption').textContent).toBe('First');
  });
});
