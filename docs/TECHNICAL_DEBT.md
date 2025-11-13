# Technical Debt

## Active items
1. **Decompose `progressUtils.ts`** (functions/src/progress) – split formatting, validation, and game-mode helpers into smaller modules for easier testing and maintainability.
2. **Refactor `frontend/src/utils/tarkovdataquery.ts`** – break the massive GraphQL query into fragments and smaller query files so updates stay localized.
3. **Split the user store** – break `frontend/src/stores/user.ts` into focused stores (preferences, UI settings, team state) to avoid the current god-object.
4. **Extract NeededItems components** – move the large page into smaller domain components/composables for filters, lists, and views.

## Goals
- Keep frontend components under 300 lines, TypeScript modules under 250 lines.
- Move business logic into composables/services and maintain single responsibility.
- Add tests for each extracted piece as the refactor proceeds.
