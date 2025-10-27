# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Task Master AI project management integration
- Claude GitHub Actions workflows for automated code review and PR assistance
- Ko-Fi support integration in redesigned footer
- Support for Unheard+EOD Edition (6) game content
- Kappa tasks tracking functionality
- Comprehensive API documentation with Swagger/OpenAPI
- Team functionality enhancements with Firebase integration
- Random team name generation for team owners
- Team password generation logic
- Internationalization support for new UI elements ("Undo", "Close" buttons)
- Support for Cultist Circle station in Unheard Edition
- Reset online profile functionality
- Issue templates for bug reports and feature requests
- DevContainer support with Firebase emulation
- Task progress undo functionality
- API token management system
- Manual chunking for large vendor libraries in build process

### Changed

- **Major Refactoring**: Reorganized components into logical subdirectories
- **Architecture**: Implemented composables architecture for improved code organization
- **Performance**: Removed v-lazy components to improve rendering performance
- **Dependencies**: Updated to Node.js 22 runtime across Firebase and package configurations
- **Dependencies**: Downgraded Firebase from 12.0.0 to 11.10.0 for stability
- **Dependencies**: Updated TypeScript ESLint dependencies and other dev dependencies
- **UI/UX**: Improved dashboard statistics cards layout and spacing
- **UI/UX**: Enhanced footer design with better layout
- **Firebase**: Migrated Firebase progress handlers to legacy format
- **Build**: Updated build commands and deployment scripts
- **Linting**: Enhanced ESLint configuration for TypeScript and Vue support
- **Testing**: Refactored test files for consistency and clarity
- **Documentation**: Enhanced README with comprehensive project documentation
- **API**: Refactored API structure for improved maintainability
- **Store Management**: Improved Pinia store patterns and state management
- **Component Structure**: Standardized component imports and usage patterns
- **Localization**: Improved i18n implementation and consistency
- **Progress Tracking**: Enhanced task progress handling with string status values
- **Team Management**: Improved team functionality and user interface
- **Data Migration**: Enhanced data migration service with better error handling

### Fixed

- Resolved various linting issues and improved error handling
- Fixed needed items bug
- Updated level input max value to allow setting level to maxPlayerLevel + 1
- Fixed task faction comparison in TaskCard component
- Improved null safety in various components
- Fixed team store reference in progress store
- Corrected Firebase configuration formatting
- Resolved dependency issues and circular references
- Fixed CORS configuration in scheduled functions
- Improved token creation logic for clarity and functionality

### Removed

- Tarkov Guru from external navigation links
- TaskEditor and UserTester components (no longer needed)
- Unused v-lazy components for performance improvement
- Deprecated configuration files
- Unused DataMigrationDialog component
- Dependencies documentation file to streamline project structure
- Unused assets (logo.png, logo.svg)
- Various unused imports and dead code

### Technical Improvements

- **Code Quality**: Extensive refactoring for improved readability and maintainability across 100+ files
- **TypeScript**: Enhanced TypeScript definitions and configurations
- **Vue 3**: Improved Vue 3 patterns and modern JavaScript usage
- **State Management**: Better Pinia store organization and usage
- **Firebase**: Updated Firebase integration patterns and error handling
- **Build Process**: Optimized Vite configuration and build scripts
- **Development Experience**: Improved development workflow with better tooling
- **Security**: Enhanced API security and token management
- **Documentation**: Comprehensive OpenAPI documentation for all endpoints
- **Testing**: Improved test coverage and consistency
- **Internationalization**: Better i18n patterns and locale management

## Previous Versions

This changelog documents changes from the fork point. For earlier history, see the original [TarkovTracker.io repository](https://github.com/TarkovTracker/TarkovTracker).

---

*Note: This fork contains significant architectural improvements and feature additions while maintaining compatibility with the original TarkovTracker functionality.*
