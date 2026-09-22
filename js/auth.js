/* ============================================================
   auth.js — optional Supabase login + cloud progress sync.
   Degrades gracefully: if Supabase isn't configured or can't load
   (e.g. offline, or config.js still has placeholders), the whole
   thing is disabled and the app works as a local guest.
   ============================================================ */
window.Auth = (function () {
  'use strict';

  var cfg = window.SUPABASE_CONFIG || {};
  var configured = !!(cfg.url && cfg.anonKey &&
    cfg.url.indexOf('YOUR_') === -1 && cfg.anonKey.indexOf('YOUR_') === -1);
  var libLoaded = !!(window.supabase && window.supabase.createClient);
  var enabled = configured && libLoaded;

  var client = enabled ? window.supabase.createClient(cfg.url, cfg.anonKey) : null;
  var user = null;
  var listeners = [];

  function notify() { listeners.forEach(function (cb) { try { cb(user); } catch (e) {} }); }

  if (client) {
    client.auth.getSession().then(function (res) {
      user = res && res.data && res.data.session ? res.data.session.user : null;
      notify();
    });
    client.auth.onAuthStateChange(function (_event, session) {
      user = session ? session.user : null;
      notify();
    });
  }

  // Why disabled, for a friendly message on the login screen.
  function status() {
    if (!configured) return 'not-configured';
    if (!libLoaded) return 'offline';   // library couldn't load
    return 'ready';
  }

  return {
    isEnabled: function () { return enabled; },
    status: status,
    getUser: function () { return user; },
    onChange: function (cb) { listeners.push(cb); if (user !== undefined) cb(user); },

    signIn: function (email, password) {
      return client.auth.signInWithPassword({ email: email, password: password });
    },
    signUp: function (email, password) {
      return client.auth.signUp({ email: email, password: password });
    },
    signOut: function () { return client.auth.signOut(); },

    // ---- progress sync (one jsonb row per user in table "progress") ----
    loadProgress: function () {
      if (!user) return Promise.resolve(null);
      return client.from('progress').select('data').eq('user_id', user.id).maybeSingle()
        .then(function (res) { return res && res.data ? res.data.data : null; });
    },
    saveProgress: function (data) {
      if (!user) return Promise.resolve();
      return client.from('progress').upsert({
        user_id: user.id, data: data, updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    }
  };
})();
