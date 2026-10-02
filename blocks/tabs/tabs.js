/**
 * msd.com tabs: tab buttons + panels; first tab active by default.
 * @param {Element} block The tabs block element
 */
export function buildTabs(block) {
  const rebuilt = document.createElement('div');
  rebuilt.className = 'tabs block';
  const buttonRow = document.createElement('div');
  buttonRow.className = 'tab-buttons';
  [...block.children].forEach((child, i) => {
    const heading = child.querySelector('h3, h2');
    const button = document.createElement('button');
    button.className = 'tab-button';
    button.textContent = heading?.textContent || `Tab ${i + 1}`;
    button.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    button.dataset.index = String(i);
    buttonRow.append(button);

    const panel = document.createElement('div');
    panel.className = 'tab-panel';
    panel.hidden = i !== 0;
    [...child.children].forEach((c) => {
      if (c !== heading) panel.append(c);
    });
    rebuilt.append(panel);
  });
  rebuilt.prepend(buttonRow);
  return rebuilt;
}

export default async function decorate(block) {
  const rebuilt = buildTabs(block);
  block.replaceWith(rebuilt);
  rebuilt.querySelector('.tab-buttons').addEventListener('click', (e) => {
    const button = e.target.closest('.tab-button');
    if (!button) return;
    const index = Number(button.dataset.index);
    rebuilt.querySelectorAll('.tab-button').forEach((b, i) => {
      b.setAttribute('aria-selected', String(i === index));
    });
    rebuilt.querySelectorAll('.tab-panel').forEach((p, i) => {
      p.hidden = i !== index;
    });
  });
}
