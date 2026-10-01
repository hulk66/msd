/**
 * msd.com related-links (b7): styled link list.
 * @param {Element} block The related-links block element
 */
export function buildRelatedLinks(block) {
  const rebuilt = document.createElement('div');
  rebuilt.className = 'related-links block';
  while (block.firstElementChild) rebuilt.append(block.firstElementChild);
  return rebuilt;
}

export default async function decorate(block) {
  block.replaceWith(buildRelatedLinks(block));
}
