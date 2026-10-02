// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { buildSlideshow } from '../../blocks/slideshow/slideshow.js';

describe('slideshow', () => {
  it('renders slides with prev/next controls, nothing dropped', () => {
    const el = document.createElement('div');
    el.innerHTML = '<picture><img src="/1.jpg"></picture><picture><img src="/2.jpg"></picture><picture><img src="/3.jpg"></picture>';
    const block = buildSlideshow(el);
    expect(block.querySelectorAll('.slide img').length).toBe(3);
    expect(block.querySelector('.slide-prev')).toBeTruthy();
    expect(block.querySelector('.slide-next')).toBeTruthy();
  });
});
