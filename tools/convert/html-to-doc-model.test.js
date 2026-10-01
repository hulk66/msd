import { describe, it, expect } from 'vitest';
import { convertPage, detectBlock, htmlToDocOps } from './html-to-doc-model.js';
import { EDS_BLOCKS } from './block-map.js';

describe('detectBlock', () => {
  it('detects hero from mco theme class', () => {
    expect(detectBlock('<div class="mco-b2-hero-block full mccberg-block mb-2"><h1>Hi</h1></div>')).toBe('hero');
  });
  it('detects content-block (b5)', () => {
    expect(detectBlock('<div class="mco-b5-content-block mccberg-block"><p>x</p></div>')).toBe('content-block');
  });
  it('detects accordion list', () => {
    expect(detectBlock('<div class="mco-b6-accordion-list-block"><p>x</p></div>')).toBe('accordion');
  });
  it('returns null for plain content', () => {
    expect(detectBlock('<p>Just text</p>')).toBe(null);
  });
  it('never returns a block name missing from the library', () => {
    const samples = [
      '<div class="mco-b2-hero-block full"><p>x</p></div>',
      '<div class="mco-b5-content-block negative right"><p>x</p></div>',
      '<div class="mco-three-column-content-block"><p>x</p></div>',
      '<div class="mco-content-teaser-cards"><p>x</p></div>',
      '<div class="mco-b6-accordion-list"><p>x</p></div>',
      '<div class="mco-article-quote"><p>x</p></div>',
    ];
    for (const html of samples) {
      const name = detectBlock(html);
      expect(EDS_BLOCKS.has(name)).toBe(true);
    }
  });
});

describe('htmlToDocOps', () => {
  it('converts headings, paragraphs, images, lists', () => {
    const ops = htmlToDocOps(
      '<h2>T</h2><p>Hello</p><img src="a.png" alt="A"><ul><li>one</li><li>two</li></ul>',
    );
    expect(ops).toEqual([
      { type: 'heading', level: 2, text: 'T' },
      { type: 'paragraph', text: 'Hello' },
      { type: 'image', src: 'a.png', alt: 'A' },
      { type: 'list', items: ['one', 'two'] },
    ]);
  });
  it('extracts lazy-loaded image urls', () => {
    const ops = htmlToDocOps('<picture><source data-srcset="m.jpg?w=375"><img data-src="big.jpg" alt="B"></picture>');
    expect(ops).toEqual([{ type: 'image', src: 'big.jpg', alt: 'B' }]);
  });
});

describe('convertPage preserves content', () => {
  it('keeps every top-level element accounted for', () => {
    const html = '<div class="mco-b2-hero-block"><h1>H</h1></div><p>body</p><ul><li>x</li></ul>';
    const model = convertPage({ slug: 's', title: 'T', excerpt: 'e', html });
    const blockEls = model.sections.flatMap((s) => s.blocks).length;
    const plainOps = model.sections.flatMap((s) => s.plain).length;
    expect(blockEls).toBe(1); // hero block
    expect(plainOps).toBe(2); // p + ul
    expect(model.slug).toBe('s');
    expect(model.title).toBe('T');
    expect(model.description).toBe('e');
  });
  it('starts a new section at an hr divider', () => {
    const html = '<p>a</p><hr><p>b</p>';
    const model = convertPage({ slug: 's', title: 'T', excerpt: '', html });
    expect(model.sections.length).toBe(2);
  });
  it('captures block variants as modifiers', () => {
    const html = '<div class="mco-b5-content-block negative right"><p>x</p></div>';
    const model = convertPage({ slug: 's', title: 'T', excerpt: '', html });
    expect(model.sections[0].blocks[0].variant).toContain('negative');
    expect(model.sections[0].blocks[0].variant).toContain('right');
  });
});
