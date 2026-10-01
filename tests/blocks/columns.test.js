// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { buildColumns } from '../../blocks/columns/columns.js';

describe('columns', () => {
  it('renders one column per row, nothing dropped', () => {
    const el = document.createElement('div');
    el.innerHTML = '<div><img src="/1.jpg"><p>One</p></div><div><img src="/2.jpg"><p>Two</p></div><div><p>Three</p></div>';
    const block = buildColumns(el);
    expect(block.querySelectorAll('.col').length).toBe(3);
    expect(block.textContent).toContain('Three');
    expect(block.querySelectorAll('.col img').length).toBe(2);
  });
});
