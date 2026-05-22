# Recovery Lab

A minimalist video library for body recovery exercises. Three sections -- Rehabilitation, Strength, and Lymph Flow -- with admin-protected uploads and a clean gallery viewer. Built with Next.js and Supabase. Deployed on Vercel.

---

## Architecture

```
Browser  -->  Vercel (serves the site)
                 |
                 v
             Supabase
             ├── Database (video metadata)
             └── Storage  (video files, no size limit)
```

No traditional server. Vercel serves static files. Supabase handles data and file storage via API calls from the browser.

---

## Full Setup Walkthrough

### Step 1 -- Create a Supabase project (free)

1. Go to https://supabase.com and sign up or log in
2. Click "New Project"
3. Pick a name (e.g. "recovery-lab"), set a database password, choose a region close to the intended users
4. Wait about 60 seconds for provisioning to complete

### Step 2 -- Set up the database and storage

**Create the table:**

1. In the Supabase dashboard, click "SQL Editor" in the left sidebar
2. Click "New Query"
3. Open `setup.sql` from this project, copy the contents, paste into the editor
4. Click "Run" -- this creates the `videos` table and its access policies

**Create the storage bucket:**

1. In the left sidebar, click "Storage"
2. Click "New Bucket"
3. Name it exactly: `videos`
4. Toggle "Public bucket" to ON
5. Click "Create bucket"
6. Go back to the SQL Editor, run the storage policy section of `setup.sql` (lines 30 onward) if they did not run the first time

### Step 3 -- Grab the Supabase credentials

1. In the left sidebar, click "Settings" then "API"
2. Copy the "Project URL" -- this is `NEXT_PUBLIC_SUPABASE_URL`
3. Under "Project API keys", copy the `anon` / `public` key -- this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Keep these ready for Step 5

### Step 4 -- Push the code to GitHub

1. Go to https://github.com and create a new repository (e.g. "recovery-lab")
2. On the local machine, open a terminal in this project folder and run:

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/recovery-lab.git
git push -u origin main
```

If Git is not installed, download it from https://git-scm.com

### Step 5 -- Deploy on Vercel (free)

1. Go to https://vercel.com and sign up with the GitHub account
2. Click "Add New" then "Project"
3. Import the "recovery-lab" repository from the GitHub list
4. Before clicking Deploy, expand "Environment Variables" and add:

```
NEXT_PUBLIC_SUPABASE_URL       = https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  = your-anon-public-key
NEXT_PUBLIC_ADMIN_PIN          = (choose any PIN, e.g. 5829)
```

5. Click "Deploy"
6. Wait about 90 seconds -- Vercel builds and publishes the site
7. The site is now live at `https://recovery-lab.vercel.app` (or similar)

### Step 6 -- Test

1. Open the Vercel URL in a browser
2. Click "Manage" in the top right, enter the admin PIN
3. Select a section tab, click "Upload Video", choose a video from the gallery
4. The video appears in the grid. Click it to play.
5. Share the URL with anyone -- they see the viewer mode by default

---

## Custom Domain (optional)

1. Buy a domain from any registrar (Namecheap, domains.co.za, etc.)
2. In the Vercel dashboard, go to the project Settings then Domains
3. Add the custom domain
4. Vercel provides DNS records (usually an A record or CNAME)
5. Go to the domain registrar's DNS settings and add the records
6. SSL is provisioned automatically within a few minutes

---

## Free Tier Limits

**Supabase free tier:**
- 1 GB file storage
- 2 GB bandwidth per month
- 500 MB database
- Unlimited API requests

**Vercel free tier:**
- 100 GB bandwidth per month
- Automatic HTTPS
- Global CDN

For a personal exercise video library shared with a few people, these limits are more than sufficient.

---

## Updating the Site

Any push to the `main` branch on GitHub triggers an automatic redeploy on Vercel. To add features or change styling:

1. Edit the files locally
2. Run `npm run dev` to preview at http://localhost:3000
3. Commit and push:

```bash
git add .
git commit -m "description of change"
git push
```

Vercel deploys the update within about 60 seconds.

---

## Local Development

```bash
cp .env.local.example .env.local
# Fill in the Supabase URL, anon key, and admin PIN

npm install
npm run dev
```

The app runs at http://localhost:3000.
