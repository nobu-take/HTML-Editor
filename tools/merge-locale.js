/**
 * 分けて書いた訳を、1つの辞書にまとめる。
 *
 *   node tools/merge-locale.js en
 *
 * locales/parts/<lang>-*.json を読み、locales/ja.json の並び順で
 * locales/<lang>.json を作ります。
 *
 * 辞書を分けているのは、901件を1つのファイルで扱うと、どこを直したのか
 * 見失うためです。まとめる側で、次の2つを必ず報告します。
 *
 *   ・まだ訳が無いもの        → 画面には日本語のまま出る
 *   ・元に無い鍵が混じったもの → 打ち間違い。黙って無視されるので危ない
 */

const fs = require('fs');
const path = require('path');

const lang = process.argv[2];
if (!lang) {
  console.error('言語を指定してください（例: node tools/merge-locale.js en）');
  process.exit(1);
}

const root = path.join(__dirname, '..');
const dir = path.join(root, 'locales');

const base = JSON.parse(fs.readFileSync(path.join(dir, 'ja.json'), 'utf8'));

const partsDir = path.join(dir, 'parts');
const files = fs.existsSync(partsDir)
  ? fs.readdirSync(partsDir).filter((f) => f.startsWith(lang + '-') && f.endsWith('.json')).sort()
  : [];

if (!files.length) {
  console.error('locales/parts/ に ' + lang + '-*.json がありません');
  process.exit(1);
}

const merged = {};
const stray = [];
const dup = [];

files.forEach((f) => {
  const part = JSON.parse(fs.readFileSync(path.join(partsDir, f), 'utf8'));

  Object.keys(part).forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(base, key)) {
      stray.push(f + ' : ' + key.slice(0, 40));
      return;
    }
    if (Object.prototype.hasOwnProperty.call(merged, key) && merged[key] !== part[key]) {
      dup.push(key.slice(0, 40));
    }
    merged[key] = part[key];
  });

  console.log(f + ' … ' + Object.keys(part).length + '件');
});

// ja.json の並びで書き出す。差分が読みやすい
const out = {};
Object.keys(base).forEach((key) => {
  if (Object.prototype.hasOwnProperty.call(merged, key)) out[key] = merged[key];
});

fs.writeFileSync(path.join(dir, lang + '.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');

const total = Object.keys(base).length;
const done = Object.keys(out).length;

console.log('');
console.log('locales/' + lang + '.json … ' + done + ' / ' + total + '件'
  + '（残り ' + (total - done) + '件）');

if (stray.length) {
  console.log('');
  console.log('【要確認】元の文言に無い鍵が ' + stray.length + '件あります。打ち間違いの可能性:');
  stray.slice(0, 10).forEach((s) => console.log('  ' + s));
  if (stray.length > 10) console.log('  …ほか ' + (stray.length - 10) + '件');
}

if (dup.length) {
  console.log('');
  console.log('【要確認】同じ鍵に違う訳が ' + dup.length + '件:');
  [...new Set(dup)].slice(0, 10).forEach((s) => console.log('  ' + s));
}
