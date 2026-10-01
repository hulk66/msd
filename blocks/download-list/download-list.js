/**
 * msd.com download-list (g5): file links marked for download.
 * @param {Element} block The download-list block element
 */
export function buildDownloadList(block) {
  const rebuilt = document.createElement('div');
  rebuilt.className = 'download-list block';
  block.querySelectorAll('a[href]').forEach((a) => {
    a.setAttribute('download', '');
  });
  while (block.firstElementChild) rebuilt.append(block.firstElementChild);
  return rebuilt;
}

export default async function decorate(block) {
  block.replaceWith(buildDownloadList(block));
}
