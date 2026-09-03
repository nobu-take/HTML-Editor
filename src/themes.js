/*
   デザインのジャンル。

   同じ内容を、目的に合う見た目で送れるようにするための仕組み。

   ---------------------------------------------------------------------------
   色だけでは足りない

   最初は配色だけを差し替えていました。結果は「色が変わっただけ」で、
   別のデザインには見えませんでした。当然で、**見た目の印象を決めているのは
   色ではなく、文字の組み方と余白**だからです。

   いま差し替えているのは6つです。

     文字の大きさ … 見出しと本文の差。ここが印象をいちばん動かす
     字面        … 太さ・字間・行間。ゴシックか明朝か
     余白        … 詰めるか、ゆったり取るか
     ボタン      … 角の丸み、大きさ
     罫線        … 細い線か、太い線か、線を引かないか
     色          … 地の色みと差し色
     組み方      … 見出しの置き方、ボタンの幅

   ---------------------------------------------------------------------------
   なぜテンプレートを5倍書かないか

   大手のテンプレート数（Stripo は1,660件）は、その大半が季節ものです。
   クリスマス61件という数字は、構造が61通りあるという意味ではなく、
   同じ構造を61通りの見た目で用意した、という意味です。

   文面を増やして実現すると 34件 → 170件になり、直すたびに170箇所を
   触ることになります。**構造と見た目を分けて掛け算にすれば、維持するのは
   34件のまま**で済みます。

   ---------------------------------------------------------------------------
   触らないもの

   ・**#ffffff は差し替えません。** カードの地であると同時に、色を敷いた
     ボタンに乗る文字の色でもあります。動かすと濃い地に濃い文字が乗ります。
   ・**注意・成功・警告の色は残します。** 注意書きの箱は、どのジャンルでも
     注意書きに見えるべきです。
   ・**地を暗くするジャンルは作りません。** 暗い背景のメールは、受信側の
     ソフトによって文字が反転したり背景が落ちたりします。
   ・**並び順と段組みは変えません。** 見出しの置き方とボタンの形までは
     ジャンルの役目ですが、どの要素をどの順に置くかはテンプレートの役目です。
*/

/*
   本文のフォント。組み立てのときに、言語ごとの指定が引用符ごと入る。

   引用符を自分で書かないこと。フォント指定は 'Hiragino Sans' のように
   引用符を含むので、'{{…}}' と書くとそこで閉じてコードが壊れる。
   明朝を使うジャンルのために、2種類を持っておく。
*/
var FONT_SANS = {{FONT_SANS}};
var FONT_SERIF = {{FONT_SERIF}};

var THEMES = [
  {
    key: 'business',
    name: 'ビジネス',
    note: '詰めすぎず、事務的すぎず。どんな用件にも',
    accents: [
      { key: 'blue', name: '青', base: '#1a73e8' },
      { key: 'navy', name: '紺', base: '#1c3557' },
      { key: 'green', name: '緑', base: '#16803c' },
      { key: 'gray', name: '灰', base: '#4b5563' }
    ],
    tint: 0,
    type: 1, headingBoost: 1, headingWeight: 'bold', headingSpacing: '',
    lineHeight: 1, density: 1,
    radius: 1, buttonRadius: 6, buttonPad: '14px 32px', buttonWidth: 'auto',
    rule: '1px solid', shadow: 'keep', font: 'sans',
    heading: 'plain', columns: 'keep', order: 'natural'
  },

  {
    key: 'formal',
    name: 'フォーマル',
    note: '明朝体と広めの行間。段は積んで一つずつ読ませる',
    accents: [
      { key: 'navy', name: '紺', base: '#1c3557' },
      { key: 'forest', name: '深緑', base: '#164d3a' },
      { key: 'wine', name: '臙脂', base: '#7d1f2e' },
      { key: 'sumi', name: '墨', base: '#26292e' }
    ],
    tint: 0.1,
    type: 0.96, headingBoost: 1.08, headingWeight: 'normal',
    headingSpacing: '0.06em',
    lineHeight: 1.15, density: 1.3,
    radius: 0, buttonRadius: 0, buttonPad: '16px 44px', buttonWidth: 'auto',
    rule: '1px solid', shadow: 'none', font: 'serif',
    heading: 'rule', columns: 'stack', order: 'natural'
  },

  {
    key: 'casual',
    name: 'カジュアル',
    note: '丸みと温かさ。ゆるやかな案内に',
    accents: [
      { key: 'orange', name: '橙', base: '#b45a0a' },
      { key: 'teal', name: '青緑', base: '#0c7256' },
      { key: 'rose', name: '桃', base: '#b8395e' },
      { key: 'violet', name: '菫', base: '#5f4bb6' }
    ],
    tint: 0.18,
    type: 1.04, headingBoost: 1.12, headingWeight: 'bold', headingSpacing: '',
    lineHeight: 1.06, density: 1.05,
    radius: 1.75, buttonRadius: 999, buttonPad: '15px 36px', buttonWidth: 'auto',
    rule: '1px solid', shadow: 'keep', font: 'sans',
    heading: 'bar', columns: 'keep', order: 'natural'
  },

  {
    key: 'pop',
    name: 'ポップ',
    note: '大きな見出しと丸いボタン。ボタンは先に見せる',
    accents: [
      { key: 'pink', name: '桃', base: '#d81b60' },
      { key: 'orange', name: '橙', base: '#c2410c' },
      { key: 'blue', name: '青', base: '#1263d8' },
      { key: 'green', name: '緑', base: '#0f7a3d' },
      { key: 'purple', name: '紫', base: '#7b1fa2' }
    ],
    tint: 0.12,
    type: 1.08, headingBoost: 1.4, headingWeight: '800',
    headingSpacing: '-0.01em',
    lineHeight: 0.95, density: 0.96,
    radius: 2.25, buttonRadius: 999, buttonPad: '18px 42px', buttonWidth: 'full',
    rule: '3px solid', shadow: 'keep', font: 'sans',
    heading: 'band', columns: 'keep', order: 'cta-first'
  },

  {
    key: 'minimal',
    name: 'ミニマル',
    note: '色を使わず、余白で見せる。段は積む',
    accents: [
      { key: 'ink', name: '黒', base: '#1f2328' },
      { key: 'slate', name: '灰', base: '#3c4149' }
    ],
    tint: 0,
    type: 0.94, headingBoost: 0.96, headingWeight: '600',
    headingSpacing: '0.09em',
    lineHeight: 1.16, density: 1.35,
    radius: 0, buttonRadius: 0, buttonPad: '13px 30px', buttonWidth: 'auto',
    rule: '1px solid', shadow: 'none', font: 'sans',
    heading: 'topline', columns: 'stack', order: 'natural'
  }
];

/*
   差し色から、地の色みまでを作る。

   ジャンルごとに1色だけ決め打ちにしていたら、「ポップはいつも同じ桃色」に
   なった。差し色を選べるようにしたが、選ぶたびに地の色・淡い色・罫線まで
   手で決めるのは続かない。**差し色1色から機械的に作る**ことにした。

   白と混ぜて薄くするだけなので、どの色を選んでも調子が揃う。
*/
function hex(n) {
  var s = Math.max(0, Math.min(255, Math.round(n))).toString(16);
  return s.length < 2 ? '0' + s : s;
}

function parse(color) {
  return [1, 3, 5].map(function (i) { return parseInt(color.slice(i, i + 2), 16); });
}

/** color を white 方向へ ratio ぶん寄せる（1 で真っ白） */
function mix(color, ratio, toward) {
  var a = parse(color);
  var b = parse(toward || '#ffffff');
  return '#' + a.map(function (v, i) { return hex(v + (b[i] - v) * ratio); }).join('');
}

/** 濃くする。ボタンの押した状態などに使う */
function darken(color, ratio) {
  return mix(color, ratio, '#000000');
}

/*
   差し色ひとつから、テンプレートで使っている色への対応表を作る。

   文字の色も少しだけ差し色へ寄せる（tint）。カジュアルの茶色い差し色に
   対して文字が青灰色のままだと、ちぐはぐに見えるため。ジャンルごとに
   どれだけ寄せるかを決めている。

   罫線は差し色に寄せすぎると主張が強くなるので、元の灰色のほうへ
   4分の3ほど戻している。
*/
function accentColors(base, tint) {
  var map = {
    '#1a73e8': base,
    '#1765cc': darken(base, 0.2),
    '#174ea6': darken(base, 0.2),
    '#e8f0fe': mix(base, 0.88),
    '#f4f5f7': mix(base, 0.955),
    '#f4f6f9': mix(base, 0.955),
    '#e5e7eb': mix(mix(base, 0.87), 0.75, '#e5e7eb'),
    '#dfe3e8': mix(mix(base, 0.87), 0.75, '#e5e7eb')
  };

  if (tint) {
    map['#1f2328'] = mix('#1f2328', tint, base);
    map['#3c4149'] = mix('#3c4149', tint, base);
    map['#6b7280'] = mix('#6b7280', tint, base);
    map['#4b5563'] = mix('#4b5563', tint, base);
  }

  return map;
}

/** 見出しとみなす大きさ。ここから上は別の倍率で動かす */
var HEADING_FROM = 18;

/*
   見出しの組み方。

   ここがジャンルの差をいちばん強く出す。色や字の大きさより、
   「見出しがどう置かれているか」のほうが先に目に入るため。

     plain   … そのまま。文字だけ
     rule    … 中央に寄せて、下に罫線を引く
     bar     … 左に太い線を立てる
     band    … 差し色で塗りつぶし、白抜きにする
     topline … 上に線を引いて、間を空ける

   組み替えではなく、見出しのセルに指定を足すだけで作っている。
   要素を入れ替えると、テンプレートごとの事情（画像の直後、表の中、など）に
   引っかかって壊れる。足すだけなら、どこにあっても壊れない。
*/
/*
   帯の上下の余白を、左右に合わせてそろえる。

   左右の値を基準にするのは、そこが「この原稿の余白の単位」だから。
   0.7 は、正方形に近づけすぎず、詰まりすぎない落としどころ。
*/
function bandPadding(style) {
  return style.replace(/padding:\s*([^;"]*)/i, function (all, value) {
    var parts = String(value).trim().split(/\s+/);
    if (parts.length < 2) return all;

    var side = parseInt(parts[1], 10);
    if (!side) return all;

    var updown = Math.max(18, Math.round(side * 0.7));

    return 'padding:' + updown + 'px ' + parts[1] + ' ' + updown + 'px '
      + (parts[3] || parts[1]);
  });
}

function dressHeading(html, theme, accent, line) {
  if (theme.heading === 'plain') return html;

  return html.replace(/<td([^>]*?)style="([^"]*)"/gi, function (all, attrs, style) {
    var size = style.match(/font-size:\s*(\d+)px/i);
    if (!size || Number(size[1]) < HEADING_FROM) return all;
    if (!/font-weight:\s*(bold|[5-9]00)/i.test(style)) return all;

    // すでに色を敷いているセルは、見出しの帯ではなく別の用がある
    if (/background-color:\s*#(?!ffffff)/i.test(style)) return all;
    if (/bgcolor="#(?!ffffff)/i.test(attrs)) return all;

    var next = style;
    var extra = '';

    if (theme.heading === 'rule') {
      next = next.replace(/text-align:[^;]*;?/i, '');
      extra = ' text-align:center; border-bottom:1px solid ' + line + ';';
    } else if (theme.heading === 'bar') {
      extra = ' border-left:4px solid ' + accent + ';';
    } else if (theme.heading === 'topline') {
      extra = ' border-top:2px solid ' + line + ';';
    } else if (theme.heading === 'band') {
      next = next.replace(/color:\s*#[0-9a-fA-F]{6}/i, 'color:#ffffff');
      extra = ' background-color:' + accent + ';';
      // Outlook は style の背景を落とすので、属性でも書く
      attrs = attrs + ' bgcolor="' + accent + '"';

      /*
         塗りつぶす以上、上下の余白はそろえる。

         元の見出しは「下に本文が続く」前提で組まれていて、下だけ詰めて
         ある（上31px・下15px など）。文字だけならそれで良いが、色を敷くと
         文字が上に寄って見え、崩れて見える。左右の余白から作り直す。
      */
      next = bandPadding(next);
    }

    if (next && !/;\s*$/.test(next)) next += ';';

    /*
       属性と style の間に必ず空白を入れる。

       取り出しの正規表現が `<td([^>]*?)style="` なので、attrs の末尾の
       空白まで飲み込まれている。そこへ bgcolor を足すと
       `bgcolor="#d81b60"style="…` という壊れた形になる。
       ブラウザは大目に見るが、Outlook で読めない形にはしたくない。
    */
    var head = attrs.replace(/\s+$/, '');

    return '<td' + head + ' style="' + next + extra + '"';
  });
}

/*
   ボタンを本文の幅いっぱいに広げる。

   包んでいる表と、中のリンクの両方を変える必要がある。表は中身の幅に
   合わせて縮むので、リンクだけを block にしても広がらない。
*/
function widenButton(html) {
  var out = html.replace(
    /(<table(?![^>]*width=)[^>]*?)(>\s*<tr>\s*<td[^>]*bgcolor="#[0-9a-fA-F]{6}"[^>]*>\s*<a[^>]*display:\s*inline-block)/gi,
    function (all, open, rest) {
      return open + ' width="100%" style="width:100%"' + rest;
    });

  return out.replace(/style="([^"]*display:\s*)inline-block([^"]*text-decoration:\s*none[^"]*)"/gi,
    function (all, head, tail) {
      return 'style="' + head + 'block' + tail + ' text-align:center;"';
    });
}

/*
   段組みを縦に積む。

   2カラム・3カラムは、幅を決めた table を align="left" で横に並べて
   作られている。幅を100%にして align を外すと、そのまま縦に積まれる。

   落ち着いた見せ方のジャンル（フォーマル・ミニマル）で使う。横に並べると
   視線が行き来するので、一つずつ読ませたい場面には向かない。
*/
function stackColumns(html) {
  return html.replace(/<table([^>]*?)>/gi, function (all, attrs) {
    // 幅を持ち、左右に寄せてある table が段組みの正体
    if (!/align="(left|right)"/i.test(attrs)) return all;
    if (!/width="\d+"/.test(attrs)) return all;

    var next = attrs
      .replace(/\s*align="(?:left|right)"/i, '')
      .replace(/width="\d+"/i, 'width="100%"')
      .replace(/width:\s*\d+px/i, 'width:100%');

    return '<table' + next + '>';
  });
}

/*
   本文テーブルの直下にある段（tr）を、順番に取り出す。

   正規表現だけでは取り出せない。中に入れ子の table があり、その中の tr まで
   拾ってしまうため。開き閉じを数えながら歩く。

   @return {Array<Object>} {start, end, html} 直下の tr だけ
*/
function topRows(html) {
  var open = html.search(/<table[^>]*max-width:\s*600px/i);
  if (open < 0) return [];

  var from = html.indexOf('>', open);
  if (from < 0) return [];

  var depth = 1;      // いま何枚の table の中にいるか
  var rows = [];
  var rowStart = -1;
  var rowDepth = 0;
  var i = from + 1;

  var tag = /<(\/?)(table|tr)\b[^>]*>/gi;
  tag.lastIndex = i;

  var m;
  while ((m = tag.exec(html)) !== null) {
    var closing = m[1] === '/';
    var name = m[2].toLowerCase();

    if (name === 'table') {
      depth += closing ? -1 : 1;
      if (depth === 0) break;                 // 本文テーブルが閉じた
    } else if (name === 'tr') {
      if (!closing && depth === 1 && rowStart < 0) {
        rowStart = m.index;
        rowDepth = depth;
      } else if (closing && depth === rowDepth && rowStart >= 0) {
        rows.push({
          start: rowStart,
          end: m.index + m[0].length,
          html: html.slice(rowStart, m.index + m[0].length)
        });
        rowStart = -1;
      }
    }
  }

  return rows;
}

/*
   ボタンの段を、見出しの段のすぐ下へ動かす。

   キャンペーンの告知では、read → 決める、より先に「押せる場所」を見せる
   ほうが通りがよい。ポップだけで使う。

   動かせる形になっていなければ、何もしない。壊すより、そのままのほうがいい。
*/
/*
   動かした段に、上の余白を足す。

   元の並びでは、上にあった本文の下余白が間を作っていた。動かすと
   その前提が消えるので、自分で間を持たせる必要がある。

   左右の余白と同じだけ空ける。原稿ごとに余白の単位が違うので、
   固定値ではなくその原稿の値に合わせる。
*/
function openTop(rowHtml) {
  return rowHtml.replace(/padding:\s*0(?:px)?\s+(\d+px)/i, function (all, side) {
    return 'padding:' + side + ' ' + side;
  });
}

/*
   帯の次の段に、間を空ける。

   見出しに色を敷くと、それまで「次との間」を作っていた下余白が、
   色の内側に取り込まれる。次の段の上余白が 0 だと、色にぴたりと接する。

   動かしたボタンだけの話ではない。動かしていない段でも同じことが起きる
   （元の並びで見出しの直下にあるものは、たいてい上余白が 0）。
   だから、並べ替えが終わったあとに、帯の次を見て直す。
*/
function spaceAfterBand(html) {
  var rows = topRows(html);
  if (rows.length < 2) return html;

  var bandAt = -1;
  rows.forEach(function (row, i) {
    if (bandAt < 0 && /<td[^>]*bgcolor="#[0-9a-fA-F]{6}"[^>]*color:\s*#ffffff/i.test(row.html)) {
      bandAt = i;
    }
  });

  if (bandAt < 0 || bandAt + 1 >= rows.length) return html;

  var next = rows[bandAt + 1];
  var opened = openTop(next.html);
  if (opened === next.html) return html;

  return html.slice(0, next.start) + opened + html.slice(next.end);
}

function ctaFirst(html) {
  var rows = topRows(html);
  if (rows.length < 3) return html;

  var headingAt = -1;
  var ctaAt = -1;

  rows.forEach(function (row, i) {
    if (headingAt < 0 && /font-size:\s*(?:[2-9]\d|1[89])px[^"]*font-weight:\s*(?:bold|[5-9]00)/i.test(row.html)) {
      headingAt = i;
    }
    if (ctaAt < 0 && /display:\s*(?:inline-)?block[^"]*text-decoration:\s*none/i.test(row.html)) {
      ctaAt = i;
    }
  });

  // 見出しが無い、ボタンが無い、すでに直後にある、なら触らない
  if (headingAt < 0 || ctaAt < 0) return html;
  if (ctaAt <= headingAt + 1) return html;

  var cta = rows[ctaAt];
  var anchor = rows[headingAt];

  // 後ろから先に切る。前を切ると、後ろの位置がずれる
  var out = html.slice(0, cta.start) + html.slice(cta.end);
  return out.slice(0, anchor.end) + '\n' + openTop(cta.html) + out.slice(anchor.end);
}

function findTheme(key) {
  for (var i = 0; i < THEMES.length; i++) {
    if (THEMES[i].key === key) return THEMES[i];
  }
  return null;
}

/** px の並びをまとめて掛ける。「32px 32px 16px」のような書き方に効かせる */
function scalePx(value, factor, min) {
  return String(value).replace(/(\d+(?:\.\d+)?)px/g, function (all, n) {
    var next = Math.round(Number(n) * factor);
    if (min !== undefined && Number(n) > 0 && next < min) next = min;
    return next + 'px';
  });
}

/**
 * テンプレートのHTMLに、ジャンルを当てる。
 *
 * @param {string} html 元のHTML
 * @param {string} key  ジャンルの key
 * @return {string}
 */
function pickAccent(theme, accentKey) {
  for (var i = 0; i < theme.accents.length; i++) {
    if (theme.accents[i].key === accentKey) return theme.accents[i];
  }
  return theme.accents[0];
}

function applyTheme(html, key, accentKey) {
  var theme = findTheme(key);
  if (!theme) return String(html);

  var chosen = pickAccent(theme, accentKey);
  var colors = accentColors(chosen.base, theme.tint);

  var out = String(html);

  // --- 色。大文字で書かれていることもあるので両方見る ---
  Object.keys(colors).forEach(function (from) {
    out = out.split(from).join(colors[from]);
    out = out.split(from.toUpperCase()).join(colors[from]);
  });

  // --- 文字の大きさ。見出しは別倍率 ---
  if (theme.type !== 1 || theme.headingBoost !== 1) {
    out = out.replace(/font-size:\s*(\d+(?:\.\d+)?)px/gi, function (all, n) {
      var size = Number(n);
      var factor = theme.type * (size >= HEADING_FROM ? theme.headingBoost : 1);
      return 'font-size:' + Math.round(size * factor) + 'px';
    });
  }

  // --- 行間 ---
  if (theme.lineHeight !== 1) {
    out = out.replace(/line-height:\s*(\d+(?:\.\d+)?)(?![\dpx%])/gi, function (all, n) {
      return 'line-height:' + (Math.round(Number(n) * theme.lineHeight * 100) / 100);
    });
  }

  /*
     --- 見出しの組み方 ---

     太さを変える前に当てる。見出しかどうかは font-weight:bold で見分けて
     いるので、先に normal へ変えてしまうと、そのあとでは見つけられない。
     フォーマルだけ組み方が効かない、という形で出た。
  */
  out = dressHeading(out, theme, colors['#1a73e8'], colors['#e5e7eb']);

  // --- 見出しの太さと字間 ---
  if (theme.headingWeight !== 'bold' || theme.headingSpacing) {
    out = out.replace(/style="([^"]*font-weight:\s*bold[^"]*)"/gi, function (all, style) {
      // 見出しだけを狙う。小さな太字（注記の強調など）はそのまま
      var size = style.match(/font-size:\s*(\d+)px/i);
      if (!size || Number(size[1]) < HEADING_FROM) return all;

      var next = style.replace(/font-weight:\s*bold/i, 'font-weight:' + theme.headingWeight);
      if (theme.headingSpacing) next += ' letter-spacing:' + theme.headingSpacing + ';';
      return 'style="' + next + '"';
    });
  }

  // --- 余白 ---
  if (theme.density !== 1) {
    out = out.replace(/(padding(?:-top|-right|-bottom|-left)?):\s*([^;"]*)/gi,
      function (all, prop, value) {
        if (!/px/.test(value)) return all;
        return prop + ':' + scalePx(value, theme.density);
      });
  }

  // --- カードや箱の角 ---
  if (theme.radius !== 1) {
    out = out.replace(/border-radius:\s*([^;"]*)/gi, function (all, value) {
      if (!/px/.test(value)) return all;
      return 'border-radius:' + scalePx(value, theme.radius);
    });
  }

  // --- 罫線 ---
  if (theme.rule !== '1px solid') {
    out = out.replace(/border-top:\s*1px solid/gi, 'border-top:' + theme.rule);
    out = out.replace(/border-bottom:\s*1px solid/gi, 'border-bottom:' + theme.rule);
  }

  // --- 影 ---
  if (theme.shadow === 'none') {
    out = out.replace(/box-shadow:[^;"']*/gi, 'box-shadow:none');
  }

  // --- 書体 ---
  if (theme.font === 'serif' && FONT_SERIF) {
    out = out.split(FONT_SANS).join(FONT_SERIF);
  }

  /*
     --- ボタン。いちばん最後に当てる ---

     はじめは先頭で処理していた。すると、あとの「余白をまとめて動かす」と
     「角をまとめて動かす」がボタンにも効いてしまい、指定した 16px 44px が
     1.3倍されて 21px 57px になり、丸ボタンの 999px は 2248px になっていた。

     ボタンは絶対値で決めたいので、他の処理がすべて済んだあとに上書きする。

     見分け方は display:inline-block と text-decoration:none の組み合わせ。
     テンプレートの中でこの2つが揃うのはボタンだけ。
  */
  out = out.replace(/style="([^"]*display:\s*inline-block[^"]*text-decoration:\s*none[^"]*)"/gi,
    function (all, style) {
      var next = style
        .replace(/padding:[^;]*/i, 'padding:' + theme.buttonPad)
        .replace(/border-radius:[^;]*/i, 'border-radius:' + theme.buttonRadius + 'px');
      return 'style="' + next + '"';
    });

  // ボタンを敷いているセルの角も、ボタンに合わせる
  out = out.replace(/(bgcolor="#[0-9a-fA-F]{6}"\s+style="[^"]*?)border-radius:\s*[^;"]*/gi,
    function (all, head) { return head + 'border-radius:' + theme.buttonRadius + 'px'; });

  /*
     --- ボタンを広げる ---

     ボタンの余白と角を当てたあとに動かす。見分け方が display:inline-block
     なので、先に block へ変えてしまうと、そのあとでは見つけられない。
  */
  if (theme.buttonWidth === 'full') out = widenButton(out);

  // --- 段組みと並び順。組み方を変えるので、いちばん最後 ---
  if (theme.columns === 'stack') out = stackColumns(out);
  if (theme.order === 'cta-first') out = ctaFirst(out);

  // 並べ替えが終わってから、帯の次の間を見る
  if (theme.heading === 'band') out = spaceAfterBand(out);

  return out;
}
