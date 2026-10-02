/**
 * msd.com vertical-scroll: stacked full sections.
 * @param {Element} block The vertical-scroll block element
 */
export function buildVerticalScroll(block) {
  const rebuilt = document.createElement('div');
  rebuilt.className = 'vertical-scroll block';
  [...block.children].forEach((child) => {
    const section = document.createElement('div');
    section.className = 'scroll-section';
    while (child.firstElementChild) section.append(child.firstElementChild);
    rebuilt.append(section);
  });
  return rebuilt;
}

export default async function decorate(block) {
  block.replaceWith(buildVerticalScroll(block));
}
