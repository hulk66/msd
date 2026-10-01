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
  rebuilt.append(copy);
  return rebuilt;
}

export default async function decorate(block) {
  block.replaceWith(buildHeroBlock(block));
}
