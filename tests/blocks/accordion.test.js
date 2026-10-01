// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { buildAccordion } from '../../blocks/accordion/accordion.js';

describe('accordion', () => {
  it('renders a details/summary pair per row, nothing dropped', () => {
    const el = document.createElement('div');
    el.innerHTML = '<div><h3>Q1</h3><p>A1</p></div><div><h3>Q2</h3><p>A2</p></div>';
    const block = buildAccordion(el);
    const items = block.querySelectorAll('details');
    expect(items.length).toBe(2);
    expect(items[0].querySelector('summary').textContent).toBe('Q1');
    expect(items[0].querySelector('.accordion-item-body').textContent).toBe('A1');
    expect(items[1].querySelector('summary').textContent).toBe('Q2');
  });
  it('handles EDS table-shaped rows: first cell is question, rest is answer', () => {
    const el = document.createElement('div');
    el.innerHTML = '<div><div>Q1</div><div>A1</div></div><div><div>Q2</div><div>A2</div></div>';
    const block = buildAccordion(el);
    const items = block.querySelectorAll('details');
    expect(items[0].querySelector('summary').textContent).toBe('Q1');
    expect(items[0].querySelector('.accordion-item-body').textContent).toBe('A1');
    expect(items[1].querySelector('summary').textContent).toBe('Q2');
  });
});
