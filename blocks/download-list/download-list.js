/**
 * msd.com download-list (g5): file links marked for download. Link cells
 * arrive as plain-text URLs paired with a title cell — converted to anchors.
 * @param {Element} block The download-list block element
 */
import { isPlainUrl } from '../../scripts/links.js';

export function buildDownloadList(block) {
  const rebuilt = document.createElement('div');
  rebuilt.className = 'download-list block';
  [...block.children].forEach((row) => {
    const cells = [...row.querySelectorAll(':scope > div')];
    if (cells.length === 2 && isPlainUrl(cells[1].textContent.trim()) && !cells[1].querySelector('a')) {
      const href = cells[1].textContent.trim();
      const title = cells[0].textContent.trim();
      cells[1].innerHTML = `<a href="${href}" download>${title}</a>`;
    }
    rebuilt.append(row);
  });
  rebuilt.querySelectorAll('a').forEach((a) => a.setAttribute('download', ''));
  return rebuilt;
}

export default async function decorate(block) {
  block.replaceWith(buildDownloadList(block));
}
