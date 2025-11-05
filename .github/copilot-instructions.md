# GitHub Copilot Custom Instructions

This file provides guidance to GitHub Copilot when working with code in this repository, particularly during code reviews.

## Project Overview

TarkovTracker is a monorepo containing:
- **Frontend**: Vue 3 SPA with Vuetify, Pinia, and Firebase integration
- **Backend**: Firebase Cloud Functions with Express.js and Firestore

## Code Review Format Requirements

### Aggregated Issue List Format

When performing code reviews, **ALWAYS** provide feedback in a single, aggregated issue list format that is easy to copy-paste to local agents or IDEs. Use the following structure:

---

## 🔴 Critical Issues – Must Fix Before Merge

- **File:** `path/to/file.ext:line`
  **Issue:** Brief description of the critical issue
  **Explanation:** Detailed explanation of why this is critical
  **Suggestion:**
  ```language
  // Code example showing the fix
  ```
  **Rationale:** Why this fix improves security/reliability/correctness

---

## 🟡 Suggestions – Consider for Improvement

- **File:** `path/to/file.ext:line`
  **Issue:** Brief description of the suggestion
  **Explanation:** Detailed explanation of the improvement opportunity
  **Suggestion:**
  ```language
  // Code example showing the improvement
  ```
  **Rationale:** Why this improves performance/maintainability/readability

---

## ⚠️ Warnings – Potential Issues

- **File:** `path/to/file.ext:line`
  **Issue:** Brief description of the potential issue
  **Explanation:** What could go wrong
  **Suggestion:**
  ```language
  // Code example showing how to address it
  ```
  **Rationale:** Why this prevents future problems

---

## ✅ Good Practices – What's Done Well

- **File:** `path/to/file.ext:line`
  **Practice:** What was implemented well
  **Explanation:** Why this is a good practice
  **Suggestion:** Continue applying this pattern across the codebase

---

### Review Format Guidelines

1. **Single aggregated list**: All issues in ONE comment, not scattered across multiple comments
2. **File references**: Always use format `path/to/file.ext:line` for easy IDE navigation
3. **Copy-paste friendly**: Use Markdown for clean paste into GitHub Issues, Slack, Notion, or local IDEs
4. **Actionable**: Each issue must include specific file location, explanation, and suggested fix
5. **Categorized**: Group by severity (Critical → Suggestions → Warnings → Good Practices)
6. **Code examples**: Include code snippets showing both the issue and the fix when relevant
7. **No PR sprawl**: Avoid creating multiple separate comments; consolidate all feedback

### Example File Reference Formats

✅ **Correct:**
- `frontend/src/stores/user.ts:42`
- `functions/src/handlers/progress/index.ts:127`
- `frontend/src/features/ui/components/TaskCard.vue:85`

❌ **Incorrect:**
- "In the user store" (too vague)
- "Line 42" (missing file)
- "src/stores" (missing specific file and line)

## Tech Stack & Standards

### Frontend (Vue 3)

- **Framework**: Vue 3 with Composition API and TypeScript
- **UI**: Vuetify 3 (Material Design)
- **State**: Pinia stores
- **Routing**: Vue Router 4
- **Build**: Vite
- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier

**Key patterns:**
- Feature-based organization in `/src/features/`
- Composables for reusable logic in `/src/composables/`
- Pinia stores in `/src/stores/`
- Keep components under 300 lines (decompose larger ones)
- Use absolute imports with `@/` prefix
- Proper TypeScript casting for Pinia stores: `as StoreWithFireswapExt<ReturnType<typeof useStore>>`

### Backend (Firebase Functions)

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with CORS
- **Database**: Firestore with transactions
- **Auth**: Firebase Auth with custom tokens
- **API**: GraphQL queries to external APIs

**Key patterns:**
- Handlers in `/functions/src/handlers/` by domain
- Services for business logic in `/functions/src/services/`
- Middleware for auth and error handling
- Transaction-based Firestore operations
- Dual callable + HTTP endpoints

## Security Requirements

- **Never hard-code secrets** or API keys
- **Validate all user input** before processing
- **Use Firestore transactions** for multi-document operations
- **Implement proper error handling** with meaningful messages
- **Use Firebase Auth tokens** for authentication
- **Sanitize external data** from APIs before storage

## Code Quality Standards

1. **TypeScript**: Avoid `any` types; use proper interfaces
2. **Null checking**: Handle optional values safely
3. **Error handling**: Implement try-catch with proper logging
4. **Import organization**: Group by framework/library, then local imports
5. **Code duplication**: Extract to composables/services
6. **Component size**: Keep under 300 lines (400 max for special cases)
7. **Function complexity**: Keep handlers under 200 lines
8. **Template nesting**: Avoid deep nesting; use composition

## Testing & Validation

- Run `npm run lint` to check code style
- Run `npm run format` for consistent formatting
- Run `npm run build` to ensure no build errors
- Run `npm run type-check` (frontend) for TypeScript validation
- Test changes in development environment with `npm run dev`

## Documentation Standards

- Update documentation when making architectural changes
- Include JSDoc/TSDoc for public APIs and complex functions
- Maintain CHANGELOG.md for notable changes
- Update README.md for user-facing changes

## Review Priorities

When reviewing code, prioritize issues in this order:

1. **Security vulnerabilities** (hard-coded secrets, SQL injection, XSS, etc.)
2. **Breaking changes** (API changes, data model changes)
3. **Performance issues** (N+1 queries, unnecessary re-renders, memory leaks)
4. **Type safety** (proper TypeScript usage, avoiding `any`)
5. **Error handling** (uncaught errors, silent failures)
6. **Code organization** (component size, duplication, patterns)
7. **Style & formatting** (linting, naming, consistency)
8. **Documentation** (missing docs, outdated comments)

## Integration with Local Agents

This review format is designed to work seamlessly with:
- **Claude Code**: Copy-paste directly into chat for context
- **VS Code Copilot**: File references are clickable in VS Code
- **GitHub Issues**: Markdown format pastes cleanly
- **Linear/Jira**: Easy to create tickets from aggregated list
- **Slack/Discord**: Share review summaries with team

## Commands Reference

For detailed project commands and architecture, see the main [CLAUDE.md](../CLAUDE.md) file.
