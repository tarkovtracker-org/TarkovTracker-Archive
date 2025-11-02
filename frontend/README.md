# TarkovTracker Frontend

A modern Vue 3 application built with TypeScript, Vuetify, and Firebase for tracking Escape from Tarkov game progress.

## Tech Stack

- **Framework**: Vue 3 with Composition API
- **Language**: TypeScript
- **Build Tool**: Vite
- **UI Library**: Vuetify 3
- **State Management**: Pinia
- **Database**: Firebase/Firestore with VueFire
- **GraphQL**: Apollo Client
- **Internationalization**: Vue I18n
- **Data Visualization**: D3.js
- **Testing**: ESLint + Prettier

## Project Structure

```bash
src/
├── components/          # Reusable Vue components
│   ├── drawer/         # Navigation drawer components
│   ├── editor/         # Task editor components
│   ├── hideout/        # Hideout-related components
│   ├── layout/         # Layout components
│   ├── neededitems/    # Needed items components
│   ├── settings/       # Settings components
│   ├── tasks/          # Task management components
│   └── teams/          # Team management components
├── composables/        # Vue composables (business logic)
│   ├── api/           # API-related composables
│   ├── data/          # Data management composables
│   ├── firebase/      # Firebase integration
│   ├── stores/        # Store-related composables
│   └── utils/         # Utility composables
├── locales/           # i18n translation files
├── pages/             # Page components
├── plugins/           # Plugin configurations
├── router/            # Vue Router configuration
├── stores/            # Pinia stores
├── types/             # TypeScript type definitions
└── utils/             # Utility functions
```

## Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build for development
- `npm run build:prod` - Build for production
- `npm run serve` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm run format` - Format code with Prettier

## Architecture

### Composables Architecture

The application uses Vue 3's Composition API with a composables-based architecture:

- **Data Composables**: Handle data fetching and management
- **Store Composables**: Provide reactive state management
- **Utility Composables**: Reusable business logic

### State Management

- **Pinia**: Primary state management
- **Firebase**: Real-time data synchronization
- **Apollo Client**: GraphQL data management

### Build Configuration

- **Vite**: Fast build tool with HMR
- **Code Splitting**: Automatic chunking for vendors (Vuetify, Apollo, Firebase, D3)
- **Source Maps**: Enabled for debugging
- **Environment Variables**: Build-time injection of commit hash and build time

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/)
- [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar)
- [TypeScript Vue Plugin](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin)

## Code Style

- ESLint with Vue and TypeScript rules
- Prettier for code formatting
- Strict TypeScript configuration
- Path aliases configured (`@/` for `src/`)

## Internationalization

The application supports multiple languages through Vue I18n:

- English (en)
- German (de)
- Spanish (es)
- French (fr)
- Russian (ru)
- Ukrainian (uk)
- Japanese (ja)
- Chinese (zh)

Translation files are located in `src/locales/` as JSON5 files.
