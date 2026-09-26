/* ============================================================
   daily.js — per-category "Daily 10" sets + streaks.
   Each category (verbs, nouns, …) gets its own set of up to 10
   words for the day, drawn from words you have NOT yet mastered.
   The same 10 stay put all day and refresh the next day.
   Stored per-device in localStorage (not cloud-synced); the
   underlying word mastery still lives in SRS/gt_progress_v1.
   ============================================================ */
(function (D) {
  'use strict';
  var SRS = window.SRS;

  var KEY = 'gt_daily_v1';
  var SIZE = 10;

  var store = load();

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {}
  }

  // Local calendar date as YYYY-MM-DD (respects local midnight, unlike
  // toISOString which is UTC).
  function dateStr(d) {
    var y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
    return y + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }
  D.today = function () { return dateStr(new Date()); };
  function yesterday() {
    var d = new Date(); d.setDate(d.getDate() - 1); return dateStr(d);
  }

  function rec(catKey) {
    return store[catKey] || { date: '', ids: [], streak: 0, lastCompleted: '' };
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function byId(items) {
    var map = {};
    items.forEach(function (e) { map[e.id] = e; });
    return map;
  }

  // Build today's fresh set: skip mastered words, put new words first
  // (shuffled), then still-learning ordered weakest-box-first. Up to 10.
  function build(items) {
    var candidates = items.filter(function (e) { return !SRS.isMastered(e.id); });
    var fresh = shuffle(candidates.filter(function (e) { return SRS.isNew(e.id); }));
    var learning = SRS.dueQueue(candidates.filter(function (e) { return !SRS.isNew(e.id); }));
    // dueQueue only keeps "due" items; add any remaining learning words after.
    var dueIds = {}; learning.forEach(function (e) { dueIds[e.id] = 1; });
    var laterLearning = candidates.filter(function (e) {
      return !SRS.isNew(e.id) && !dueIds[e.id];
    });
    return fresh.concat(learning, laterLearning).slice(0, SIZE);
  }

  // Today's set for a category. Stable within the day; rebuilt on a new day.
  D.getSet = function (catKey, items) {
    var r = rec(catKey);
    var today = D.today();
    var map = byId(items);
    if (r.date === today && r.ids && r.ids.length) {
      // Re-use the locked set, but drop any word mastered since it was chosen.
      var kept = r.ids
        .map(function (id) { return map[id]; })
        .filter(function (e) { return e && !SRS.isMastered(e.id); });
      if (kept.length) return kept;
      // Everything got mastered — fall through and build a fresh set.
    }
    var set = build(items);
    store[catKey] = {
      date: today,
      ids: set.map(function (e) { return e.id; }),
      streak: r.streak || 0,
      lastCompleted: r.lastCompleted || ''
    };
    save();
    return set;
  };

  // "Do another 10": a mix of the category's still-learning words plus the
  // words practised in today's set (that aren't mastered yet).
  D.extraSet = function (catKey, items) {
    var r = rec(catKey);
    var map = byId(items);
    var seen = {};
    var pool = [];
    function add(e) {
      if (e && !SRS.isMastered(e.id) && !seen[e.id]) { seen[e.id] = 1; pool.push(e); }
    }
    // still-learning words in the category
    items.forEach(function (e) { if (!SRS.isNew(e.id)) add(e); });
    // today's set words
    (r.ids || []).forEach(function (id) { add(map[id]); });
    return shuffle(pool).slice(0, SIZE);
  };

  // Mark today's set complete. Streak counts the first completion per day.
  D.markComplete = function (catKey) {
    var r = rec(catKey);
    var today = D.today();
    if (r.lastCompleted === today) { store[catKey] = r; return r.streak; }
    if (r.lastCompleted === yesterday()) r.streak = (r.streak || 0) + 1;
    else r.streak = 1;
    r.lastCompleted = today;
    store[catKey] = r;
    save();
    return r.streak;
  };

  D.streak = function (catKey) { return rec(catKey).streak || 0; };
  D.isDoneToday = function (catKey) { return rec(catKey).lastCompleted === D.today(); };

})(window.Daily = window.Daily || {});
