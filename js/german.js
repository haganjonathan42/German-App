/* ============================================================
   german.js — language helpers
   - present-tense conjugation for verbs (regular + irregular +
     strong + separable + reflexive)
   - example-sentence generation
   - noun article parsing
   These are authored/derived by us; the source site only gives
   word + translation.
   ============================================================ */
(function (G) {
  'use strict';

  // Fully irregular verbs: all six present-tense forms given.
  var IRREGULAR = {
    'sein':    { ich: 'bin',   du: 'bist',   er: 'ist',   wir: 'sind',   ihr: 'seid',  sie: 'sind' },
    'haben':   { ich: 'habe',  du: 'hast',   er: 'hat',   wir: 'haben',  ihr: 'habt',  sie: 'haben' },
    'werden':  { ich: 'werde', du: 'wirst',  er: 'wird',  wir: 'werden', ihr: 'werdet', sie: 'werden' },
    'wissen':  { ich: 'weiß',  du: 'weißt',  er: 'weiß',  wir: 'wissen', ihr: 'wisst', sie: 'wissen' },
    'mögen':   { ich: 'mag',   du: 'magst',  er: 'mag',   wir: 'mögen',  ihr: 'mögt',  sie: 'mögen' },
    'wollen':  { ich: 'will',  du: 'willst', er: 'will',  wir: 'wollen', ihr: 'wollt', sie: 'wollen' },
    'können':  { ich: 'kann',  du: 'kannst', er: 'kann',  wir: 'können', ihr: 'könnt', sie: 'können' },
    'könnte':  { ich: 'könnte', du: 'könntest', er: 'könnte', wir: 'könnten', ihr: 'könntet', sie: 'könnten' }
  };

  // Strong verbs: only du / er-sie-es change the stem vowel; rest is regular.
  var STRONG = {
    'brechen':   { du: 'brichst', er: 'bricht' },
    'essen':     { du: 'isst',    er: 'isst' },
    'fahren':    { du: 'fährst',  er: 'fährt' },
    'fallen':    { du: 'fällst',  er: 'fällt' },
    'fangen':    { du: 'fängst',  er: 'fängt' },
    'geben':     { du: 'gibst',   er: 'gibt' },
    'halten':    { du: 'hältst',  er: 'hält' },
    'helfen':    { du: 'hilfst',  er: 'hilft' },
    'laden':     { du: 'lädst',   er: 'lädt' },
    'lassen':    { du: 'lässt',   er: 'lässt' },
    'laufen':    { du: 'läufst',  er: 'läuft' },
    'lesen':     { du: 'liest',   er: 'liest' },
    'messen':    { du: 'misst',   er: 'misst' },
    'nehmen':    { du: 'nimmst',  er: 'nimmt' },
    'schlafen':  { du: 'schläfst', er: 'schläft' },
    'schlagen':  { du: 'schlägst', er: 'schlägt' },
    'sehen':     { du: 'siehst',  er: 'sieht' },
    'sprechen':  { du: 'sprichst', er: 'spricht' },
    'tragen':    { du: 'trägst',  er: 'trägt' },
    'treffen':   { du: 'triffst', er: 'trifft' },
    'vergessen': { du: 'vergisst', er: 'vergisst' },
    'verlassen': { du: 'verlässt', er: 'verlässt' },
    'wachsen':   { du: 'wächst',  er: 'wächst' },
    'werfen':    { du: 'wirfst',  er: 'wirft' }
  };

  // Separable verbs: infinitive -> [separable particle, base infinitive].
  var SEPARABLE = {
    'ankommen':   ['an', 'kommen'],
    'anrufen':    ['an', 'rufen'],
    'anbieten':   ['an', 'bieten'],
    'anschauen':  ['an', 'schauen'],
    'anziehen':   ['an', 'ziehen'],
    'aufwachen':  ['auf', 'wachen'],
    'aufzeichnen':['auf', 'zeichnen'],
    'ausdrücken': ['aus', 'drücken'],
    'einladen':   ['ein', 'laden'],
    'fortsetzen': ['fort', 'setzen'],
    'vorbereiten':['vor', 'bereiten'],
    'vorschlagen':['vor', 'schlagen'],
    'vorstellen': ['vor', 'stellen'],
    'zuhören':    ['zu', 'hören'],
    'zustimmen':  ['zu', 'stimmen'],
    'zugeben':    ['zu', 'geben'],
    'zurückkehren':['zurück', 'kehren'],
    'beitragen':  ['bei', 'tragen']
  };

  var REFLEX = { ich: 'mich', du: 'dich', er: 'sich', wir: 'uns', ihr: 'euch', sie: 'sich' };
  var FORMS = ['ich', 'du', 'er', 'wir', 'ihr', 'sie'];

  // Conjugate a plain (non-separable, non-reflexive) base verb.
  function conjBase(inf) {
    if (IRREGULAR[inf]) {
      var o = IRREGULAR[inf];
      return { ich: o.ich, du: o.du, er: o.er, wir: o.wir, ihr: o.ihr, sie: o.sie };
    }
    var stem, full;
    if (/en$/.test(inf))      { stem = inf.slice(0, -2); full = inf; }
    else if (/n$/.test(inf))  { stem = inf.slice(0, -1); full = inf; }   // -eln / -ern
    else                      { stem = inf; full = inf + 'en'; }

    // -eln verbs drop the e in the ich form: sammeln -> ich sammle
    var ichStem = stem;
    if (/eln$/.test(inf)) { ichStem = stem.slice(0, -2) + 'l'; }

    var needsE = /[dt]$/.test(stem) || /(?:[bcdfgkpt]|ch|ph)[mn]$/.test(stem);
    var sibilant = /(?:s|ß|z|x)$/.test(stem);

    var du, er, ihr;
    if (needsE)         { du = stem + 'est'; er = stem + 'et'; ihr = stem + 'et'; }
    else if (sibilant)  { du = stem + 't';   er = stem + 't';  ihr = stem + 't'; }
    else                { du = stem + 'st';  er = stem + 't';  ihr = stem + 't'; }

    var forms = { ich: ichStem + 'e', du: du, er: er, wir: full, ihr: ihr, sie: full };

    if (STRONG[inf]) { forms.du = STRONG[inf].du; forms.er = STRONG[inf].er; }
    return forms;
  }

  // firstOption("Rufen / Anrufen") -> "Rufen"
  function firstOption(s) { return String(s).split('/')[0].trim(); }

  // Public: conjugate any verb string from the data set.
  // Returns { ich, du, er, wir, ihr, sie } (present tense) or null.
  G.conjugate = function (raw) {
    if (!raw) return null;
    var inf = firstOption(raw);
    var reflexive = /^sich\s+/i.test(inf);
    if (reflexive) inf = inf.replace(/^sich\s+/i, '');
    inf = inf.toLowerCase();

    var sep = '';
    if (SEPARABLE[inf]) { sep = SEPARABLE[inf][0]; inf = SEPARABLE[inf][1]; }

    // Multi-word verbs we don't model (e.g. "erfolg haben") -> skip.
    if (/\s/.test(inf)) return null;

    var base = conjBase(inf);
    var out = {};
    FORMS.forEach(function (k) {
      var parts = [base[k]];
      if (reflexive) parts.push(REFLEX[k]);
      if (sep) parts.push(sep);
      out[k] = parts.join(' ');
    });
    return out;
  };

  // Hand-written example sentences for the most common verbs (nicer than
  // the generic fallback). Keyed by lower-case first-option infinitive.
  var VERB_EXAMPLES = {
    'gehen':      { de: 'Ich gehe jeden Tag zur Arbeit.', en: 'I go to work every day.' },
    'haben':      { de: 'Wir haben ein großes Haus.', en: 'We have a big house.' },
    'sein':       { de: 'Sie ist meine beste Freundin.', en: 'She is my best friend.' },
    'werden':     { de: 'Es wird langsam dunkel.', en: 'It is slowly getting dark.' },
    'machen':     { de: 'Was machst du heute Abend?', en: 'What are you doing tonight?' },
    'kommen':     { de: 'Kommst du mit uns?', en: 'Are you coming with us?' },
    'essen':      { de: 'Am Morgen esse ich ein Ei.', en: 'In the morning I eat an egg.' },
    'trinken':    { de: 'Ich trinke gern Kaffee.', en: 'I like drinking coffee.' },
    'sehen':      { de: 'Siehst du das Auto dort?', en: 'Do you see the car there?' },
    'sprechen':   { de: 'Sprichst du Deutsch?', en: 'Do you speak German?' },
    'geben':      { de: 'Er gibt mir das Buch.', en: 'He gives me the book.' },
    'nehmen':     { de: 'Ich nehme den Bus zur Schule.', en: 'I take the bus to school.' },
    'fahren':     { de: 'Wir fahren nach Berlin.', en: 'We are driving to Berlin.' },
    'lesen':      { de: 'Sie liest ein spannendes Buch.', en: 'She is reading an exciting book.' },
    'schlafen':   { de: 'Das Kind schläft schon.', en: 'The child is already sleeping.' },
    'wissen':     { de: 'Ich weiß die Antwort nicht.', en: 'I do not know the answer.' },
    'kaufen':     { de: 'Ich kaufe Brot im Laden.', en: 'I buy bread at the shop.' },
    'lernen':     { de: 'Wir lernen jeden Tag Deutsch.', en: 'We learn German every day.' },
    'arbeiten':   { de: 'Er arbeitet in einem Büro.', en: 'He works in an office.' },
    'wohnen':     { de: 'Ich wohne in einer kleinen Stadt.', en: 'I live in a small town.' },
    'lieben':     { de: 'Ich liebe dich.', en: 'I love you.' },
    'helfen':     { de: 'Kannst du mir helfen?', en: 'Can you help me?' },
    'spielen':    { de: 'Die Kinder spielen im Garten.', en: 'The children are playing in the garden.' },
    'verstehen':  { de: 'Ich verstehe die Frage nicht.', en: 'I do not understand the question.' },
    'brauchen':   { de: 'Ich brauche mehr Zeit.', en: 'I need more time.' }
  };

  G.verbExample = function (raw, english) {
    var inf = firstOption(raw).toLowerCase();
    var reflexive = /^sich\s+/i.test(inf);
    var key = inf.replace(/^sich\s+/i, '');
    if (VERB_EXAMPLES[key]) return VERB_EXAMPLES[key];
    // Generic, grammatically-safe fallback using "möchte" + infinitive.
    var infl = firstOption(raw).toLowerCase();
    var de;
    if (reflexive) {
      de = 'Ich möchte mich ' + infl.replace(/^sich\s+/i, '') + '.';
    } else {
      de = 'Ich möchte ' + infl + '.';
    }
    var en = 'I would like to ' + String(english || '').toLowerCase() + '.';
    return { de: de, en: en };
  };

  // Parse a German noun string -> { article, noun, german } (first option).
  // "der Körper" -> der/Körper ; "die Leute / das Volk" -> die/Leute
  G.parseNoun = function (raw) {
    var first = firstOption(raw);
    var m = first.match(/^(der|die|das)\s+(.+)$/i);
    if (m) return { article: m[1].toLowerCase(), noun: m[2].trim(), german: first };
    return { article: null, noun: first, german: first };
  };

  G.nounExample = function (article, noun, english) {
    var de = article ? ('Das ist ' + article + ' ' + noun + '.') : ('Das ist ' + noun + '.');
    var en = 'That is the ' + String(english || '').toLowerCase().split('/')[0].trim() + '.';
    return { de: de, en: en };
  };

  G.adjExample = function (raw, english) {
    var adj = firstOption(raw).toLowerCase();
    return {
      de: 'Es ist sehr ' + adj + '.',
      en: 'It is very ' + String(english || '').toLowerCase().split('/')[0].trim() + '.'
    };
  };

  // slug helper for ids
  G.slug = function (s) {
    return String(s).toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  };

})(window.German = window.German || {});
