// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { buildHeroBlock } from '../../blocks/hero/hero.js';

describe('hero block', () => {
  it('wraps first picture as background and content as copy', () => {
    const el = document.createElement('div');
    el.innerHTML = '<picture><img src="/h.jpg"></picture><h1>Title</h1><p>Sub</p>';
    const block = buildHeroBlock(el);
    expect(block.querySelector('.hero-picture img').getAttribute('src')).toBe('/h.jpg');
    expect(block.querySelector('.hero-copy h1').textContent).toBe('Title');
    expect(block.querySelector('.hero-copy p').textContent).toBe('Sub');
  });
  it('keeps all source content (nothing dropped)', () => {
    const el = document.createElement('div');
    el.innerHTML = '<picture><img src="/h.jpg"></picture><h1>T</h1><p>a</p><p>b</p><a href="/x">CTA</a>';
    const block = buildHeroBlock(el);
    expect(block.querySelectorAll('.hero-copy p').length).toBe(2);
    expect(block.querySelector('.hero-copy a').getAttribute('href')).toBe('/x');
  });
  it('handles hero without picture', () => {
    const el = document.createElement('div');
    el.innerHTML = '<h1>Text only</h1>';
    const block = buildHeroBlock(el);
    expect(block.querySelector('.hero-picture')).toBe(null);
    expect(block.querySelector('.hero-copy h1').textContent).toBe('Text only');
  });
  it('preserves variant classes (full, negative)', () => {
    const el = document.createElement('div');
    el.className = 'hero full';
    el.innerHTML = '<h1>T</h1>';
    const block = buildHeroBlock(el);
    expect(block.classList.contains('full')).toBe(true);
  });

  it('wraps site-relative path cells as CTA anchors', () => {
    const el = document.createElement('div');
    el.innerHTML = '<picture><img src="/h.jpg"></picture><p>Copy</p><div>/research-overview</div><div>Our research</div>';
    const block = buildHeroBlock(el);
    const a = block.querySelector('.hero-copy a[href="/research-overview"]');
    expect(a).toBeTruthy();
    expect(a.textContent).toBe('Our research');
  });
});
