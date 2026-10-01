/**
 * msd.com columns: one .col per source row.
 * @param {Element} block The columns block element
 */
export function buildColumns(block) {
  const rebuilt = document.createElement('div');
  rebuilt.className = 'columns block';
  [...block.children].forEach((child) => {
    const col = document.createElement('div');
    col.className = 'col';
    while (child.firstElementChild) col.append(child.firstElementChild);
    rebuilt.append(col);
  });
  return rebuilt;
}

export default async function decorate(block) {
  block.replaceWith(buildColumns(block));
}
