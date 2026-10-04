// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { buildVideo } from '../../blocks/video/video.js';

describe('video', () => {
  it('wraps a video link as an embed placeholder with poster and copy', () => {
    const el = document.createElement('div');
    el.innerHTML = '<picture><img src="/poster.jpg"></picture><h2>Watch</h2><p>Intro</p><a href="https://youtube.com/watch?v=x">Play</a>';
    const block = buildVideo(el);
    expect(block.querySelector('.video-poster img').getAttribute('src')).toBe('/poster.jpg');
    expect(block.querySelector('.video-copy h2').textContent).toBe('Watch');
    expect(block.querySelector('.video-embed a').getAttribute('href')).toBe('https://youtube.com/watch?v=x');
  });

  it('uses the cell after the URL as the CTA label when aem.js wrapped cell text in <p>', () => {
    // aem.js wraps bare text cell content in <p> before decorate() runs, so
    // each cell is <div><p>text</p></div> — the URL must not become its own
    // label and the following label cell must survive.
    const el = document.createElement('div');
    el.innerHTML = `<div>
      <div><picture><img src="/poster.jpg"></picture></div>
      <div></div>
      <div><p>We aspire to be the premier research-intensive biopharmaceutical company</p></div>
      <div><p>/research-overview</p></div>
      <div><p>Our research</p></div>
    </div>`;
    const block = buildVideo(el);
    const a = block.querySelector('.video-embed a');
    expect(a.getAttribute('href')).toBe('/research-overview');
    expect(a.textContent).toBe('Our research');
    expect(block.querySelector('.video-copy').textContent).not.toContain('/research-overview');
  });
});
