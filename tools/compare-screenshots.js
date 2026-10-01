// Screenshot comparison: renders a local block page and the corresponding
// live WordPress page at three widths, saving side-by-side evidence for
// human sign-off (spec §3 fidelity check).
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const WIDTHS = [375, 768, 1280];

export async function compare({ localUrl, liveUrl, name, outDir = 'inventory/compare' }) {
  mkdirSync(`${outDir}/${name}`, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const shots = [];
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    for (const [label, url] of [['eds', localUrl], ['wp', liveUrl]]) {
      try {
        await page.goto(url, { waitUntil: 'load', timeout: 45000 });
        await page.waitForTimeout(1200);
        const path = `${outDir}/${name}/${label}-${width}.png`;
        await page.screenshot({ path, fullPage: false });
        shots.push(path);
      } catch (err) {
        shots.push(`${label}@${width}: FAILED ${err.message.split('\n')[0]}`);
      }
    }
  }
  await browser.close();
  writeFileSync(`${outDir}/${name}/README.txt`, shots.join('\n'));
  return shots;
}

if (process.argv[1] && process.argv[1].endsWith('compare-screenshots.js')) {
  const [name, localUrl, liveUrl] = process.argv.slice(2);
  compare({ name, localUrl, liveUrl }).then((shots) => console.log(shots.join('\n')));
}
