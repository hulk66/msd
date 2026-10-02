/**
 * msd.com listicle: numbered sections.
 * @param {Element} block The listicle block element
 */
export function buildListicle(block) {
  const rebuilt = document.createElement('div');
  rebuilt.className = 'listicle block';
  [...block.children].forEach((child, i) => {
    const item = document.createElement('div');
    item.className = 'listicle-item';
    const number = document.createElement('div');
    number.className = 'listicle-number';
    number.textContent = String(i + 1);
    item.append(number, ...child.children);
    rebuilt.append(item);
  });
  return rebuilt;
}

export default async function decorate(block) {
  block.replaceWith(buildListicle(block));
}
