/**
 * タブのアイコンを作る。
 *
 *   node tools/make-icons.js
 *
 * assets/icon/ に SVG と PNG を書き出します。外部ライブラリは使いません。
 *
 * ---------------------------------------------------------------------------
 * 描き方
 *
 * 図形を「点との距離」で表して、距離が線の太さの半分より近ければ塗る、
 * という判定で描いています。パスを塗る仕組みを書かずに済み、4倍で描いて
 * 縮めるだけで縁がなめらかになります。
 *
 * ---------------------------------------------------------------------------
 * なぜこの絵か
 *
 * 16pxで読めることがすべてです。封筒は、その大きさでも形が分かる数少ない
 * 図のひとつ。フラップを開いた形にして、コードの山括弧にも見えるようにして
 * あります。
 *
 * 地は差し色の青。明るいタブでも暗いタブでも沈まないためです。地を暗く
 * すると、暗いブラウザの見た目に溶けます。
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = path.join(__dirname, '..', 'assets', 'icon');
const SS = 4;   // 何倍で描いてから縮めるか

const TILE = '#1a73e8';
const MARK = '#ffffff';

const rgb = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16)
];

// ---------------------------------------------------------------------------
// 距離
// ---------------------------------------------------------------------------

/** 角の丸い四角の縁までの距離。中が負、外が正 */
function roundedBox(px, py, cx, cy, hw, hh, r) {
  const dx = Math.abs(px - cx) - hw + r;
  const dy = Math.abs(py - cy) - hh + r;
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  return outside + Math.min(Math.max(dx, dy), 0) - r;
}

/** 線分までの距離 */
function segment(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;

  const len = vx * vx + vy * vy;
  const t = len ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / len)) : 0;

  return Math.hypot(wx - vx * t, wy - vy * t);
}

// ---------------------------------------------------------------------------
// 絵
// ---------------------------------------------------------------------------

/*
   32×32 を基準に置いた座標。どの大きさで書き出すときも、この比率で拡大する。
*/
const ART = {
  radius: 7,          // 地の角丸
  body: { cx: 16, cy: 16.6, hw: 9, hh: 6.4, r: 1.6 },
  flap: [[8.4, 11.9], [16, 17.6], [23.6, 11.9]],
  stroke: 2.2
};

/**
 * その点の色を返す。
 * @return {Array|null} [r,g,b,a] 0-255。地の外なら透明
 */
function shade(x, y, size, square) {
  const k = size / 32;
  const half = ART.stroke * k / 2;

  // 地
  const tile = square
    ? Math.max(Math.abs(x - size / 2) - size / 2, Math.abs(y - size / 2) - size / 2)
    : roundedBox(x, y, size / 2, size / 2, size / 2, size / 2, ART.radius * k);

  if (tile > 0.5) return null;

  // 封筒の枠
  const body = ART.body;
  const edge = Math.abs(roundedBox(
    x, y, body.cx * k, body.cy * k, body.hw * k, body.hh * k, body.r * k
  ));

  // フラップ
  let flap = Infinity;
  for (let i = 0; i < ART.flap.length - 1; i++) {
    const a = ART.flap[i];
    const b = ART.flap[i + 1];
    flap = Math.min(flap, segment(x, y, a[0] * k, a[1] * k, b[0] * k, b[1] * k));
  }

  const mark = Math.min(edge, flap);

  return mark <= half ? rgb(MARK).concat(255) : rgb(TILE).concat(255);
}

// ---------------------------------------------------------------------------
// 書き出し
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = -1;
  for (let i = 0; i < buffer.length; i++) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/** 透明を含めたいので RGBA（カラータイプ6）で書く */
function encodePng(size, pixels) {
  const stride = size * 4;
  const raw = Buffer.alloc(size * (stride + 1));

  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const chunk = (type, body) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(body.length, 0);
    const typed = Buffer.concat([Buffer.from(type, 'ascii'), body]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typed), 0);
    return Buffer.concat([length, typed, crc]);
  };

  const head = Buffer.alloc(13);
  head.writeUInt32BE(size, 0);
  head.writeUInt32BE(size, 4);
  head[8] = 8;    // ビット深度
  head[9] = 6;    // RGBA
  head[10] = 0;
  head[11] = 0;
  head[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', head),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function draw(size, square) {
  const big = size * SS;
  const out = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = (x * SS + sx + 0.5) / SS;
          const py = (y * SS + sy + 0.5) / SS;
          const c = shade(px, py, size, square);
          if (!c) continue;
          r += c[0]; g += c[1]; b += c[2]; a += c[3];
        }
      }

      const n = SS * SS;
      const at = (y * size + x) * 4;

      // 透明なところで色が濁らないよう、色は塗った点だけで平均する
      const filled = a / 255;
      out[at] = filled ? Math.round(r / filled) : 0;
      out[at + 1] = filled ? Math.round(g / filled) : 0;
      out[at + 2] = filled ? Math.round(b / filled) : 0;
      out[at + 3] = Math.round(a / n);
    }
  }

  return encodePng(size, out);
}

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-label="HTML Editor for Email">
  <rect width="32" height="32" rx="${ART.radius}" fill="${TILE}"/>
  <rect x="${ART.body.cx - ART.body.hw}" y="${ART.body.cy - ART.body.hh}"
        width="${ART.body.hw * 2}" height="${ART.body.hh * 2}" rx="${ART.body.r}"
        fill="none" stroke="${MARK}" stroke-width="${ART.stroke}"/>
  <path d="M${ART.flap[0][0]} ${ART.flap[0][1]} L${ART.flap[1][0]} ${ART.flap[1][1]} L${ART.flap[2][0]} ${ART.flap[2][1]}"
        fill="none" stroke="${MARK}" stroke-width="${ART.stroke}"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'favicon.svg'), SVG, 'utf8');

// 角丸つき。タブとブックマーク用
[16, 32, 48].forEach((size) => {
  fs.writeFileSync(path.join(OUT_DIR, 'favicon-' + size + '.png'), draw(size, false));
});

// iOS は自分で角を丸めるので、こちらは四角のまま
fs.writeFileSync(path.join(OUT_DIR, 'apple-touch-icon.png'), draw(180, true));

fs.readdirSync(OUT_DIR).sort().forEach((f) => {
  const n = fs.statSync(path.join(OUT_DIR, f)).size;
  console.log('  ' + f.padEnd(22) + (n / 1024).toFixed(1) + ' KB');
});
