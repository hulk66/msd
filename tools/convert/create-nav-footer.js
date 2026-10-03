// Creates the `nav` and `footer` Google Docs from the extracted site menu
// (tools/gen-nav-footer.js output) and syncs them to the Drive root.
import { readFileSync } from 'node:fs';
import { getGoogleClients } from './google-auth.js';
import { syncDocs, throttleDocs } from './create-docs.js';

const parseNav = () => {
  // nav-doc.html: <nav aria-label="main"><ul><li><a href>Text</a><ul>children</ul></li>...</ul></nav>
  const html = readFileSync('inventory/nav-doc.html', 'utf8');
  const items = [...html.matchAll(/<li><a href="([^"]+)">([^<]+)<\/a>(<ul>[\s\S]*?<\/ul>)?<\/li>/g)];
  return items.map((m) => ({
    text: m[2],
    link: m[1],
    children: [...m[3]?.matchAll(/<li><a href="([^"]+)">([^<]+)<\/a><\/li>/g) || []].map((c) => ({ text: c[2], link: c[1] })),
  }));
};

const parseFooter = () => {
  const html = readFileSync('inventory/footer-doc.html', 'utf8');
  const groups = [...html.matchAll(/<div><h3>([^<]*)<\/h3><ul>([\s\S]*?)<\/ul><\/div>/g)];
  return groups.map((g) => ({
    heading: g[1],
    links: [...g[2].matchAll(/<li><a href="([^"]+)">([^<]+)<\/a><\/li>/g)].map((l) => ({ text: l[2], link: l[1] })),
  }));
};

const navModel = {
  slug: 'nav',
  title: 'nav',
  description: '',
  sections: [
    { blocks: [], plain: [{ type: 'paragraph', text: 'MSD', link: '/', bold: true }], metadata: {} },
    { blocks: [], plain: [{ type: 'list', items: parseNav().map((i) => ({ text: i.text, link: i.link })) }], metadata: {} },
    { blocks: [], plain: [{ type: 'paragraph', text: 'Contact Us', link: '/contact-us/', bold: true }], metadata: {} },
  ],
};

const footerGroups = parseFooter();
const footerModel = {
  slug: 'footer',
  title: 'footer',
  description: '',
  sections: footerGroups.map((g) => ({
    blocks: [],
    plain: [
      { type: 'heading', level: 3, text: g.heading || 'Links' },
      { type: 'list', items: g.links.map((l) => ({ text: l.text, link: l.link })) },
    ],
    metadata: {},
  })),
};

const clients = await getGoogleClients();
await syncDocs([navModel], {
  folderId: process.env.DRIVE_FOLDER_ID || '1MZexbvQFeFmqdFycqtHPmMQB1wGe2a0E',
  docs: throttleDocs(clients.docs),
  drive: clients.drive,
  skipExisting: false,
});
const clients2 = await getGoogleClients();
await syncDocs([footerModel], {
  folderId: process.env.DRIVE_FOLDER_ID || '1MZexbvQFeFmqdFycqtHPmMQB1wGe2a0E',
  docs: throttleDocs(clients2.docs),
  drive: clients2.drive,
  skipExisting: false,
});
console.log('nav + footer docs created');
