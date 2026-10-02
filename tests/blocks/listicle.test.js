// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { buildListicle } from '../../blocks/listicle/listicle.js';

describe('listicle', () => {
  it('renders numbered sections, nothing dropped', () => {
    const el = document.createElement('div');
    el.innerHTML = '<div><h3>First</h3><p>Text one</p></div><div><h3>Second</h3><p>Text two</p></div>';
    const block = buildListicle(el);
    const items = block.querySelectorAll('.listicle-item');
    expect(items.length).toBe(2);
    expect(items[0].querySelector('.listicle-number').textContent).toBe('1');
    expect(items[0].querySelector('h3').textContent).toBe('First');
    expect(items[1].querySelector('.listicle-number').textContent).toBe('2');
  });
});
