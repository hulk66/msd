// Exports the WordPress `story` custom post type (the /stories/ pages) in
// the same shape export-wp.js produces for pages, so the normal convert →
// create-docs pipeline can process them. Media is not downloaded here: the
// doc writer fetches images from the original site by URL.
// Usage: WP_BASE_URL=https://www.msd.com node tools/convert/export-stories.js
import { writeFileSync } from 'node:fs';

const BASE = process.env.WP_BASE_URL || 'https://www.msd.com';

export async function exportStories(baseUrl = BASE) {
  const stories = [];
  for (let page = 1; ; page += 1) {
    const res = await fetch(`${baseUrl}/wp-json/wp/v2/story?per_page=100&page=${page}&_fields=link,title,content,excerpt,slug,date`);
    if (!res.ok) break;
    const batch = await res.json();
    if (!batch.length) break;
    stories.push(...batch);
  }
  for (const s of stories) {
    s.title = s.title.rendered;
    s.html = s.content.rendered;
  }
  writeFileSync('export/stories.json', JSON.stringify(stories, null, 2));
  return stories;
}

if (process.argv[1] && process.argv[1].endsWith('export-stories.js')) {
  exportStories().then((stories) => console.log(`Exported ${stories.length} stories -> export/stories.json`));
}
