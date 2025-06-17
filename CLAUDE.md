# CLAUDE

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TarkovTracker is a Vue 3/TypeScript web application for tracking player progress in "Escape From Tarkov". It's a monorepo with a frontend SPA and Firebase Cloud Functions backend, supporting offline functionality and real-time team collaboration.

## Development Commands

### Common Development Tasks

```bash
npm run dev              # Start frontend dev server + Firebase emulators
npm run build            # Build both frontend and functions
npm run lint             # Lint entire codebase (run before committing)
npm run format           # Format code with Prettier
npm run emulators:start  # Start Firebase emulators only
```

### Frontend-Specific

```bash
cd frontend
npm run type-check       # TypeScript type checking
npm run build:dev        # Development build
npm run serve            # Preview built app
```

### Functions-Specific

```bash
cd functions
npm run test             # Run Vitest tests
npm run build:watch      # Watch mode compilation
npm run swagger          # Generate OpenAPI documentation
```

## Architecture Overview

### Monorepo Structure

- `frontend/` - Vue 3 SPA with Vuetify UI, Pinia stores, Firebase sync
- `functions/` - Firebase Cloud Functions with Express.js REST API
- `docs/` - Auto-generated Swagger API documentation

### Key Technologies

- **Frontend**: Vue 3 Composition API, TypeScript, Vite, Vuetify 3, Pinia
- **Backend**: Firebase Cloud Functions, Firestore, Express.js
- **State Management**: Pinia with Firebase real-time sync and localStorage persistence
- **Authentication**: Firebase Auth with API token system
- **Internationalization**: Vue i18n (EN, DE, ES, FR, RU, UK)

### Data Flow Patterns

- **Local-First**: Works offline using localStorage with Firebase sync when online
- **Real-time Updates**: VueFire for reactive Firestore document sync
- **External Data**: GraphQL integration for Tarkov game data via Apollo Client
- **Team Features**: Firestore subcollections with real-time collaboration

### Component Organization

- **Pages**: Route-level components in `frontend/src/pages/`
- **Components**: Feature-organized in subdirectories (tasks, hideout, teams, etc.)
- **Stores**: Domain-specific Pinia stores with Firebase persistence
- **Composables**: Reusable logic in `frontend/src/composables/`

### Firebase Architecture

- **Authentication**: Optional for enhanced features, works without login
- **Firestore**: User progress data with team subcollections
- **Cloud Functions**: REST API with Bearer token authentication
- **Emulators**: Full local development environment via `firebase.json`

## Development Notes

### State Management Pattern

Progress data is stored in Pinia stores that automatically sync with:

1. LocalStorage (always, for offline capability)
2. Firestore (when authenticated, for cross-device/team sync)

### Testing

- Functions use Vitest with Firebase emulator integration
- Test Firebase rules with `firebase.rules.json`
- Run `npm run test` in the functions directory

### API Documentation

- Auto-generated Swagger docs at the `/docs` endpoint
- OpenAPI spec generated from TypeScript interfaces
- Update via `npm run swagger` in the functions directory

### Internationalization

- Translation files in `frontend/src/locales/` (JSON5 format)
- Use `$t()` function in templates, `t()` in composition functions
- Language detection via URL query parameter or browser default
