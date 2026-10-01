// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { buildTitle } from '../../blocks/title/title.js';
import { buildQuote } from '../../blocks/quote/quote.js';
import { buildRelatedLinks } from '../../blocks/related-links/related-links.js';
import { buildDownloadList } from '../../blocks/download-list/download-list.js';
import { buildButtons } from '../../blocks/buttons/buttons.js';
import { buildStatistics } from '../../blocks/statistics/statistics.js';

describe('title', () => {
  it('wraps heading in a title band', () => {
    const el = document.createElement('div');
    el.innerHTML = '<h2>Explore our stories</h2>';
    const block = buildTitle(el);
    expect(block.querySelector('h2').textContent).toBe('Explore our stories');
    expect(block.classList.contains('title')).toBe(true);
  });
});

describe('quote', () => {
  it('renders blockquote with attribution', () => {
    const el = document.createElement('div');
    el.innerHTML = '<p>Invention is in our DNA.</p><p>— Jane Doe, Chief Scientist</p>';
    const block = buildQuote(el);
    expect(block.querySelector('blockquote').textContent).toContain('DNA');
    expect(block.querySelector('cite').textContent).toContain('Scientist');
  });
});

describe('related-links', () => {
  it('renders link list, nothing dropped', () => {
    const el = document.createElement('div');
    el.innerHTML = '<ul><li><a href="/a">A</a></li><li><a href="/b">B</a></li></ul>';
    const block = buildRelatedLinks(el);
    expect(block.querySelectorAll('li a').length).toBe(2);
  });
});

describe('download-list', () => {
  it('marks file links for download', () => {
    const el = document.createElement('div');
    el.innerHTML = '<ul><li><a href="/r.pdf">Report</a></li><li><a href="/d.xlsx">Data</a></li></ul>';
    const block = buildDownloadList(el);
    const links = block.querySelectorAll('a');
    expect(links.length).toBe(2);
    expect(links[0].hasAttribute('download')).toBe(true);
  });
});

describe('buttons', () => {
  it('renders CTA row', () => {
    const el = document.createElement('div');
    el.innerHTML = '<p><a href="/a">Primary</a></p><p><a href="/b">Secondary</a></p>';
    const block = buildButtons(el);
    expect(block.querySelectorAll('a.button').length).toBe(2);
  });
});

describe('statistics', () => {
  it('renders stat grid with number and label', () => {
    const el = document.createElement('div');
    el.innerHTML = '<div><p>140</p><p>years of innovation</p></div><div><p>70+</p><p>countries</p></div>';
    const block = buildStatistics(el);
    const stats = block.querySelectorAll('.stat');
    expect(stats.length).toBe(2);
    expect(stats[0].querySelector('.stat-number').textContent).toBe('140');
    expect(stats[0].querySelector('.stat-label').textContent).toBe('years of innovation');
  });
});
