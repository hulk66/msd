import { describe, it, expect } from 'vitest';
import { buildDocPlan, planSync } from './create-docs.js';

const model = {
  slug: 'about', title: 'About', description: 'd',
  sections: [
    {
      blocks: [{ name: 'hero', variant: ['full'], rows: [['img.jpg', 'Headline', 'Sub', '/x']] }],
      plain: [{ type: 'paragraph', text: 'Body text' }],
      metadata: { style: 'dark' },
    },
    {
      blocks: [{ name: 'cards', variant: [], rows: [['a.jpg', 'A', 'da', '/a'], ['b.jpg', 'B', 'db', '/b']] }],
      plain: [{ type: 'image', src: 'pic.jpg', alt: 'Pic' }],
      metadata: {},
    },
  ],
};

describe('buildDocPlan (C1: real EDS block tables, I1: images, I2: metadata)', () => {
  const plan = buildDocPlan(model);

  it('emits page metadata as a key/value table EDS reads', () => {
    const meta = plan.find((s) => s.type === 'table' && s.rows.some((r) => r[0] === 'title'));
    expect(meta).toBeTruthy();
    expect(meta.rows.some((r) => r[0] === 'description')).toBe(true);
  });

  it('emits one table per block with header row = block name + variants', () => {
    const hero = plan.find((s) => s.type === 'table' && s.header === 'hero (full)');
    expect(hero).toBeTruthy();
    expect(hero.rows).toEqual([['img.jpg', 'Headline', 'Sub', '/x']]);
    const cards = plan.find((s) => s.type === 'table' && s.header === 'cards');
    expect(cards.rows.length).toBe(2); // C3: one row per card, not mushed
  });

  it('emits images as inline image steps, not text placeholders', () => {
    expect(plan.some((s) => s.type === 'image' && s.url === 'pic.jpg' && s.alt === 'Pic')).toBe(true);
    expect(plan.some((s) => s.type === 'text' && s.text.includes('[image:'))).toBe(false);
  });

  it('emits section metadata tables and preserves section order', () => {
    const idx = (pred) => plan.findIndex(pred);
    const bodyText = idx((s) => s.type === 'text' && s.text.includes('Body text'));
    const cardsTable = idx((s) => s.type === 'table' && s.header === 'cards');
    expect(cardsTable).toBeGreaterThan(bodyText); // section 2 after section 1 content
    const styleRow = plan.find((s) => s.type === 'table' && s.rows.some((r) => r[0] === 'style'));
    expect(styleRow).toBeTruthy();
  });
});

describe('planSync is idempotent', () => {
  it('creates when slug unknown, updates when known', () => {
    const create = planSync({ slug: 'a' }, {});
    const update = planSync({ slug: 'a' }, { a: { fileId: 'f1' } });
    expect(create.action).toBe('create');
    expect(update.action).toBe('update');
    expect(update.fileId).toBe('f1');
  });
});
