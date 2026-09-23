# German Trainer 🇩🇪

A simple, offline web app for learning common German vocabulary — built for a
complete beginner. Four study modes, works on phone and computer, no login and
no internet needed.

## How to open it

**Easiest:** double-click `index.html`. It opens in your web browser and works
straight away.

**Or run a tiny local server** (nicer on some phones/browsers). In this folder:

```
python3 -m http.server
```

Then open <http://localhost:8000> in your browser. On your phone, open your
computer's address instead, e.g. `http://192.168.1.20:8000` (same Wi‑Fi).

> The app runs fully as a **guest** with no setup. Login is optional: to enable it,
> add your Supabase keys and run `node build.js` once (see **[DEPLOY.md](DEPLOY.md)**).
> Until then the 👤 Sign in button simply stays hidden.

## What's inside

- **~522 words** across categories: **Verbs** (200), **Nouns** (with der/die/das),
  **Adjectives** (140), plus everyday **Phrases**, **Colours**, **Numbers**, and
  **Days & Time**. Pick one set, or **Mix — everything**.
- **Four ways to study** (pick after choosing a set):
  - **🃏 Flashcards** — flip a card, then mark “I knew it” / “Still learning”.
  - **❓ Quiz** — multiple choice, type-the-answer, or **der/die/das** for nouns.
  - **🧠 Smart Review** — shows only the words that are *due*, practising your
    weak ones more often (spaced repetition).
  - **📖 Browse** — a searchable list of every word.
- **Distraction‑free by default, flexible extras.** By default a card shows just
  the **word and its meaning** — nothing else. Two one‑tap toggles let you add
  **📝 Sentence** and/or **🔤 Conjugation** whenever you want them (and turn them
  back off). Your choice is remembered. The toggles appear both on the mode‑picker
  screen and while you study, in Flashcards, Smart Review, and Browse.
- Nouns always show the colour‑coded **article** (der = blue, die = pink,
  das = green) since that is part of the word itself.
- **🔊 Pronunciation.** Tap the speaker next to any word or example sentence to
  hear it spoken in German. Uses your device's built‑in text‑to‑speech, so it needs
  no downloads and works offline. (If a browser has no German voice it falls back to
  the default voice; the button hides on browsers with no speech support.)

## Your progress

- **Without an account (guest):** progress is saved **in your browser on this
  device** and stays between visits. Phone and computer track separately.
- **Signed in (optional Supabase login):** progress is saved to your account and
  **synced across all your devices**. When you sign in, your device's progress and
  your cloud progress are merged (the most recent result for each word wins).

“Reset all progress” on the home screen clears the local copy. The **👤 button**
in the top‑right is for signing in (it only appears once Supabase is configured).

## Where the words come from

The English↔German word lists were taken from lingualid.com for personal study.
The example sentences, articles, and conjugations were generated for this app
(the source site only lists word + translation).

## Adding or editing words

Word lists live in the `data/` folder as simple lists:

```js
// data/verbs.js
{ en: 'Go', de: 'Gehen' },
```

Add a line in the same format and reload. For nouns include the article
(`{ en: 'Dog', de: 'der Hund' }`); conjugations and example sentences are
generated automatically by `js/german.js`.

## Deploying (login + cloud sync with Supabase & Vercel)

To add accounts and cross-device progress sync, and put the app online, follow the
step-by-step guide in **[DEPLOY.md](DEPLOY.md)**. It covers creating the Supabase
project, the database table + security, environment variables, and deploying to
Vercel — plus a troubleshooting table.

The app works fully **without** any of this (guest mode), so this is optional.

## Files

- `index.html` – the page
- `css/styles.css` – styling (light/dark, mobile-friendly)
- `data/*.js` – the word lists
- `.env.example` – template for your Supabase keys (copy to `.env`)
- `build.js` – generates `js/config.js` from env vars (`.env` / Vercel)
- `js/config.js` – **auto-generated** by `build.js` (git-ignored, don't edit)
- `js/german.js` – conjugation + example-sentence engine
- `js/srs.js` – spaced-repetition + progress saving (local + cloud)
- `js/auth.js` – optional Supabase login + progress sync
- `js/flashcards.js`, `js/quiz.js`, `js/review.js`, `js/browse.js` – the modes
- `js/app.js` – builds the vocabulary and runs the app
- `vercel.json` – Vercel build command (`node build.js`) + static output
- `DEPLOY.md` – full step-by-step deployment guide (Supabase + Vercel)
