// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { buildCards } from '../../blocks/cards/cards.js';

describe('cards', () => {
  it('renders one card per row with image, title, text, link', () => {
    const el = document.createElement('div');
    el.innerHTML = '<div><img src="/1.jpg"><h3>Card A</h3><p>Desc</p><a href="/a">More</a></div>'
      + '<div><img src="/2.jpg"><h3>Card B</h3><p>Desc2</p><a href="/b">More</a></div>';
    const block = buildCards(el);
    const cards = block.querySelectorAll('.card');
    expect(cards.length).toBe(2);
    expect(cards[0].querySelector('img').getAttribute('src')).toBe('/1.jpg');
    expect(cards[0].querySelector('h3').textContent).toBe('Card A');
    expect(cards[1].querySelector('a').getAttribute('href')).toBe('/b');
  });
});
