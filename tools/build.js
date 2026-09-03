/**
 * 各言語版を1枚ずつのHTMLに組み立てる。
 *
 *   node tools/build.js
 *
 * locales/index.json にある言語ぶんだけ作ります。
 *
 *   dist/index.html        … 既定の言語
 *   dist/<lang>/index.html … それ以外
 *
 * これ1枚で動きます。サーバーもデータベースも要りません。
 * Cloudflare Pages に置くのは dist/ です。
 *
 * ---------------------------------------------------------------------------
 * 訳の当て方
 *
 * 文言を t('key') のような呼び出しに書き換える作りにはしていません。
 * 画面側は元のアプリと共通なので、書き換えると差が積み上がります。
 *
 * 代わりに、**文言が現れる場所を特定して、そこだけ差し替え**ます。
 * 場所は tools/extract-strings.js が拾うのと同じ3種類です。
 *
 *   ・タグの中身        >ここ<
 *   ・画面に出る属性    placeholder / title / aria-label / alt
 *   ・コード中の文字列  'ここ' と "ここ"
 *
 * 素朴な文字列置換にしないのは、短い語が長い語を食うからです。
 * 「保存」を先に置き換えると「保存先」が壊れます。場所を特定してから
 * **完全一致**でだけ差し替えれば、これは起きません。
 * ---------------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'src');
const outDir = path.join(root, 'dist');

const read = (name) => fs.readFileSync(path.join(src, name), 'utf8');

const config = JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));
const imageBase = config.imageBase || '/img/';

const locales = JSON.parse(fs.readFileSync(path.join(root, 'locales', 'index.json'), 'utf8'));

const JP = /[぀-ヿ㐀-䶿一-鿿ｦ-ﾟ]/;

// ---------------------------------------------------------------------------
// 差し替え
// ---------------------------------------------------------------------------

/**
 * 訳が無ければ元のまま返す。
 *
 * 訳し漏れは画面に日本語として出ます。空欄や鍵の名前が出るより、
 * 「ここだけ日本語だ」のほうがずっと気づきやすいためです。
 * ビルドのときにも件数を出します。
 */
function translator(dict) {
  const missing = new Set();

  function at(text) {
    const key = String(text).trim();
    if (!key) return text;

    if (!Object.prototype.hasOwnProperty.call(dict, key)) {
      if (JP.test(key)) missing.add(key);
      return text;
    }

    // 前後の空白は元のまま残す。詰めると詰まって見える
    return String(text).replace(key, dict[key]);
  }

  /** 訳があるか。触ってよいかどうかの判断に使う */
  function has(text) {
    return Object.prototype.hasOwnProperty.call(dict, String(text).trim());
  }

  return { at, has, missing };
}

/** タグの中身と、画面に出る属性 */
function markup(html, t) {
  return html
    .replace(/>([^<>]+)</g, (all, inner) => '>' + t.at(inner) + '<')
    .replace(/(placeholder|title|aria-label|alt)="([^"]*)"/g,
      // 属性の中に " が入ると、そこで属性が閉じてしまう
      (all, name, value) => name + '="' + String(t.at(value)).split('"').join('&quot;') + '"');
}

/*
   テンプレートと部品は、HTMLコメントも訳す。

   中の注記（「ボタンは table で組むと Outlook でも角丸が保たれる」など）は、
   利用者が書き出したHTMLにそのまま入るためです。訳さずに置くと、英語版から
   日本語のコメント付きのHTMLが出てきます。

   画面の骨組み（Index.html）のコメントは訳しません。あちらは中を直す人への
   注記で、利用者の手元には出て行きません。
*/
function templateMarkup(html, t) {
  return markup(
    html.replace(/<!--([\s\S]*?)-->/g, (all, inner) => '<!--' + t.at(inner) + '-->'),
    t
  );
}

/*
   コード中の文字列。

   引用符の種類はそのまま保ち、**中身は必ず逃がす**。

   ここは一度事故を起こしている。英語の訳には "The AI's reply" のように
   アポストロフィが入る。素通しで 'ここ' に戻すと引用符がそこで閉じ、
   その先のコードが全部壊れる。画面は真っ白になり、手がかりは
   「missing ) after argument list」だけ。

   訳は人が書くもので、記号が混じる前提で扱うこと。
*/
function escapeFor(quote, text) {
  return String(text)
    .split('\\').join('\\\\')
    .split(quote).join('\\' + quote);
}

/*
   訳を当てた文字列だけを逃がす。

   はじめは全部の文字列に逃がし処理をかけて、日本語版まで壊した。
   元のコードには "'Hiragino Sans','Yu Gothic'" のように引用符を含む
   リテラルや、\\u200b のような書き方が普通にある。訳と関係の無いものに
   手を入れれば、当然そこが壊れる。

   触らないものには一切触らないこと。
*/
function code(js, t) {
  const swap = (quote) => (all, body) => {
    if (!t.has(body)) return all;                   // 訳が無いものはそのまま
    return quote + escapeFor(quote, t.at(body)) + quote;
  };

  return js
    .replace(/'((?:[^'\\\n]|\\.)*)'/g, swap("'"))
    .replace(/"((?:[^"\\\n]|\\.)*)"/g, swap('"'));
}

// ---------------------------------------------------------------------------
// 画面に足すもの
// ---------------------------------------------------------------------------

const HIDE = `
<style>
  /* 保存先はこのブラウザの中なので、フォルダを開く・設定する入口は無い */
  #btn-open-folder,
  #btn-loc-settings { display: none !important; }

  /* 同じ理由で、保存先を選ぶ画面ごと出さない */
  #loc-modal { display: none !important; }

  /* 言語の切り替え */
  .lang-pick {
    margin-left: 6px;
    padding: 3px 22px 3px 7px;
    border: 0;
    border-radius: var(--radius);
    background: var(--sunken);
    color: var(--muted);
    font: inherit;
    font-size: 11px;
    cursor: pointer;
    appearance: none;
  }

  .lang-pick:hover { color: var(--text); }
</style>
`;

// 覚えている表示サイズを、画面が組み上がる前に当てる。
// あとから当てると、大きさが一瞬飛んで見える。
const BOOT = `<script>
(function () {
  try {
    var saved = JSON.parse(localStorage.getItem('html-editor:settings')) || {};
    if (saved.uiScale) document.documentElement.style.zoom = saved.uiScale;
    window.SCALE_HINT_DONE = !!saved.scaleHintDone;
  } catch (e) {
    window.SCALE_HINT_DONE = false;
  }
})();
</script>
`;

/*
   言語の切り替え。

   保存はこのドメインの localStorage にあり、言語ごとには分かれません。
   切り替えても、それまでの原稿はそのまま見えます。
*/
function languageMenu(lang, meta) {
  const options = Object.keys(locales.languages).map((key) => {
    const to = key === locales.default ? '/' : '/' + key + '/';
    return '<option value="' + to + '"' + (key === lang ? ' selected' : '') + '>'
      + locales.languages[key].name + '</option>';
  }).join('');

  return '<script>\n'
    + 'window.addEventListener(\'DOMContentLoaded\', function () {\n'
    + '  var pick = document.createElement(\'select\');\n'
    + '  pick.className = \'lang-pick\';\n'
    + '  pick.setAttribute(\'aria-label\', ' + JSON.stringify(meta.switchLabel) + ');\n'
    + '  pick.innerHTML = ' + JSON.stringify(options) + ';\n'
    + '  pick.addEventListener(\'change\', function () { location.href = pick.value; });\n'
    + '\n'
    + '  var status = document.getElementById(\'status\');\n'
    + '  if (status && status.parentNode) status.parentNode.insertBefore(pick, status);\n'
    + '  else document.querySelector(\'header\').appendChild(pick);\n'
    + '});\n'
    + '</script>\n';
}

// ---------------------------------------------------------------------------
// 1言語ぶん
// ---------------------------------------------------------------------------

function buildLocale(lang, meta) {
  const dict = JSON.parse(
    fs.readFileSync(path.join(root, 'locales', lang + '.json'), 'utf8')
  );
  const t = translator(dict);

  // テンプレートは、フォントも言語ごとに差し替える
  const library = new Function(
    read('Templates.js')
      .replace('{{IMAGE_BASE}}', imageBase)
      .replace(/var FONT_STACK = "[^"]*";/, 'var FONT_STACK = ' + JSON.stringify(meta.font) + ';')
    + '\nreturn { templates: getTemplates(), parts: getParts() };'
  )();

  const templates = library.templates;
  const parts = library.parts;

  (templates.templates || []).forEach((tpl) => {
    tpl.name = t.at(tpl.name);
    tpl.description = t.at(tpl.description);
    tpl.category = t.at(tpl.category);
    tpl.html = templateMarkup(tpl.html, t);
  });

  templates.categories = (templates.categories || []).map((c) => t.at(c));
  parts.forEach((p) => { p.name = t.at(p.name); p.html = templateMarkup(p.html, t); });

  const store = '<script>\n'
    + code(read('store.js'), t)
        .replace('{{TEMPLATES}}', JSON.stringify(templates))
        .replace('{{PARTS}}', JSON.stringify(parts))
    + '\n</script>\n';

  /*
     訳すのは Index.html の骨組みだけ。

     はじめは組み上がったHTML全体に当てていたが、それでは `<style>` の中の
     CSS や、コードのコメントまで「タグの中身」として拾ってしまう。
     訳し漏れの報告が偽物で埋まり、本当の漏れが見えなくなった。
     差し込む前に、それぞれの形に合った当て方をする。
  */
  let html = markup(read('Index.html'), t)
    // Apps Script のテンプレート構文。独立版では表示サイズを store から読む
    .replace(/<\?!=[\s\S]*?uiScale[\s\S]*?\?>/, '')
    .replace("<?!= include('Stylesheet'); ?>", read('Stylesheet.html') + HIDE)
    .replace("<?!= include('JavaScript'); ?>", store + code(read('JavaScript.html'), t));

  html = html
    .replace('<html lang="ja">', '<html lang="' + lang + '">')
    .replace('<head>', '<head>\n' + BOOT + languageMenu(lang, meta));

  return { html, missing: t.missing, size: Object.keys(dict).length };
}

// ---------------------------------------------------------------------------

fs.mkdirSync(outDir, { recursive: true });

let shortfall = 0;

Object.keys(locales.languages).forEach((lang) => {
  const meta = locales.languages[lang];
  const built = buildLocale(lang, meta);

  const dir = lang === locales.default ? outDir : path.join(outDir, lang);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), built.html, 'utf8');

  const kb = (Buffer.byteLength(built.html) / 1024).toFixed(0);
  const where = lang === locales.default ? 'dist/index.html' : 'dist/' + lang + '/index.html';

  console.log(where + '  ' + kb + ' KB / 辞書 ' + built.size + '件'
    + (built.missing.size ? ' / 訳し漏れ ' + built.missing.size + '件' : ''));

  if (built.missing.size) {
    shortfall += built.missing.size;
    [...built.missing].slice(0, 6).forEach((m) => console.log('    ・' + m.slice(0, 56)));
    if (built.missing.size > 6) console.log('    …ほか ' + (built.missing.size - 6) + '件');
  }
});

// 見本画像も一緒に配る。テンプレートが指している先はここ
const imgSrc = path.join(root, 'assets', 'img');
const imgOut = path.join(outDir, 'img');
fs.mkdirSync(imgOut, { recursive: true });

const images = fs.readdirSync(imgSrc)
  .filter((f) => /\.(png|jpe?g|gif|webp|svg)$/i.test(f));

images.forEach((f) => fs.copyFileSync(path.join(imgSrc, f), path.join(imgOut, f)));

console.log('見本画像 ' + images.length + '枚（置き場: ' + imageBase + '）');
if (shortfall) console.log('訳し漏れが合計 ' + shortfall + '件あります。');
