/**
 * msd.com hero: first cell picture becomes the background layer, remaining
 * content is grouped into a copy overlay. Variants: `full` (full-bleed).
 * @param {Element} block The hero block element
 */
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
  // URL-only cells arrive as plain text; wrap them as CTA anchors.
  [...copy.querySelectorAll('div, p')].forEach((cell) => {
    const text = cell.textContent.trim();
    if (/^https?:\/\/\S+$/.test(text) && !cell.querySelector('a')) {
      const a = document.createElement('a');
      a.href = text;
      a.textContent = 'Learn more';
      cell.textContent = '';
      cell.append(a);
    }
  });
  // promote the first text cell to the hero heading
  const firstText = copy.querySelector(':scope > div:not(.hero-picture), :scope > p');
  if (firstText && !copy.querySelector('h1, h2, h3')) {
    const h1 = document.createElement('h1');
    h1.textContent = firstText.textContent.trim();
    firstText.replaceWith(h1);
  }
  rebuilt.append(copy);
  return rebuilt;
}

export default async function decorate(block) {
  block.replaceWith(buildHeroBlock(block));
}
