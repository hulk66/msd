/**
 * msd.com content-block (b5): image + heading + description + CTA.
 * Variants: left/right (image side), negative (dark band).
 * @param {Element} block The block element
 */
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
  rebuilt.append(copy);
  return rebuilt;
}

export default async function decorate(block) {
  block.replaceWith(buildContentBlock(block));
}
