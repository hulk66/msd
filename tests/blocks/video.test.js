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
});
