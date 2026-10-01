/**
 * msd.com accordion (b6): details/summary per row.
 * @param {Element} block The accordion block element
 */
export function buildAccordion(block) {
  const rebuilt = document.createElement('div');
  rebuilt.className = 'accordion block';
  [...block.children].forEach((child) => {
    const summary = child.querySelector('h1, h2, h3, h4, h5, h6');
    const details = document.createElement('details');
    const sum = document.createElement('summary');
    sum.textContent = summary ? summary.textContent : child.firstElementChild?.textContent || '';
    const body = document.createElement('div');
    body.className = 'accordion-item-body';
    [...child.children].forEach((c) => {
      if (c !== summary) body.append(c);
    });
    details.append(sum, body);
    rebuilt.append(details);
  });
  return rebuilt;
}

export default async function decorate(block) {
  block.replaceWith(buildAccordion(block));
}
