# OutcomeStar Marketing Site

The public-facing marketing, signup, and login site for OutcomeStar.app.

Built with Astro + Tailwind CSS. Hosted on Cloudflare Pages.

## Architecture

- `OutcomeStar.app/` â€” this site (Cloudflare Pages)
- `app.OutcomeStar.app/` â€” Next.js app (Render)
- `OutcomeStar-companion-api.onrender.com` â€” API backend (Render)

## Local development

    npm install
    npm run dev

Visit http://localhost:4321

## Build

    npm run build
    npm run preview

## Deploying to Cloudflare Pages

1. Push to GitHub
2. Cloudflare Pages â†’ Create project â†’ Connect to GitHub â†’ select this repo
3. Build settings: command `npm run build`, output `dist`, Node 20
4. Add custom domain `OutcomeStar.app` in Cloudflare Pages settings
5. Update GoDaddy DNS to point OutcomeStar.app to Cloudflare Pages

## Pages

- `/` â€” Homepage
- `/signup` â€” Pairing code entry
- `/login` â€” Returning user sign-in
- `/pricing` â€” TBD
- `/about` â€” TBD
- `/privacy` â€” TBD (launch-blocking)
- `/terms` â€” TBD