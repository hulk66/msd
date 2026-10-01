import { describe, it, expect } from 'vitest';
import { classifyComponent } from './crawl-site.js';

describe('classifyComponent', () => {
  it('classifies a hero section', () => {
    const el = { tagName: 'DIV', className: 'wp-block-cover hero-banner', querySelector: () => null };
    expect(classifyComponent(el)).toBe('hero');
  });
  it('classifies a card grid', () => {
    const el = { tagName: 'UL', className: 'cards-grid', querySelector: () => null };
    expect(classifyComponent(el)).toBe('cards');
  });
  it('falls back to plain for unrecognized content', () => {
    const el = { tagName: 'P', className: '', querySelector: () => null };
    expect(classifyComponent(el)).toBe('plain');
  });
});
