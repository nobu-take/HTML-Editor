/**
 * 画面が呼ぶ窓口と、store.js が持つ窓口を突き合わせる。
 *
 *   node tools/check-api.js
 *
 * 画面側は google.script.run 経由で名前を指定して呼びます。名前が
 * 合っていないことは、実行するまで分かりません。しかも「テンプレートを
 * 開いたとき」のように、特定の操作をしたときだけ落ちます。
 *
 * 保存部に手を入れたら、これを通してください。
 */

const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'src');
const client = fs.readFileSync(path.join(src, 'JavaScript.html'), 'utf8');
const store = fs.readFileSync(path.join(src, 'store.js'), 'utf8');

/*
   call( の第1引数だけを見る。

   はじめは正規表現ひとつで拾おうとして失敗した。
   call('saveDoc', loc === 'my' ? 'my' : 'shared') のような行から
   第2引数の 'my' まで窓口の名前として数えてしまう。
   括弧の中を第1引数の区切りまで切り出してから読む。
*/
function firstArgs(text) {
  const names = new Set();
  // 直前が「.」なら Array.prototype.map.call など別物。窓口ではない
  const re = /(?<![.\w])call\(/g;
  let m;

  while ((m = re.exec(text)) !== null) {
    let depth = 1;
    let i = m.index + m[0].length;
    const start = i;

    while (i < text.length && depth > 0) {
      const c = text[i];
      if (c === '(') depth++;
      else if (c === ')') depth--;
      else if (c === ',' && depth === 1) break;
      i++;
    }

    // 第1引数は 'name' か、条件 ? 'A' : 'B' の形
    const arg = text.slice(start, i);
    (arg.match(/'([a-zA-Z_]+)'/g) || []).forEach((q) => names.add(q.slice(1, -1)));
  }

  return names;
}

const wanted = firstArgs(client);

// 保存部： api の中の「名前: function」
const have = new Set(
  (store.match(/^ {4}([a-zA-Z_]+): function/gm) || [])
    .map((m) => m.trim().split(':')[0])
);

const missing = [...wanted].filter((n) => !have.has(n)).sort();
const extra = [...have].filter((n) => !wanted.has(n)).sort();

console.log('画面が呼ぶ窓口 : ' + wanted.size + '個');
console.log('保存部が持つ窓口: ' + have.size + '個');

if (missing.length) {
  console.log('\n足りません（呼ばれたら落ちます）:');
  missing.forEach((n) => console.log('  - ' + n));
}

if (extra.length) {
  console.log('\n使われていません（消してよいかは要確認）:');
  extra.forEach((n) => console.log('  - ' + n));
}

if (!missing.length && !extra.length) console.log('\n過不足なし。');

process.exit(missing.length ? 1 : 0);
