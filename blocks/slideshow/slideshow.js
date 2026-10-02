/**
 * msd.com slideshow: slides with prev/next controls; first visible.
 * @param {Element} block The slideshow block element
 */
export function buildSlideshow(block) {
  const rebuilt = document.createElement('div');
  rebuilt.className = 'slideshow block';
  block.querySelectorAll('picture').forEach((picture, i) => {
    const slide = document.createElement('div');
    slide.className = 'slide';
    slide.hidden = i !== 0;
    slide.append(picture);
    rebuilt.append(slide);
  });
  const prev = document.createElement('button');
  prev.className = 'slide-prev';
  prev.setAttribute('aria-label', 'Previous slide');
  prev.textContent = '‹';
  const next = document.createElement('button');
  next.className = 'slide-next';
  next.setAttribute('aria-label', 'Next slide');
  next.textContent = '›';
  rebuilt.append(prev, next);
  return rebuilt;
}

export default async function decorate(block) {
  const rebuilt = buildSlideshow(block);
  block.replaceWith(rebuilt);
  const slides = [...rebuilt.querySelectorAll('.slide')];
  let current = 0;
  const show = (i) => {
    current = (i + slides.length) % slides.length;
    slides.forEach((s, si) => { s.hidden = si !== current; });
  };
  rebuilt.querySelector('.slide-prev').addEventListener('click', () => show(current - 1));
  rebuilt.querySelector('.slide-next').addEventListener('click', () => show(current + 1));
}
