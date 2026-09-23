# Natural Pronunciation Audio

The app can speak words two ways:

1. **Built-in device voice** (default, no setup) — free and offline, but robotic on
   some devices, and on **iPhone/Safari** it can't use your downloaded "enhanced"
   voices and is muted by the **silent switch**.
2. **Pre-recorded MP3s** (this guide) — natural cloud voices, generated once with
   Google Cloud Text-to-Speech, served as files. They sound the same on every device
   and, because they play through an `<audio>` element, **they work even when the
   iPhone is on silent**.

The app automatically prefers an MP3 when it exists and falls back to the device voice
otherwise, so you can add audio for some or all words at any time.

---

## One-time setup

### 1. Create a Google Cloud project + API key
1. Go to <https://console.cloud.google.com> and create a project (or use an existing one).
2. Enable the API: search **"Cloud Text-to-Speech API"** → **Enable**.
   (You'll need billing enabled on the project, but this stays within the free tier.)
3. Create a key: **APIs & Services → Credentials → Create credentials → API key**.
   Copy it. (Optional but recommended: **Restrict key** → restrict to the
   Text-to-Speech API.)

> **Cost:** Google's free tier covers ~1 million characters/month of Neural2/WaveNet
> audio. Our ~520 words are a few thousand characters, so generating them is
> effectively free.

### 2. Put the key in `.env`
```
GOOGLE_TTS_API_KEY=AIza...your key...
# optional:
# TTS_VOICE=de-DE-Neural2-F      # try de-DE-Neural2-B (male), de-DE-Wavenet-C, etc.
# TTS_RATE=0.95
```
`.env` is git-ignored, so the key is never committed or shipped to the browser.

### 3. Generate the audio
Requires **Node 18+** (for built-in `fetch`).
```bash
node gen-audio.js --dry     # optional: preview how many words / the ids, no API calls
node gen-audio.js           # generate MP3s for all words (skips ones already made)
node gen-audio.js --force   # re-generate everything (e.g. after changing the voice)
```
This writes `audio/<word-id>.mp3` for every word and updates `audio/manifest.js`.

### 4. Commit and deploy
```bash
git add audio
git commit -m "Add pronunciation audio"
git push
```
Vercel serves the `audio/` folder statically. Reload the app — the 🔊 buttons now play
the natural recordings (and work in iPhone silent mode).

---

## Notes

- **Choosing a voice:** browse voices at
  <https://cloud.google.com/text-to-speech/docs/voices> (filter language "German").
  Good picks: `de-DE-Neural2-F` (female), `de-DE-Neural2-B` (male),
  `de-DE-Wavenet-C`. Set `TTS_VOICE` in `.env` and run `node gen-audio.js --force`.
- **Size:** ~520 short MP3s total only a few MB — fine to commit and serve.
- **Words only for now:** this generates audio for the words. Example-sentence audio
  can be added later (the example 🔊 buttons currently use the device voice).
- **Alternative providers:** Azure and ElevenLabs also work; you'd adapt the request
  in `gen-audio.js`. Google Neural2 is a great, cheap default.
- **No key yet?** The app still works — it just uses the built-in device voice until
  the MP3s exist.
