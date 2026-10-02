/**
 * msd.com bento-box: mixed-size grid cells.
 * @param {Element} block The bento-box block element
 */
export function buildBentoBox(block) {
  const rebuilt = document.createElement('div');
  rebuilt.className = 'bento-box block';
  [...block.children].forEach((child) => {
    const cell = document.createElement('div');
    cell.className = 'bento-cell';
    while (child.firstElementChild) cell.append(child.firstElementChild);
    rebuilt.append(cell);
  });
  return rebuilt;
}

export default async function decorate(block) {
  block.replaceWith(buildBentoBox(block));
}
