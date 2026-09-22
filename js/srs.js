/* ============================================================
   srs.js — Leitner spaced-repetition + progress storage
   Progress is saved per-device in localStorage (no login/server).
   A word climbs boxes 1..5 when answered correctly and drops to
   box 1 when wrong. Higher boxes are shown less often.
   ============================================================ */
(function (S) {
  'use strict';

  var KEY = 'gt_progress_v1';
  var MASTER_BOX = 5;
  // How many days until a word in each box is "due" again.
  var INTERVALS = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 16 };
  var DAY = 24 * 60 * 60 * 1000;

  var store = load();
  var onChange = null; // set by the app to sync progress to the cloud

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {}
    if (onChange) { try { onChange(store); } catch (e) {} }
  }

  S.get = function (id) {
    return store[id] || { box: 1, correct: 0, wrong: 0, lastSeen: 0 };
  };

  S.record = function (id, wasCorrect) {
    var r = store[id] || { box: 1, correct: 0, wrong: 0, lastSeen: 0 };
    if (wasCorrect) { r.box = Math.min(MASTER_BOX, r.box + 1); r.correct++; }
    else            { r.box = 1; r.wrong++; }
    r.lastSeen = Date.now();
    store[id] = r;
    save();
    return r;
  };

  // A word is "due" if never seen, or its interval since lastSeen has passed.
  S.isDue = function (id) {
    var r = store[id];
    if (!r) return true;
    var days = INTERVALS[r.box] != null ? INTERVALS[r.box] : 0;
    return Date.now() - r.lastSeen >= days * DAY;
  };

  S.isMastered = function (id) {
    var r = store[id];
    return !!r && r.box >= MASTER_BOX;
  };

  S.isNew = function (id) { return !store[id]; };

  // Order a list for review: due items first, weakest boxes first, new items early.
  S.dueQueue = function (items) {
    var due = items.filter(function (it) { return S.isDue(it.id); });
    due.sort(function (a, b) { return S.get(a.id).box - S.get(b.id).box; });
    return due;
  };

  S.stats = function (items) {
    var mastered = 0, learning = 0, fresh = 0, due = 0;
    items.forEach(function (it) {
      if (S.isNew(it.id)) fresh++;
      else if (S.isMastered(it.id)) mastered++;
      else learning++;
      if (S.isDue(it.id)) due++;
    });
    return { total: items.length, mastered: mastered, learning: learning, fresh: fresh, due: due };
  };

  S.resetAll = function () { store = {}; save(); };

  S.resetItems = function (items) {
    items.forEach(function (it) { delete store[it.id]; });
    save();
  };

  /* ---- cloud-sync support ---- */
  S.onChange = function (cb) { onChange = cb; };
  S.exportAll = function () { return store; };

  // Merge a remote progress map into the local one, keeping whichever
  // record for each word was seen most recently. Saves the result.
  S.mergeRemote = function (remote) {
    if (!remote) return;
    Object.keys(remote).forEach(function (id) {
      var r = remote[id], local = store[id];
      if (!local || (r.lastSeen || 0) > (local.lastSeen || 0)) store[id] = r;
    });
    // Note: save() also triggers onChange, pushing the merged result back up.
    save();
  };

})(window.SRS = window.SRS || {});
