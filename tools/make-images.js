/**
 * テンプレート用の画像を生成する。
 *
 *   node tools/make-images.js
 *
 * できたPNGを https://mypage.abitus.co.jp/public/data/_img/ に置く。
 *
 * 写真は使わない。この環境に画像処理の道具が無く、拾ってきた写真を枠の寸法へ
 * 切り出せないため。代わりに、グラデーションと幾何形で構成した図を描いている。
 * 権利の心配が要らず、寸法も自由に決められる。
 *
 * 縁を滑らかにするため、2倍の大きさで描いてから縮めている（スーパーサンプリング）。
 * 外部ライブラリは使わない。PNGは zlib だけで書ける。
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = path.join(__dirname, '..', 'assets', 'img');
const SS = 3;   // 何倍で描いてから縮めるか

// ---------------------------------------------------------------------------
// 描く道具
// ---------------------------------------------------------------------------

/** 0-255 の色を 0-1 の配列に */
const rgb = (hex) => [
  parseInt(hex.slice(1, 3), 16) / 255,
  parseInt(hex.slice(3, 5), 16) / 255,
  parseInt(hex.slice(5, 7), 16) / 255
];

function createCanvas(w, h) {
  return { w: w, h: h, data: new Float64Array(w * h * 3) };
}

/**
 * 斜めのグラデーションで塗りつぶす。
 * @param {number} angle 度。0で左→右、90で上→下
 * @param {Array} stops [[位置0-1, '#hex'], ...]
 */
function fillGradient(cv, angle, stops) {
  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);

  // 画面の対角に沿って 0-1 になるよう正規化する
  const span = Math.abs(dx) * cv.w + Math.abs(dy) * cv.h;
  const originX = dx < 0 ? cv.w : 0;
  const originY = dy < 0 ? cv.h : 0;

  const colors = stops.map(([at, hex]) => [at, rgb(hex)]);

  for (let y = 0; y < cv.h; y++) {
    for (let x = 0; x < cv.w; x++) {
      const t = Math.min(1, Math.max(0, ((x - originX) * dx + (y - originY) * dy) / span));

      let i = 0;
      while (i < colors.length - 2 && t > colors[i + 1][0]) i++;

      const [a0, c0] = colors[i];
      const [a1, c1] = colors[i + 1];
      const k = a1 === a0 ? 0 : (t - a0) / (a1 - a0);
      const e = Math.min(1, Math.max(0, k));

      const at = (y * cv.w + x) * 3;
      cv.data[at] = c0[0] + (c1[0] - c0[0]) * e;
      cv.data[at + 1] = c0[1] + (c1[1] - c0[1]) * e;
      cv.data[at + 2] = c0[2] + (c1[2] - c0[2]) * e;
    }
  }
}

/** 1画素に色を重ねる */
function blend(cv, x, y, color, alpha) {
  if (alpha <= 0 || x < 0 || y < 0 || x >= cv.w || y >= cv.h) return;
  const at = (y * cv.w + x) * 3;
  cv.data[at] += (color[0] - cv.data[at]) * alpha;
  cv.data[at + 1] += (color[1] - cv.data[at + 1]) * alpha;
  cv.data[at + 2] += (color[2] - cv.data[at + 2]) * alpha;
}

/**
 * 円。内側を塗るか、輪だけにするかを選べる。
 * @param {Object} o {x, y, r, color, alpha, ring}
 */
function circle(cv, o) {
  const color = rgb(o.color);
  const alpha = o.alpha === undefined ? 1 : o.alpha;
  const ring = o.ring || 0;

  const x0 = Math.max(0, Math.floor(o.x - o.r - 2));
  const x1 = Math.min(cv.w - 1, Math.ceil(o.x + o.r + 2));
  const y0 = Math.max(0, Math.floor(o.y - o.r - 2));
  const y1 = Math.min(cv.h - 1, Math.ceil(o.y + o.r + 2));

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x + 0.5 - o.x, y + 0.5 - o.y);
      let cover;

      if (ring) {
        // 輪の中心からの距離で、縁を1画素ぶんぼかす
        cover = 1 - Math.min(1, Math.max(0, (Math.abs(d - o.r) - ring / 2) / 1));
      } else {
        cover = Math.min(1, Math.max(0, o.r - d));
      }

      blend(cv, x, y, color, alpha * cover);
    }
  }
}

/** 太さのある直線。斜めの装飾に使う */
function line(cv, o) {
  const color = rgb(o.color);
  const alpha = o.alpha === undefined ? 1 : o.alpha;
  const half = o.width / 2;

  const vx = o.x2 - o.x1;
  const vy = o.y2 - o.y1;
  const len2 = vx * vx + vy * vy;

  for (let y = 0; y < cv.h; y++) {
    for (let x = 0; x < cv.w; x++) {
      const wx = x + 0.5 - o.x1;
      const wy = y + 0.5 - o.y1;
      const t = Math.min(1, Math.max(0, (wx * vx + wy * vy) / len2));
      const d = Math.hypot(wx - vx * t, wy - vy * t);
      const cover = Math.min(1, Math.max(0, half - d));
      blend(cv, x, y, color, alpha * cover);
    }
  }
}

/** 縮めて、色を 0-255 のバイト列にする */
function downsample(cv, scale) {
  const w = cv.w / scale;
  const h = cv.h / scale;
  const out = Buffer.alloc(w * h * 3);
  const n = scale * scale;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0;
      let g = 0;
      let b = 0;

      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const at = ((y * scale + sy) * cv.w + (x * scale + sx)) * 3;
          r += cv.data[at];
          g += cv.data[at + 1];
          b += cv.data[at + 2];
        }
      }

      const at = (y * w + x) * 3;
      out[at] = Math.round(Math.min(1, r / n) * 255);
      out[at + 1] = Math.round(Math.min(1, g / n) * 255);
      out[at + 2] = Math.round(Math.min(1, b / n) * 255);
    }
  }

  return { w: w, h: h, pixels: out };
}

// ---------------------------------------------------------------------------
// PNG
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
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return c ^ 0xffffffff;
}

function encodePng(w, h, pixels) {
  const raw = Buffer.alloc(h * (w * 3 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    pixels.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  }

  const chunk = (type, body) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(body.length, 0);
    const typed = Buffer.concat([Buffer.from(type, 'ascii'), body]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typed) >>> 0, 0);
    return Buffer.concat([length, typed, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// ---------------------------------------------------------------------------
// 絵柄
//
// どれも「斜めのグラデーション + 大きな円がいくつか + 細い輪や線」で組む。
// 主役の文字が上に乗ることを考えて、明るさの差は控えめにしている。
// ---------------------------------------------------------------------------

const PALETTES = {
  // 主役のヘッダー用。落ち着いた濃紺から青へ
  deep: { grad: [[0, '#123a66'], [0.55, '#1a5aa8'], [1, '#2f7de0']], light: '#ffffff', dark: '#0d2947' },
  // 本文中の帯。文字を重ねることがあるので、明るめでも輪郭は残す
  soft: { grad: [[0, '#c8d8ee'], [0.5, '#aac4e4'], [1, '#8badd8']], light: '#ffffff', dark: '#4a6c99' },
  // 差し色。青ばかりにならないように
  teal: { grad: [[0, '#0f4f4a'], [0.55, '#157a6e'], [1, '#2aa89a']], light: '#ffffff', dark: '#0a3a36' },

  /*
     2カラムの左右で使う中間色。

     淡くしすぎると「画像が入っていない」ように見えてしまうので、
     写真の代わりとして成立する濃さにしている。
  */
  azure: { grad: [[0, '#2b62b8'], [0.5, '#3a7bd5'], [1, '#5f9de8']], light: '#ffffff', dark: '#1c4784' },
  moss: { grad: [[0, '#3d7358'], [0.5, '#4f8f6c'], [1, '#7ab894']], light: '#ffffff', dark: '#2a5340' },
  slate: { grad: [[0, '#5b6b80'], [0.5, '#75879e'], [1, '#9aaabd']], light: '#ffffff', dark: '#3d4a5c' }
};

/**
 * 円をいくつか散らす、共通の絵柄。
 * 位置と大きさは幅・高さの割合で置くので、どの寸法でも同じ雰囲気になる。
 */
function compose(cv, palette, variant) {
  const p = PALETTES[palette];
  const W = cv.w;
  const H = cv.h;
  const unit = Math.min(W, H);

  fillGradient(cv, variant.angle === undefined ? 24 : variant.angle, p.grad);

  (variant.circles || []).forEach((c) => {
    circle(cv, {
      x: W * c[0],
      y: H * c[1],
      r: unit * c[2],
      color: c[3] === 'l' ? p.light : p.dark,
      alpha: c[4],
      ring: c[5] ? unit * c[5] : 0
    });
  });

  (variant.lines || []).forEach((l) => {
    line(cv, {
      x1: W * l[0],
      y1: H * l[1],
      x2: W * l[2],
      y2: H * l[3],
      width: unit * l[4],
      color: l[5] === 'l' ? p.light : p.dark,
      alpha: l[6]
    });
  });
}

/* 絵柄の型。円は [x割合, y割合, 半径割合, 明/暗, 濃さ, 輪の太さ] */
const SCENES = {
  // 大きな円が右から差し込む。主役向け
  arcs: {
    angle: 22,
    circles: [
      [0.82, 0.18, 0.62, 'l', 0.10],
      [1.02, 0.72, 0.78, 'l', 0.08],
      [0.70, 0.95, 0.45, 'd', 0.12],
      [0.86, 0.30, 0.44, 'l', 0.22, 0.012],
      [0.20, -0.10, 0.30, 'l', 0.07]
    ],
    lines: [[0.0, 1.02, 0.55, -0.05, 0.006, 'l', 0.14]]
  },
  // 左に円がかたまる。本文中の画像向け
  cluster: {
    angle: 200,
    circles: [
      [0.16, 0.30, 0.52, 'l', 0.34],
      [0.34, 0.74, 0.40, 'l', 0.20],
      [0.08, 0.86, 0.30, 'd', 0.08],
      [0.62, 0.22, 0.34, 'l', 0.26, 0.014],
      [0.92, 0.66, 0.42, 'l', 0.16]
    ]
  },
  // 輪が重なる。小さい画像向け。1つの形に絞ると潰れにくい
  rings: {
    angle: 130,
    circles: [
      [0.66, 0.40, 0.46, 'l', 0.30, 0.030],
      [0.38, 0.66, 0.34, 'l', 0.36],
      [0.86, 0.86, 0.30, 'd', 0.10]
    ]
  },
  // 斜めに流れる。横長の画像向け
  sweep: {
    angle: 350,
    circles: [
      [0.28, 0.90, 0.56, 'l', 0.16],
      [0.74, 0.14, 0.48, 'l', 0.20],
      [0.50, 0.50, 0.30, 'l', 0.26, 0.012]
    ],
    lines: [
      [-0.05, 0.72, 1.05, 0.10, 0.010, 'l', 0.18],
      [-0.05, 0.90, 1.05, 0.28, 0.006, 'l', 0.12]
    ]
  }
};

const SHEET = [
  { name: 'sample-hero-600x240.png', w: 600, h: 240, palette: 'deep', scene: 'arcs' },
  { name: 'sample-wide-536x200.png', w: 536, h: 200, palette: 'soft', scene: 'sweep' },
  { name: 'sample-web-680x360.png', w: 680, h: 360, palette: 'teal', scene: 'arcs' },
  { name: 'sample-half-a-236x140.png', w: 236, h: 140, palette: 'azure', scene: 'cluster' },
  { name: 'sample-half-b-236x140.png', w: 236, h: 140, palette: 'moss', scene: 'cluster' },
  { name: 'sample-thumb-a-160x110.png', w: 160, h: 110, palette: 'deep', scene: 'rings' },
  { name: 'sample-thumb-b-160x110.png', w: 160, h: 110, palette: 'teal', scene: 'rings' }
];

// --- 実行 -----------------------------------------------------------------

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

SHEET.forEach((item) => {
  const cv = createCanvas(item.w * SS, item.h * SS);
  compose(cv, item.palette, SCENES[item.scene]);

  const small = downsample(cv, SS);
  const png = encodePng(small.w, small.h, small.pixels);

  fs.writeFileSync(path.join(OUT_DIR, item.name), png);
  console.log(item.name.padEnd(30) + item.w + '×' + item.h + '  ' + Math.round(png.length / 1024) + ' KB');
});

console.log('\n' + OUT_DIR + ' に書き出しました。');
