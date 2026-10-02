import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { google } from 'googleapis';

const TOKEN_FILE = 'token.json';
const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive',
];

// Locates the OAuth client secret downloaded from Google Cloud Console.
export function findClientSecret(dir = '.') {
  const file = readdirSync(dir).find((f) => f.startsWith('client_secret') && f.endsWith('.json'));
  if (!file) throw new Error(`no client_secret*.json found in ${dir}`);
  const parsed = JSON.parse(readFileSync(`${dir}/${file}`, 'utf8'));
  const key = parsed.installed ? 'installed' : 'web';
  const cfg = parsed[key];
  if (!cfg) throw new Error(`${file} has neither "installed" nor "web" credentials`);
  return {
    client_id: cfg.client_id,
    client_secret: cfg.client_secret,
    redirect_uris: cfg.redirect_uris || ['http://localhost:0'],
  };
}

// Runs the loopback OAuth flow: opens the consent URL in the user's browser,
// captures the redirect code on a local port, exchanges it, caches token.json.
export async function authorize(dir = '.') {
  if (existsSync(TOKEN_FILE)) {
    const creds = findClientSecret(dir);
    const client = new google.auth.OAuth2(creds.client_id, creds.client_secret, 'http://localhost:0');
    client.setCredentials(JSON.parse(readFileSync(TOKEN_FILE, 'utf8')));
    return client;
  }

  const creds = findClientSecret(dir);
  const client = new google.auth.OAuth2(creds.client_id, creds.client_secret, 'http://localhost:0');

  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      try {
        const url = new URL(req.url, 'http://localhost:0');
        const code = url.searchParams.get('code');
        if (!code) throw new Error(`no code in callback: ${req.url}`);
        const { tokens } = await client.getToken(code);
        client.setCredentials(tokens);
        writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
        res.end('msd.com migration authorized. You can close this tab.');
        server.close();
        resolve(client);
      } catch (err) {
        server.close();
        reject(err);
      }
    });
    server.listen(0, 'localhost', () => {
      const port = server.address().port;
      client.redirectUri = `http://localhost:${port}`;
      const authUrl = client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        redirect_uri: `http://localhost:${port}`,
        prompt: 'consent',
      });
      console.log(`\nOpen this URL to authorize (browser should open automatically):\n\n${authUrl}\n`);
      spawn('open', [authUrl], { detached: true }).unref();
    });
  });
}

export async function getGoogleClients(dir = '.') {
  const auth = await authorize(dir);
  return {
    docs: google.docs({ version: 'v1', auth }),
    drive: google.drive({ version: 'v3', auth }),
  };
}
