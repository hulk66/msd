/**
 * msd.com buttons (f2): CTA button row. Cells arrive as label|URL pairs —
 * converted to button anchors.
 * @param {Element} block The buttons block element
 */
export function buildButtons(block) {
  const rebuilt = document.createElement('div');
  rebuilt.className = 'buttons block';
  [...block.children].forEach((row) => {
    const cells = [...row.querySelectorAll(':scope > div')];
    if (cells.length === 2 && /^https?:\/\/\S+$/.test(cells[1].textContent.trim()) && !cells[1].querySelector('a')) {
      const href = cells[1].textContent.trim();
      const label = cells[0].textContent.trim();
      cells[1].innerHTML = `<a href="${href}">${label}</a>`;
    }
    rebuilt.append(row);
  });
  rebuilt.querySelectorAll('a[href]').forEach((a) => a.classList.add('button'));
  return rebuilt;
}

export default async function decorate(block) {
  block.replaceWith(buildButtons(block));
}
