/**
 * msd.com buttons (f2): CTA button row.
 * @param {Element} block The buttons block element
 */
export function buildButtons(block) {
  const rebuilt = document.createElement('div');
  rebuilt.className = 'buttons block';
  block.querySelectorAll('a[href]').forEach((a) => {
    a.classList.add('button');
  });
  while (block.firstElementChild) rebuilt.append(block.firstElementChild);
  return rebuilt;
}

export default async function decorate(block) {
  block.replaceWith(buildButtons(block));
}
