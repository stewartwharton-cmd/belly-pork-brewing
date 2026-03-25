# 🐷 Belly Pork Brewing Co.

Official website for Belly Pork Brewing — independent craft beer, Graham-approved.

Live site: [bellyporkbrewing.com](https://bellyporkbrewing.com)

---

## Project Structure

```
belly-pork-brewing/
├── public/               ← Everything served to the browser
│   ├── index.html        ← Main website
│   ├── css/
│   │   └── styles.css    ← Global styles (currently inlined, extract here later)
│   ├── js/
│   │   └── main.js       ← JS interactions (currently inlined, extract here later)
│   └── images/
│       └── hero.png      ← Hero image (pig with pint)
├── netlify.toml          ← Netlify deploy config
├── vercel.json           ← Vercel deploy config
├── package.json          ← npm scripts for local dev
├── .gitignore
└── README.md
```

---

## Local Development

```bash
# Install dev dependencies
npm install

# Run local dev server at http://localhost:3000
npm run dev
```

---

## Deploying

### Option A — Netlify (recommended for beginners)

1. Push this repo to GitHub
2. Go to [app.netlify.com](https://app.netlify.com) → "Add new site" → "Import an existing project"
3. Connect your GitHub repo
4. Build settings are auto-detected from `netlify.toml`:
   - **Publish directory:** `public`
   - **Build command:** _(none needed)_
5. Click Deploy — you'll get a `*.netlify.app` URL instantly

**Custom domain (GoDaddy):**
- In Netlify: Site settings → Domain management → Add custom domain → `bellyporkbrewing.com`
- In GoDaddy DNS: Change nameservers to Netlify's (Netlify will show you the values), OR add these DNS records:
  - `A` record: `@` → Netlify's load balancer IP (shown in dashboard)
  - `CNAME` record: `www` → your Netlify subdomain

---

### Option B — Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → "Add New Project" → import your GitHub repo
3. Framework preset: **Other**
4. Output directory: `public`
5. Deploy

**Custom domain (GoDaddy):**
- In Vercel: Project → Settings → Domains → Add `bellyporkbrewing.com`
- In GoDaddy DNS:
  - `A` record: `@` → `76.76.21.21`
  - `CNAME` record: `www` → `cname.vercel-dns.com`

---

## Using Claude Code

Claude Code lets you iterate on this site using AI from your terminal.

```bash
# Install Claude Code globally
npm install -g @anthropic-ai/claude-code

# Navigate to this project
cd belly-pork-brewing

# Start Claude Code
claude
```

**Example things to ask Claude Code:**
- "Add an events page for tap takeovers"
- "Create a contact form that emails Graham"
- "Add a mobile hamburger menu"
- "Build a beer finder / brewery locator page"
- "Add smooth scroll animations to the beer cards"
- "Create an About Us page with more of Graham's story"

---

## Roadmap Ideas

- [ ] Events / tap takeovers page
- [ ] Beer detail pages with full tasting notes
- [ ] Contact / find us page
- [ ] Mobile nav hamburger menu
- [ ] Dark/light mode toggle
- [ ] Instagram feed integration
- [ ] Online merch shop
- [ ] Blog / brewery news
- [ ] Graham's ratings page 🐷

---

## Tech Stack

- **HTML/CSS/JS** — pure vanilla, no framework needed yet
- **Fonts** — Bebas Neue + Syne + Syne Mono (Google Fonts)
- **Logo** — hosted on GoDaddy Websites CDN
- **Deploy** — Netlify or Vercel (both free tier)
- **Domain** — GoDaddy (`bellyporkbrewing.com`)
- **Repo** — GitHub
- **AI dev tool** — Claude Code

---

*"If Graham doesn't like it, it doesn't ship."*  
— The Belly Pork Quality Charter, Article 1
