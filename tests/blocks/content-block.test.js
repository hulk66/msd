// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { buildContentBlock } from '../../blocks/content-block/content-block.js';

describe('content-block', () => {
  it('splits image and copy sides, keeps all content', () => {
    const el = document.createElement('div');
    el.innerHTML = '<picture><img src="/a.jpg"></picture><h2>Head</h2><p>Body</p><a href="/x">Read</a>';
    const block = buildContentBlock(el);
    expect(block.querySelector('.cb-image img').getAttribute('src')).toBe('/a.jpg');
    expect(block.querySelector('.cb-copy h2').textContent).toBe('Head');
    expect(block.querySelector('.cb-copy p').textContent).toBe('Body');
    expect(block.querySelector('.cb-copy a').getAttribute('href')).toBe('/x');
  });
  it('applies side variant class', () => {
    const el = document.createElement('div');
    el.className = 'content-block right negative';
    el.innerHTML = '<h2>T</h2>';
    const block = buildContentBlock(el);
    expect(block.classList.contains('right')).toBe(true);
    expect(block.classList.contains('negative')).toBe(true);
  });
  it('wraps plain-text URL cells as CTA links and makes the block clickable', () => {
    const el = document.createElement('div');
    el.innerHTML = '<picture><img src="/a.jpg"></picture><h2>Head</h2><p>Body</p><div>https://www.msd.com/x/</div>';
    const block = buildContentBlock(el);
    const a = block.querySelector('.cb-copy a[href="https://www.msd.com/x/"]');
    expect(a).toBeTruthy();
    expect(a.textContent).toBe('Learn more');
    expect(block.dataset.href).toBe('https://www.msd.com/x/');
    expect(block.style.cursor).toBe('pointer');
  });
});
