/**
 * msd.com cards: one .card per source row (image, title, text, link).
 * Link cells arrive as plain-text URLs — they become the card title link
 * and make the whole card clickable.
 * @param {Element} block The cards block element
 */
import { isPlainUrl, makeClickable } from '../../scripts/links.js';

export function buildCards(block) {
  const rebuilt = document.createElement('div');
  rebuilt.className = 'cards block';
  [...block.children].forEach((child) => {
    const card = document.createElement('div');
    card.className = 'card';
    while (child.firstElementChild) card.append(child.firstElementChild);
    // link cells arrive as plain-text URLs: the title becomes the link and
    // the whole card is clickable (source behavior)
    const urlCell = [...card.querySelectorAll('div, p')].find((c) => isPlainUrl(c.textContent.trim()) && !c.querySelector('a'));
    if (urlCell) {
      const href = urlCell.textContent.trim();
      urlCell.remove();
      const title = card.querySelector('h3, h2');
      if (title) {
        const a = document.createElement('a');
        a.href = href;
        a.textContent = title.textContent;
        title.textContent = '';
        title.append(a);
      }
      makeClickable(card, href);
    }
    rebuilt.append(card);
  });
  return rebuilt;
}

export default async function decorate(block) {
  block.replaceWith(buildCards(block));
}
