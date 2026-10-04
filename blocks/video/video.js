/**
 * msd.com video: poster + copy + embed link. Content-only: renders a link,
 * never an auto-playing third-party embed.
 * @param {Element} block The video block element
 */
import { isPlainUrl } from '../../scripts/links.js';

export function buildVideo(block) {
  const rebuilt = document.createElement('div');
  rebuilt.className = 'video block';

  const poster = block.querySelector('picture');
  if (poster) {
    const p = document.createElement('div');
    p.className = 'video-poster';
    p.append(poster);
    rebuilt.append(p);
  }

  const copy = document.createElement('div');
  copy.className = 'video-copy';
  [...block.children].forEach((child) => {
    if (child !== poster) copy.append(child);
  });
  // URL-only cells arrive as plain text (Docs cells don't auto-link);
  // wrap them in anchors. A cell following the URL cell is the CTA label.
  // Enumerate actual cells (block > row > cell) — descendant queries would
  // see each cell twice once aem.js wraps bare text in <p>.
  const cells = [...copy.children].flatMap((row) => [...row.children]);
  cells.forEach((cell, i) => {
    const text = cell.textContent.trim();
    if (isPlainUrl(text) && !cell.querySelector('a')) {
      const a = document.createElement('a');
      a.href = text;
      a.textContent = cells[i + 1]?.textContent.trim() || 'Learn more';
      if (cells[i + 1]) cells[i + 1].remove();
      cell.textContent = '';
      cell.append(a);
    }
  });
  // promote the copy text to the hero headline (source: large light heading)
  if (!copy.querySelector('h1, h2, h3')) {
    const leaf = [...copy.querySelectorAll('div, p')].find((c) => c.textContent.trim() && !c.querySelector('div, p, a'));
    if (leaf) {
      const h2 = document.createElement('h2');
      h2.textContent = leaf.textContent.trim();
      leaf.replaceWith(h2);
    }
  }
  const link = copy.querySelector('a[href]');
  if (link) {
    const embed = document.createElement('div');
    embed.className = 'video-embed';
    embed.append(link);
    rebuilt.append(embed);
  }
  rebuilt.append(copy);
  return rebuilt;
}

export default async function decorate(block) {
  block.replaceWith(buildVideo(block));
}
