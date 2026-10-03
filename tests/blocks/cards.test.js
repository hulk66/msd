// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { buildCards } from '../../blocks/cards/cards.js';

describe('cards', () => {
  it('renders one card per row with image, title, text, link', () => {
    const el = document.createElement('div');
    el.innerHTML = '<div><img src="/1.jpg"><h3>Card A</h3><p>Desc</p><div>https://www.msd.com/a/</div></div>'
      + '<div><img src="/2.jpg"><h3>Card B</h3><p>Desc2</p><div>https://www.msd.com/b/</div></div>';
    const block = buildCards(el);
    const cards = block.querySelectorAll('.card');
    expect(cards.length).toBe(2);
    expect(cards[0].querySelector('img').getAttribute('src')).toBe('/1.jpg');
    expect(cards[0].querySelector('h3 a').getAttribute('href')).toBe('https://www.msd.com/a/');
    expect(cards[0].querySelector('h3 a').textContent).toBe('Card A');
    expect(cards[1].querySelector('a').getAttribute('href')).toBe('https://www.msd.com/b/');
    expect(cards[0].dataset.href).toBe('https://www.msd.com/a/');
    expect(cards[0].style.cursor).toBe('pointer');
  });
});
