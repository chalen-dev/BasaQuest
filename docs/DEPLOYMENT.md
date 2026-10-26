# Deploying BasaQuest to the cloud

This puts BasaQuest online so other people (for example a groupmate who is
reviewing the word pictures) can use it with their own login. Nothing here
needs SSH keys: Vercel / Cloudflare connect to GitHub with a normal
"authorize" login and rebuild the site on every push to `main`.

**What runs where**

| Piece | Where | Cost |
|---|---|---|
| Website (the React app in `dist/`) | Vercel or Cloudflare Pages | free plan |
| Database, logins, file storage, edge functions | Supabase Cloud | free plan |
| Passage generation / voices | Gemini and Azure Speech (your API keys) | pay per use / free tiers |
| Pronunciation scoring service (`VITE_SCORING_SERVICE_URL`) | **not covered here** (see "Known gaps") | n/a |

Plan on 1–2 hours the first time. Check each provider's pricing page before
you start, since free-plan limits change.

---

## 0. Before you start

You need:

- A GitHub account with this repo pushed (you have this).
- A [Supabase](https://supabase.com) account.
- A [Vercel](https://vercel.com) account (sign in with GitHub). Cloudflare Pages
  works too — see step 9.
- Node.js and this project's dependencies installed (`npm install`).
- The Supabase CLI. You don't have to install it: every command below uses
  `npx supabase ...`.
- Your **Gemini API key** (passage generation). An **Azure Speech key and
  region** are needed for the pronunciation button (`pronounce-word`).

> **Never put the Supabase `service_role` / secret key in the website's
> environment variables or in git.** It bypasses all security. It only goes in
> `.env.cloud.local` on your own computer and in Supabase's secrets.

Commands below are for **PowerShell** on Windows. In Git Bash, write
`ENV_FILE=.env.cloud.local npm run ...` instead of
`$env:ENV_FILE=".env.cloud.local"; npm run ...`.

---

## 1. Create the Supabase project

1. In the Supabase dashboard: **New project**. Pick a region close to the
   Philippines (Singapore is the nearest) and save the database password
   somewhere safe.
2. Open **Project Settings → API** (or **API Keys**) and note:
   - **Project URL** — `https://<project-ref>.supabase.co`
   - the **anon / publishable** key (safe to expose in the website)
   - the **service_role / secret** key (private!)
3. The **project ref** is the `<project-ref>` part of the URL.

## 2. Create `.env.cloud.local`

In the project root, create a file called `.env.cloud.local`. Any file ending
in `.local` is already ignored by git.

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon / publishable key>
SUPABASE_SERVICE_ROLE_KEY=<service_role / secret key>

# Real admin accounts for the deployed site (usernames log in as
# <username>@basaquest.local behind the scenes). Use strong passwords.
SEED_ADMIN_ACCOUNTS_JSON=[{"username":"chael","name":"Chael Lusaya","password":"a-long-real-password"},{"username":"groupmate","name":"Your Groupmate","password":"another-long-password"}]
```

## 3. Push the database

```powershell
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

`db push` applies every file in `supabase/migrations/`: tables, security
rules, the `word-images` and recording buckets, and the daily recording-purge
job. It includes `protect_profile_columns`, a security fix that stops any
signed-in user from changing their own `role` (without it, a student could
make themselves an admin with one request) — don't skip it. If it complains about the `pg_cron` or `pg_net` extension, enable both in
**Database → Extensions** in the dashboard and run `db push` again.

## 4. Auth settings (important)

In **Authentication** in the dashboard:

1. **Providers → Email → turn OFF "Confirm email".** BasaQuest signs people up
   with made-up `@basaquest.local` addresses that can't receive mail, so with
   confirmation on, new accounts could never log in. (Locally this is already
   off in `supabase/config.toml`.)
2. **URL Configuration:** set **Site URL** to your website address once you
   have it (step 9) and add it under **Redirect URLs**.
3. **Turn off open sign-ups (strongly recommended).** The app has a public
   **Register** page, and every new account starts as a *teacher*. Teachers
   can view the fine-tuning recordings, so anyone who finds the site could
   register and read them. Under **Authentication → Sign In / Providers**,
   switch off "Allow new users to sign up" once your admins exist (step 5).
   The Register page will then stop working, which is what you want for a
   private review site. Existing accounts and accounts created by an admin or
   a teacher through the app keep working.

## 5. Create your admin accounts and the reference data

```powershell
$env:ENV_FILE=".env.cloud.local"; npm run seed:cloud
```

This creates only the admin accounts from `SEED_ADMIN_ACCOUNTS_JSON` plus the
recording sentence sets. It deliberately does **not** run the normal
`npm run seed`, which creates demo teachers and students whose password
(`basaquest`) is public in this repo.

Adding another admin later: add them to `SEED_ADMIN_ACCOUNTS_JSON` and run the
command again (accounts that already exist just print an error and are skipped).

### Letting a teammate choose a password you never see

A teammate can send you a **password hash** instead of a password. A hash is a
scrambled form of the password that Supabase accepts directly; you can create
their account from it without ever knowing the password.

**Easiest (no install):** send the teammate the single file
`tools/hash-password.html`. They double-click it, which opens it in their
browser, fill in the form and press **Make hash**. Two buttons then appear: **Copy line** (just the
three lines) and **Copy message** (a ready-to-send note for the group chat
that includes those lines). It uses the very same
library and settings as the command below (bcryptjs, strength 12), runs
entirely inside the browser, and its security policy blocks every network
request, so the password can't leave the page. They can even turn off the
internet first. Rebuild the file after upgrading bcryptjs with
`npm run build:hash-tool`.

**Or with the project installed**, on the teammate's computer:

```powershell
npm run hash-password
```

Either way you get three plain lines:

```
Username: johndoe
Name: John Doe
Password hash: $2b$12$...
```

They send you those lines (a private message, not a public channel). You turn
them into one entry in `SEED_ADMIN_ACCOUNTS_JSON`, using `passwordHash` where a
plain account would have `password` (each account uses one or the other, never both):

```
SEED_ADMIN_ACCOUNTS_JSON=[{"username":"chael","name":"Chael Lusaya","password":"..."},{"username":"johndoe","name":"John Doe","passwordHash":"$2b$12$..."}]
```

Then run `seed:cloud` as above. They log in with the password they typed.

Notes: a hash is not the password, but anyone holding it can try to guess the
password offline, so the password should be long and unique (the script
requires at least 10 characters; a passphrase of several words is better).
Changing a password later means making a new hash and updating the account
(there is no change-password screen in the app).

## 6. Deploy the edge functions and set their secrets

```powershell
npx supabase functions deploy
npx supabase secrets set GEMINI_API_KEY=<your gemini key>
npx supabase secrets set AZURE_SPEECH_KEY=<key> AZURE_SPEECH_REGION=<region, e.g. southeastasia>
npx supabase secrets set CRON_SECRET=<a long random string you make up>
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are added
to functions automatically — don't set those yourself. Re-run
`npx supabase functions deploy generate-remediation-passages` whenever you
change that function (for example the name tagging).

## 7. Turn on the daily recording purge

Pupil recordings are deleted after 7 days by a nightly job. It needs two
values stored in the database vault. In the dashboard **SQL Editor**, run this
once (use the same `CRON_SECRET` as in step 6):

```sql
select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
select vault.create_secret('<the same CRON_SECRET>', 'cron_secret');
```

Skipping this doesn't break the site, but recordings would never be purged.

## 8. Load the word-picture bank

Make sure your local Supabase is running, then copy the bank from your
computer to the cloud project:

```powershell
npm run word-images:copy -- --from .env.local --to .env.cloud.local
```

It copies every picture file and word row (including which pictures are
already reviewed) and takes a few minutes. It is safe to run again; it only
adds and updates.

## 9. Put the website online

### Vercel (recommended)

1. **Add New… → Project**, then import your GitHub repo.
2. Vercel detects Vite. Check: **Build Command** `npm run build`, **Output
   Directory** `dist`.
3. Under **Environment Variables** add only:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SCORING_SERVICE_URL` — only if you've deployed a scoring service
4. **Deploy.** Every later `git push` to `main` redeploys automatically.

`vercel.json` in the repo makes page refreshes and deep links (such as
`/admin/word-images`) work; without it they would show a 404.

### Cloudflare Pages (alternative)

**Workers & Pages → Create → Pages → Connect to Git.** Build command
`npm run build`, output directory `dist`, same environment variables as
above. `public/_redirects` takes care of the page-refresh routing.

## 10. Finish the Supabase side

Copy your new website address (for example
`https://basaquest.vercel.app`) into **Authentication → URL Configuration**
(Site URL and Redirect URLs) as noted in step 4.

## 11. Check that it works

- [ ] The site loads, and refreshing on `/admin/word-images` doesn't 404.
- [ ] The login page shows **no** demo passwords.
- [ ] You can log in with your admin account.
- [ ] **Word Pictures** shows about 1,100 pictures, and **Preview in coach** works.
- [ ] `/credits` lists ARASAAC with its license.
- [ ] (Optional) In the app, generate a remediation passage to confirm Gemini works.

---

## Test accounts on the real site

While you are still testing, you can keep a test teacher and some test pupils
on the deployed site, in the same database as the real accounts. They are
**tagged** (`profiles.is_test = true`) so you can tell them apart, and one
command removes all of them before real classes start.

```powershell
npm run seed:testdata               # create the test teachers, pupils and fake attempts
npm run unseed:testdata             # preview what would be removed
npm run unseed:testdata -- --yes    # remove all of it
```

- Add `SEED_TEST_PASSWORD=<a private password, 12+ characters>` to
  `.env.cloud.local`. It must not be `basaquest`; the script refuses to run
  without a private one. The demo password is public in this repo, so it is never
  used on the real site.
- Accounts are named `test-guro`, `test-ramon`, `test-ella` and so on, so
  they cannot collide with a real person's username. **No test admin is
  created**; admins are only the real ones from `seed:cloud`.
- Tagging follows the teacher: any pupil linked to a test teacher, including
  ones the test teacher creates in the app, is tagged test automatically. The
  tag can only be changed by the server, never from a browser.
- Test accounts show a yellow **TEST** badge in the header.
- Removing a test account also removes its attempts, assignments, reports and
  recording files. Real accounts are never touched.
- Run `npx supabase db push` **before** deploying the website that reads the
  tag (the migration `add_is_test_to_profiles`), or logins will fail until you
  do. The full `npm run seed` now refuses to run against anything but the
  local stack.

**Not done yet: hiding test and real data from each other.** The tag only
labels data. Today the database lets every signed-in user read every profile
("Users can view all profiles"), so a test teacher could still see real names
and the other way round. Making test and real exclusive means narrowing that
rule and the rules on attempts and recordings by the `is_test` group, and
should be done together with the planned teacher-to-teacher features. Until
then, do not put real pupils' data on a site that test accounts can log in to.
Pictures stay shared by design.

---

## Having your groupmate review pictures

1. Give them the website address and the admin username and password you
   created for them.
2. They open **Word Pictures → Needs review** and use **Approve**, **Replace**,
   the pencil (edit words) and **Preview** (eye) on each picture. Progress is
   saved for both of you as they go.
3. When they're done, bring their work home:

```powershell
npm run word-images:copy -- --from .env.cloud.local --to .env.local
```

Notes: this overwrites your local rows with the cloud's version (including
reviewed flags). It adds and updates but never deletes, so a picture deleted on
the cloud stays on your computer until you delete it there too.

---

## Known gaps and decisions

- **Pronunciation scoring service.** The app calls a separate service
  (`VITE_SCORING_SERVICE_URL`) to score reading. It is not part of this
  project's deployment. Without it, scoring in the assessment and the coach
  won't work on the deployed site. The picture review doesn't need it. If you
  need scoring online, host that service separately (any host that runs a
  small Python/Node web service) and set the variable in Vercel.
- **Don't upload real pupil data to a review site.** Fine-tuning recordings and
  consent files are children's data. Keep them on your own machine; the
  deployed site should hold only admin accounts, the word pictures and
  reference data.
- **Free Supabase projects pause** after about a week without activity. Open
  the dashboard and restore it before a demo or defense.
- **Secrets cheat sheet.** Website variables: Supabase URL and anon key.
  Supabase secrets: Gemini key, Azure key and region, `CRON_SECRET`. Only your
  computer: the service-role key (`.env.cloud.local`). Nothing secret in git.
- **Picture licenses.** ARASAAC pictograms are CC BY-NC-SA 4.0: fine for a
  capstone, non-commercial, with the credit shown on `/credits`.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| 404 after refreshing a page | `vercel.json` / `public/_redirects` not deployed — push them and redeploy |
| "Invalid login credentials" for a new account | "Confirm email" is still on (step 4) |
| Functions return 401 / 403 | Functions not deployed, or the website's anon key is wrong |
| Pictures don't appear | Run step 8; check that **Storage** has a public `word-images` bucket |
| Passage generation fails | `GEMINI_API_KEY` secret missing (step 6) |
| `db push` fails on an extension | Enable `pg_cron` and `pg_net` in Database → Extensions |
| Local run can't find an env file | `ENV_FILE` is relative to the project root |
