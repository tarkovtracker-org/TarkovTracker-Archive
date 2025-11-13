# Action Tracking & Prioritization

> **Audience:** Maintainers, project leads  
> **Purpose:** Priority framework and decision-making process (not a task list)

How TarkovTracker tracks, prioritizes, and executes development work.

---

## Work Management Philosophy

**Keep docs evergreen, tasks ephemeral:**
- Documentation captures **process, architecture, and decisions**
- Specific tasks, bugs, and priorities live in **GitHub Issues/Projects**
- This document explains **how** we prioritize, not **what** to do next

---

## Priority Framework

### P0 (Critical)
**Definition:** Blocks users, security vulnerabilities, or data loss risks

**Response Time:** Immediate (hotfix from `main`)

**Examples:**
- Auth system completely broken
- Data corruption affecting production users
- Critical security vulnerability disclosed
- API completely down

**Process:**
1. Branch from `main` if in production
2. Fix and test thoroughly
3. Deploy directly to production
4. Backport to `staging`

---

### P1 (High)
**Definition:** Degrades experience, blocks features, or tech debt with compounding costs

**Response Time:** Next sprint/week

**Examples:**
- Performance degradation (>5s load times)
- Feature partially broken for subset of users
- Major dependency security updates
- Architecture debt causing frequent issues

**Process:**
1. Create GitHub Issue with `priority: high` label
2. Add to current sprint if capacity exists
3. Branch from `staging`, standard PR flow
4. Deploy via staging → main promotion

---

### P2 (Medium)
**Definition:** Nice-to-have improvements, optimization, or manageable tech debt

**Response Time:** Planned work, next 1-2 sprints

**Examples:**
- UI polish and minor UX improvements
- Documentation gaps
- Refactoring for maintainability
- Non-critical dependency updates

**Process:**
1. Create GitHub Issue with `priority: medium` label
2. Add to backlog, pull into sprint during planning
3. Standard development workflow

---

### P3 (Low)
**Definition:** Future considerations, exploratory work, or deferred improvements

**Response Time:** No commitment

**Examples:**
- Feature ideas for future consideration
- Long-term architecture improvements
- Experimental optimizations
- Research spikes

**Process:**
1. Document in GitHub Discussions or backlog
2. Re-evaluate during quarterly planning
3. May never be implemented

---

## Decision Framework

When prioritizing work, consider:

1. **User Impact** – How many users affected? How severely?
2. **Risk** – Could this cause data loss or security issues?
3. **Cost of Delay** – Does postponing make it more expensive later?
4. **Dependencies** – Does other work block on this?
5. **Effort** – Quick wins vs. large projects

**Use this matrix:**

| Impact | Effort | Priority |
|--------|--------|----------|
| High | Low | P1 (do now) |
| High | High | P1 (plan carefully) |
| Low | Low | P2 (nice to have) |
| Low | High | P3 (probably never) |

---

## Implementation Checklists

When implementing complex features, use lightweight checklists:

**Example: Token Expiration Feature**
```markdown
## Token Inactivity Expiration

- [ ] Add `lastUsed`/`revoked` fields to ApiToken schema
- [ ] Update bearer middleware to check inactivity
- [ ] Add auto-revoke logic (180 days)
- [ ] Update UI to show expiration status
- [ ] Add tests for expired tokens
- [ ] Document in SECURITY.md
```

**Where to track:**
- Small features: PR description or GitHub Issue
- Large features: Dedicated GitHub Project board
- Architecture changes: This docs folder (ARCHITECTURE.md, etc.)

---

## When to Update Documentation

Documentation changes should accompany:

- **Architecture decisions** → Update `ARCHITECTURE.md`
- **Security changes** → Update `SECURITY.md`
- **Workflow changes** → Update `WORKFLOWS.md` or `DEVELOPMENT.md`
- **Process changes** → Update this file (`ACTIONS.md`)

**Never:**
- Document specific dated tasks/priorities here (use GitHub Issues)
- Create implementation checklists as standalone docs (use Issues/PRs)
- Track bugs in documentation (use GitHub Issues)

---

## Current Focus Areas

For current specific priorities, see:
- **GitHub Issues:** Labeled with `priority: high` or `sprint: current`
- **GitHub Projects:** Sprint board or backlog view
- **TECHNICAL_DEBT.md:** Ongoing refactoring priorities

---

## Related Documentation

- [TECHNICAL_DEBT.md](./development/TECHNICAL_DEBT.md) – Known debt items
- [WORKFLOWS.md](./WORKFLOWS.md) – Branch and deployment process
- [DEVELOPMENT.md](./DEVELOPMENT.md) – Development setup and testing
