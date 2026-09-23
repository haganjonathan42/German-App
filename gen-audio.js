#!/usr/bin/env node
/* ============================================================
   gen-audio.js — generate natural pronunciation MP3s for every word
   using Google Cloud Text-to-Speech, and write audio/manifest.js.

   Why: the browser's built-in voices are robotic and, on iPhone, the
   downloaded "enhanced" voices are not available to web pages, and
   speech synthesis is muted by the silent switch. Pre-recorded MP3s
   played via <audio> sound natural, are identical on every device, and
   play even when the iPhone is on silent.

   Setup (one time):
     1. Create a Google Cloud project and enable "Cloud Text-to-Speech API".
     2. Create an API key (APIs & Services -> Credentials -> Create API key).
     3. Put it in your .env:   GOOGLE_TTS_API_KEY=AIza...
   Run:
     node gen-audio.js            # generates missing word clips
     node gen-audio.js --force    # re-generate everything
   Then commit the audio/ folder and push (Vercel serves the files).

   Cost: well within Google's free tier for ~520 short words.
   Options (env): TTS_VOICE (default de-DE-Neural2-F), TTS_RATE (default 0.95)
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

// --- read .env for the API key (same simple parser as build.js) ---
function readEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line) => {
    const s = line.trim(); if (!s || s.startsWith('#')) return;
    const i = s.indexOf('='); if (i === -1) return;
    let v = s.slice(i + 1).trim();
    if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1);
    out[s.slice(0, i).trim()] = v;
  });
  return out;
}
const fileEnv = readEnv(path.join(__dirname, '.env'));
const KEY = process.env.GOOGLE_TTS_API_KEY || fileEnv.GOOGLE_TTS_API_KEY;
const VOICE = process.env.TTS_VOICE || fileEnv.TTS_VOICE || 'de-DE-Neural2-F';
const RATE = parseFloat(process.env.TTS_RATE || fileEnv.TTS_RATE || '0.95');
const FORCE = process.argv.indexOf('--force') !== -1;
const DRY = process.argv.indexOf('--dry') !== -1; // build ids only, no API/files

if (!KEY && !DRY) {
  console.error('Missing GOOGLE_TTS_API_KEY. Add it to .env (see AUDIO.md). Aborting.');
  process.exit(1);
}
if (!DRY && typeof fetch === 'undefined') {
  console.error('This script needs Node 18+ (global fetch). Please upgrade Node.');
  process.exit(1);
}

// --- rebuild the exact same word ids + speakText the app uses ---
global.window = {};
['data/verbs.js', 'data/nouns.js', 'data/adjectives.js', 'data/phrases.js', 'js/german.js']
  .forEach((f) => eval(fs.readFileSync(path.join(__dirname, f), 'utf8')));
const G = global.window.German, RAW = global.window.RAW;

function buildVocab() {
  const VOCAB = [], used = {};
  const makeId = (prefix, english) => {
    let base = prefix + '-' + G.slug(english), id = base, n = 2;
    while (used[id]) id = base + '-' + (n++);
    used[id] = 1; return id;
  };
  const add = (cat, prefix, raw) => {
    const e = { category: cat, english: raw.en, raw: raw.de };
    if (cat === 'noun' || (cat === 'time' && /^(der|die|das)\s/i.test(raw.de))) {
      const p = G.parseNoun(raw.de); e.article = p.article; e.noun = p.noun;
      e.germanDisplay = p.article ? (p.article + ' ' + p.noun) : p.noun;
    } else if (['verb', 'adjective', 'color', 'number'].indexOf(cat) !== -1) {
      e.germanDisplay = String(raw.de).toLowerCase();
    } else { e.germanDisplay = raw.de; }
    e.speakText = e.article ? (e.article + ' ' + e.noun) : e.germanDisplay.split('/')[0].trim();
    e.id = makeId(prefix, raw.en + '-' + raw.de);
    VOCAB.push(e);
  };
  (RAW.verbs || []).forEach((r) => add('verb', 'v', r));
  (RAW.nouns || []).forEach((r) => add('noun', 'n', r));
  (RAW.adjectives || []).forEach((r) => add('adjective', 'a', r));
  (RAW.phrases || []).forEach((r) => add(r.cat || 'phrase', 'p', r));
  return VOCAB;
}

async function synth(text) {
  const url = 'https://texttospeech.googleapis.com/v1/text:synthesize?key=' + KEY;
  const body = {
    input: { text: text },
    voice: { languageCode: 'de-DE', name: VOICE },
    audioConfig: { audioEncoding: 'MP3', speakingRate: RATE }
  };
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error('TTS ' + res.status + ': ' + (await res.text()).slice(0, 200));
  const json = await res.json();
  return Buffer.from(json.audioContent, 'base64');
}

(async () => {
  const vocab = buildVocab();
  const outDir = path.join(__dirname, 'audio');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  if (DRY) {
    console.log('DRY RUN — ' + vocab.length + ' words. Sample ids:');
    vocab.slice(0, 6).forEach((e) => console.log('  ' + e.id + '  →  "' + e.speakText + '"'));
    console.log('(no API calls, no files written)');
    return;
  }

  let made = 0, skipped = 0, failed = 0;
  const manifest = {};
  console.log('Generating audio with voice "' + VOICE + '" (rate ' + RATE + ') for ' + vocab.length + ' words…');

  for (const e of vocab) {
    const file = path.join(outDir, e.id + '.mp3');
    if (!FORCE && fs.existsSync(file)) { manifest[e.id] = 1; skipped++; continue; }
    try {
      const mp3 = await synth(e.speakText);
      fs.writeFileSync(file, mp3);
      manifest[e.id] = 1; made++;
      if (made % 25 === 0) console.log('  …' + made + ' generated');
      await new Promise((r) => setTimeout(r, 60)); // be gentle on the API
    } catch (err) {
      failed++;
      console.error('  ✗ ' + e.speakText + ' (' + e.id + '): ' + err.message);
    }
  }

  const manifestJs =
    '/* AUTO-GENERATED by gen-audio.js — words that have an MP3 in this folder. */\n' +
    'window.AUDIO_MANIFEST = ' + JSON.stringify(manifest, null, 0) + ';\n';
  fs.writeFileSync(path.join(outDir, 'manifest.js'), manifestJs);

  console.log('\nDone. ' + made + ' generated, ' + skipped + ' already existed, ' + failed + ' failed.');
  console.log('Total words with audio: ' + Object.keys(manifest).length + ' / ' + vocab.length);
  console.log('Now commit the audio/ folder and push:  git add audio && git commit -m "add pronunciation audio" && git push');
})();
