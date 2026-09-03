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
    note: '青の差し色。詰めすぎず、事務的すぎず',
    colors: {},
    type: 1, headingBoost: 1, headingWeight: 'bold', headingSpacing: '',
    lineHeight: 1, density: 1,
    radius: 1, buttonRadius: 6, buttonPad: '14px 32px', buttonWidth: 'auto',
    rule: '1px solid', shadow: 'keep', font: 'sans',
    heading: 'plain'
  },

  {
    key: 'formal',
    name: 'フォーマル',
    note: '明朝体と広めの行間。改まった案内に',
    colors: {
      '#1a73e8': '#1c3557',
      '#1765cc': '#132540',
      '#174ea6': '#132540',
      '#e8f0fe': '#eaeef4',
      '#f4f5f7': '#f2f3f5',
      '#f4f6f9': '#f2f3f5',
      '#1f2328': '#1a1d22',
      '#3c4149': '#363b43',
      '#e5e7eb': '#cfd3da',
      '#dfe3e8': '#cfd3da'
    },
    type: 0.96, headingBoost: 1.08, headingWeight: 'normal',
    headingSpacing: '0.06em',
    lineHeight: 1.15, density: 1.3,
    radius: 0, buttonRadius: 0, buttonPad: '16px 44px', buttonWidth: 'auto',
    rule: '1px solid', shadow: 'none', font: 'serif',
    heading: 'rule'
  },

  {
    key: 'casual',
    name: 'カジュアル',
    note: '丸みと温かい色。ゆるやかな案内に',
    colors: {
      '#1a73e8': '#b45a0a',
      '#1765cc': '#a04f08',
      '#174ea6': '#a04f08',
      '#e8f0fe': '#fbeee0',
      '#f4f5f7': '#fdf8f2',
      '#f4f6f9': '#fdf8f2',
      '#1f2328': '#332a20',
      '#3c4149': '#4c4136',
      '#6b7280': '#7f7264',
      '#4b5563': '#5e5245',
      '#e5e7eb': '#eadfd1',
      '#dfe3e8': '#eadfd1'
    },
    type: 1.04, headingBoost: 1.12, headingWeight: 'bold', headingSpacing: '',
    lineHeight: 1.06, density: 1.05,
    radius: 1.75, buttonRadius: 999, buttonPad: '15px 36px', buttonWidth: 'auto',
    rule: '1px solid', shadow: 'keep', font: 'sans',
    heading: 'bar'
  },

  {
    key: 'pop',
    name: 'ポップ',
    note: '大きな見出しと丸いボタン。告知やキャンペーンに',
    colors: {
      '#1a73e8': '#d81b60',
      '#1765cc': '#ad144c',
      '#174ea6': '#ad144c',
      '#e8f0fe': '#fde7ef',
      '#f4f5f7': '#fff5f8',
      '#f4f6f9': '#fff5f8',
      '#1f2328': '#20141a',
      '#e5e7eb': '#f4d9e2',
      '#dfe3e8': '#f4d9e2'
    },
    type: 1.08, headingBoost: 1.4, headingWeight: '800',
    headingSpacing: '-0.01em',
    lineHeight: 0.95, density: 0.96,
    radius: 2.25, buttonRadius: 999, buttonPad: '18px 42px', buttonWidth: 'full',
    rule: '3px solid', shadow: 'keep', font: 'sans',
    heading: 'band'
  },

  {
    key: 'minimal',
    name: 'ミニマル',
    note: '色を使わず、余白で見せる。通知や事務連絡に',
    colors: {
      '#1a73e8': '#1f2328',
      '#1765cc': '#000000',
      '#174ea6': '#000000',
      '#e8f0fe': '#f2f3f4',
      '#f4f5f7': '#fafafa',
      '#f4f6f9': '#fafafa',
      '#6b7280': '#7a7f87',
      '#e5e7eb': '#dcdee2',
      '#dfe3e8': '#dcdee2'
    },
    type: 0.94, headingBoost: 0.96, headingWeight: '600',
    headingSpacing: '0.09em',
    lineHeight: 1.16, density: 1.35,
    radius: 0, buttonRadius: 0, buttonPad: '13px 30px', buttonWidth: 'auto',
    rule: '1px solid', shadow: 'none', font: 'sans',
    heading: 'topline'
  }
];

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
function applyTheme(html, key) {
  var theme = findTheme(key);
  if (!theme || theme.key === 'business') return String(html);

  var out = String(html);

  // --- 色。大文字で書かれていることもあるので両方見る ---
  Object.keys(theme.colors).forEach(function (from) {
    out = out.split(from).join(theme.colors[from]);
    out = out.split(from.toUpperCase()).join(theme.colors[from]);
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
  var accent = theme.colors['#1a73e8'] || '#1a73e8';
  var line = theme.colors['#e5e7eb'] || '#e5e7eb';

  out = dressHeading(out, theme, accent, line);

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

  return out;
}
