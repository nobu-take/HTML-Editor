/**
 * 画面に出る文言を洗い出して、辞書の雛形を作る。
 *
 *   node tools/extract-strings.js
 *
 * locales/_source.json に、日本語の文言を「そのまま鍵」にして並べます。
 * 鍵を別に発明しないのは、訳し漏れがそのまま日本語として画面に出て、
 * すぐ気づけるからです。鍵を作ると、漏れは空欄や記号になって埋もれます。
 *
 * 拾う場所は3つ。
 *   ・Index.html   … タグの中身と、placeholder / title / aria-label / alt
 *   ・JavaScript.html と store.js … コード中の文字列（コメントは除く）
 *   ・Templates.js  … テンプレートの名前・説明と、HTMLの中の文字
 *
 * 差し替えは文字列の長い順に行います（tools/build.js）。
 * 「保存」より先に「保存先」を置き換えないと、後者が壊れるためです。
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'src');
const read = (name) => fs.readFileSync(path.join(src, name), 'utf8');

const JP = /[぀-ヿ㐀-䶿一-鿿ｦ-ﾟ]/;
const hasJp = (s) => JP.test(s);

const found = new Map();   // 文言 → どこで見つけたか

function add(text, where) {
  const value = String(text).trim();
  if (!value || !hasJp(value)) return;
  if (!found.has(value)) found.set(value, new Set());
  found.get(value).add(where);
}

// --- Index.html -------------------------------------------------------------

const index = read('Index.html');

// タグの中身。入れ子のタグをまたぐものは拾わない（訳しにくいので手当て対象）
(index.match(/>[^<>]+</g) || []).forEach((m) => add(m.slice(1, -1), 'index'));

// 属性
(index.match(/(?:placeholder|title|aria-label|alt)="([^"]*)"/g) || []).forEach((m) => {
  add(m.slice(m.indexOf('"') + 1, -1), 'index');
});

// --- JavaScript.html --------------------------------------------------------

const js = (read('JavaScript.html') + '\n' + read('store.js'))
  .replace(/\/\*[\s\S]*?\*\//g, '')      // ブロックコメント
  .replace(/^[ \t]*\/\/.*$/gm, '');      // 行コメント

(js.match(/'(?:[^'\\\n]|\\.)*'/g) || []).forEach((m) => add(m.slice(1, -1), 'js'));
(js.match(/"(?:[^"\\\n]|\\.)*"/g) || []).forEach((m) => add(m.slice(1, -1), 'js'));

// --- テンプレートと部品 -----------------------------------------------------

const library = new Function(
  read('Templates.js').replace('{{IMAGE_BASE}}', '/img/')
  + '\nreturn { templates: getTemplates(), parts: getParts() };'
)();

function fromHtml(html, where) {
  // タグの外に出ている文字だけを拾う
  (String(html).match(/>[^<>]+</g) || []).forEach((m) => add(m.slice(1, -1), where));

  /*
     HTMLコメントも拾う。

     テンプレートの中の注記（Outlook対策の理由など）は、書き出したHTMLに
     そのまま入ります。訳さずに置くと、英語版から日本語のコメント付きの
     HTMLが出てきます。
  */
  (String(html).match(/<!--[\s\S]*?-->/g) || []).forEach((m) => add(m.slice(4, -3), where));
  // alt と title も画面に出る
  (String(html).match(/(?:alt|title)="([^"]*)"/g) || []).forEach((m) => {
    add(m.slice(m.indexOf('"') + 1, -1), where);
  });
}

(library.templates.templates || []).forEach((t) => {
  add(t.name, 'template');
  add(t.description, 'template');
  add(t.category, 'template');
  fromHtml(t.html, 'template');
});

(library.templates.categories || []).forEach((c) => add(c, 'template'));
(library.parts || []).forEach((p) => { add(p.name, 'part'); fromHtml(p.html, 'part'); });

// --- 書き出し ---------------------------------------------------------------

// 長い順。差し替えのとき、短いものが長いものを食わないように
const list = [...found.keys()].sort((a, b) => b.length - a.length);

/*
   洗い出した結果は locales/_source.json に書く。

   はじめは ja.json に書いていた。しかしあれは日本語版の**訳**が入る
   ファイルでもある（独立版では「マイドライブ」を「作業中」と言い換える）。
   洗い出すたびに上書きすると、その言い換えが黙って消える。
   実際に一度消して、日本語版だけ元のアプリの言い回しに戻っていた。

   洗い出す先と、訳を置く先は分けること。
*/
const dict = {};
list.forEach((k) => { dict[k] = k; });

const dir = path.join(root, 'locales');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, '_source.json'), JSON.stringify(dict, null, 2) + '\n', 'utf8');

const counts = {};
found.forEach((wheres) => {
  wheres.forEach((w) => { counts[w] = (counts[w] || 0) + 1; });
});

console.log('locales/_source.json に ' + list.length + ' 件を書き出しました');
Object.keys(counts).sort().forEach((k) => console.log('  ' + k + ': ' + counts[k] + ' 件'));

const chars = list.reduce((n, s) => n + s.length, 0);
console.log('  文字数の合計: 約' + chars.toLocaleString() + ' 文字');
