// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { buildBioHighlights } from '../../blocks/bio-highlights/bio-highlights.js';

describe('bio-highlights', () => {
  it('renders one bio card per row with image, name, role, nothing dropped', () => {
    const el = document.createElement('div');
    el.innerHTML = '<div><img src="/j.jpg"><h3>Jane Doe</h3><p>Chief Scientist</p></div>'
      + '<div><img src="/b.jpg"><h3>Bob Roe</h3><p>CTO</p></div>';
    const block = buildBioHighlights(el);
    const bios = block.querySelectorAll('.bio');
    expect(bios.length).toBe(2);
    expect(bios[0].querySelector('img').getAttribute('src')).toBe('/j.jpg');
    expect(bios[0].querySelector('.bio-name').textContent).toBe('Jane Doe');
    expect(bios[0].querySelector('.bio-role').textContent).toBe('Chief Scientist');
    expect(bios[1].querySelector('.bio-name').textContent).toBe('Bob Roe');
  });
  it('handles EDS table-shaped rows (cells)', () => {
    const el = document.createElement('div');
    el.innerHTML = '<div><div>/j.jpg</div><div>Jane Doe</div><div>Chief Scientist</div></div>';
    const block = buildBioHighlights(el);
    expect(block.querySelectorAll('.bio').length).toBe(1);
    expect(block.querySelector('.bio-name').textContent).toBe('Jane Doe');
  });
});
