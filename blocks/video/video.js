/**
 * msd.com video: poster + copy + embed link. Content-only: renders a link,
 * never an auto-playing third-party embed.
 * @param {Element} block The video block element
 */
export function buildVideo(block) {
  const rebuilt = document.createElement('div');
  rebuilt.className = 'video block';

  const poster = block.querySelector('picture');
  if (poster) {
    const p = document.createElement('div');
    p.className = 'video-poster';
    p.append(poster);
    rebuilt.append(p);
  }

  const copy = document.createElement('div');
  copy.className = 'video-copy';
  [...block.children].forEach((child) => {
    if (child !== poster) copy.append(child);
  });
  const link = copy.querySelector('a[href]');
  if (link) {
    const embed = document.createElement('div');
    embed.className = 'video-embed';
    embed.append(link);
    rebuilt.append(embed);
  }
  rebuilt.append(copy);
  return rebuilt;
}

export default async function decorate(block) {
  block.replaceWith(buildVideo(block));
}
