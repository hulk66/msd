import { mkdirSync, writeFileSync } from 'node:fs';

export function extractSlug(page) {
  const path = new URL(page.link).pathname.replace(/^\/|\/$/g, '');
  return path || 'home';
}

export function collectImageUrls(html) {
  const urls = [];
  for (const m of html.matchAll(/(?:data-srcset|srcset|data-src|src)="([^"]+)"/g)) {
    if (/srcset/.test(m[0])) {
      for (const part of m[1].split(',')) {
        const url = part.trim().split(/\s+/)[0];
        if (url) urls.push(url);
      }
    } else {
      urls.push(m[1]);
    }
  }
  return [...new Set(urls)];
}

export async function exportPages(baseUrl) {
  const pages = [];
  let page = 1;
  for (;;) {
    const res = await fetch(
      `${baseUrl}/wp-json/wp/v2/pages?per_page=100&page=${page}&_fields=link,title,content,excerpt,featured_media,menu_order,parent`,
    );
    if (!res.ok) break;
    const batch = await res.json();
    if (!batch.length) break;
    pages.push(...batch);
    page++;
  }
  mkdirSync('export/media', { recursive: true });
  for (const p of pages) {
    p.slug = extractSlug(p);
    p.title = p.title.rendered;
    p.html = p.content.rendered;
    for (const url of collectImageUrls(p.html)) {
      const file = `export/media/${p.slug}/${url.split('/').pop()}`;
      mkdirSync(`export/media/${p.slug}`, { recursive: true });
      try {
        const img = await fetch(url);
        if (img.ok) writeFileSync(file, Buffer.from(await img.arrayBuffer()));
      } catch {
        // leave missing; the review pass flags broken images
      }
    }
  }
  writeFileSync('export/pages.json', JSON.stringify(pages, null, 2));
  return pages;
}

if (process.argv[1] && process.argv[1].endsWith('export-wp.js')) {
  exportPages(process.env.WP_BASE_URL).then((pages) =>
    console.log(`Exported ${pages.length} pages -> export/pages.json`),
  );
}
