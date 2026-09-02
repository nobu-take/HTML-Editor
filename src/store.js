/*
   保存部。ブラウザの localStorage に置く。

   画面側は google.script.run というひとつの窓口しか知らないので、
   ここでその窓口を作って受ければ、サーバーが無くても同じように動く。
   画面側のコードは1行も変えていない。

   localStorage の性質は理解して使うこと。
     ・端末ごと、ブラウザごとに別。同期はしない
     ・閲覧データを消すと一緒に消える
     ・容量は 5MB 前後（原稿は1件あたり数十KB）
   大事な原稿は「書き出す」からHTMLとして手元へ落としておくこと。
*/
(function () {
  var KEY = 'html-editor:docs';
  var SIG_KEY = 'html-editor:signatures';
  var PROMPT_KEY = 'html-editor:prompts';
  var SET_KEY = 'html-editor:settings';
  var TPL_KEY = 'html-editor:my-templates';
  var TEMPLATES = {{TEMPLATES}};
  var PARTS = {{PARTS}};
  var MAX_VERSIONS = 30;
  var MY_CATEGORY = '自分のテンプレート';
  var TEMPLATE_LIMIT = 40;

  function loadStore() {
    try { return JSON.parse(localStorage.getItem(KEY)) || { my: {}, shared: {} }; }
    catch (e) { return { my: {}, shared: {} }; }
  }
  /*
     書き込みは、いっぱいになると例外になる。

     そのまま投げると「保存できませんでした」としか出ず、何が起きたのか
     分からない。しかも原因はたいてい版履歴で、原稿の数ではない。
     1原稿につき最大30版まで残るので、上書き保存を繰り返した原稿が
     数件あるだけで、原稿100件ぶんより重くなることがある。

     まず版履歴を削って、それでも入らなければ理由を添えて伝える。
  */
  function persist(store) {
    try {
      localStorage.setItem(KEY, JSON.stringify(store));
      return;
    } catch (err) {
      if (!isFull(err)) throw err;
    }

    var freed = dropOldestVersions(store);

    if (freed) {
      try {
        localStorage.setItem(KEY, JSON.stringify(store));
        return;
      } catch (err2) {
        if (!isFull(err2)) throw err2;
      }
    }

    throw new Error('保存先がいっぱいです。'
      + '使わない原稿を消すか、「書き出す」でHTMLとして手元に保存してから消してください。'
      + '（保存先はこのブラウザの中で、容量に上限があります）');
  }

  function isFull(err) {
    return err && (err.name === 'QuotaExceededError'
      || err.name === 'NS_ERROR_DOM_QUOTA_REACHED'
      || err.code === 22);
  }

  /**
   * いちばん古い版から順に捨てて、場所を空ける。
   *
   * 消すのは版だけで、原稿そのものには手を触れない。
   * 黙って原稿が消えるのがいちばん困るため。
   *
   * @return {boolean} 1件でも捨てられたか
   */
  function dropOldestVersions(store) {
    var all = [];

    Object.keys(store).forEach(function (loc) {
      Object.keys(store[loc] || {}).forEach(function (id) {
        var doc = store[loc][id];
        if (doc && doc.versions && doc.versions.length) all.push(doc);
      });
    });

    if (!all.length) return false;

    // 版をいちばん多く抱えているものから削る
    all.sort(function (a, b) { return b.versions.length - a.versions.length; });

    var half = Math.max(1, Math.ceil(all[0].versions.length / 2));
    all[0].versions = all[0].versions.slice(0, all[0].versions.length - half);

    return true;
  }
  function settings() {
    try { return JSON.parse(localStorage.getItem(SET_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveSettings(value) { localStorage.setItem(SET_KEY, JSON.stringify(value)); }

  function nextId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }
  function bytes(text) { return new Blob([text]).size; }

  function bucket(location) {
    var store = loadStore();
    if (!store[location]) store[location] = {};
    return store;
  }

  function sanitizeTitle(t) {
    var s = String(t == null ? '' : t).replace(/[\\\\/:*?"<>|]/g, '_').trim();
    return (s || '無題').slice(0, 120);
  }

  function sanitizeTags(tags) {
    var list = Array.isArray(tags) ? tags : String(tags || '').split(',');
    var seen = {}, out = [];
    list.forEach(function (tag) {
      var name = String(tag).trim().slice(0, 30);
      if (name && !seen[name]) { seen[name] = true; out.push(name); }
    });
    return out.slice(0, 10);
  }

  function requireDoc(store, location, id) {
    if (!store[location] || !store[location][id]) throw new Error('ファイルが見つかりません。');
    return store[location][id];
  }

  function archive(doc) {
    doc.versions = doc.versions || [];
    doc.versions.unshift({ id: nextId(), savedAt: new Date().toISOString(), title: doc.title, html: doc.html });
    doc.versions = doc.versions.slice(0, MAX_VERSIONS);
  }

  var api = {
    getAppInfo: function () {
      return { webAppUrl: location.href.split('?')[0], manualUrl: '' };
    },

    getTemplates: function () { return TEMPLATES; },
    getParts: function () { return PARTS; },

    // --- 保存場所 ---

    /*
       引き出しは2つ。書きかけと、書き上がったもの。

       元は「マイドライブ」と「共有ドライブ」だった。独立版に共有の相手は
       いないが、引き出しが2つあること自体は役に立つので、名前を変えて残す。
       間のコピーと移動もそのまま使える。
    */
    getLocations: function () {
      return {
        my: { key: 'my', label: '作業中', configured: true, canWrite: true,
              name: 'このブラウザの中', url: '', error: '' },
        shared: { key: 'shared', label: '保管', configured: true, canWrite: true,
                  name: 'このブラウザの中', url: '', error: '' }
      };
    },

    /*
       保存先の設定は独立版には無い。画面のボタンもCSSで隠してある。
       ただし窓口だけは残す。画面側は28個の名前をそのまま呼ぶので、
       どれか1つでも欠けると、そこで例外になる。
    */
    setSharedFolder: function () { return api.getLocations(); },
    clearSharedFolder: function () { return api.getLocations(); },
    listSharedDrives: function () { return []; },
    listChildFolders: function () { return []; },

    // --- ドキュメント ---

    listDocs: function (loc) {
      var store = bucket(loc);
      return Object.keys(store[loc]).map(function (id) {
        var d = store[loc][id];
        return { id: id, title: d.title, tags: d.tags || [], updatedAt: d.updatedAt, size: bytes(d.html) };
      }).sort(function (a, b) { return b.updatedAt.localeCompare(a.updatedAt); });
    },

    loadDoc: function (loc, id) {
      var doc = requireDoc(bucket(loc), loc, id);
      return { id: id, location: loc, title: doc.title, tags: doc.tags || [], html: doc.html, updatedAt: doc.updatedAt };
    },

    saveDoc: function (payload) {
      var loc = payload.location === 'shared' ? 'shared' : 'my';

      var store = bucket(loc);
      var id = payload.id || nextId();
      var title = sanitizeTitle(payload.title);
      var tags = sanitizeTags(payload.tags);
      var html = payload.html || '';

      if (store[loc][id]) {
        if (store[loc][id].html !== html) archive(store[loc][id]);
        store[loc][id].title = title;
        store[loc][id].tags = tags;
        store[loc][id].html = html;
        store[loc][id].updatedAt = new Date().toISOString();
      } else {
        store[loc][id] = { title: title, tags: tags, html: html, updatedAt: new Date().toISOString(), versions: [] };
      }

      persist(store);
      return { id: id, location: loc, title: title, tags: tags, updatedAt: store[loc][id].updatedAt };
    },

    duplicateDoc: function (loc, id) {
      var store = bucket(loc);
      var source = requireDoc(store, loc, id);
      var copyId = nextId();
      store[loc][copyId] = {
        title: source.title + ' のコピー', tags: (source.tags || []).slice(),
        html: source.html, updatedAt: new Date().toISOString(), versions: []
      };
      persist(store);
      return { id: copyId, location: loc, title: store[loc][copyId].title, tags: store[loc][copyId].tags, updatedAt: store[loc][copyId].updatedAt };
    },

    copyDocTo: function (from, id, to) {
      if (from === to) throw new Error('コピー元とコピー先が同じです。');

      var store = bucket(from);
      if (!store[to]) store[to] = {};
      var source = requireDoc(store, from, id);
      var copyId = nextId();
      store[to][copyId] = {
        title: source.title, tags: (source.tags || []).slice(),
        html: source.html, updatedAt: new Date().toISOString(), versions: []
      };
      persist(store);
      return { id: copyId, location: to, title: source.title, tags: store[to][copyId].tags, updatedAt: store[to][copyId].updatedAt };
    },

    moveDocTo: function (from, id, to) {
      var result = api.copyDocTo(from, id, to);
      api.trashDoc(from, id);
      return result;
    },

    trashDoc: function (loc, id) {
      var store = bucket(loc);
      delete store[loc][id];
      persist(store);
      return true;
    },

    listVersions: function (loc, docId) {
      var doc = requireDoc(bucket(loc), loc, docId);
      return (doc.versions || []).map(function (v) {
        return { id: v.id, savedAt: v.savedAt, title: v.title, size: bytes(v.html) };
      });
    },

    loadVersion: function (loc, docId, versionId) {
      var doc = requireDoc(bucket(loc), loc, docId);
      var found = (doc.versions || []).filter(function (v) { return v.id === versionId; })[0];
      if (!found) throw new Error('履歴が見つかりません。');
      return { html: found.html };
    },

    restoreVersion: function (loc, docId, versionId) {
      var store = bucket(loc);
      var doc = requireDoc(store, loc, docId);
      var found = (doc.versions || []).filter(function (v) { return v.id === versionId; })[0];
      if (!found) throw new Error('履歴が見つかりません。');

      if (doc.html !== found.html) {
        archive(doc);
        doc.html = found.html;
        doc.updatedAt = new Date().toISOString();
      }
      persist(store);
      return { id: docId, location: loc, title: doc.title, tags: doc.tags || [], html: doc.html, updatedAt: doc.updatedAt };
    },

    // --- 署名 ---

    listSignatures: function () {
      try { return JSON.parse(localStorage.getItem(SIG_KEY)) || []; } catch (e) { return []; }
    },

    saveSignature: function (payload) {
      var list = api.listSignatures();
      var name = String(payload.name || '').trim().slice(0, 60) || '無題の署名';
      var html = String(payload.html || '').trim();
      if (!html) throw new Error('署名の内容が空です。');

      var found = list.filter(function (s) { return s.id === payload.id; })[0];
      if (found) { found.name = name; found.html = html; }
      else {
        if (list.length >= 20) throw new Error('署名は20件までです。');
        list.push({ id: nextId(), name: name, html: html });
      }
      localStorage.setItem(SIG_KEY, JSON.stringify(list));
      return list;
    },

    deleteSignature: function (id) {
      var list = api.listSignatures().filter(function (s) { return s.id !== id; });
      localStorage.setItem(SIG_KEY, JSON.stringify(list));
      return list;
    },

    // --- AI依頼テンプレート ---

    listPrompts: function () {
      try { return JSON.parse(localStorage.getItem(PROMPT_KEY)) || []; } catch (e) { return []; }
    },

    savePrompt: function (payload) {
      var list = api.listPrompts();
      var name = String(payload.name || '').trim().slice(0, 60);
      var body = String(payload.body || '').trim();
      if (!name) throw new Error('依頼の名前を入力してください。');
      if (!body) throw new Error('依頼の内容を入力してください。');

      var found = list.filter(function (s) { return s.id === payload.id; })[0];
      if (found) { found.name = name; found.body = body; }
      else {
        if (list.length >= 30) throw new Error('登録できる依頼は30件までです。');
        list.push({ id: nextId(), name: name, body: body });
      }
      localStorage.setItem(PROMPT_KEY, JSON.stringify(list));
      return list;
    },

    deletePrompt: function (id) {
      var list = api.listPrompts().filter(function (s) { return s.id !== id; });
      localStorage.setItem(PROMPT_KEY, JSON.stringify(list));
      return list;
    },

    // --- 表示の設定 ---

    setUiScale: function (value) {
      var scale = parseFloat(value);
      if (!scale || scale < 0.7 || scale > 1.3) scale = 1;

      var s = settings();
      s.uiScale = scale;
      s.scaleHintDone = true;
      saveSettings(s);

      return scale;
    },

    dismissScaleHint: function () {
      var s = settings();
      s.scaleHintDone = true;
      saveSettings(s);
      return true;
    },

    // --- 自分のテンプレート ---

    getCustomTemplates: function () {
      return { mine: { items: myTemplates(), error: '' } };
    },

    saveMyTemplate: function (payload) {
      payload = payload || {};

      var name = String(payload.name || '').trim().slice(0, 80);
      var html = String(payload.html || '');

      if (!name) throw new Error('テンプレートの名前を入力してください。');
      if (!html.trim()) throw new Error('中身が空です。');

      var list = myTemplates();
      var found = null;
      list.forEach(function (t) { if (t.name === name) found = t; });

      if (found) {
        // 同じ名前は差し替える。増やし続けて分からなくなるより扱いやすい
        found.html = html;
        found.description = today() + ' 更新';
      } else {
        if (list.length >= TEMPLATE_LIMIT) {
          throw new Error('テンプレートは' + TEMPLATE_LIMIT + '件までです。使わないものを消してください。');
        }
        var id = nextId();
        list.push({
          key: 'mine:' + id, fileId: id, kind: 'mine', category: MY_CATEGORY,
          name: name, description: today() + ' 更新', html: html
        });
      }

      list.sort(function (a, b) { return a.name.localeCompare(b.name, 'ja'); });
      localStorage.setItem(TPL_KEY, JSON.stringify(list));

      return api.getCustomTemplates();
    },

    deleteMyTemplate: function (fileId) {
      var id = String(fileId || '');
      if (!id) throw new Error('消すテンプレートが指定されていません。');

      var list = myTemplates().filter(function (t) { return t.fileId !== id; });
      localStorage.setItem(TPL_KEY, JSON.stringify(list));

      return api.getCustomTemplates();
    },

    // --- メールソフト用の書き出し ---

    /*
       Gmailの下書きは作れない。個人のアカウントで送信権限を取るには
       OAuthの審査が要り、この規模には重すぎる。

       代わりに .eml を書き出す。Thunderbird・Outlook・Apple Mail の
       どれでも「開く」だけで下書きになる、昔からある標準の形式。
    */
    createGmailDraft: function (payload) {
      payload = payload || {};
      if (!payload.html) throw new Error('本文が空です。');

      var eml = buildEml(payload);
      var blob = new Blob([eml], { type: 'message/rfc822' });
      var url = URL.createObjectURL(blob);

      var link = document.createElement('a');
      link.href = url;
      link.download = fileNameFor(payload.subject) + '.eml';
      document.body.appendChild(link);
      link.click();
      link.remove();

      // すぐ消すと保存前に切れることがある
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);

      return { draftId: '', url: '' };
    }
  };

  function myTemplates() {
    try { return JSON.parse(localStorage.getItem(TPL_KEY)) || []; }
    catch (e) { return []; }
  }

  function today() {
    var d = new Date();
    var two = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '/' + two(d.getMonth() + 1) + '/' + two(d.getDate());
  }

  /** UTF-8のまま base64 にする。btoa は生のバイト列しか受け取らない */
  function base64(text) {
    var bytes = new TextEncoder().encode(text);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  /** メールの本文は76文字で折る決まり（RFC 2045） */
  function wrap(text) {
    return (text.match(/.{1,76}/g) || []).join('\r\n');
  }

  /** 日本語の件名は、そのままでは載せられない（RFC 2047） */
  function encodeHeader(text) {
    var value = String(text || '');
    /* eslint-disable-next-line no-control-regex */
    if (/^[\x20-\x7e]*$/.test(value)) return value;
    return '=?UTF-8?B?' + base64(value) + '?=';
  }

  function buildEml(payload) {
    var lines = [
      'MIME-Version: 1.0',
      'Date: ' + new Date().toUTCString(),
      'Subject: ' + encodeHeader(payload.subject || ''),
      'To: ' + String(payload.to || ''),
      'X-Unsent: 1',                    // 「下書き」として開かせる印
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: base64',
      '',
      wrap(base64(payload.html))
    ];

    return lines.join('\r\n');
  }

  function fileNameFor(subject) {
    var name = String(subject || '').replace(/[\\/:*?"<>|]/g, '_').trim();
    return (name || 'mail').slice(0, 60);
  }

  function makeRunner(onSuccess, onFailure) {
    var runner = {
      withSuccessHandler: function (fn) { return makeRunner(fn, onFailure); },
      withFailureHandler: function (fn) { return makeRunner(onSuccess, fn); }
    };
    Object.keys(api).forEach(function (name) {
      runner[name] = function () {
        var args = arguments;
        setTimeout(function () {
          try {
            var result = api[name].apply(null, args);
            if (onSuccess) onSuccess(result);
          } catch (err) {
            if (onFailure) onFailure(err);
          }
        }, 60);
      };
    });
    return runner;
  }

  window.google = { script: { run: makeRunner(null, null) } };
})();