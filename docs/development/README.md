# Development Documentation

Developer-focused documentation for TarkovTracker contributors and maintainers.

## 🛠️ Available Documentation

### Development Guides

- [Epics and Planning](./epics.md) - Project roadmap and epic planning
- [Development Modes](./DEV_MODES_README.md) - Development environment setup
- [Branch Strategy](./BRANCH_STRATEGY.md) - Git branching workflow
- [Staging Workflow](./STAGING_WORKFLOW.md) - Staging deployment process
- [Technical Debt Remediation](./TECHNICAL_DEBT_REMEDIATION_PLAN.md) - Debt tracking and resolution
- [Rate Limits](./rate-limits.md) - API rate-limiting policies
- [Development Plan](./PLAN.md) - Current development priorities

### Tools and Scripts

- [Scripts Documentation](../../scripts/SCRIPTS.md) - Available development scripts
- **Emulator Wrapper** - `scripts/emulator-wrapper.js` provides enhanced Firebase emulator management for local development

### Documentation Structure

```bash
development/
├── README.md                    # This file
├── epics.md                     # Project roadmap
├── DEV_MODES_README.md          # Dev environment guide
├── BRANCH_STRATEGY.md           # Git workflow
├── STAGING_WORKFLOW.md          # Deployment process
├── TECHNICAL_DEBT_REMEDIATION_PLAN.md  # Debt management
├── rate-limits.md               # API limits
├── PLAN.md                      # Development plan
├── CI/                          # CI/CD documentation
└── stories/                     # User stories

scripts/
├── SCRIPTS.md                   # Scripts documentation
├── emulator-wrapper.js          # Enhanced Firebase emulator wrapper
└── update-maps-from-tarkovdev.js # Map data synchronization
```

## 🎯 Purpose

This section contains documentation focused on **developers**:

- Setup and development workflow
- Code organization and patterns
- Testing and deployment
- Contributing guidelines

## 🔗 Related Documentation

- **For users:** [User Guides](../user-guides/README.md)
- **For architects:** [Architecture Documentation](../architecture/README.md)
- **For operations:** [Reports and Guides](../REPORTS/README.md)

## 🚀 Quick Start for Developers

1. Read the [Development Modes Guide](./DEV_MODES_README.md)
2. Review the [Branch Strategy](./BRANCH_STRATEGY.md)  
3. Check the current [Development Plan](./PLAN.md)
4. For AI development guidelines: See [CLAUDE.md](../../CLAUDE.md) (identical to [AGENTS.md](../../AGENTS.md))
5. Follow [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines

---

*This documentation is developer-focused. For user-facing information, see user documentation.*
