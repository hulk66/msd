// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { buildTabs } from '../../blocks/tabs/tabs.js';

describe('tabs', () => {
  it('renders tab buttons and panels, nothing dropped', () => {
    const el = document.createElement('div');
    el.innerHTML = '<div><h3>Overview</h3><p>Overview text</p></div>'
      + '<div><h3>Details</h3><p>Details text</p></div>';
    const block = buildTabs(el);
    const buttons = block.querySelectorAll('.tab-button');
    const panels = block.querySelectorAll('.tab-panel');
    expect(buttons.length).toBe(2);
    expect(panels.length).toBe(2);
    expect(buttons[0].textContent).toBe('Overview');
    expect(panels[0].textContent).toContain('Overview text');
    expect(panels[1].textContent).toContain('Details text');
  });
});
