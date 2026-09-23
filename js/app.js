/* ============================================================
   app.js — vocabulary builder, navigation, and shared UI helpers.
   Loads after data/*.js, german.js, srs.js and the mode files.
   ============================================================ */
(function () {
  'use strict';
  var G = window.German, SRS = window.SRS;
  var appEl = document.getElementById('app');

  /* ---------- tiny DOM helper ---------- */
  function h(tag, props) {
    var el = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      if (k === 'class') el.className = props[k];
      else if (k === 'onclick') el.onclick = props[k];
      else if (k in el && k !== 'list') { try { el[k] = props[k]; } catch (e) { el.setAttribute(k, props[k]); } }
      else el.setAttribute(k, props[k]);
    });
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, child) {
    if (child == null || child === false) return;
    if (Array.isArray(child)) return child.forEach(function (c) { append(el, c); });
    el.appendChild(typeof child === 'object' ? child : document.createTextNode(String(child)));
  }
  function mount(node) { appEl.innerHTML = ''; appEl.appendChild(node); }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function scrollTop() { window.scrollTo(0, 0); }

  /* ---------- reusable UI pieces ---------- */
  function articleNode(a) { return h('span', { class: 'art-' + a }, a); }

  function germanNode(e, cls) {
    if (e.article) {
      return h('div', { class: cls }, articleNode(e.article), ' ', e.noun);
    }
    return h('div', { class: cls }, e.germanDisplay);
  }

  var CONJ_LABELS = [['ich', 'ich'], ['du', 'du'], ['er', 'er / sie / es'], ['wir', 'wir'], ['ihr', 'ihr'], ['sie', 'sie / Sie']];
  function conjugationTable(conj) {
    var wrap = h('div', { class: 'card__section' }, h('div', { class: 'sr-note' }, 'Present tense'));
    var table = h('table', { class: 'conj' });
    CONJ_LABELS.forEach(function (row) {
      table.appendChild(h('tr', {}, h('td', {}, row[1]), h('td', {}, conj[row[0]])));
    });
    wrap.appendChild(table);
    return wrap;
  }

  function progressBar(frac) {
    var pct = Math.max(0, Math.min(1, frac)) * 100;
    return h('div', { class: 'bar' }, h('i', { style: 'width:' + pct + '%' }));
  }

  function statRow(label, value, total) {
    return h('div', { class: 'stack' },
      h('div', { class: 'scorebar' }, h('span', {}, label), h('span', {}, value + ' / ' + total)),
      progressBar(total ? value / total : 0));
  }

  /* ---------- display settings (what extras to show) ----------
     Kept minimal by default so words can be learnt alone; the user
     turns Sentence / Conjugation on when they want them. Persisted. */
  var SET_KEY = 'gt_settings_v1';
  var DEFAULT_SETTINGS = { showExample: false, showConjugation: false };
  var settings = loadSettings();
  function loadSettings() {
    try { return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(localStorage.getItem(SET_KEY)) || {}); }
    catch (e) { return Object.assign({}, DEFAULT_SETTINGS); }
  }
  function saveSettings() { try { localStorage.setItem(SET_KEY, JSON.stringify(settings)); } catch (e) {} }

  var Settings = {
    get: function (k) { return !!settings[k]; },
    set: function (k, v) { settings[k] = !!v; saveSettings(); },
    toggle: function (k) { settings[k] = !settings[k]; saveSettings(); return settings[k]; }
  };

  // A reusable toggle-chip row. `opts.conjugation` shows the conjugation
  // toggle (only when the current set actually has verbs). `onChange` re-renders.
  function displayToggles(onChange, opts) {
    var row = h('div', { class: 'chips' });
    row.appendChild(toggleChip('📝 Sentence', 'showExample'));
    if (opts && opts.conjugation) row.appendChild(toggleChip('🔤 Conjugation', 'showConjugation'));
    function toggleChip(label, key) {
      var b = h('button', { class: 'chip' + (settings[key] ? ' chip--on' : '') }, label);
      b.onclick = function () { Settings.toggle(key); if (onChange) onChange(); };
      return b;
    }
    return row;
  }

  /* ---------- expose helpers to modes ---------- */
  window.App = {
    h: h, mount: mount, shuffle: shuffle, scrollTop: scrollTop,
    germanNode: germanNode, articleNode: articleNode,
    conjugationTable: conjugationTable, progressBar: progressBar, statRow: statRow,
    home: showHome, setBack: setBack,
    settings: Settings, displayToggles: displayToggles
  };

  /* ---------- build the vocabulary ---------- */
  var VOCAB = [];
  var usedIds = {};
  function makeId(prefix, english) {
    var base = prefix + '-' + G.slug(english); var id = base, n = 2;
    while (usedIds[id]) { id = base + '-' + (n++); }
    usedIds[id] = 1; return id;
  }

  function addEntry(cat, prefix, raw) {
    var e = { category: cat, english: raw.en, raw: raw.de };
    if (cat === 'noun' || (cat === 'time' && /^(der|die|das)\s/i.test(raw.de))) {
      var p = G.parseNoun(raw.de);
      e.article = p.article; e.noun = p.noun;
      e.germanDisplay = p.article ? (p.article + ' ' + p.noun) : p.noun;
    } else if (cat === 'verb' || cat === 'adjective' || cat === 'color' || cat === 'number') {
      e.germanDisplay = String(raw.de).toLowerCase();
    } else {
      e.germanDisplay = raw.de; // phrases, plain time words
    }

    if (cat === 'verb') e.conjugation = G.conjugate(raw.de);

    if (raw.ex) e.example = raw.ex;
    else if (cat === 'verb') e.example = G.verbExample(raw.de, raw.en);
    else if (cat === 'noun') e.example = G.nounExample(e.article, e.noun, raw.en);
    else if (cat === 'adjective' || cat === 'color') e.example = G.adjExample(raw.de, raw.en);
    else if (cat === 'time' && e.article) e.example = G.nounExample(e.article, e.noun, raw.en);
    else e.example = null;

    e.id = makeId(prefix, raw.en + '-' + raw.de);
    VOCAB.push(e);
  }

  (window.RAW.verbs || []).forEach(function (r) { addEntry('verb', 'v', r); });
  (window.RAW.nouns || []).forEach(function (r) { addEntry('noun', 'n', r); });
  (window.RAW.adjectives || []).forEach(function (r) { addEntry('adjective', 'a', r); });
  (window.RAW.phrases || []).forEach(function (r) { addEntry(r.cat || 'phrase', 'p', r); });

  function itemsIn(cats) {
    return VOCAB.filter(function (e) { return cats.indexOf(e.category) !== -1; });
  }

  /* ---------- categories ---------- */
  var CATEGORIES = [
    { key: 'verb', title: 'Verbs', emoji: '🏃', cats: ['verb'] },
    { key: 'noun', title: 'Nouns', emoji: '📦', cats: ['noun'] },
    { key: 'adjective', title: 'Adjectives', emoji: '✨', cats: ['adjective'] },
    { key: 'phrase', title: 'Everyday phrases', emoji: '💬', cats: ['phrase'] },
    { key: 'color', title: 'Colours', emoji: '🎨', cats: ['color'] },
    { key: 'number', title: 'Numbers', emoji: '🔢', cats: ['number'] },
    { key: 'time', title: 'Days & Time', emoji: '📅', cats: ['time'] },
    { key: 'all', title: 'Mix — everything', emoji: '⭐', cats: ['verb', 'noun', 'adjective', 'phrase', 'color', 'number', 'time'] }
  ];
  function catByKey(k) { for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].key === k) return CATEGORIES[i]; }

  var MODES = [
    { key: 'flashcards', title: 'Flashcards', emoji: '🃏', desc: 'Flip cards and mark what you know' },
    { key: 'quiz', title: 'Quiz', emoji: '❓', desc: 'Multiple choice, typing, or der/die/das' },
    { key: 'review', title: 'Smart Review', emoji: '🧠', desc: 'Spaced repetition — practises weak words' },
    { key: 'reinforce', title: 'Reinforce', emoji: '🔁', desc: "Quiz your ‘still learning’ words (random 10)" },
    { key: 'browse', title: 'Browse list', emoji: '📖', desc: 'Read and search all the words' }
  ];

  /* ---------- navigation ---------- */
  var backBtn = document.getElementById('backBtn');
  var homeBtn = document.getElementById('homeBtn');
  function setBack(fn) {
    if (fn) { backBtn.hidden = false; backBtn.onclick = fn; }
    else { backBtn.hidden = true; backBtn.onclick = null; }
  }
  homeBtn.onclick = showHome;

  function showHome() {
    currentRefresh = showHome;
    setBack(null);
    scrollTop();
    var grid = h('div', { class: 'grid grid--2' });
    CATEGORIES.forEach(function (c) {
      var items = itemsIn(c.cats);
      var st = SRS.stats(items);
      grid.appendChild(h('button', { class: 'tile', onclick: function () { showModes(c.key); } },
        h('div', { class: 'tile__emoji' }, c.emoji),
        h('div', { class: 'tile__body' },
          h('div', { class: 'tile__title' }, c.title),
          h('div', { class: 'tile__desc' }, items.length + ' words')),
        h('div', { class: 'tile__meta' }, st.mastered > 0
          ? h('span', { class: 'pill pill--done' }, st.mastered + ' mastered')
          : h('span', { class: 'pill' }, 'start'))
      ));
    });

    var all = SRS.stats(VOCAB);
    var vocabTile = h('button', { class: 'tile', onclick: showVocabulary },
      h('div', { class: 'tile__emoji' }, '📚'),
      h('div', { class: 'tile__body' },
        h('div', { class: 'tile__title' }, 'My Vocabulary'),
        h('div', { class: 'tile__desc' }, 'The words you have learned')),
      h('div', { class: 'tile__meta' }, h('span', { class: 'pill' + (all.mastered ? ' pill--done' : '') }, all.mastered + ' known')));

    mount(h('div', { class: 'stack' },
      h('h1', { class: 'screen-title' }, 'Guten Tag! 👋'),
      h('p', { class: 'screen-sub' }, 'Pick a set to study. Verbs are a great place to start.'),
      grid,
      h('div', { class: 'spacer' }),
      vocabTile,
      h('div', { class: 'spacer' }),
      h('button', { class: 'btn btn--ghost btn--block', onclick: confirmReset }, 'Reset all progress'),
      h('p', { class: 'sr-note center' }, 'Your progress is saved on this device only.')
    ));
  }

  function showModes(catKey) {
    currentRefresh = function () { showModes(catKey); };
    var c = catByKey(catKey);
    var items = itemsIn(c.cats);
    var st = SRS.stats(items);
    setBack(showHome);
    scrollTop();

    var grid = h('div', { class: 'grid' });
    MODES.forEach(function (m) {
      var meta = '';
      if (m.key === 'review') meta = st.due + ' due';
      else if (m.key === 'reinforce') meta = st.learning + ' learning';
      grid.appendChild(h('button', { class: 'tile', onclick: function () { launch(m.key, c, items); } },
        h('div', { class: 'tile__emoji' }, m.emoji),
        h('div', { class: 'tile__body' },
          h('div', { class: 'tile__title' }, m.title),
          h('div', { class: 'tile__desc' }, m.desc)),
        meta ? h('div', { class: 'tile__meta' }, h('span', { class: 'pill' }, meta)) : null
      ));
    });

    var hasConj = items.some(function (it) { return it.conjugation; });
    mount(h('div', { class: 'stack' },
      h('h1', { class: 'screen-title' }, c.emoji + ' ' + c.title),
      h('p', { class: 'screen-sub' }, items.length + ' words · ' + st.mastered + ' mastered · ' + st.learning + ' learning'),
      statRow('Progress', st.mastered, st.total),
      h('div', { class: 'spacer' }),
      h('div', { class: 'sr-note' }, 'Extras (off = just the word & meaning). You can also toggle these while studying:'),
      displayToggles(function () { showModes(catKey); }, { conjugation: hasConj }),
      h('div', { class: 'spacer' }),
      h('div', { class: 'sr-note' }, 'How do you want to study?'),
      grid
    ));
  }

  var vocabFilter = 'known'; // 'known' | 'learning' | 'all'
  var vocabQuery = '';
  function showVocabulary() {
    currentRefresh = showVocabulary;
    setBack(showHome);
    scrollTop();

    var studied = VOCAB.filter(function (e) { return !SRS.isNew(e.id); });
    var known = studied.filter(function (e) { return SRS.isMastered(e.id); });
    var learning = studied.filter(function (e) { return !SRS.isMastered(e.id); });

    function chip(label, key, count) {
      var b = h('button', { class: 'chip' + (vocabFilter === key ? ' chip--on' : '') }, label + ' (' + count + ')');
      b.onclick = function () { vocabFilter = key; showVocabulary(); };
      return b;
    }

    var source = vocabFilter === 'known' ? known : vocabFilter === 'learning' ? learning : studied;
    var q = vocabQuery.toLowerCase();
    var shown = source.filter(function (e) {
      if (!q) return true;
      return e.germanDisplay.toLowerCase().indexOf(q) !== -1 || e.english.toLowerCase().indexOf(q) !== -1;
    }).sort(function (a, b) { return a.germanDisplay.localeCompare(b.germanDisplay, 'de'); });

    var list = h('div', { class: 'list' });
    shown.forEach(function (e) {
      var box = SRS.get(e.id).box;
      var row = h('div', { class: 'row' });
      row.appendChild(germanNode(e, 'row__de'));
      row.appendChild(h('div', { class: 'row__en' }, e.english));
      row.appendChild(h('div', { class: 'row__badge' },
        SRS.isMastered(e.id)
          ? h('span', { class: 'pill pill--done' }, '✓ known')
          : h('span', { class: 'pill' }, 'box ' + box + '/5')));
      list.appendChild(row);
    });

    var empty = null;
    if (studied.length === 0) {
      empty = h('p', { class: 'muted center' }, 'You have not studied any words yet. Open a set and start with Flashcards or Quiz — words you get right will appear here.');
    } else if (shown.length === 0) {
      empty = h('p', { class: 'muted center' }, vocabQuery ? ('No words match “' + vocabQuery + '.”') : 'Nothing here yet in this filter.');
    }

    var search = h('input', { class: 'search', type: 'search', placeholder: 'Search your words…', value: vocabQuery });
    search.addEventListener('input', function () { vocabQuery = search.value; refreshList(); });
    function refreshList() {
      var q2 = vocabQuery.toLowerCase();
      var src = vocabFilter === 'known' ? known : vocabFilter === 'learning' ? learning : studied;
      var vis = src.filter(function (e) {
        if (!q2) return true;
        return e.germanDisplay.toLowerCase().indexOf(q2) !== -1 || e.english.toLowerCase().indexOf(q2) !== -1;
      }).sort(function (a, b) { return a.germanDisplay.localeCompare(b.germanDisplay, 'de'); });
      var nl = h('div', { class: 'list', id: 'vocabList' });
      vis.forEach(function (e) {
        var box = SRS.get(e.id).box;
        var row = h('div', { class: 'row' });
        row.appendChild(germanNode(e, 'row__de'));
        row.appendChild(h('div', { class: 'row__en' }, e.english));
        row.appendChild(h('div', { class: 'row__badge' }, SRS.isMastered(e.id)
          ? h('span', { class: 'pill pill--done' }, '✓ known')
          : h('span', { class: 'pill' }, 'box ' + box + '/5')));
        nl.appendChild(row);
      });
      if (vis.length === 0) nl.appendChild(h('p', { class: 'muted center' }, vocabQuery ? ('No words match “' + vocabQuery + '.”') : 'Nothing here yet in this filter.'));
      var cur = document.getElementById('vocabList');
      if (cur) cur.replaceWith(nl);
    }
    list.id = 'vocabList';

    mount(h('div', { class: 'stack' },
      h('h1', { class: 'screen-title' }, '📚 My Vocabulary'),
      h('p', { class: 'screen-sub' }, known.length + ' known · ' + learning.length + ' still learning · ' + VOCAB.length + ' total'),
      h('div', { class: 'chips' },
        chip('✓ Known', 'known', known.length),
        chip('📖 Learning', 'learning', learning.length),
        chip('All studied', 'all', studied.length)),
      search,
      empty || list
    ));
  }

  function launch(modeKey, cat, items) {
    if (modeKey === 'reinforce') return launchReinforce(cat, items);
    var ctx = {
      items: items,
      title: cat.title,
      onExit: function () { showModes(cat.key); }
    };
    setBack(ctx.onExit);
    scrollTop();
    window.Modes[modeKey](ctx);
  }

  // Reinforce: quiz just the "still learning" words (studied, not mastered),
  // a random 10, with right/wrong feedback. Options are drawn from the whole
  // category so questions still have 4 choices even if few words are weak.
  function launchReinforce(cat, items) {
    var onExit = function () { showModes(cat.key); };
    setBack(onExit);
    scrollTop();
    var learning = items.filter(function (e) { return !SRS.isNew(e.id) && !SRS.isMastered(e.id); });
    if (learning.length === 0) {
      mount(h('div', { class: 'stack center' },
        h('div', { class: 'big-emoji' }, '🔁'),
        h('h2', { class: 'screen-title' }, 'Nothing to reinforce yet'),
        h('p', { class: 'muted' }, 'Words you mark “Still learning” (or get wrong) in ' + cat.title +
          ' show up here. Study a few in Flashcards or Quiz first, then come back to drill them.'),
        h('button', { class: 'btn btn--primary', onclick: onExit }, 'Back to modes')));
      return;
    }
    window.Modes.quiz({
      items: learning,
      pool: items,
      round: 10,
      title: cat.title,
      titleSuffix: 'Reinforce',
      subtitle: 'Practising ' + learning.length + ' word' + (learning.length === 1 ? '' : 's') +
        ' you’re still learning. Get them right to move them toward “known”.',
      startLabel: 'Start review',
      onExit: onExit
    });
  }

  function confirmReset() {
    mount(h('div', { class: 'stack center' },
      h('div', { class: 'big-emoji' }, '⚠️'),
      h('h2', { class: 'screen-title' }, 'Reset all progress?'),
      h('p', { class: 'muted' }, 'This clears every word’s learning history on this device. It cannot be undone.'),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn', onclick: showHome }, 'Cancel'),
        h('button', { class: 'btn btn--bad', onclick: function () { SRS.resetAll(); showHome(); } }, 'Yes, reset'))
    ));
    setBack(showHome);
  }

  /* ---------- auth + cloud sync ---------- */
  var acctBtn = document.getElementById('acctBtn');
  var currentRefresh = showHome; // re-render the current stable screen after login

  function updateAcct(user) {
    if (!window.Auth || !window.Auth.isEnabled()) { acctBtn.hidden = true; return; }
    acctBtn.hidden = false;
    acctBtn.innerHTML = '';
    if (user) {
      acctBtn.appendChild(h('span', { class: 'avatar' }, (user.email || '?').charAt(0).toUpperCase()));
      acctBtn.onclick = showAccount;
    } else {
      acctBtn.textContent = '👤 Sign in';
      acctBtn.onclick = showLogin;
    }
  }

  // Push local progress to the cloud (debounced) whenever it changes.
  var pushTimer = null;
  if (window.Auth) {
    SRS.onChange(function (store) {
      if (!window.Auth.getUser()) return;
      clearTimeout(pushTimer);
      pushTimer = setTimeout(function () { window.Auth.saveProgress(store); }, 800);
    });

    var lastUserId;
    window.Auth.onChange(function (user) {
      updateAcct(user);
      if (user && user.id !== lastUserId) {
        lastUserId = user.id;
        // Pull cloud progress, merge with this device, then push the
        // combined result back up (also uploads local-only progress).
        window.Auth.loadProgress().then(function (remote) {
          SRS.mergeRemote(remote);
          window.Auth.saveProgress(SRS.exportAll());
          currentRefresh();
        }).catch(function () {});
      } else if (!user) {
        lastUserId = null;
      }
    });
  } else {
    acctBtn.hidden = true;
  }

  function showLogin() {
    setBack(showHome);
    scrollTop();
    var email = h('input', { class: 'text-answer', type: 'email', placeholder: 'you@example.com', autocomplete: 'email' });
    var pw = h('input', { class: 'text-answer', type: 'password', placeholder: 'password (at least 6 characters)', autocomplete: 'current-password' });
    var msg = h('div', { class: 'feedback' });

    function handle(promise) {
      msg.className = 'feedback'; msg.textContent = 'Please wait…';
      promise.then(function (res) {
        if (res && res.error) { msg.className = 'feedback feedback--bad'; msg.textContent = res.error.message; return; }
        if (res && res.data && res.data.user && !res.data.session) {
          msg.className = 'feedback'; msg.textContent = 'Account created! Check your email to confirm, then sign in.';
          return;
        }
        showHome(); // signed in — auth handler loads & merges progress
      }).catch(function (e) { msg.className = 'feedback feedback--bad'; msg.textContent = String((e && e.message) || e); });
    }

    mount(h('div', { class: 'stack' },
      h('h1', { class: 'screen-title' }, 'Sign in'),
      h('p', { class: 'screen-sub' }, 'Sign in to save your progress and pick up on any device. You can also keep using the app without an account.'),
      email, pw, msg,
      h('button', { class: 'btn btn--primary btn--block', onclick: function () { handle(window.Auth.signIn(email.value.trim(), pw.value)); } }, 'Sign in'),
      h('button', { class: 'btn btn--block', onclick: function () { handle(window.Auth.signUp(email.value.trim(), pw.value)); } }, 'Create account'),
      h('button', { class: 'btn btn--ghost btn--block', onclick: showHome }, 'Continue without an account')
    ));
  }

  function showAccount() {
    setBack(showHome);
    scrollTop();
    var user = window.Auth.getUser();
    var st = SRS.stats(VOCAB);
    mount(h('div', { class: 'stack center' },
      h('div', { class: 'big-emoji' }, '👤'),
      h('h2', { class: 'screen-title' }, user ? user.email : 'Account'),
      h('p', { class: 'muted' }, 'Progress is synced to your account across your devices.'),
      statRow('Mastered', st.mastered, st.total),
      h('div', { class: 'spacer' }),
      h('button', { class: 'btn btn--block', onclick: showHome }, 'Back to learning'),
      h('button', { class: 'btn btn--bad btn--block', onclick: function () { window.Auth.signOut().then(showHome); } }, 'Sign out')
    ));
  }

  /* ---------- go ---------- */
  updateAcct(window.Auth && window.Auth.getUser ? window.Auth.getUser() : null);
  showHome();
})();
