// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { buildTimeline } from '../../blocks/timeline/timeline.js';

describe('timeline', () => {
  it('renders year-marked entries, nothing dropped', () => {
    const el = document.createElement('div');
    el.innerHTML = '<div><h3>1891</h3><p>Founded</p></div><div><h3>2009</h3><p>Merged</p></div>';
    const block = buildTimeline(el);
    const entries = block.querySelectorAll('.timeline-entry');
    expect(entries.length).toBe(2);
    expect(entries[0].querySelector('.timeline-year').textContent).toBe('1891');
    expect(entries[0].querySelector('.timeline-text').textContent).toBe('Founded');
    expect(entries[1].querySelector('.timeline-year').textContent).toBe('2009');
  });
});
