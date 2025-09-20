# Contributing to TarkovTracker

🎉 Thank you for your interest in improving TarkovTracker! This project survives because of contributions from the Escape From Tarkov community. Whether you are fixing a typo, building new features, or triaging issues, your help is appreciated.

The guidelines below explain how to participate effectively and respectfully. If anything is unclear, please open a discussion or reach out to the maintainers.

---

## Before you start
- **Familiarize yourself with the project** – Read the [README](README.md) and explore the application so you understand what exists today.
- **Search first** – Look for existing issues, pull requests, or discussions that relate to your idea. Commenting on an active thread helps consolidate effort.
- **Talk to us** – For substantial changes (e.g., major refactors, architectural changes), start a [GitHub Discussion](https://github.com/TarkovTracker/tarkovtracker/discussions), chat in the [TarkovTracker Discord](https://discord.gg/zeAP4Ng), or open an issue to align with the maintainers before investing significant time.
- **Be kind** – Participation in this community is covered by our [Code of Conduct](CODE_OF_CONDUCT.md). If you observe unacceptable behavior, email [report@tarkovtracker.org](mailto:report@tarkovtracker.org).

## Ways to contribute
- **Report bugs** – Provide detailed reproduction steps, screenshots, and environment info when filing issues.
- **Improve documentation** – Clarify instructions, add examples, or document features in markdown or inline code comments.
- **Suggest enhancements** – Describe the problem you are trying to solve and why the current experience falls short.
- **Fix issues** – Pick up `good first issue` and `help wanted` tasks or propose your own fixes via pull requests.
- **Test and review** – Help validate pull requests by testing branches locally or sharing feedback.

## Development workflow
1. **Fork & clone** the repository (or create a feature branch if you have write access).
2. **Install dependencies** by running `npm install` in the repository root. This bootstraps both the `frontend` and `functions` workspaces.
3. **Run the local environment** with `npm run dev`. Refer to the [Getting started](README.md#getting-started) section for details and prerequisites.
4. **Make your changes** in small, logically grouped commits. Keep unrelated changes in separate pull requests.
5. **Write or update tests/docs** when applicable. Documentation updates are expected for user-facing changes.
6. **Run quality checks** before submitting your pull request:
   - `npm run lint`
   - `npm run format` (if files need formatting)
   - `npm run build`
7. **Open a pull request** targeting the `main` branch and fill in the template completely. Reference related issues with `Fixes #<issue-number>` when appropriate.

> **Note:** Changes that affect production data models, Firebase rules, or infrastructure must be reviewed by a core maintainer before merging. Coordinate in advance if you anticipate schema migrations or configuration changes.

## Pull request checklist
- [ ] Tests, linters, and builds pass locally.
- [ ] Documentation or comments updated to reflect the change.
- [ ] Added screenshots or recordings for UI-affecting changes when possible.
- [ ] Linked relevant issues and provided a clear summary of the change.
- [ ] Requested review from a maintainer (`@TarkovTracker/maintainers` on GitHub) once the PR is ready.

Maintainers will review submissions for correctness, accessibility, performance, and adherence to the project style. Expect constructive feedback and iterate as needed. Merge is performed by a maintainer after approval.

## Coding standards
- **Language & stack** – TypeScript is preferred across both the Vue frontend and Firebase functions. Avoid introducing plain JavaScript unless necessary.
- **Formatting** – Prettier is configured through `npm run format`. Do not reformat unrelated files.
- **Linting** – Follow ESLint rules enforced via `npm run lint`. Address warnings unless explicitly waived by maintainers.
- **Testing** – Add or update automated tests once they are available. Until then, include manual testing steps in the PR description.
- **Dependencies** – Introduce new dependencies sparingly. Justify additions in the pull request and ensure licenses are compatible with GPLv3.

## Commit conventions
- Use clear, present-tense commit messages (e.g., `Add hideout fuel timer component`).
- Limit the first line to ~72 characters and include additional details in the body if necessary.
- Reference issues in commit bodies when helpful but reserve `Fixes #123` for pull requests.
- Avoid force-pushing to shared branches during review; instead, add follow-up commits and squash on merge if needed.

## Issue reporting guidelines
- Include the TarkovTracker version (or commit SHA) and environment (OS, browser, device).
- Detail the expected vs. actual behavior.
- Attach logs or console output when relevant.
- Use descriptive titles so future contributors can find related work easily.

## Documentation contributions
- Place large guides or references in the [`docs/`](docs/) directory.
- Keep the top-level `README.md` focused on quick discovery and link to deeper documentation where appropriate.
- When adding diagrams or screenshots, include accessible text alternatives.

## Getting help
- Ask implementation questions in [Discussions](https://github.com/TarkovTracker/tarkovtracker/discussions) under the `Q&A` category or in the development channels on the [TarkovTracker Discord](https://discord.gg/zeAP4Ng).
- For sensitive or security-related topics, email [support@tarkovtracker.org](mailto:support@tarkovtracker.org) or [security@tarkovtracker.org](mailto:security@tarkovtracker.org).
- Join playtesting or community events announced via Discussions to collaborate synchronously.

We are grateful for every contribution—thank you for helping TarkovTracker grow! 🙌
