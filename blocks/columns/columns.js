/**
 * msd.com columns: one .col per source row. Cells containing a plain URL
 * become the column's link; the whole column is clickable (source behavior:
 * role="link" with data-href).
 * @param {Element} block The columns block element
 */
import { isPlainUrl } from '../../scripts/links.js';

export function buildColumns(block) {
  const rebuilt = document.createElement('div');
  rebuilt.className = 'columns block';
  [...block.children].forEach((child) => {
    const col = document.createElement('div');
    col.className = 'col';
    while (child.firstElementChild) col.append(child.firstElementChild);

    // URL-only cells become the column link; the title is the anchor text.
    const cells = [...col.querySelectorAll('div, p')];
    const urlCell = cells.find((c) => isPlainUrl(c.textContent.trim()) && !c.querySelector('a'));
    if (urlCell) {
      const href = urlCell.textContent.trim();
      const title = col.querySelector('h3, h2');
      const a = document.createElement('a');
      a.href = href;
      a.textContent = title?.textContent || 'Learn more';
      if (title) {
        title.textContent = '';
        title.append(a);
      } else {
        a.textContent = 'Learn more';
        urlCell.replaceWith(a);
      }
      urlCell.remove();
      col.dataset.href = href;
      col.style.cursor = 'pointer';
      col.setAttribute('role', 'link');
      col.addEventListener('click', (e) => {
        if (e.target.closest('a')) return; // let real links behave natively
        window.location.href = href;
      });
    }
    rebuilt.append(col);
  });
  return rebuilt;
}

export default async function decorate(block) {
  block.replaceWith(buildColumns(block));
}
