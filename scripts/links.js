// Shared block helper: Google Docs cells don't auto-link URLs, so link
// cells arrive as plain text. This converts URL-only cells into anchors.
// A following cell (or the nearest heading) provides the link label.

export function isPlainUrl(text) {
  return /^https?:\/\/\S+$/.test((text || '').trim());
}

/**
 * Converts URL-only cells inside `scope` into anchors.
 * @param {Element} scope container whose direct div/p children are cells
 * @param {object} [opts]
 * @param {string} [opts.label] fixed label for the anchor
 * @param {boolean} [opts.consumeNext] use the next cell's text as the label
 *   and remove that cell (default true)
 */
export function wrapUrlCells(scope, { label, consumeNext = true } = {}) {
  const cells = [...scope.querySelectorAll('div, p')];
  cells.forEach((cell, i) => {
    const text = cell.textContent.trim();
    if (!isPlainUrl(text) || cell.querySelector('a')) return;
    const a = document.createElement('a');
    a.href = text;
    let anchorText = label || 'Learn more';
    if (!label && consumeNext) {
      const next = cells[i + 1];
      if (next && !isPlainUrl(next.textContent.trim())) {
        anchorText = next.textContent.trim();
        next.remove();
      }
    }
    a.textContent = anchorText;
    cell.textContent = '';
    cell.append(a);
  });
}

/**
 * Makes `el` fully clickable: attaches a click handler navigating to
 * `href` (unless a real link was clicked) and marks it as a link.
 * @param {Element} el
 * @param {string} href
 */
export function makeClickable(el, href) {
  el.dataset.href = href;
  el.style.cursor = 'pointer';
  el.setAttribute('role', 'link');
  el.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    window.location.href = href;
  });
}
