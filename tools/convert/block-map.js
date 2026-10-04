// Block map: WordPress theme block families -> EDS block names.
// Source: inventory/block-library.md (theme registry, Task 2).
// q4-* families are dynamic investor feeds, excluded per spec.

const FAMILY_MAP = {
  // hero family
  'b2-hero-block': 'hero',
  'article-hero-block': 'hero',
  'f1-article-hero': 'hero',
  'text-hero-block': 'hero',
  'featured-banner': 'hero',
  'stock-ticker-hero-block': 'hero',
  'hero-block': 'hero',
  // cards family
  'content-teaser-cards': 'cards',
  'f3-more-stories': 'cards',
  'feature-stories': 'cards',
  'e2-all-stories': 'cards',
  'b13-3-card-block': 'cards',
  'featured-stories': 'cards',
  'b24-homepage-no-hero-block': 'cards',
  // content block
  'b5-content-block': 'content-block',
  'content-block': 'content-block',
  // title
  'title-block': 'title',
  'g5-title-container': 'title',
  // bio
  'f9-bio-highlights': 'bio-highlights',
  // accordion
  'b6-accordion-list': 'accordion',
  // statistics
  'statistics-content': 'statistics',
  'article-statistics-content': 'statistics',
  // tabs
  'tabs-block': 'tabs',
  'tab-block': 'tabs',
  // columns
  'three-column-content-block': 'columns',
  'two-column-content-block': 'columns',
  'four-column-content-block': 'columns',
  'two-column-video': 'columns',
  // article media
  'article-images': 'article-images',
  // video
  'b25-homepage-light-text-over-dark-video': 'video',
  'hero-video-player': 'video',
  // lists and links
  'b7-related-links': 'related-links',
  'g5-download-list': 'download-list',
  'f7-listicle': 'listicle',
  // media carousels
  'f11-article-slideshow': 'slideshow',
  'carousel': 'slideshow',
  // quote
  'article-quote': 'quote',
  // contact
  'contact-us-banner-block': 'contact-banner',
  'g4-contact-list': 'contact-banner',
  // misc
  'bento-box': 'bento-box',
  'timeline': 'timeline',
  'timeline-year': 'timeline',
  'f2-buttons-link': 'buttons',
  'f6-vertical-in-page-scrolling': 'vertical-scroll',
  'modal-block': 'modal',
};

export const EDS_BLOCKS = new Set(Object.values(FAMILY_MAP));

// Matches the family key inside an mco- class token, longest match wins.
const FAMILY_RES = Object.keys(FAMILY_MAP)
  .sort((a, b) => b.length - a.length)
  .map((fam) => [new RegExp(`mco-${fam.replace(/-/g, '\\-')}(?:-block)?(?![a-z0-9-])`, 'i'), fam]);

export function detectBlockName(classToken) {
  for (const [re, fam] of FAMILY_RES) {
    if (re.test(classToken)) return FAMILY_MAP[fam];
  }
  return null;
}
