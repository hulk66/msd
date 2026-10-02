/**
 * msd.com article-images: figure gallery with alt-text captions.
 * @param {Element} block The article-images block element
 */
export function buildArticleImages(block) {
  const rebuilt = document.createElement('div');
  rebuilt.className = 'article-images block';
  block.querySelectorAll('picture').forEach((picture) => {
    const figure = document.createElement('figure');
    const img = picture.querySelector('img');
    figure.append(picture);
    if (img?.getAttribute('alt')) {
      const caption = document.createElement('figcaption');
      caption.textContent = img.getAttribute('alt');
      figure.append(caption);
    }
    rebuilt.append(figure);
  });
  return rebuilt;
}

export default async function decorate(block) {
  block.replaceWith(buildArticleImages(block));
}
