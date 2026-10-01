// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { buildContactBanner } from '../../blocks/contact-banner/contact-banner.js';

describe('contact-banner', () => {
  it('renders image, heading, text, link; nothing dropped', () => {
    const el = document.createElement('div');
    el.innerHTML = '<picture><img src="/c.jpg"></picture><h2>Contact us</h2><p>We reply within 2 days</p><a href="/contact">Contact</a>';
    const block = buildContactBanner(el);
    expect(block.querySelector('.cb-image img').getAttribute('src')).toBe('/c.jpg');
    expect(block.querySelector('.cb-copy h2').textContent).toBe('Contact us');
    expect(block.querySelector('.cb-copy p').textContent).toBe('We reply within 2 days');
    expect(block.querySelector('.cb-copy a').getAttribute('href')).toBe('/contact');
  });
  it('renders without image', () => {
    const el = document.createElement('div');
    el.innerHTML = '<h2>Contact us</h2><p>Info</p>';
    const block = buildContactBanner(el);
    expect(block.querySelector('.cb-image')).toBe(null);
    expect(block.querySelector('.cb-copy h2').textContent).toBe('Contact us');
  });
});
