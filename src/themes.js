/*
   配色テーマ。

   同じ内容を、好きな見た目で送れるようにするための仕組み。

   ---------------------------------------------------------------------------
   なぜ「テンプレートを5倍書く」形にしないか

   大手のテンプレート数（Stripo は1,660件）は、その大半が季節ものです。
   クリスマス61件・バレンタイン44件という数字は、構造が61通りあるという
   意味ではなく、同じ構造を61通りの見た目で用意した、という意味です。

   同じことを文面を増やして実現すると、34件 → 170件になり、直すたびに
   170箇所を触ることになります。**構造と見た目を分けて掛け算にすれば、
   維持するのは34件のままで済みます。**

   ---------------------------------------------------------------------------
   どう当てるか

   テンプレートの装飾はすべてインラインの style 属性にあり、使っている色は
   26種類、うち中心は8種類です。そこに役割を与えて差し替えます。

   角丸と影も差し替えます。この2つは、色より強く印象を変えます。

   ---------------------------------------------------------------------------
   触らないもの

   ・**#ffffff は差し替えません。** カードの地であると同時に、色を敷いた
     ボタンの上に乗る文字の色でもあります。ここを動かすと、濃い地の上に
     濃い文字が乗って読めなくなります。
   ・**注意・成功・警告の色は残します。** 注意書きの箱は、どのテーマでも
     注意書きに見えるべきです。
   ・**地を暗くするテーマは作りません。** 暗い背景のメールは、受信側の
     ソフトによって文字が反転したり背景が落ちたりします。見た目の幅は
     地の色みと差し色で作れば足ります。
*/

var THEMES = [
  {
    key: 'standard',
    name: '標準',
    note: '青の差し色。どんな用件にも合う',
    colors: {},
    radius: 1,
    shadow: 'keep'
  },

  {
    key: 'crisp',
    name: '端正',
    note: '角と罫線で締める。事務的な通知に',
    colors: {
      '#1a73e8': '#1f2328',   // 差し色を黒に寄せる
      '#1765cc': '#000000',
      '#174ea6': '#000000',
      '#e8f0fe': '#f1f2f4',
      '#f4f5f7': '#f7f7f8',
      '#f4f6f9': '#f7f7f8',
      '#e5e7eb': '#d3d6dc',   // 罫線を少し濃く
      '#dfe3e8': '#d3d6dc'
    },
    radius: 0,
    shadow: 'none'
  },

  {
    key: 'warm',
    name: '温かい',
    note: '生成りの地に茶の差し色。案内や礼状に',
    colors: {
      '#1a73e8': '#a4643a',
      '#1765cc': '#8a5230',
      '#174ea6': '#8a5230',
      '#e8f0fe': '#f6ece3',
      '#f4f5f7': '#faf6f0',
      '#f4f6f9': '#faf6f0',
      '#1f2328': '#33291f',
      '#3c4149': '#4a3d31',
      '#6b7280': '#7d6f60',
      '#4b5563': '#5c4f42',
      '#e5e7eb': '#e6dcd0',
      '#dfe3e8': '#e6dcd0'
    },
    radius: 1.5,
    shadow: 'keep'
  },

  {
    key: 'calm',
    name: '落ち着いた',
    note: '紺で通す。改まった連絡に',
    colors: {
      '#1a73e8': '#123a66',
      '#1765cc': '#0f2a4a',
      '#174ea6': '#0f2a4a',
      '#e8f0fe': '#e7edf4',
      '#f4f5f7': '#eef1f5',
      '#f4f6f9': '#eef1f5',
      '#1f2328': '#16202c',
      '#3c4149': '#333f4d',
      '#e5e7eb': '#d8dee6',
      '#dfe3e8': '#d8dee6'
    },
    radius: 0.5,
    shadow: 'keep'
  },

  {
    key: 'fresh',
    name: '軽やか',
    note: '緑の差し色と大きめの角丸。案内や告知に',
    colors: {
      '#1a73e8': '#0c7256',
      '#1765cc': '#0a6045',
      '#174ea6': '#0a6045',
      '#e8f0fe': '#e4f3ee',
      '#f4f5f7': '#f1f7f5',
      '#f4f6f9': '#f1f7f5',
      '#6b7280': '#66756f',
      '#e5e7eb': '#dbe8e3',
      '#dfe3e8': '#dbe8e3'
    },
    radius: 2,
    shadow: 'none'
  }
];

/**
 * テンプレートのHTMLに、テーマを当てる。
 *
 * @param {string} html 元のHTML
 * @param {string} key  テーマの key。無ければ素通し
 * @return {string}
 */
function applyTheme(html, key) {
  var theme = null;
  for (var i = 0; i < THEMES.length; i++) {
    if (THEMES[i].key === key) theme = THEMES[i];
  }

  if (!theme || theme.key === 'standard') return String(html);

  var out = String(html);

  // 色。大文字で書かれていることもあるので両方見る
  Object.keys(theme.colors).forEach(function (from) {
    var to = theme.colors[from];
    out = out.split(from).join(to);
    out = out.split(from.toUpperCase()).join(to);
  });

  // 角丸。0 なら角に、2 なら倍に
  if (theme.radius !== 1) {
    out = out.replace(/border-radius:\s*([0-9 px%]+)/gi, function (all, value) {
      var scaled = String(value).replace(/(\d+)px/g, function (m, n) {
        return Math.round(Number(n) * theme.radius) + 'px';
      });
      return 'border-radius:' + scaled;
    });
  }

  // 影
  if (theme.shadow === 'none') {
    out = out.replace(/box-shadow:[^;"']*/gi, 'box-shadow:none');
  }

  return out;
}
