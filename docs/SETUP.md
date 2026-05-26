# StockTrack — Setup Guide

Step-by-step instructions for running StockTrack locally and deploying to Vercel.

---

## Prerequisites

- **Node.js 20+** — [nodejs.org](https://nodejs.org)
- **MongoDB Atlas account** — [mongodb.com/atlas](https://www.mongodb.com/atlas) (free M0 tier works)
- **Google Cloud project** — for OAuth credentials
- **Twelve Data account** — [twelvedata.com](https://twelvedata.com) (free tier: 800 req/day)

---

## 1 — Clone and install

```bash
git clone https://github.com/MiguelC121913/StockTrack.git
cd StockTrack
npm install
cp .env.example .env.local
```

---

## 2 — MongoDB Atlas

1. Sign in at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a new **Project** → create a **Cluster** (M0 Free is fine)
3. In **Database Access**: create a database user with read/write permissions
4. In **Network Access**: add `0.0.0.0/0` for development (Vercel IPs change, so this is required for production too unless you pay for a static IP)
5. Click **Connect** → **Drivers** → copy the connection string:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/stocktrack
   ```
6. Paste into `.env.local`:
   ```
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/stocktrack
   ```

> The `stocktrack` database and all collections are created automatically by Mongoose on first run.

---

## 3 — Google OAuth credentials

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or use an existing one)
3. Enable the **Google+ API** / **People API**:
   - Sidebar → **APIs & Services** → **Library** → search "Google+ API" → Enable
4. Go to **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google` (local dev)
   - `https://your-app.vercel.app/api/auth/callback/google` (production — replace with your domain)
7. Copy **Client ID** and **Client Secret** into `.env.local`:
   ```
   GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
   ```

> If you see "Access blocked: This app's request is invalid" — make sure the redirect URI matches exactly (no trailing slash).

---

## 4 — NextAuth secret

Generate a random 32-byte secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the output into `.env.local`:
```
NEXTAUTH_SECRET=your_output_here
```

For local development also set:
```
NEXTAUTH_URL=http://localhost:3000
```

---

## 5 — Twelve Data API key

1. Sign up at [twelvedata.com/register](https://twelvedata.com/register)
2. Go to **Dashboard** → **API Keys** → copy your key
3. Free tier gives 800 requests/day and access to `/quote` and `/time_series` endpoints
4. Add to `.env.local`:
   ```
   TWELVE_DATA_API_KEY=your_api_key_here
   ```

---

## 6 — Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you should see the landing page. Click **Get Started**, sign in with Google, and you'll be taken to the dashboard.

---

## 7 — Deploy to Vercel

### 7.1 Push to GitHub

```bash
git add .
git commit -m "chore: ready for deployment"
git push origin main
```

### 7.2 Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Framework preset: **Next.js** (auto-detected)
4. Leave build settings as-is

### 7.3 Add environment variables

In the Vercel project dashboard → **Settings** → **Environment Variables**, add all five variables from `.env.local`:

| Variable | Value |
|----------|-------|
| `NEXTAUTH_URL` | `https://your-app.vercel.app` (your actual Vercel domain) |
| `NEXTAUTH_SECRET` | Same secret you generated in step 4 |
| `GOOGLE_CLIENT_ID` | Your Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth client secret |
| `MONGODB_URI` | Your Atlas connection string |
| `TWELVE_DATA_API_KEY` | Your Twelve Data API key |

> **Important:** `NEXTAUTH_URL` must be your actual production URL, not `localhost`.

### 7.4 Update Google OAuth redirect URI

Back in Google Cloud Console → **Credentials** → your OAuth client → add:
```
https://your-app.vercel.app/api/auth/callback/google
```

### 7.5 Deploy

Click **Deploy** in Vercel. The build takes ~60 seconds. After deployment, visit your Vercel URL — the app should be fully functional.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| "OAuthCallbackError" on login | Redirect URI mismatch | Check Google OAuth authorized URIs match exactly |
| "MongooseError: buffering timed out" | Wrong MONGODB_URI or IP not whitelisted | Check Atlas Network Access |
| Holdings show "—" for price | Twelve Data API key invalid or rate limit hit | Check API key; free tier resets daily at midnight UTC |
| Vercel build fails on `next build` | Missing env vars at build time | Ensure all 6 vars are added in Vercel dashboard |
| "NEXTAUTH_URL mismatch" in logs | NEXTAUTH_URL set to localhost in production | Update to your Vercel domain |
