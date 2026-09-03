/**
 * 手元で確かめるための、最小の静的サーバー。
 *
 *   node tools/serve.js   →  http://localhost:8080/
 *
 * Cloudflare Pages に置くのと同じものを、同じ形で開けます。
 * file:// で開くと localStorage の扱いがブラウザによって変わるので、
 * 確認は必ずこのサーバー越しに行ってください。
 *
 * dist/ の外へは出られないようにしてあります（.. を含むURLへの備え）。
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'dist');
const PORT = 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

http
  .createServer((req, res) => {
    // Cloudflare Pages は /en/ で /en/index.html を返す。ここも同じにする
    let url = req.url.split('?')[0];
    if (url.endsWith('/')) url += 'index.html';
    const file = path.join(dir, decodeURIComponent(url));

    // dist/ の外は返さない
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('ありません: ' + url + '\n先に node tools/build.js を実行してください。');
      return;
    }

    const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': type });
    res.end(fs.readFileSync(file));
  })
  .listen(PORT, () => console.log('http://localhost:' + PORT + '/'));
