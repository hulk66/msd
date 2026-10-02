/**
 * msd.com timeline: year-marked entries.
 * @param {Element} block The timeline block element
 */
export function buildTimeline(block) {
  const rebuilt = document.createElement('div');
  rebuilt.className = 'timeline block';
  [...block.children].forEach((child) => {
    const entry = document.createElement('div');
    entry.className = 'timeline-entry';
    const heading = child.querySelector('h3, h2, [class*="year"]');
    const year = document.createElement('div');
    year.className = 'timeline-year';
    year.textContent = heading?.textContent || '';
    const body = document.createElement('div');
    body.className = 'timeline-text';
    [...child.children].forEach((c) => {
      if (c !== heading) body.append(c);
    });
    entry.append(year, body);
    rebuilt.append(entry);
  });
  return rebuilt;
}

export default async function decorate(block) {
  block.replaceWith(buildTimeline(block));
}
