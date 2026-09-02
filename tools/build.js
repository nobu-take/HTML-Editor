/**
 * 独立版を1枚のHTMLに組み立てる。
 *
 *   node tools/build.js
 *
 * src/ の各ファイルを束ね、dist/index.html を作ります。
 * これ1枚で動きます。サーバーもデータベースも要りません。
 * Cloudflare Pages に置くのは、この dist/ です。
 *
 * 元はGoogle Apps Script のアプリでした。画面側（Index / Stylesheet /
 * JavaScript）はブラウザだけで動くので、そのまま使っています。
 * サーバー側にあたる部分だけを src/store.js に置き換えています。
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'src');
const outDir = path.join(root, 'dist');

const read = (name) => fs.readFileSync(path.join(src, name), 'utf8');

/*
   見本画像の置き場。config.json で決めます。

   既定は '/img/' で、このサイト自身が配ります。作った原稿をメールとして
   送るなら、絶対URL（https://例.com/img/）にしてください。相対のままだと、
   受け取った側では画像の在り処が分かりません。
*/
const config = JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));
const imageBase = config.imageBase || '/img/';

// Templates.js は素のJSなので、そのまま評価して中身を取り出す
const library = new Function(
  read('Templates.js').replace('{{IMAGE_BASE}}', imageBase)
  + '\nreturn { templates: getTemplates(), parts: getParts() };'
)();

// ---------------------------------------------------------------------------
// 画面の文言を、独立版のものに直す
//
// 元は社内向けのGoogleアプリだったので、Googleドライブ・Gmail・共有ドライブを
// 前提にした文言が入っています。ここで一括して言い換えます。
//
// 画面側のコードそのものは触っていません。触ると、元のアプリとの差が
// 積み上がって、あとで直しづらくなるためです。
// ---------------------------------------------------------------------------

const WORDS = [
  // --- 保存場所 ---
  ['マイドライブ', '作業中'],
  ['共有ドライブ', '保管'],
  ['共有の場所', '保管'],

  // --- メール ---
  ['Gmailの下書きにする', 'メールソフト用に書き出す'],
  ['Gmailの下書きを作成', 'メールソフト用に書き出す'],
  ['編集中のHTMLを本文として、ご自身のGmailに下書きを作ります。送信は行いません。',
   '編集中のHTMLを本文にした .eml ファイルを書き出します。Thunderbird・Outlook・Apple Mail などで開くと、そのまま下書きになります。送信は行いません。'],
  ['メールの件名（Gmailの下書きにそのまま使われます）', 'メールの件名（書き出すファイルにそのまま入ります）'],
  ['下書きを作成しました。', '書き出しました。'],
  ['Gmailに下書きを作成しました', 'メールソフト用に書き出しました'],
  ['Gmailで開く', 'もう一度書き出す'],
  ['下書きを作成', '書き出す'],

  // --- 保存先の説明 ---
  ['登録内容はご自身のドライブに保存されます。', '登録内容はこのブラウザの中に保存されます。'],
  ['保存先はご自身のドライブで、他の方には見えません。', '保存先はこのブラウザの中で、他の方には見えません。'],
  ['保存先フォルダをドライブで開く', '保存先'],

  // --- 独立版に無い画面の中の、外向きの文字列 ---
  ['https://drive.google.com/drive/folders/...', ''],
];

// ---------------------------------------------------------------------------
// 独立版で使わない入口を隠す
//
// 要素そのものは残します。消すと、画面側のコードが el['...'] を
// 見つけられずに例外になるためです。見えなくするだけにします。
// ---------------------------------------------------------------------------

const HIDE = `
<style>
  /* 保存先はこのブラウザの中なので、フォルダを開く・設定する入口は無い */
  #btn-open-folder,
  #btn-loc-settings { display: none !important; }

  /* 同じ理由で、保存先を選ぶ画面ごと出さない */
  #loc-modal { display: none !important; }
</style>
`;

function apply(text) {
  WORDS.forEach(([from, to]) => {
    text = text.split(from).join(to);
  });
  return text;
}

// ---------------------------------------------------------------------------

const store = '<script>\n'
  + read('store.js')
      .replace('{{TEMPLATES}}', JSON.stringify(library.templates))
      .replace('{{PARTS}}', JSON.stringify(library.parts))
  + '\n</script>\n';

let html = read('Index.html')
  // Apps Script のテンプレート構文。独立版では表示サイズを store から読む
  .replace(/<\?!=[\s\S]*?uiScale[\s\S]*?\?>/, '')
  .replace("<?!= include('Stylesheet'); ?>", read('Stylesheet.html') + HIDE)
  .replace("<?!= include('JavaScript'); ?>", store + read('JavaScript.html'));

html = apply(html);

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

html = html.replace('<head>', '<head>\n' + BOOT);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');

// 見本画像も一緒に配る。テンプレートが指している先はここ
const imgSrc = path.join(root, 'assets', 'img');
const imgOut = path.join(outDir, 'img');
fs.mkdirSync(imgOut, { recursive: true });

const images = fs.readdirSync(imgSrc).filter(function (f) {
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(f);
});
images.forEach(function (f) {
  fs.copyFileSync(path.join(imgSrc, f), path.join(imgOut, f));
});

const size = (fs.statSync(path.join(outDir, 'index.html')).size / 1024).toFixed(0);

console.log('dist/index.html を作りました（' + size + ' KB、'
  + 'テンプレート ' + (library.templates.templates || []).length + '件、'
  + '部品 ' + library.parts.length + '件）');
console.log('dist/img に見本画像 ' + images.length + '枚（置き場: ' + imageBase + '）');
