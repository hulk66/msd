/**
 * msd.com quote (article-quote): blockquote with attribution.
 * @param {Element} block The quote block element
 */
export function buildQuote(block) {
  const rebuilt = document.createElement('div');
  rebuilt.className = 'quote block';
  const quote = document.createElement('blockquote');
  const cite = document.createElement('cite');
  const paras = [...block.querySelectorAll('p')];
  paras.forEach((p, i) => {
    if (i === paras.length - 1 && paras.length > 1) {
      cite.textContent = p.textContent;
    } else {
      const t = document.createElement('p');
      t.textContent = p.textContent;
      quote.append(t);
    }
  });
  rebuilt.append(quote);
  if (cite.textContent) rebuilt.append(cite);
  return rebuilt;
}

export default async function decorate(block) {
  block.replaceWith(buildQuote(block));
}
