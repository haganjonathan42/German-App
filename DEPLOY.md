# Deployment Guide — German Trainer

This guide takes you from the files on your Desktop to a live website with login,
using **Supabase** (backend / accounts) and **Vercel** (hosting).

The app works fully **without** any of this (guest mode, progress saved on the
device). Do the steps below only when you want **accounts + cross‑device sync**.

**Total time:** ~15 minutes. No prior experience needed.

---

## Overview

```
   Your code (GitHub)  ──►  Vercel  ──►  https://your-app.vercel.app
                                │
                                │  (talks to)
                                ▼
                            Supabase  (login + saves your progress)
```

- **Supabase** stores user accounts and each user's learning progress.
- **Vercel** hosts the website and, at deploy time, runs `node build.js` to inject
  your Supabase keys from environment variables (so no keys live in your code).

---

## Part 1 — Supabase (backend)

### 1.1 Create a project
1. Go to <https://supabase.com> and sign up / log in.
2. Click **New project**.
3. Enter a **name**, set a **database password** (save it somewhere), pick the
   **region** closest to you, and click **Create new project**.
4. Wait ~1 minute for it to finish setting up.

### 1.2 Copy your keys
1. Open **Project Settings → API** (the gear icon; may also be under **Connect**).
2. Copy these two values — you'll need them twice (locally and on Vercel):
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public** key — a long string starting with `eyJ...`

> ⚠️ Only ever use the **anon public** key in this app. Never use the
> **service_role** key or your database password in the frontend — those are secret.

### 1.3 Create the progress table + security
1. In the Supabase dashboard, open **SQL Editor → New query**.
2. Paste the following and click **Run**:

```sql
create table if not exists public.progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

create policy "Users manage their own progress"
  on public.progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

This creates one row of progress per user and makes sure each user can read and
write **only their own** data. **This policy is what keeps your data secure** — not
hiding the anon key.

### 1.4 Turn on email sign‑in
1. Open **Authentication → Providers → Email** and make sure **Email** is enabled.
2. Choose one:
   - **Easiest (testing):** turn **“Confirm email” OFF** → creating an account signs
     you in immediately, no email step.
   - **Real launch:** leave **“Confirm email” ON** → new users must click a link in a
     confirmation email before their first sign‑in. If you pick this, do Part 3 so
     the email link points at your live site.

---

## Part 2 — Vercel (hosting)

### 2.1 Put the project on GitHub
In the project folder (`German Verbs App`), run:

```bash
git init
git add .
git commit -m "German Trainer app"
```

Create a new **empty** repository on <https://github.com> (no README), then:

```bash
git remote add origin https://github.com/YOURNAME/german-trainer.git
git branch -M main
git push -u origin main
```

> Your `.env` and generated `js/config.js` are git‑ignored, so **no keys are pushed**.

### 2.2 Import into Vercel
1. Go to <https://vercel.com> and sign up / log in (using your GitHub account is
   simplest).
2. Click **Add New… → Project** and **import** your `german-trainer` repo.
3. **Framework Preset:** leave as **Other**. The build command is already set to
   `node build.js` by `vercel.json` — don't change it.

### 2.3 Add your keys as environment variables
Before deploying (the import screen has an **Environment Variables** section — or add
them later under **Settings → Environment Variables**), add these two, for **all**
environments (Production, Preview, Development):

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | `https://YOURPROJECT.supabase.co` |
| `SUPABASE_ANON_KEY` | your anon public key |

### 2.4 Deploy
Click **Deploy**. In ~30 seconds you'll get a live URL like
`https://german-trainer.vercel.app`. Vercel automatically ran `node build.js`, which
turned your env vars into `js/config.js`.

> **Prefer the command line?** Instead of 2.2–2.4:
> ```bash
> npm i -g vercel
> cd "German Verbs App"
> vercel                       # first run: answer the prompts
> vercel env add SUPABASE_URL          # paste value when asked
> vercel env add SUPABASE_ANON_KEY     # paste value when asked
> vercel --prod                # publish
> ```

---

## Part 3 — Connect Supabase to your live site

So confirmation / password‑reset email links return users to your site:

1. In Supabase, open **Authentication → URL Configuration**.
2. Set **Site URL** to your Vercel address, e.g. `https://german-trainer.vercel.app`.
3. Under **Redirect URLs**, add the same address (and keep
   `http://localhost:8000` if you also test locally).

---

## Part 4 — Test it

1. Open your live Vercel URL. A **👤 Sign in** button should appear top‑right.
2. Click it → **Create account** → enter an email + password.
   - If you turned email confirmation **off**, you're signed in right away.
   - If **on**, check your email and click the link, then **Sign in**.
3. Study a few words. Then open the site on your **phone**, sign in with the same
   account — your progress should be there. 🎉

---

## Testing locally (optional)

To run the login flow on your own computer before deploying:

```bash
cp .env.example .env      # then paste your Supabase URL + anon key into .env
node build.js             # generates js/config.js from .env
```

Then open `index.html` (or run `python3 -m http.server` and visit
<http://localhost:8000>). Re‑run `node build.js` any time you change `.env`.

---

## Updating the site later

Any time you change the code or word lists:

```bash
git add .
git commit -m "describe your change"
git push
```

Vercel redeploys automatically on every push to `main`.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| **No 👤 Sign in button** | Keys aren't set. Locally: check `.env` and re‑run `node build.js`. On Vercel: confirm both env vars exist, then **redeploy**. |
| **"Invalid API key" / login errors** | The `SUPABASE_URL` or `SUPABASE_ANON_KEY` value is wrong. Re‑copy from Supabase **Settings → API** and update `.env` (local) and Vercel env vars. |
| **Sign‑up says "check your email" but no email** | Email confirmation is ON. Either confirm via the email, or turn it OFF in **Authentication → Providers → Email** for testing. |
| **Progress not syncing between devices** | Make sure you ran the SQL in step 1.3 (the `progress` table + policy) and that you're signed in with the **same account** on both devices. |
| **Vercel build fails** | Ensure `vercel.json` is present and the Build Command is `node build.js`. It needs no npm packages. |
| **Login works locally but not on Vercel (or vice‑versa)** | Env vars must be set in **both** places: `.env` locally and Vercel's dashboard. Redeploy after adding them on Vercel. |

---

For how the app itself works (study modes, word lists, adding words), see
[`README.md`](README.md).
