// Bulk preview + publish all migrated pages via the AEM admin API.
// Uses the authenticated admin.hlx.page session in the user's browser (CDP).
import WebSocket from 'ws';
import { readFileSync } from 'node:fs';

const paths = JSON.parse(readFileSync('/tmp/bulk-paths.json', 'utf8'));

const targets = await (await fetch('http://localhost:9222/json')).json();
const target = targets.find((t) => t.type === 'page' && t.url.includes('admin.hlx.page'))
  || targets.find((t) => t.type === 'page' && t.url.includes('tools.aem.live'));
if (!target) {
  console.error('no admin.hlx.page or tools.aem.live tab found in the browser');
  process.exit(1);
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.on('open', r));

let id = 0;
const pending = new Map();
ws.on('message', (d) => {
  const msg = JSON.parse(d.toString());
  if (msg.id && pending.has(msg.id)) {
    const { resolve } = pending.get(msg.id);
    pending.delete(msg.id);
    resolve(msg.result);
  }
});
const evalJs = (expression) => new Promise((resolve) => {
  const msgId = ++id;
  pending.set(msgId, { resolve });
  ws.send(JSON.stringify({ id: msgId, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }));
});

const op = process.argv[2] || 'preview'; // preview | live
const body = JSON.stringify(paths);

const result = await evalJs(`
  (async () => {
    const r = await fetch('https://admin.hlx.page/${op}/hulk66/msd/main/*', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: ${JSON.stringify(body)},
    });
    return { status: r.status, body: (await r.text()).slice(0, 600) };
  })()
`);
console.log(JSON.stringify(result.result?.value ?? result, null, 1));
ws.close();
