/**
 * ジャンルごとの差を数字で並べる。
 *
 *   node tools/diff-genres.js [テンプレート名の一部]
 *
 * 「色が変わっただけ」になっていないかを確かめるための道具です。
 * 見出しの大きさ・行間・余白・ボタンの形が、ジャンルごとに動いているか。
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const want = process.argv[2] || 'CTA';

const locales = JSON.parse(fs.readFileSync(path.join(root, 'locales', 'index.json'), 'utf8'));
const meta = locales.languages[locales.default];

const themes = new Function(
  fs.readFileSync(path.join(root, 'src', 'themes.js'), 'utf8')
    .replace('{{FONT_SANS}}', JSON.stringify(meta.font))
    .replace('{{FONT_SERIF}}', JSON.stringify(meta.fontSerif || meta.font))
  + '\nreturn { THEMES: THEMES, applyTheme: applyTheme };'
)();

const config = JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));

const library = new Function(
  fs.readFileSync(path.join(root, 'src', 'Templates.js'), 'utf8')
    .replace('{{IMAGE_BASE}}', config.imageBase)
  + '\nreturn { templates: getTemplates() };'
)();

const tpl = library.templates.templates.find((t) => t.name.indexOf(want) >= 0)
  || library.templates.templates[0];

function look(html) {
  const sizes = (html.match(/font-size:\s*(\d+)px/g) || [])
    .map((s) => Number(s.match(/(\d+)/)[1]));

  const heading = Math.max.apply(null, sizes);
  const body = sizes.filter((n) => n >= 12 && n < 18).sort((a, b) => b - a)[0];

  const lines = [...new Set((html.match(/line-height:\s*([\d.]+)(?![\dpx%])/g) || [])
    .map((s) => s.split(':')[1].trim()))].sort();

  // ポップは幅いっぱいにするので display:block になる。両方拾う
  const btn = html.match(/style="[^"]*display:\s*(?:inline-)?block[^"]*text-decoration[^"]*"/i);
  const btnPad = btn ? (btn[0].match(/padding:\s*([^;]*)/i) || [])[1] : '';
  const btnR = btn ? (btn[0].match(/border-radius:\s*([^;]*)/i) || [])[1] : '';

  const pads = [...new Set((html.match(/padding:\s*32px[^;"]*|padding:\s*\d+px \d+px \d+px \d+px/g) || []))];
  const accent = (html.match(/bgcolor="(#[0-9a-fA-F]{6})"[^>]*>\s*<a/i) || [])[1]
    || (html.match(/bgcolor="(#[0-9a-fA-F]{6})"/i) || [])[1];

  const serif = /Mincho|Georgia|serif"/.test(html) && !/sans-serif/.test(html.split('font-family')[1] || '');
  const weight = [...new Set((html.match(/font-weight:\s*([^;"]*)/g) || []).map((s) => s.split(':')[1].trim()))];
  const rule = [...new Set((html.match(/border-top:\s*[^;"]*/g) || []))];

  return { heading, body, lines, btnPad, btnR, pads: pads[0] || '', accent, serif, weight, rule: rule[0] || '' };
}

console.log('「' + tpl.name + '」— ジャンルごとの差\n');

const head = ['ジャンル', '見出しの置き方', '見出し', '本文', '行間', 'ボタンの余白', 'ボタンの角', '幅', '差し色'];
const rows = themes.THEMES.map((theme) => {
  const v = look(themes.applyTheme(tpl.html, theme.key));
  const full = /<table[^>]*width="100%"[^>]*>\s*<tr>\s*<td[^>]*bgcolor="#[0-9a-fA-F]{6}"[^>]*>\s*<a/i
    .test(themes.applyTheme(tpl.html, theme.key));
  return [
    theme.name,
    { plain: 'そのまま', rule: '中央＋罫線', bar: '左に線', band: '塗り・白抜き', topline: '上に線' }[theme.heading] || theme.heading,
    v.heading + 'px',
    v.body + 'px',
    v.lines.join('/'),
    v.btnPad,
    v.btnR,
    full ? '幅いっぱい' : '幅なり',
    v.accent
  ];
});

const widths = head.map((h, i) =>
  Math.max(strWidth(h), ...rows.map((r) => strWidth(String(r[i])))));

function strWidth(s) {
  let n = 0;
  for (const ch of String(s)) n += /[^\x00-\xff]/.test(ch) ? 2 : 1;
  return n;
}

function pad(s, w) {
  return String(s) + ' '.repeat(Math.max(0, w - strWidth(s)));
}

console.log(head.map((h, i) => pad(h, widths[i])).join('  '));
console.log(widths.map((w) => '-'.repeat(w)).join('  '));
rows.forEach((r) => console.log(r.map((c, i) => pad(c, widths[i])).join('  ')));

console.log('\n書体:');
themes.THEMES.forEach((theme) => {
  const html = themes.applyTheme(tpl.html, theme.key);
  const first = (html.match(/font-family:\s*([^;"]*)/) || [])[1] || '';
  console.log('  ' + theme.name + ': ' + first.split(',')[0]);
});
