// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { buildModal } from '../../blocks/modal/modal.js';

describe('modal', () => {
  it('renders a details-based disclosure with heading and body', () => {
    const el = document.createElement('div');
    el.innerHTML = '<h3>More info</h3><p>Hidden details</p>';
    const block = buildModal(el);
    const details = block.querySelector('details');
    expect(details.querySelector('summary').textContent).toBe('More info');
    expect(details.querySelector('.modal-body').textContent).toBe('Hidden details');
  });
});
