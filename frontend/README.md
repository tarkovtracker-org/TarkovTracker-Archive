# TarkovTracker Frontend

## Tech stack
- Vue 3 + Vite, TypeScript, Pinia, Vuetify 3
- Firebase (Auth + Firestore) via VueFire
- Apollo client (currently on v3) for GraphQL integrations
- Playwright for end-to-end tests and Vitest for unit tests

## Quick start
```bash
cd frontend
npm install
npm run dev          # Vite dev server
npm run dev:full     # Use repo-level script for Firebase emulators (from root)
npm run dev:firebase # Spin up the full production build + Firebase emulators (from root)
```

## Available frontend scripts
- `npm run dev` / `npm run build` / `npm run serve`
- `npm run lint` / `npm run format` / `npm run type-check`
- `npm run test`, `npm run test:watch`, `npm run test:coverage`, `npm run test:e2e`, `npm run test:e2e:headed`

## Notes
- `npm run dev` uses mock auth via `VITE_DEV_AUTH=true` if needed.
- Prefer running the workspace scripts from the root to leverage shared tooling (`npm run dev:full`, `npm run dev:firebase`, `npm run emulators`).
