/**
 * msd.com contact-banner (contact-us-banner): image + contact info + link.
 * Content-only: renders contact details, never a form.
 * @param {Element} block The contact-banner block element
 */
export function buildContactBanner(block) {
  const rebuilt = document.createElement('div');
  rebuilt.className = 'contact-banner block';

  const picture = block.querySelector('picture');
  if (picture) {
    const imgSide = document.createElement('div');
    imgSide.className = 'cb-image';
    imgSide.append(picture);
    rebuilt.append(imgSide);
  }

  const copy = document.createElement('div');
  copy.className = 'cb-copy';
  [...block.children].forEach((child) => {
    if (child !== picture) copy.append(child);
  });
  rebuilt.append(copy);
  return rebuilt;
}

export default async function decorate(block) {
  block.replaceWith(buildContactBanner(block));
}
