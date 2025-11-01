# TarkovTracker Product Requirements Document (PRD)

**Author:** Dys
**Date:** 2025-10-22
**Project Level:** 2
**Target Scale:** 100s of concurrent users

---

## Goals and Background Context

### Goals

- Create the definitive, all-in-one, open-source platform for tracking player progress and statistics in Escape From Tarkov.
- Develop a robust, publicly accessible API to enable a network of interconnected, community-built Tarkov tools.
- Introduce unique, optional monetized features to support the project's long-term sustainability without compromising the core, ad-free experience.

### Background Context

The current ecosystem for tracking progress in Escape From Tarkov is fragmented and inefficient. The official in-game system suffers from a poor user experience, forcing players to rely on the community-run wiki, which, while comprehensive, is not a dedicated tracking tool. The lack of an official API from the game's developer, Battlestate Games (BSG), has led to a proliferation of third-party trackers. However, these trackers are almost universally reliant on manual data entry, creating a tedious and error-prone user experience that fails to retain users.

This project addresses the core problem of manual tracking by integrating with TarkovMonitor, a tool capable of reading game logs to automate progress updates. This creates a streamlined, near-real-time tracking experience that is currently absent in the market. Furthermore, by providing a public API, TarkovTracker will empower other developers to build upon this automated data, fostering a collaborative ecosystem of tools. The inclusion of team-based progress sharing will also address the social and collaborative aspects of the game, providing a feature set that goes beyond simple personal tracking and offers a compelling, intuitive, and efficient solution that the current landscape lacks.

---

## Requirements

### Functional Requirements

#### User & Profile Management

- FR001: Users must be able to create and manage a user profile.
- FR002: Users must be able to view their detailed player statistics and progress, including progression rate over time (e.g., task completion frequency and duration), timelines of major achievements (e.g., reaching max traders, Kappa, Lightkeeper), and potentially other metadata from TarkovMonitor logs (e.g., raid times).
- FR003: Users must be able to form teams with other users to view their progress.
- FR013: Users must be able to "Prestige" their profile, which resets some but not all of their progress, mirroring the in-game functionality. (Note: The specific data to be reset requires further investigation as the in-game implementation is subject to change).

#### Automated Tracking

- FR004: The system must ensure API compatibility with TarkovMonitor to facilitate automated user progress updates from game logs.
- FR005: The system must provide a mechanism for users to manually input and edit their progress as a fallback.

#### Task & Quest Tracking

- FR006: The system must display all Escape From Tarkov quests and tasks.
- FR007: The system must allow users to track their progress on each quest.
- FR016: Users must be able to track their skill progression and levels, as some skills are prerequisites for task completion.

#### API

- FR008: The system must expose a public API for accessing user progress and data, specifically including `playerLevel`, `gameEdition`, `taskProgress` (which includes `id` (UUID correlating to the task ID available via the tarkov.dev API), `complete` (boolean), `failed` (boolean), `invalid` (boolean)), `taskObjectivesProgress`, `hideoutModulesProgress`, `hideoutPartsProgress`, `userId`, `displayName`, and `pmcFaction` via the "Progress" endpoint.
- FR009: The API must be documented to allow for third-party integrations.
- FR014: The system must maintain an audit log of all actions performed by API services on a user's account, including task status updates and data reads, for auditing, security, transparency, and statistical purposes.

#### Monetization

- FR010: The system must support a mechanism for unique monetized features, such as donations (Ko-fi, Patreon, GitHub Sponsors), exclusive Discord roles, non-disruptive supporter recognition (e.g., profile badges), early-access to new features, cosmetic upgrades (e.g., themes, avatars), and sponsored content creator integrations.
- FR011: Core tracking functionality must remain free and ad-free.

#### Community & Open Source

- FR012: The project will be open source, allowing for community contributions.

#### Data Integration

- FR015: The system must integrate with the Tarkov.dev API to retrieve community-sourced game data not readily available from official game sources.

### Non-Functional Requirements

- NFR001: The system should provide a responsive user experience, with page load times under 2 seconds for all critical tracking and progress views.
- NFR002: The system should have a high level of availability, with a target of 99.9% uptime, excluding planned maintenance.
- NFR003: The system should be able to handle a growing number of users and their data, with the ability to scale horizontally to meet increased demand.
- NFR004: All user data, especially API keys and personal information, must be stored securely and transmitted over encrypted channels.

---

## User Journeys

**Title:** The Path to Efficiency: A Player's Journey to Kappa

**Persona:** A dedicated but struggling Escape From Tarkov player who wants to optimize their time and achieve endgame goals.

**Scenario:** The player has completed one "wipe" with limited success and is frustrated with their slow progress and lack of direction. They are determined to be more efficient in the new wipe.

**User Journey Steps:**

1. **Initial Struggle:** The player relies on the in-game quest log and ad-hoc advice from friends, leading to confusion and wasted time on non-essential quests.
2. **Discovering the Wiki:** The player starts using the official wiki, which provides detailed information but is overwhelming and doesn't offer a personalized view of their progress.
3. **Seeking a Better Way:** Frustrated with manually cross-referencing the wiki with their in-game progress, the player searches for a dedicated Tarkov quest tracker.
4. **Finding TarkovTracker:** The player discovers TarkovTracker and is immediately drawn to the fact that they can start using it without creating an account.
5. **Setting Initial Progress:** The player manually updates their progress in TarkovTracker, marking the quests they have already completed.
6. **The "Aha!" Moment:** The player discovers the "Kappa Only" filter and applies it. The quest list is instantly filtered to show only the quests required for the Kappa container, providing a clear and focused path.
7. **Efficient Questing:** The player uses TarkovTracker as their primary guide, using the direct links to the wiki for specific quest details when needed. They are no longer wasting time on irrelevant quests.
8. **Achieving the Goal:** Thanks to the efficiency gained from using TarkovTracker, the player successfully obtains the Kappa container for the first time.
9. **Becoming an Advocate:** The player becomes a strong advocate for TarkovTracker, recommending it to their friends and other players in the community.

---

## UX Design Principles

- **Clarity and Intuitiveness:** The system should be easy to understand and use, even for new players.
- **Efficiency:** The UI should be designed to help users accomplish their tasks as quickly and with as little friction as possible.
- **Consistency:** We will establish and adhere to a consistent and easily maintainable design system (including light and dark themes) across the entire application.
- **Performance:** The UI will be built on a lightweight and performant framework to ensure a fast and responsive experience for all users.

---

## User Interface Design Goals

- **Target Platform:** The primary platform is Desktop Web, designed for users who often have the application open on a second monitor while playing the game.
- **Core Screens:** The application will be centered around the following core screens: Tasks, Dashboard, Needed Items (needs redesign), Hideout (needs redesign), Traders (for Loyalty Levels and Rep), and Settings.
- **Navigation:** The current sidebar/drawer navigation pattern is considered ineffective and should be re-evaluated in favor of a more intuitive and user-friendly approach.
- **Design Constraints:** There are no specific brand guidelines or design systems to adhere to. The primary goal is to follow modern best practices to create a professional, well-balanced, and intuitive UI that feels neither overcrowded nor lacking in features.

---

## Epic List

- **Epic 1: Frontend Performance Overhaul**
  - **Goal:** Dramatically improve frontend performance by replacing direct calls to the Tarkov.dev API with reads from the existing Firestore cache, as outlined in the `performance-fix-implementation-plan.md` document.
  - **Estimated Stories:** 6-8
  - **Covers:**
    - **Phase 1: Items Migration**
      - Implement and test the `useFirestoreTarkovItems()` composable.
      - Create a parallel implementation in `useTarkovApi.ts` to use the new Firestore composable, with a feature flag for A/B testing.
      - Add performance metrics to compare Apollo vs. Firestore load times and validate data consistency.
    - **Phase 2: Tasks/Maps/Traders Migration**
      - Extend the backend scheduled function to cache Tasks, Maps, and Traders data to Firestore.
      - Update the frontend to read this new data from the Firestore cache.
    - **Phase 3: Cleanup & Testing**
      - Remove the Apollo client and all related dependencies and files.
      - Document the new data architecture.
      - Set up a frontend testing framework (e.g., Vitest) and write initial tests for the new Firestore composables.

- **Epic 2: Core Functionality & UI/UX Refinement**
  - **Goal:** Build upon the stable foundation to improve the core user experience and implement the most critical UI/UX improvements.
  - **Estimated Stories:** 8-12
  - **Covers:**
    - Targeted UI/UX improvements for the most problematic views (e.g., "Needed Items", "Hideout").
    - Implementing the "Traders" view.
    - Ensuring all core tracking functionalities are robust and reliable.

- **Epic 3: API, Backend Testing & Community Enhancements**
  - **Goal:** Improve the existing API, establish a backend testing framework, and introduce community-focused features.
  - **Estimated Stories:** 5-7
  - **Covers:**
    - Setting up a backend testing framework (e.g., Jest, Mocha).
    - Writing unit and integration tests for critical API endpoints.
    - Public API documentation review and expansion.
    - API audit logging.
    - Team functionality enhancements.
    - Open-sourcing the project.
    - Monetization hooks (donations, etc.).

> **Note:** Detailed epic breakdown with full story specifications is available in [epics.md](../development/epics.md)

---

## Out of Scope

- **Full UI/UX Overhaul in MVP:** While a significant UI/UX refinement is planned, a complete, ground-up redesign of every single screen is deferred to future phases beyond the initial MVP. The focus is on critical improvements and problematic views.
- **Self-hosting Tarkov.dev API Data:** Due to the extensive nature of the data and the project's current scope, self-hosting or mirroring the Tarkov.dev API data is explicitly out of scope. The project will rely on the external API's availability.
- **Official Game API Integration:** Direct integration with any potential future official Escape From Tarkov game API is out of scope for this phase, as no such API currently exists.
- **Complex Monetization Features:** While monetization hooks are planned, highly complex or speculative monetized features requiring significant development effort (e.g., in-game item trading, complex subscription tiers beyond basic supporter benefits) are deferred.
- **Comprehensive Mobile Application:** While the web application will be responsive, a dedicated native mobile application is out of scope for this phase.
