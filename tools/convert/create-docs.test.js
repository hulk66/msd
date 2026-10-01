import { describe, it, expect } from 'vitest';
import { docModelToRequests, planSync } from './create-docs.js';

describe('docModelToRequests', () => {
  it('emits title, metadata, blocks and plain ops in order', () => {
    const model = {
      slug: 'about', title: 'About', description: 'd',
      sections: [
        { blocks: [{ name: 'hero', variant: ['full'], rows: [['Headline', 'Sub']] }], plain: [], metadata: {} },
        { blocks: [], plain: [{ type: 'heading', level: 2, text: 'Sec' }, { type: 'paragraph', text: 'Body' }], metadata: {} },
      ],
    };
    const reqs = docModelToRequests(model);
    const text = reqs.filter((r) => r.insertText).map((r) => r.insertText.text).join('');
    expect(text).toContain('About');
    expect(text).toContain('hero (full)');
    expect(text).toContain('Sec');
    expect(text).toContain('Body');
  });
  it('renders block rows as a table request', () => {
    const model = {
      slug: 'a', title: 'A', description: '',
      sections: [{ blocks: [{ name: 'cards', variant: [], rows: [['img|Title|Desc|Link']] }], plain: [], metadata: {} }],
    };
    const reqs = docModelToRequests(model);
    expect(reqs.some((r) => r.createTableRequest)).toBe(true);
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
