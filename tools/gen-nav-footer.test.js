import { describe, it, expect } from 'vitest';
import { extractNavTree, extractFooterColumns, toNavDocHtml, toFooterDocHtml } from './gen-nav-footer.js';

const NAV_HTML = `
<nav class="menu-main-menu-container">
  <ul id="menuMain" class="menu-main level-0">
    <li class="level-1"><a href="/about/">About</a>
      <ul class="level-2">
        <li class="level-2"><a href="/about/history/">History</a></li>
        <li class="level-2"><a href="/about/values/">Values</a></li>
      </ul>
    </li>
    <li class="level-1"><a href="/research/">Research</a></li>
  </ul>
</nav>`;

const FOOTER_HTML = `
<footer id="footerMain" class="footer">
  <div id="footerSocial"><h3>Connect with us on social</h3>
    <a href="https://twitter.com/MSDInvents" aria-label="Twitter">Twitter</a></div>
  <ul id="footerNav">
    <li><a href="https://www.msdmanuals.com/">MSD Manuals</a></li>
    <li><a href="/contact-us/">Contact Us</a></li>
  </ul>
</footer>`;

describe('extractNavTree', () => {
  it('extracts top-level items with children', () => {
    const tree = extractNavTree(NAV_HTML);
    expect(tree).toEqual([
      { title: 'About', href: '/about/', children: [
        { title: 'History', href: '/about/history/', children: [] },
        { title: 'Values', href: '/about/values/', children: [] },
      ] },
      { title: 'Research', href: '/research/', children: [] },
    ]);
  });
});
describe('extractFooterColumns', () => {
  it('extracts footer heading and link list', () => {
    const cols = extractFooterColumns(FOOTER_HTML);
    expect(cols).toEqual([
      { heading: 'Connect with us on social', links: [{ title: 'Twitter', href: 'https://twitter.com/MSDInvents' }] },
      { heading: '', links: [
        { title: 'MSD Manuals', href: 'https://www.msdmanuals.com/' },
        { title: 'Contact Us', href: '/contact-us/' },
      ] },
    ]);
  });
});

describe('doc html output', () => {
  it('wraps nav in <nav> with nested lists', () => {
    const html = toNavDocHtml(extractNavTree(NAV_HTML));
    expect(html).toContain('<nav');
    expect(html).toContain('History');
  });
  it('emits footer columns as sections', () => {
    const html = toFooterDocHtml(extractFooterColumns(FOOTER_HTML));
    expect(html).toContain('Connect with us on social');
    expect(html).toContain('MSD Manuals');
  });
});
