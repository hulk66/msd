/**
 * msd.com modal: details-based disclosure (content-only; no JS overlay).
 * @param {Element} block The modal block element
 */
export function buildModal(block) {
  const rebuilt = document.createElement('div');
  rebuilt.className = 'modal block';
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  const heading = block.querySelector('h1, h2, h3, h4');
  summary.textContent = heading?.textContent || block.firstElementChild?.textContent || 'More information';
  const body = document.createElement('div');
  body.className = 'modal-body';
  [...block.children].forEach((c) => {
    if (c !== heading) body.append(c);
  });
  details.append(summary, body);
  rebuilt.append(details);
  return rebuilt;
}

export default async function decorate(block) {
  block.replaceWith(buildModal(block));
}
