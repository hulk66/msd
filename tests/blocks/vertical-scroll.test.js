// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { buildVerticalScroll } from '../../blocks/vertical-scroll/vertical-scroll.js';

describe('vertical-scroll', () => {
  it('renders scroll sections with heading and text, nothing dropped', () => {
    const el = document.createElement('div');
    el.innerHTML = '<div><h3>Section One</h3><p>Body one</p></div><div><h3>Section Two</h3><p>Body two</p></div>';
    const block = buildVerticalScroll(el);
    const sections = block.querySelectorAll('.scroll-section');
    expect(sections.length).toBe(2);
    expect(sections[0].querySelector('h3').textContent).toBe('Section One');
    expect(sections[1].querySelector('p').textContent).toBe('Body two');
  });
});
