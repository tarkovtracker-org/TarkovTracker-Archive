# TarkovTracker

A community-maintained web application for planning and tracking your Escape From
Tarkov progression. TarkovTracker keeps tabs on tasks, hideout upgrades, and required items so
you can focus on raids while sharing progress with your squad.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/N4N31IEP8Z)

> **Project Status**
> This repository is a community fork of the original
> [TarkovTracker.io project](https://github.com/TarkovTracker/TarkovTracker).
> The official production instance continues to live at
> <https://tarkovtracker.io> and this fork is developed and hosted by volunteers at
> <https://tarkovtracker.org> while the original maintainer is inactive.
> If the original owner returns, stewardship will gladly be transferred back.

---

## Table of Contents

- [Features](#features)
- [Architecture overview](#architecture-overview)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Quick start](#quick-start)
  - [Available scripts](#available-scripts)
- [Project structure](#project-structure)
- [Documentation](#documentation)
- [Deployment & hosting](#deployment--hosting)
- [Community & support](#community--support)
- [Contributing](#contributing)
- [Code of Conduct](#code-of-conduct)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Features

- Track trader tasks and objectives with filtering by map, type, and status
- Monitor hideout module requirements and completion progress
- Keep a centralized list of required items for quests and upgrades
- Collaborate with friends using the built-in team system backed by Firebase
- Enjoy offline-ready functionality thanks to local storage and PWA support
- Benefit from an open API and generated documentation for integrations

## Architecture overview

TarkovTracker is built as a modern Jamstack-style application:

- **Frontend** – A Vue 3 + Vite single-page application (SPA) with TypeScript, Pinia for
  state management, and Vuetify for UI.
- **Backend** – Firebase Cloud Functions provide team syncing, authentication, and access to
  external services when needed.
- **Data** – Firestore rules, indexes, and emulators are versioned in this repository for
  easy collaboration.
  reproducible environments.
- **Tooling** – The monorepo is managed with npm workspaces. Linting, formatting, and TypeScript
  support are configured via ESLint, Prettier, and shared configs.

## Getting started

### Prerequisites

- [Node.js 18](https://nodejs.org/en/download/) or newer (installs npm automatically)
- [Java 11+ Runtime Environment](https://firebase.google.com/docs/emulator-suite/install_and_configure)
  (required for Firebase emulators)
- Optional: [Firebase CLI](https://firebase.google.com/docs/cli) if you prefer to manage emulators separately

### Quick start

```bash
# Clone the repository
git clone https://github.com/tarkovtracker-org/TarkovTracker.git
cd tarkovtracker

# Install dependencies for all workspaces
npm install

# Choose your development mode:
# npm run dev          # Frontend only (UI development)
# npm run dev:full     # Frontend + backend (features/auth)
# npm run dev:firebase # Full stack with hosting (production testing)
npm run dev
```

The application will start a Vite development server (default `http://localhost:3000`).
With `npm run dev:full` or `npm run dev:firebase`, Firebase emulators will also start.

### Available scripts

The root `package.json` exposes helpful scripts for daily development:

| Command | Description |
| --- | --- |
| `npm run dev` | Starts frontend dev server only (port 3000). |
| `npm run dev:full` | Starts frontend + Firebase backend emulators. |
| `npm run dev:firebase` | Builds everything + starts all emulators including hosting. |
| `npm run build` | Builds both frontend and functions. |
| `npm run lint` | Runs ESLint and TypeScript checks across the monorepo. |
| `npm run format` | Formats the codebase using Prettier. |
| `npm run docs` | Builds functions + generates API docs. |
| `npm run test` | Runs all tests (frontend + functions). |

See [scripts/SCRIPTS.md](scripts/SCRIPTS.md) for complete scripts reference.

## Project structure

```bash
TarkovTracker/
├── frontend/           # Vue application (pages, components, assets)
├── functions/          # Firebase Cloud Functions (TypeScript)
│   └── openapi/        # OpenAPI specification (output: openapi.json)
├── docs/               # Project docs (guides, ops, CI notes)
├── scripts/            # Utility scripts and documentation
│   └── SCRIPTS.md      # Reference for automation and maintenance scripts
├── firestore.rules     # Firestore security rules
├── firestore.indexes.json
├── database.rules.json # Realtime Database rules (if needed for features)
├── CHANGELOG.md        # Release highlights and version notes
└── CONTRIBUTING.md     # Contribution guidelines
```

## Documentation

- **User & feature guides** – Work-in-progress documentation lives in the [`docs/`](docs/) directory
  (not tied to API docs hosting).
- **API reference** – Generate locally via `npm run docs` which creates `functions/openapi/openapi.json`,
  which is consumed by Scalar UI in the app.
- **Development scripts** – Complete reference for all available npm scripts in [scripts/SCRIPTS.md](scripts/SCRIPTS.md).
- **Changelog** – Review notable updates in [CHANGELOG.md](CHANGELOG.md).

We welcome additional documentation improvements! Open an issue or pull request if you find gaps.

## Deployment & hosting

- The community fork is deployed to <https://tarkovtracker.org>.
- Firebase hosting is used for both the SPA and backend functions. Deployment is managed through
  the Firebase CLI and CI/CD pipelines.
- Secrets, service accounts, and production data are **not** included in this repository. Please
  coordinate with maintainers before attempting production deployments.

## Community & support

- **Questions & ideas** – Use
  [GitHub Discussions](https://github.com/tarkovtracker-org/TarkovTracker/discussions) or open an
  issue.
- **Live chat & squads** – Join the [TarkovTracker Discord](https://discord.gg/zeAP4Ng) to coordinate
  raids, ask questions in real time, or hang out with fellow Tarkov fans.
- **Bug reports** – File an issue with clear reproduction steps and screenshots/logs when possible.
- **Security concerns** – Follow our [security policy](SECURITY.md) for responsible disclosure.
- **Need to talk to a human?** – Reach out via [support@tarkovtracker.org](mailto:support@tarkovtracker.org).
- **More resources** – See [SUPPORT.md](SUPPORT.md) for additional help channels and
  troubleshooting tips.

## Contributing

We enthusiastically welcome contributions from the Escape From Tarkov community! Please read our
[CONTRIBUTING guidelines](CONTRIBUTING.md) for details on development workflows, coding standards,
testing expectations, and how to propose large features.

If you are unsure where to begin, check the issue tracker for labels such as `good first issue`,
`help wanted`, or reach out on Discussions.

## Code of Conduct

Participation in this project is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). We are
committed to providing a welcoming and harassment-free experience for all community members.

## License

This project remains licensed under the GNU General Public License v3.0. See
[LICENSE.md](LICENSE.md) for the full license text.

## Acknowledgments

- The original TarkovTracker team and [@thaddeus](https://github.com/thaddeus)
- Contributors and testers who keep the project alive
- The Escape From Tarkov community for continued enthusiasm and support
