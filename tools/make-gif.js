/**
 * 紹介用のGIFを作る。
 *
 *   node tools/make-gif.js                      → assets/demo/look-en.gif
 *   node tools/make-gif.js --lang ja
 *   node tools/make-gif.js --out path/to.gif
 *
 * dist/ を配って、Chromeでテンプレート画面を開き、ジャンルと差し色を
 * 順に押しながら撮って、GIFに束ねます。外部ライブラリは使いません。
 *
 * 先に node tools/build.js を実行しておいてください。
 *
 * ---------------------------------------------------------------------------
 * なぜGIFか
 *
 * このアプリの「34件 × 5ジャンル × 19配色」は、文章にすると数字の羅列に
 * しかなりません。同じ34件の見た目が一斉に変わるところを見せるのが、
 * いちばん短く伝わります。SNSが動くものを優遇する、という事情もあります。
 *
 * ---------------------------------------------------------------------------
 * 中身
 *
 *   1. ChromeをDevTools Protocolで動かして、コマをPNGで受け取る
 *   2. PNGを読む（zlibで展開して、行ごとのフィルタを戻す）
 *   3. 全コマから255色を選ぶ（中央値分割）
 *   4. 2コマ目からは「前と違うところ」だけを、変わらない画素を透明にして書く
 *   5. LZWで詰めてGIF89aとして並べる
 *
 * 4がないと10倍以上になります。画面の大半は動かないためです。
 */

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');

// ---------------------------------------------------------------------------
// 設定
// ---------------------------------------------------------------------------

const CHROME = process.env.CHROME_PATH ||
  'C:/Program Files/Google/Chrome/Application/chrome.exe';

const DEBUG_PORT = 9333;
const SERVE_PORT = 8080;

/** 撮る大きさ。切り出すのは、この中に出るダイアログだけ */
const VIEW = { width: 1280, height: 840 };

/**
 * 撮る順番。
 *
 * ジャンルを一巡してから、ひとつのジャンルの中で差し色を回します。
 * 「ジャンルで構造が変わる」と「その中で色が選べる」は別の話なので、
 * 混ぜずに順に見せます。
 *
 * accent は画面に並ぶ順の番号。名前は言語で変わるので位置で選びます。
 */
const SHOTS = [
  { look: 'business', hold: 1300 },
  { look: 'formal',   hold: 1300 },
  { look: 'casual',   hold: 1300 },
  { look: 'pop',      hold: 1300 },
  { look: 'minimal',  hold: 1300 },
  { look: 'casual', accent: 0, hold: 900 },
  { look: 'casual', accent: 1, hold: 600 },
  { look: 'casual', accent: 2, hold: 600 },
  { look: 'casual', accent: 3, hold: 900 }
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Chromeを動かす
// ---------------------------------------------------------------------------

async function openChrome() {
  if (!fs.existsSync(CHROME)) {
    throw new Error('Chromeが見つかりません: ' + CHROME +
      '\n  環境変数 CHROME_PATH で指定できます。');
  }

  const profile = path.join(os.tmpdir(), 'make-gif-' + process.pid);

  const child = spawn(CHROME, [
    '--headless=new',
    '--remote-debugging-port=' + DEBUG_PORT,
    '--user-data-dir=' + profile,
    '--window-size=' + VIEW.width + ',' + VIEW.height,
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--force-color-profile=srgb',
    // 細字の色にじみを止める。にじみはそのまま色数を食うので、
    // 見た目と容量の両方に効く
    '--disable-lcd-text',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ], { stdio: 'ignore' });

  let target = null;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(250);
    try {
      const list = await (await fetch('http://127.0.0.1:' + DEBUG_PORT + '/json/list')).json();
      target = list.find((t) => t.type === 'page');
    } catch (err) { /* まだ起きていない */ }
  }
  if (!target) throw new Error('Chromeに接続できませんでした');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok, ng) => {
    ws.onopen = ok;
    ws.onerror = () => ng(new Error('Chromeへの接続に失敗しました'));
  });

  let id = 0;
  const waiting = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (!msg.id || !waiting.has(msg.id)) return;
    const { ok, ng } = waiting.get(msg.id);
    waiting.delete(msg.id);
    msg.error ? ng(new Error(msg.error.message)) : ok(msg.result);
  };

  const send = (method, params) => new Promise((ok, ng) => {
    const n = ++id;
    waiting.set(n, { ok, ng });
    ws.send(JSON.stringify({ id: n, method: method, params: params || {} }));
  });

  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate',
      { expression: expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
    return r.result.value;
  };

  const shot = async (clip) => {
    const r = await send('Page.captureScreenshot', Object.assign(
      { format: 'png', captureBeyondViewport: false },
      clip ? { clip: Object.assign({ scale: 1 }, clip) } : {}
    ));
    return Buffer.from(r.data, 'base64');
  };

  const close = () => {
    try { ws.close(); } catch (err) { /* すでに閉じている */ }
    child.kill();
    fs.rmSync(profile, { recursive: true, force: true });
  };

  return { send: send, evaluate: evaluate, shot: shot, close: close };
}

// ---------------------------------------------------------------------------
// PNGを読む
// ---------------------------------------------------------------------------

/** Chromeが返すのは8bitのRGBかRGBA、インタレース無し。それだけ読めればよい */
function readPng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('PNGではありません');

  let at = 8;
  let width = 0;
  let height = 0;
  let color = 0;
  const parts = [];

  while (at < buf.length) {
    const len = buf.readUInt32BE(at);
    const type = buf.toString('ascii', at + 4, at + 8);
    const body = buf.subarray(at + 8, at + 8 + len);

    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      color = body[9];
      if (body[8] !== 8 || (color !== 2 && color !== 6)) throw new Error('想定外のPNGです');
      if (body[12] !== 0) throw new Error('インタレースには未対応です');
    } else if (type === 'IDAT') {
      parts.push(Buffer.from(body));
    } else if (type === 'IEND') {
      break;
    }
    at += 12 + len;
  }

  const ch = color === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(parts));
  const stride = width * ch;
  const rgb = Buffer.alloc(width * height * 3);
  const line = Buffer.alloc(stride);
  const prev = Buffer.alloc(stride);

  let p = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[p++];
    raw.copy(line, 0, p, p + stride);
    p += stride;

    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? line[i - ch] : 0;
      const b = prev[i];
      const c = i >= ch ? prev[i - ch] : 0;
      let v = line[i];

      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const q = a + b - c;
        const pa = Math.abs(q - a);
        const pb = Math.abs(q - b);
        const pc = Math.abs(q - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      line[i] = v & 0xff;
    }

    for (let x = 0; x < width; x++) {
      const s = x * ch;
      const d = (y * width + x) * 3;
      rgb[d] = line[s];
      rgb[d + 1] = line[s + 1];
      rgb[d + 2] = line[s + 2];
    }
    line.copy(prev);
  }

  return { width: width, height: height, rgb: rgb };
}

// ---------------------------------------------------------------------------
// 減色
// ---------------------------------------------------------------------------

/** 目の感度。同じ幅でも、緑のずれのほうがはっきり見える */
const WEIGHT = [3, 6, 1];

/**
 * 中央値分割でn色を選ぶ。
 *
 * 割る箱は「画素数 × いちばん広い軸の幅」で選びます。幅だけで選ぶと、
 * 数画素しかない外れ値に代表色を使い切ります。
 */
function pickColors(counts, n) {
  const colors = [];
  counts.forEach(function (count, key) {
    colors.push([(key >> 16) & 0xff, (key >> 8) & 0xff, key & 0xff, count]);
  });
  if (colors.length <= n) return colors.map((c) => [c[0], c[1], c[2]]);

  const stat = (box) => {
    let weight = 0;
    const lo = [255, 255, 255];
    const hi = [0, 0, 0];
    for (const c of box) {
      weight += c[3];
      for (let a = 0; a < 3; a++) {
        if (c[a] < lo[a]) lo[a] = c[a];
        if (c[a] > hi[a]) hi[a] = c[a];
      }
    }
    let axis = 0;
    for (let a = 1; a < 3; a++) {
      if ((hi[a] - lo[a]) * WEIGHT[a] > (hi[axis] - lo[axis]) * WEIGHT[axis]) axis = a;
    }
    return { weight: weight, axis: axis, range: hi[axis] - lo[axis] };
  };

  let boxes = [{ box: colors, s: stat(colors) }];

  while (boxes.length < n) {
    let pick = -1;
    let best = -1;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].box.length < 2) continue;
      const score = boxes[i].s.weight * boxes[i].s.range;
      if (score > best) { best = score; pick = i; }
    }
    if (pick < 0) break;

    const box = boxes[pick].box;
    const s = boxes[pick].s;
    box.sort((x, y) => x[s.axis] - y[s.axis]);

    // いちばん釣り合う位置で割る。
    //
    // 「積み上げが半分を超えたら」という条件だけで決めると、支配的な色が
    // 並びの末尾にいるときに最後まで成立せず、初期値のまま先頭の1色だけを
    // 切り落とす。それが毎回続き、255箱のうち252箱が1色、という状態になる。
    // 実際にそれで画面全体の色が転んだので、釣り合いで選ぶようにしてある。
    let acc = 0;
    let at = 1;
    let gap = Infinity;
    for (let i = 0; i < box.length - 1; i++) {
      acc += box[i][3];
      const d = Math.abs(2 * acc - s.weight);
      if (d < gap) { gap = d; at = i + 1; }
    }

    const left = box.slice(0, at);
    const right = box.slice(at);
    boxes.splice(pick, 1, { box: left, s: stat(left) }, { box: right, s: stat(right) });
  }

  return boxes.map((entry) => {
    let r = 0;
    let g = 0;
    let b = 0;
    let w = 0;
    for (const c of entry.box) {
      r += c[0] * c[3];
      g += c[1] * c[3];
      b += c[2] * c[3];
      w += c[3];
    }
    return [Math.round(r / w), Math.round(g / w), Math.round(b / w)];
  });
}

/** 色から、いちばん近い代表色の番号へ。引いた結果は覚えておく */
function makeLookup(palette) {
  const cache = new Map();

  return (r, g, b) => {
    const key = (r << 16) | (g << 8) | b;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;

    let best = 0;
    let near = Infinity;
    for (let i = 0; i < palette.length; i++) {
      const p = palette[i];
      const dr = r - p[0];
      const dg = g - p[1];
      const db = b - p[2];
      const d = dr * dr * WEIGHT[0] + dg * dg * WEIGHT[1] + db * db * WEIGHT[2];
      if (d < near) { near = d; best = i; }
    }
    cache.set(key, best);
    return best;
  };
}

// ---------------------------------------------------------------------------
// GIFを書く
// ---------------------------------------------------------------------------

function lzw(minCodeSize, indices) {
  const clear = 1 << minCodeSize;
  const eoi = clear + 1;

  const bytes = [];
  let hold = 0;
  let bits = 0;

  const put = (code, size) => {
    hold |= code << bits;
    bits += size;
    while (bits >= 8) {
      bytes.push(hold & 0xff);
      hold >>= 8;
      bits -= 8;
    }
  };

  let dict = new Map();
  let next = eoi + 1;
  let size = minCodeSize + 1;

  put(clear, size);

  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = prefix * 4096 + k;
    const seen = dict.get(key);
    if (seen !== undefined) { prefix = seen; continue; }

    put(prefix, size);
    dict.set(key, next++);

    if (next > 4095) {
      put(clear, size);
      dict = new Map();
      next = eoi + 1;
      size = minCodeSize + 1;
    } else if (next > (1 << size) && size < 12) {
      size++;
    }
    prefix = k;
  }

  put(prefix, size);
  put(eoi, size);
  if (bits > 0) bytes.push(hold & 0xff);

  // 255バイトずつの小分けにする
  const out = [];
  for (let i = 0; i < bytes.length; i += 255) {
    const part = bytes.slice(i, i + 255);
    out.push(part.length);
    for (const v of part) out.push(v);
  }
  out.push(0);
  return Buffer.from(out);
}

/**
 * @param {Array<{rgb:Buffer, hold:number}>} frames 同じ大きさのコマ
 */
function writeGif(frames, width, height) {
  // 全コマから色を数える。多いので間引く
  const counts = new Map();
  for (const f of frames) {
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const i = (y * width + x) * 3;
        const key = (f.rgb[i] << 16) | (f.rgb[i + 1] << 8) | f.rgb[i + 2];
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
  }

  const palette = pickColors(counts, 255);
  const lookup = makeLookup(palette);
  const CLEARISH = palette.length;          // 余る1つを透明に使う

  const px = width * height;
  const planes = frames.map((f) => {
    const idx = new Uint8Array(px);
    for (let i = 0, p = 0; i < px; i++, p += 3) {
      idx[i] = lookup(f.rgb[p], f.rgb[p + 1], f.rgb[p + 2]);
    }
    return idx;
  });

  const out = [];
  const u16 = (v) => Buffer.from([v & 0xff, (v >> 8) & 0xff]);

  out.push(Buffer.from('GIF89a', 'ascii'));
  out.push(u16(width), u16(height), Buffer.from([0xf7, 0, 0]));

  const table = Buffer.alloc(256 * 3);
  palette.forEach((c, i) => {
    table[i * 3] = c[0];
    table[i * 3 + 1] = c[1];
    table[i * 3 + 2] = c[2];
  });
  out.push(table);

  // 0 = ずっと繰り返す
  out.push(Buffer.from([0x21, 0xff, 0x0b]), Buffer.from('NETSCAPE2.0', 'ascii'),
    Buffer.from([0x03, 0x01, 0x00, 0x00, 0x00]));

  for (let n = 0; n < planes.length; n++) {
    const cur = planes[n];
    let left = 0;
    let top = 0;
    let w = width;
    let h = height;
    let body = cur;
    let clear = false;

    if (n > 0) {
      const prev = planes[n - 1];
      let x0 = width;
      let y0 = height;
      let x1 = -1;
      let y1 = -1;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (cur[y * width + x] === prev[y * width + x]) continue;
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
      if (x1 < 0) { x0 = 0; y0 = 0; x1 = 0; y1 = 0; }   // 前とまったく同じ

      left = x0;
      top = y0;
      w = x1 - x0 + 1;
      h = y1 - y0 + 1;
      clear = true;

      const cut = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const src = (y + top) * width + (x + left);
          cut[y * w + x] = cur[src] === prev[src] ? CLEARISH : cur[src];
        }
      }
      body = cut;
    }

    // 表示時間は 1/100 秒きざみ
    const delay = Math.max(2, Math.round(frames[n].hold / 10));

    out.push(Buffer.from([0x21, 0xf9, 0x04, (1 << 2) | (clear ? 1 : 0)]),
      u16(delay), Buffer.from([clear ? CLEARISH : 0, 0x00]));
    out.push(Buffer.from([0x2c]), u16(left), u16(top), u16(w), u16(h), Buffer.from([0x00]));
    out.push(Buffer.from([8]), lzw(8, body));
  }

  out.push(Buffer.from([0x3b]));
  return Buffer.concat(out);
}

// ---------------------------------------------------------------------------
// 本体
// ---------------------------------------------------------------------------

function arg(name, fallback) {
  const at = process.argv.indexOf('--' + name);
  return at >= 0 && process.argv[at + 1] ? process.argv[at + 1] : fallback;
}

async function main() {
  const lang = arg('lang', 'en');
  const out = path.resolve(arg('out',
    path.join(__dirname, '..', 'assets', 'demo', 'look-' + lang + '.gif')));

  const dist = path.join(__dirname, '..', 'dist');
  const page = lang === 'ja' ? '/index.html' : '/' + lang + '/index.html';
  if (!fs.existsSync(path.join(dist, page.split('/').join(path.sep)))) {
    throw new Error('dist' + page + ' がありません。先に node tools/build.js を実行してください。');
  }

  const server = spawn(process.execPath, [path.join(__dirname, 'serve.js')], { stdio: 'ignore' });
  const stop = () => { server.kill(); };
  process.on('exit', stop);

  let up = false;
  for (let i = 0; i < 40 && !up; i++) {
    await sleep(200);
    try {
      up = (await fetch('http://localhost:' + SERVE_PORT + page)).ok;
    } catch (err) { /* まだ起きていない */ }
  }
  if (!up) { stop(); throw new Error('確認用サーバーが起動しませんでした'); }

  const chrome = await openChrome();

  try {
    await chrome.send('Page.enable');
    await chrome.send('Runtime.enable');
    await chrome.send('Emulation.setDeviceMetricsOverride',
      { width: VIEW.width, height: VIEW.height, deviceScaleFactor: 1, mobile: false });
    await chrome.send('Page.navigate', { url: 'http://localhost:' + SERVE_PORT + page });
    await sleep(3000);

    await chrome.evaluate("document.getElementById('btn-template').click()");
    await sleep(2500);

    // 「まだ保存がない」旨の告知は、撮影用の新しいプロファイルだから
    // 出ているもの。機能の説明ではないので畳む
    await chrome.evaluate([
      '(function () {',
      '  var hide = function () {',
      "    Array.prototype.forEach.call(document.querySelectorAll('.template-group'), function (g) {",
      "      var h = g.querySelector('h3');",
      '      if (h && /^(My templates|マイテンプレート)/.test(h.textContent)) g.style.display = "none";',
      '    });',
      '  };',
      '  hide();',
      "  new MutationObserver(hide).observe(document.getElementById('template-list'), { childList: true });",
      '  return true;',
      '})()'
    ].join('\n'));
    await sleep(400);

    const clip = await chrome.evaluate([
      '(function () {',
      "  var r = document.querySelector('#template-modal .modal, #template-modal > *').getBoundingClientRect();",
      '  return { x: Math.round(r.x), y: Math.round(r.y),',
      '           width: Math.round(r.width), height: Math.round(r.height) };',
      '})()'
    ].join('\n'));

    const frames = [];
    for (const s of SHOTS) {
      await chrome.evaluate([
        '(function () {',
        '  var chip = document.querySelector(\'.theme-chip[data-theme="' + s.look + '"]\');',
        "  if (chip && !chip.classList.contains('active')) chip.click();",
        '  return true;',
        '})()'
      ].join('\n'));
      await sleep(700);

      if (s.accent !== undefined) {
        await chrome.evaluate([
          '(function () {',
          "  var chips = document.querySelectorAll('.accent-chip');",
          '  var c = chips[' + s.accent + '];',
          "  if (c && !c.classList.contains('active')) c.click();",
          '  return true;',
          '})()'
        ].join('\n'));
        await sleep(700);
      }

      await sleep(1400);   // サムネイルが出そろうのを待つ

      const img = readPng(await chrome.shot(clip));
      frames.push({ rgb: img.rgb, hold: s.hold, width: img.width, height: img.height });
      console.log('  撮影  ' + s.look +
        (s.accent !== undefined ? ' / 差し色' + (s.accent + 1) : ''));
    }

    const width = frames[0].width;
    const height = frames[0].height;
    const gif = writeGif(frames, width, height);

    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, gif);

    const seconds = SHOTS.reduce((sum, s) => sum + s.hold, 0) / 1000;
    console.log('\n' + frames.length + 'コマ  ' + width + '×' + height + '  ' +
      seconds + '秒  ' + (gif.length / 1024).toFixed(0) + 'KB');
    console.log(out);
  } finally {
    chrome.close();
    stop();
  }
}

main().catch((err) => {
  console.error('失敗: ' + err.message);
  process.exit(1);
});
