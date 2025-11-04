# TarkovTracker Documentation

Welcome to the TarkovTracker documentation. This section contains comprehensive
documentation organized by audience and purpose.

## 📚 Documentation Structure

### For End Users

- **[User Guides](./user-guides/README.md)** - How to use TarkovTracker features
  - Getting started guides
  - Feature documentation
  - Privacy and legal information

### For Developers  

- **[Development Documentation](./development/README.md)** - Technical implementation
  and contribution
  - Development workflow and setup
  - Code organization and patterns
  - Testing and deployment processes

### For Architects

- **[Architecture Documentation](./architecture/README.md)** - System design and
technical decisions
  - System architecture overview
  - Technology stack details
  - Security and performance considerations

### For Operations

- **[Reports and Guides](./REPORTS/README.md)** - Operational guides and
project reports
  - Upgrade strategies and guides
  - Performance analysis reports
  - Action items and priorities

## 🎯 Documentation Categories

```bash
docs/
├── README.md                    # This file - Documentation overview
├── user-guides/                 # End-user documentation
│   ├── README.md
│   ├── USER_GUIDES_INDEX.md
│   └── PRD.md
├── development/                 # Developer documentation
│   ├── README.md
│   ├── DEV_MODES_README.md
│   ├── BRANCH_STRATEGY.md
│   └── [more dev docs...]
├── architecture/                # Technical architecture
│   ├── README.md
│   ├── ARCHITECTURE_INDEX.md
│   └── [architecture docs...]
├── REPORTS/                     # Operational reports
│   ├── README.md
│   └── [project reports...]
├── ci/                          # CI/CD documentation
├── stories/                     # User stories
└── [BMM Documentation Files]    # BMM-specific documentation
```

## 🔗 Cross-References

### Essential Links

- **Main Project:** [README.md](../README.md) - Project introduction and setup
- **AI Assistant Guidelines:**
  [CLAUDE.md](../CLAUDE.md) & [AGENTS.md](../AGENTS.md)
  Identical AI development instructions
- **Contribution Guidelines:** [CONTRIBUTING.md](../CONTRIBUTING.md) - How to contribute
- **Scripts Reference:** [scripts/SCRIPTS.md](../scripts/SCRIPTS.md) - Development
  automation scripts

### External Resources

- **GitHub Repository:**
  [TarkovTracker/TarkovTracker](https://github.com/TarkovTracker/TarkovTracker)
- **Live Application:** [TarkovTracker.app](https://tarkovtracker.app)
- **API Documentation:** [Generated OpenAPI Spec](../functions/openapi/openapi.json)

## 📝 Documentation Guidelines

### For Contributors

1. **Choose the right audience** - User, Developer, Architect, or Operations
2. **Use clear structure** - Follow existing patterns and organization
3. **Cross-reference appropriately** - Link to related documentation
4. **Keep current** - Update documentation when features change

### For AI Assistants

- Start with [CLAUDE.md](../CLAUDE.md) (identical to [AGENTS.md](../AGENTS.md)) for
  development guidelines
- Both files contain identical AI development instructions for different agent systems
- Use this README to find appropriate documentation sections
- Follow the audience-based organization when creating new docs

---

**Next Steps:**

- **New user?** Start with [User Guides](./user-guides/README.md)
- **Want to contribute?** See [Development Documentation](./development/README.md)
- **Understanding the system?** Read [Architecture Documentation](./architecture/README.md)
- **Operational context?** Check [Reports and Guides](./REPORTS/README.md)
