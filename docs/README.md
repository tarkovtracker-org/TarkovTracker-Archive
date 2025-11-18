# TarkovTracker Documentation

Comprehensive documentation for contributors, maintainers, and architects.

## 📚 Core Documentation

### Essential Reading
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** – Setup, testing, workflows, and dependency management
- **[WORKFLOWS.md](./WORKFLOWS.md)** – Branch strategy and deployment process
- **[ACTIONS.md](./ACTIONS.md)** – How we prioritize and track work
- **[NEW_FEATURE_TEMPLATE.md](./NEW_FEATURE_TEMPLATE.md)** – Step-by-step guide for adding new features (backend + frontend)

### Architecture & Design
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** – System design, caching strategy, performance optimization
- **[SECURITY.md](./SECURITY.md)** – Authentication, authorization, validation, and security controls

### Feature Documentation
- **[PROGRESS_RESET.md](./PROGRESS_RESET.md)** – Progress reset system architecture

### Operational & Organizational Guides
- **[BACKEND_STRUCTURE.md](./BACKEND_STRUCTURE.md)** – Functions workspace organization, patterns, and technical debt targets (essential for backend developers)
- **[CI_PIPELINE.md](./CI_PIPELINE.md)** – Comprehensive CI/CD pipeline with quality gates and enforcement (critical for maintainers)
- **[OPENAPI_SYNC.md](./OPENAPI_SYNC.md)** – Automated API documentation synchronization workflow (required after any API changes)

---

## Quick Start

**New contributors:**
1. Read [DEVELOPMENT.md](./DEVELOPMENT.md) for setup and workflows
2. Check [WORKFLOWS.md](./WORKFLOWS.md) before creating branches
3. Review [GitHub Issues](https://github.com/tarkovtracker-org/TarkovTracker/issues) for areas needing help

**Working on features:**
1. Follow [NEW_FEATURE_TEMPLATE.md](./NEW_FEATURE_TEMPLATE.md) for implementing new features
2. Reference [ARCHITECTURE.md](./ARCHITECTURE.md) for design patterns
3. Follow [SECURITY.md](./SECURITY.md) for security requirements
4. Use [ACTIONS.md](./ACTIONS.md) framework for prioritization
5. Consult [BACKEND_STRUCTURE.md](./BACKEND_STRUCTURE.md) for backend patterns and technical debt

**Before deploying:**
1. Run quality gates (see [DEVELOPMENT.md](./DEVELOPMENT.md#quality-gates))
2. Follow [WORKFLOWS.md](./WORKFLOWS.md) deployment checklist
3. Ensure OpenAPI docs are synchronized ([OPENAPI_SYNC.md](./OPENAPI_SYNC.md))
4. Understand CI/CD pipeline requirements ([CI_PIPELINE.md](./CI_PIPELINE.md))
5. Update relevant docs with any architecture or security changes
