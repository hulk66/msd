// CDP helper: evaluate JS in a Vivaldi tab via the DevTools protocol.
// Usage: node tools/cdp-eval.js '<js expression>' [urlFilter]
import WebSocket from 'ws';

const [, , expr, urlFilter = 'admin.hlx.page'] = process.argv;

const targets = await (await fetch('http://localhost:9222/json')).json();
let target = targets.find((t) => t.type === 'page' && t.url.includes(urlFilter));
if (!target) target = targets.find((t) => t.type === 'page');
if (!target) {
  console.error('no page target found');
  process.exit(1);
}

const ws = new WebSocket(target.webSocketDebuggerUrl, { perMessageDeflate: false });
let id = 0;
const pending = new Map();

function send(method, params) {
  return new Promise((resolve, reject) => {
    const msgId = ++id;
    pending.set(msgId, { resolve, reject });
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
}

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  }
});

await new Promise((r) => ws.on('open', r));

const result = await send('Runtime.evaluate', {
  expression: `(async () => { ${expr} })()`,
  awaitPromise: true,
  returnByValue: true,
});

console.log(JSON.stringify(result.result?.value ?? result, null, 1));
ws.close();
