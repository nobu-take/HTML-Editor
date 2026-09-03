/**
 * ジャンルを見比べるページを作る。
 *
 *   node tools/preview-genres.js [テンプレート名の一部]
 *
 * dist/genres.html に、同じテンプレートを5ジャンルで並べて書き出します。
 * 配って使うものではなく、手元で見比べるための道具です。
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

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');

const columns = themes.THEMES.map((theme) => {
  const html = themes.applyTheme(tpl.html, theme.key);
  return '<div class="col">'
    + '<h2>' + theme.name + '</h2>'
    + '<p>' + theme.note + '</p>'
    + '<div class="shot"><iframe sandbox="" scrolling="no" srcdoc="' + esc(html) + '"></iframe></div>'
    + '</div>';
}).join('\n');

const page = `<!doctype html>
<meta charset="utf-8">
<title>${tpl.name} — ジャンル比較</title>
<style>
  body { margin: 0; padding: 16px; background: #14161a; color: #e9ecf1;
         font: 13px/1.6 'Hiragino Sans','Yu Gothic',Meiryo,sans-serif; }
  h1 { margin: 0 0 14px; font-size: 15px; }
  .row { display: flex; gap: 12px; align-items: flex-start; }
  .col { flex: 1 1 0; min-width: 0; }
  .col h2 { margin: 0 0 2px; font-size: 13px; }
  .col p { margin: 0 0 8px; color: #8b93a1; font-size: 11px; min-height: 30px; }
  .shot { width: 100%; height: 620px; overflow: hidden; background: #fff; border-radius: 4px; }
  .shot iframe { width: 600px; height: 1400px; border: 0;
                 transform: scale(var(--s)); transform-origin: 0 0; }
</style>
<h1>${tpl.name} — 5ジャンル</h1>
<div class="row">
${columns}
</div>
<script>
  // 列の幅に合わせて縮める
  function fit() {
    document.querySelectorAll('.shot').forEach(function (box) {
      box.style.setProperty('--s', box.clientWidth / 600);
    });
  }
  window.addEventListener('resize', fit);
  fit();
</script>
`;

fs.writeFileSync(path.join(root, 'dist', 'genres.html'), page, 'utf8');
console.log('dist/genres.html に「' + tpl.name + '」を5ジャンルで並べました');
