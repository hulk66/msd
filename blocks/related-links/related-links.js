/**
 * msd.com related-links (b7): styled link list. Link cells arrive as
 * plain-text URLs paired with a title cell — converted to real anchors.
 * @param {Element} block The related-links block element
 */
import { isPlainUrl } from '../../scripts/links.js';

export function buildRelatedLinks(block) {
  const rebuilt = document.createElement('div');
  rebuilt.className = 'related-links block';
  [...block.children].forEach((row) => {
    const cells = [...row.querySelectorAll(':scope > div')];
    if (cells.length === 2 && isPlainUrl(cells[1].textContent.trim()) && !cells[1].querySelector('a')) {
      const href = cells[1].textContent.trim();
      const title = cells[0].textContent.trim();
      cells[1].innerHTML = `<a href="${href}">${title}</a>`;
    }
    rebuilt.append(row);
  });
  return rebuilt;
}

export default async function decorate(block) {
  block.replaceWith(buildRelatedLinks(block));
}
