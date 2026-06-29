# Outcomestar Marketing Site

The public-facing marketing, signup, and login site for outcomestar.app.

Built with Astro + Tailwind CSS. Hosted on Cloudflare Pages.

## Architecture

- `outcomestar.app/` — this site (Cloudflare Pages)
- `app.outcomestar.app/` — Next.js app (Render)
- `outcomestar-companion-api.onrender.com` — API backend (Render)

## Local development

    npm install
    npm run dev

Visit http://localhost:4321

## Build

    npm run build
    npm run preview

## Deploying to Cloudflare Pages

1. Push to GitHub
2. Cloudflare Pages → Create project → Connect to GitHub → select this repo
3. Build settings: command `npm run build`, output `dist`, Node 20
4. Add custom domain `outcomestar.app` in Cloudflare Pages settings
5. Update GoDaddy DNS to point outcomestar.app to Cloudflare Pages

## Pages

- `/` — Homepage
- `/signup` — Pairing code entry
- `/login` — Returning user sign-in
- `/pricing` — TBD
- `/about` — TBD
- `/privacy` — TBD (launch-blocking)
- `/terms` — TBD