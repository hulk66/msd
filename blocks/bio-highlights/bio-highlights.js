/**
 * msd.com bio-highlights (f9): leadership bio cards.
 * @param {Element} block The bio-highlights block element
 */
export function buildBioHighlights(block) {
  const rebuilt = document.createElement('div');
  rebuilt.className = 'bio-highlights block';
  [...block.children].forEach((child) => {
    const bio = document.createElement('div');
    bio.className = 'bio';
    const cells = [...child.children];
    const img = child.querySelector('img');
    const heading = child.querySelector('h3, h2');
    if (img || heading) {
      if (img) {
        const im = document.createElement('div');
        im.className = 'bio-image';
        im.append(img);
        bio.append(im);
      }
      const name = document.createElement('div');
      name.className = 'bio-name';
      name.textContent = heading?.textContent || '';
      const role = document.createElement('div');
      role.className = 'bio-role';
      [...child.children].forEach((c) => {
        if (c !== img && c !== heading) role.append(c);
      });
      bio.append(name, role);
    } else if (cells.length >= 2) {
      const im = document.createElement('div');
      im.className = 'bio-image';
      if (cells[0].textContent.trim().match(/\.(jpg|png|webp)/)) {
        const image = document.createElement('img');
        image.src = cells[0].textContent.trim();
        im.append(image);
        bio.append(im);
      }
      const name = document.createElement('div');
      name.className = 'bio-name';
      name.textContent = cells[1].textContent.trim();
      const role = document.createElement('div');
      role.className = 'bio-role';
      role.textContent = cells.slice(2).map((c) => c.textContent.trim()).join(' ');
      bio.append(name, role);
    }
    rebuilt.append(bio);
  });
  return rebuilt;
}

export default async function decorate(block) {
  block.replaceWith(buildBioHighlights(block));
}
