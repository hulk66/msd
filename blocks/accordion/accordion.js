/**
 * msd.com accordion (b6): details/summary per row.
 * @param {Element} block The accordion block element
 */
export function buildAccordion(block) {
  const rebuilt = document.createElement('div');
  rebuilt.className = 'accordion block';
  [...block.children].forEach((child) => {
    const details = document.createElement('details');
    const sum = document.createElement('summary');
    const body = document.createElement('div');
    body.className = 'accordion-item-body';

    // EDS delivers table rows: first cell = question, remaining cells = answer.
    // WordPress-shaped rows carry a heading element instead.
    const cells = [...child.children];
    const heading = child.querySelector('h1, h2, h3, h4, h5, h6, summary');
    if (heading) {
      sum.textContent = heading.textContent;
      [...child.children].forEach((c) => {
        if (c !== heading) body.append(c);
      });
    } else if (cells.length > 1) {
      sum.textContent = cells[0].textContent.trim();
      cells.slice(1).forEach((c) => body.append(c));
    } else {
      sum.textContent = child.textContent.trim();
    }
    details.append(sum, body);
    rebuilt.append(details);
  });
  return rebuilt;
}

export default async function decorate(block) {
  block.replaceWith(buildAccordion(block));
}
