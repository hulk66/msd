/**
 * msd.com cards: one .card per source row (image, title, text, link).
 * @param {Element} block The cards block element
 */
export function buildCards(block) {
  const rebuilt = document.createElement('div');
  rebuilt.className = 'cards block';
  [...block.children].forEach((child) => {
    const card = document.createElement('div');
    card.className = 'card';
    while (child.firstElementChild) card.append(child.firstElementChild);
    rebuilt.append(card);
  });
  return rebuilt;
}

export default async function decorate(block) {
  block.replaceWith(buildCards(block));
}
