/**
 * msd.com content-block (b5): image + heading + description + CTA.
 * Variants: left/right (image side), negative (dark band).
 * @param {Element} block The block element
 */
import { isPlainUrl, makeClickable } from '../../scripts/links.js';

export function buildContentBlock(block) {
  const variant = [...block.classList].filter((c) => ['right', 'left', 'negative'].includes(c));
  const rebuilt = document.createElement('div');
  rebuilt.className = `content-block block ${variant.join(' ')}`;

  const picture = block.querySelector('picture');
  if (picture) {
    const imgSide = document.createElement('div');
    imgSide.className = 'cb-image';
    imgSide.append(picture);
    rebuilt.append(imgSide);
  }

  const copy = document.createElement('div');
  copy.className = 'cb-copy';
  [...block.children].forEach((child) => {
    if (child !== picture) copy.append(child);
  });
  // link cells arrive as plain-text URLs: wrap as CTA and make the whole
  // block clickable (source behavior)
  const urlCell = [...copy.querySelectorAll('div, p')].find((c) => isPlainUrl(c.textContent.trim()) && !c.querySelector('a'));
  if (urlCell) {
    const href = urlCell.textContent.trim();
    const a = document.createElement('a');
    a.href = href;
    a.textContent = 'Learn more';
    urlCell.replaceWith(a);
    makeClickable(rebuilt, href);
  }
  rebuilt.append(copy);
  return rebuilt;
}

export default async function decorate(block) {
  block.replaceWith(buildContentBlock(block));
}
