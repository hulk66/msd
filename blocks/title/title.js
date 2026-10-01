/**
 * msd.com title band (g5): heading band above a section.
 * @param {Element} block The title block element
 */
export function buildTitle(block) {
  const rebuilt = document.createElement('div');
  rebuilt.className = 'title block';
  while (block.firstElementChild) rebuilt.append(block.firstElementChild);
  return rebuilt;
}

export default async function decorate(block) {
  block.replaceWith(buildTitle(block));
}
