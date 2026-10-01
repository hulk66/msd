/**
 * msd.com statistics: stat grid, first paragraph = number, second = label.
 * @param {Element} block The statistics block element
 */
export function buildStatistics(block) {
  const rebuilt = document.createElement('div');
  rebuilt.className = 'statistics block';
  [...block.children].forEach((child) => {
    const stat = document.createElement('div');
    stat.className = 'stat';
    const paras = child.querySelectorAll('p');
    const number = document.createElement('div');
    number.className = 'stat-number';
    number.textContent = paras[0]?.textContent || '';
    const label = document.createElement('div');
    label.className = 'stat-label';
    label.textContent = paras[1]?.textContent || '';
    stat.append(number, label);
    rebuilt.append(stat);
  });
  return rebuilt;
}

export default async function decorate(block) {
  block.replaceWith(buildStatistics(block));
}
