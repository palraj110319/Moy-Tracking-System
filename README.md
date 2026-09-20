# Moy Tracker (frontend-only)

Tracks Moy/Moi (gift money) given and received, with per-person balances, a dashboard, and reports.
React 18 + Vite + TypeScript. **No server**: data lives in the browser (localStorage) and the site
deploys as static files on Vercel's free plan.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # type-checks, then builds to dist/
npm run preview    # serve the production build locally
```

Node 18.18+ is required.

## Structure

```
src/
  api/            what the UI calls (async, same shapes as the old REST API)
  local-backend/  browser-side "backend": storage, validation, business rules, reports, exports, passcode
  components/     reusable UI pieces
  pages/          Dashboard, Moy Transactions, Person Summary, Reports, Settings, Login
  context/        auth (passcode lock) and year filter
  types/          shared TypeScript types
  utils/          formatting helpers (₹ Indian grouping, dates)
```

Pages never import `local-backend` directly; they go through `src/api`. To move to a real backend later,
re-implement the files in `src/api` with `fetch` and a `VITE_API_BASE_URL` env variable.

## Getting your existing data in

1. Deploy (or run locally) and open **Moy Transactions → Import Excel**.
2. Choose your exported `.xlsx` (columns: Person Name, Type, Amount, Payment Mode, Place, Date).
3. Review the preview and import.

Your data is not in this repository and is never uploaded anywhere.

## Backups matter

Data is stored per browser. Clearing site data, using a private window, or switching device loses it.
Use **Settings → Download backup** regularly; **Restore from backup** brings it back.

## Deploy to Vercel

Push to GitHub, then in Vercel: **Add New → Project → import the repo**. Vercel detects Vite; the included
`vercel.json` sets the build command, `dist` output, and the SPA rewrite so page refreshes work.
No environment variables are needed.
