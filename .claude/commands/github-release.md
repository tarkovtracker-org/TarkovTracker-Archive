---
title: "Create GitHub Release"
argument-hint: "version (e.g., v1.2.3)"
---

Create a GitHub release for version $ARGUMENTS following best practices:

1. **Version Validation**: Verify the version follows semantic versioning (e.g., v1.2.3)

2. **Pre-release Checks**:
   - Check git status to ensure working directory is clean
   - Verify you're on the main/master branch
   - Pull latest changes from remote
   - Run tests to ensure everything passes
   - Check for any uncommitted changes

3. **Generate Release Notes**:
   - Get commits since last release using `git log --oneline <last-tag>..HEAD`
   - Categorize changes into:
     - 🚀 **New Features**
     - 🐛 **Bug Fixes**
     - 📚 **Documentation**
     - 🔧 **Maintenance**
     - ⚠️ **Breaking Changes**

4. **Create and Push Tag**:
   - Create annotated git tag: `git tag -a $ARGUMENTS -m "Release $ARGUMENTS"`
   - Push tag to remote: `git push origin $ARGUMENTS`

5. **Create GitHub Release**:
   - Use `gh release create $ARGUMENTS` with the following flags:
     - `--title "Release $ARGUMENTS"`
     - `--notes-file` or `--notes` with categorized release notes
     - `--latest` (if this is the latest stable release)
     - `--prerelease` (if this is a pre-release version like alpha, beta, rc)

6. **Post-release Actions**:
   - Verify the release appears correctly on GitHub
   - Check that any automated workflows (CI/CD, package publishing) triggered successfully
   - Update any documentation that references version numbers
   - Announce the release if applicable

**Example Commands**:

```bash
# Check status and pull latest
git status && git pull origin main

# Run tests (adjust command based on project)
npm test  # or yarn test, make test, etc.

# Create and push tag
git tag -a $ARGUMENTS -m "Release $ARGUMENTS"
git push origin $ARGUMENTS

# Create GitHub release
gh release create $ARGUMENTS \
  --title "Release $ARGUMENTS" \
  --notes "Release notes here..." \
  --latest
```

Always ensure proper testing and review before creating releases in production repositories.
