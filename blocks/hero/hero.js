/**
 * msd.com hero: first cell picture becomes the background layer, remaining
 * content is grouped into a copy overlay. Variants: `full` (full-bleed).
 * @param {Element} block The hero block element
 */
import { isPlainUrl } from '../../scripts/links.js';

export function buildHeroBlock(block) {
  const variant = [...block.classList].filter((c) => c !== 'hero' && c !== 'block');
  const rebuilt = document.createElement('div');
  rebuilt.className = `hero block ${variant.join(' ')}`.trim();

  const picture = block.querySelector('picture');
  if (picture) {
    const bg = document.createElement('div');
    bg.className = 'hero-picture';
    bg.append(picture);
    rebuilt.append(bg);
  }

  const copy = document.createElement('div');
  copy.className = 'hero-copy';
  [...block.children].forEach((child) => {
    if (child !== picture) copy.append(child);
  });
  // URL-only cells arrive as plain text; wrap them as CTA anchors. A cell
  // following the URL cell is the CTA label (same convention as video).
  // Enumerate actual cells (block > row > cell) — descendant queries would
  // see each cell twice once aem.js wraps bare text in <p>.
  const copyCells = [...copy.children].flatMap((row) => [...row.children]);
  copyCells.forEach((cell, i) => {
    const text = cell.textContent.trim();
    if (isPlainUrl(text) && !cell.querySelector('a')) {
      const a = document.createElement('a');
      a.href = text;
      a.textContent = copyCells[i + 1]?.textContent.trim() || 'Learn more';
      if (copyCells[i + 1]) copyCells[i + 1].remove();
      cell.textContent = '';
      cell.append(a);
    }
  });
  // promote the first leaf text cell to the hero heading (cells are nested
  // inside row wrappers, so take the first div/p without element children)
  if (!copy.querySelector('h1, h2, h3')) {
    const leaf = [...copy.querySelectorAll('div, p')].find((c) => c.textContent.trim() && !c.querySelector('div, p, a'));
    if (leaf) {
      const h1 = document.createElement('h1');
      h1.textContent = leaf.textContent.trim();
      leaf.replaceWith(h1);
    }
  }
  rebuilt.append(copy);
  return rebuilt;
}

export default async function decorate(block) {
  block.replaceWith(buildHeroBlock(block));
}
