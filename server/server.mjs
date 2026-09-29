import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appFile = path.join(root, 'web', 'index.html');
const MAX_BODY = 1024 * 1024;

function dataPaths(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  return { tokenFile: path.join(dataDir, 'access-token'), scenariosFile: path.join(dataDir, 'scenarios.json') };
}
function readToken(file) {
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
  const token = crypto.randomBytes(32).toString('base64url');
  fs.writeFileSync(file, token, { mode: 0o600, flag: 'wx' });
  return token;
}
function readScenarios(file) {
  try {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
}
function writeScenarios(file, value) {
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), { mode: 0o600 });
  fs.renameSync(temp, file);
}
function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(value));
}
function lanAddresses(port, token) {
  const urls = [];
  let interfaces;
  try { interfaces = os.networkInterfaces(); } catch { return urls; }
  for (const entries of Object.values(interfaces)) for (const item of entries || []) {
    if (item.family === 'IPv4' && !item.internal) urls.push(`http://${item.address}:${port}/?access=${encodeURIComponent(token)}`);
  }
  return urls;
}
export async function startServer({ host = '0.0.0.0', port = 4173, dataDir = process.env.FLUX_DATA_DIR || path.join(os.homedir(), '.flux-bkl') } = {}) {
  const { tokenFile, scenariosFile } = dataPaths(dataDir);
  const token = readToken(tokenFile);
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      fs.createReadStream(appFile).pipe(res);
      return;
    }
    if (!url.pathname.startsWith('/api/')) { json(res, 404, { error: 'Introuvable' }); return; }
    const supplied = (req.headers.authorization || '').replace(/^Bearer /, '');
    const valid = supplied.length === token.length && crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(token));
    if (!valid) { json(res, 401, { error: 'Accès refusé' }); return; }
    try {
      if (url.pathname === '/api/scenarios' && req.method === 'GET') {
        json(res, 200, { names: Object.keys(readScenarios(scenariosFile)).sort() }); return;
      }
      const match = /^\/api\/scenarios\/([^/]+)$/.exec(url.pathname);
      if (!match) { json(res, 404, { error: 'Introuvable' }); return; }
      const name = decodeURIComponent(match[1]);
      if (!name || name.length > 120 || /[\u0000-\u001f]/.test(name)) { json(res, 400, { error: 'Nom invalide' }); return; }
      if (req.method === 'GET') {
        const scenarios = readScenarios(scenariosFile);
        if (!Object.hasOwn(scenarios, name)) { json(res, 404, { error: 'Scénario introuvable' }); return; }
        json(res, 200, { scenario: scenarios[name] }); return;
      }
      if (req.method === 'PUT') {
        let raw = '';
        for await (const chunk of req) {
          raw += chunk;
          if (Buffer.byteLength(raw) > MAX_BODY) { json(res, 413, { error: 'Scénario trop volumineux' }); req.destroy(); return; }
        }
        let scenario;
        try { scenario = JSON.parse(raw); } catch { json(res, 400, { error: 'JSON invalide' }); return; }
        if (!scenario || typeof scenario !== 'object' || Array.isArray(scenario)) { json(res, 400, { error: 'Scénario invalide' }); return; }
        const scenarios = readScenarios(scenariosFile);
        scenarios[name] = scenario;
        writeScenarios(scenariosFile, scenarios);
        json(res, 200, { name }); return;
      }
      json(res, 405, { error: 'Méthode non autorisée' });
    } catch (error) {
      console.error(error);
      if (!res.headersSent) json(res, 500, { error: 'Erreur du serveur' });
    }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, resolve); });
  const actualPort = server.address().port;
  return { server, token, port: actualPort, localUrl: `http://127.0.0.1:${actualPort}/?access=${encodeURIComponent(token)}`, lanUrls: lanAddresses(actualPort, token) };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.FLUX_PORT || 4173);
  const host = process.env.FLUX_HOST || '0.0.0.0';
  startServer({ host, port }).then(({ localUrl, lanUrls }) => {
    console.log(`Sur ce poste : ${localUrl}`);
    for (const url of lanUrls) console.log(`Sur le réseau : ${url}`);
    console.log('Conservez ces liens privés : ils donnent accès aux scénarios partagés.');
  }).catch(error => { console.error(error); process.exitCode = 1; });
}
