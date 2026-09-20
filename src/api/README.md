# API layer

The UI talks only to these modules. Today each function delegates to
`src/local-backend` (browser storage), but the signatures mirror the original
REST endpoints, so a real backend can be swapped in by re-implementing these
files with `fetch` and a `VITE_API_BASE_URL` variable, without touching pages.
