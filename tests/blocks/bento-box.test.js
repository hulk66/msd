// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { buildBentoBox } from '../../blocks/bento-box/bento-box.js';

describe('bento-box', () => {
  it('renders bento cells with image, heading, text, link', () => {
    const el = document.createElement('div');
    el.innerHTML = '<div><img src="/a.jpg"><h3>Cell A</h3><p>Text A</p><a href="/a">Link</a></div>'
      + '<div><h3>Cell B</h3><p>Text B</p></div>';
    const block = buildBentoBox(el);
    const cells = block.querySelectorAll('.bento-cell');
    expect(cells.length).toBe(2);
    expect(cells[0].querySelector('img').getAttribute('src')).toBe('/a.jpg');
    expect(cells[0].querySelector('h3').textContent).toBe('Cell A');
    expect(cells[1].querySelector('h3').textContent).toBe('Cell B');
  });
});
