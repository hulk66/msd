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
      { type: 'image', src: 'https://www.msd.com/a.png', alt: 'A' },
      { type: 'list', items: ['one', 'two'] },
    ]);
  });
  it('extracts lazy-loaded image urls', () => {
    const ops = htmlToDocOps('<picture><source data-srcset="m.jpg?w=375"><img data-src="big.jpg" alt="B"></picture>');
    expect(ops).toEqual([{ type: 'image', src: 'https://www.msd.com/big.jpg', alt: 'B' }]);
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

describe('image url absolutization', () => {
  it('makes relative image urls absolute against the WP host', () => {
    const ops = htmlToDocOps('<img src="/wp-content/uploads/a.jpg" alt="A">');
    expect(ops).toEqual([{ type: 'image', src: 'https://www.msd.com/wp-content/uploads/a.jpg', alt: 'A' }]);
  });
  it('leaves absolute urls untouched', () => {
    const ops = htmlToDocOps('<img src="https://cdn.example.com/a.jpg">');
    expect(ops[0].src).toBe('https://cdn.example.com/a.jpg');
  });
});

describe('per-block extractors preserve block-internal content (C3)', () => {
  it('cards: one row per card with image, title, text, link', () => {
    const html = `<div class="mco-content-teaser-cards">
      <div class="card"><img src="a.jpg"><h3>Card A</h3><p>Desc A</p><a href="/a">More</a></div>
      <div class="card"><img src="b.jpg"><h3>Card B</h3><p>Desc B</p><a href="/b">More</a></div>
      <div class="card"><img src="c.jpg"><h3>Card C</h3><p>Desc C</p><a href="/c">More</a></div>
    </div>`;
    const model = convertPage({ slug: 's', title: 'T', excerpt: '', html });
    const rows = model.sections[0].blocks[0].rows;
    expect(rows.length).toBe(3);
    expect(rows[0]).toEqual(['https://www.msd.com/a.jpg', 'Card A', 'Desc A', '/a']);
    expect(rows[2][1]).toBe('Card C');
  });

  it('accordion: one row per item with question and answer', () => {
    const html = `<div class="mco-b6-accordion-list">
      <div class="item"><h3>Q1</h3><p>A1</p></div>
      <div class="item"><h3>Q2</h3><p>A2</p></div>
    </div>`;
    const model = convertPage({ slug: 's', title: 'T', excerpt: '', html });
    const rows = model.sections[0].blocks[0].rows;
    expect(rows.length).toBe(2);
    expect(rows[0]).toEqual(['Q1', 'A1']);
    expect(rows[1][0]).toBe('Q2');
  });

  it('statistics: one row per stat with number and label', () => {
    const html = `<div class="mco-statistics-content">
      <div class="stat"><p>140</p><p>years</p></div>
      <div class="stat"><p>70+</p><p>countries</p></div>
    </div>`;
    const model = convertPage({ slug: 's', title: 'T', excerpt: '', html });
    const rows = model.sections[0].blocks[0].rows;
    expect(rows).toEqual([['140', 'years'], ['70+', 'countries']]);
  });

  it('columns: one row per column', () => {
    const html = `<div class="mco-three-column-content-block">
      <div class="column"><img src="1.jpg"><h3>One</h3><p>d1</p><a href="/1">l1</a></div>
      <div class="column"><img src="2.jpg"><h3>Two</h3><p>d2</p><a href="/2">l2</a></div>
      <div class="column"><img src="3.jpg"><h3>Three</h3><p>d3</p><a href="/3">l3</a></div>
    </div>`;
    const model = convertPage({ slug: 's', title: 'T', excerpt: '', html });
    const rows = model.sections[0].blocks[0].rows;
    expect(rows.length).toBe(3);
    expect(rows[0]).toEqual(['https://www.msd.com/1.jpg', 'One', 'd1', '/1']);
  });

  it('hero: image, heading, copy, cta in one row', () => {
    const html = `<div class="mco-b2-hero-block full">
      <picture><img src="hero.jpg"></picture>
      <h1>Title</h1><p>Sub</p><a href="/go">Go</a>
    </div>`;
    const model = convertPage({ slug: 's', title: 'T', excerpt: '', html });
    const rows = model.sections[0].blocks[0].rows;
    expect(rows).toEqual([['https://www.msd.com/hero.jpg', 'Title', 'Sub', '/go']]);
  });

  it('quote: quote and attribution', () => {
    const html = `<div class="mco-article-quote"><p>Invention is in our DNA.</p><p>Jane Doe, Chief Scientist</p></div>`;
    const model = convertPage({ slug: 's', title: 'T', excerpt: '', html });
    const rows = model.sections[0].blocks[0].rows;
    expect(rows).toEqual([['Invention is in our DNA.', 'Jane Doe, Chief Scientist']]);
  });

  it('related-links: one row per link', () => {
    const html = `<div class="mco-b7-related-links"><ul><li><a href="/a">A</a></li><li><a href="/b">B</a></li></ul></div>`;
    const model = convertPage({ slug: 's', title: 'T', excerpt: '', html });
    const rows = model.sections[0].blocks[0].rows;
    expect(rows).toEqual([['A', '/a'], ['B', '/b']]);
  });

  it('buttons: one row per button', () => {
    const html = `<div class="mco-f2-buttons-link"><p><a href="/a">Primary</a></p><p><a href="/b">Secondary</a></p></div>`;
    const model = convertPage({ slug: 's', title: 'T', excerpt: '', html });
    const rows = model.sections[0].blocks[0].rows;
    expect(rows).toEqual([['Primary', '/a'], ['Secondary', '/b']]);
  });

  it('download-list: one row per file', () => {
    const html = `<div class="mco-g5-download-list"><ul><li><a href="/r.pdf">Report</a></li></ul></div>`;
    const model = convertPage({ slug: 's', title: 'T', excerpt: '', html });
    const rows = model.sections[0].blocks[0].rows;
    expect(rows).toEqual([['Report', '/r.pdf']]);
  });

  it('title: heading text', () => {
    const html = `<div class="mco-g5-title-container"><h2>Explore</h2></div>`;
    const model = convertPage({ slug: 's', title: 'T', excerpt: '', html });
    const rows = model.sections[0].blocks[0].rows;
    expect(rows).toEqual([['Explore']]);
  });

  it('content-block: image, heading, text, link', () => {
    const html = `<div class="mco-b5-content-block right">
      <picture><img src="cb.jpg"></picture><h2>Head</h2><p>Body copy</p><a href="/x">Read</a>
    </div>`;
    const model = convertPage({ slug: 's', title: 'T', excerpt: '', html });
    const rows = model.sections[0].blocks[0].rows;
    expect(rows).toEqual([['https://www.msd.com/cb.jpg', 'Head', 'Body copy', '/x']]);
  });
});
