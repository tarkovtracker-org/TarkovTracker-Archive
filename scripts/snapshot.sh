#!/bin/bash
# snapshot.sh - Create pre-upgrade snapshot

set -e

SNAPSHOT_DIR=".upgrade-snapshots/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$SNAPSHOT_DIR"

echo "📸 Creating upgrade snapshot..."
echo ""

# 1. Save package manifests
echo "📦 Saving package manifests..."
cp package.json "$SNAPSHOT_DIR/"
cp package-lock.json "$SNAPSHOT_DIR/"
cp frontend/package.json "$SNAPSHOT_DIR/frontend-package.json"
cp frontend/package-lock.json "$SNAPSHOT_DIR/frontend-package-lock.json"
cp functions/package.json "$SNAPSHOT_DIR/functions-package.json"

# 2. Save git state
echo "🔖 Saving git state..."
git rev-parse HEAD > "$SNAPSHOT_DIR/commit-hash.txt"
git status > "$SNAPSHOT_DIR/git-status.txt"
git log --oneline -10 > "$SNAPSHOT_DIR/recent-commits.txt"

# 3. Save current versions
echo "📋 Saving dependency versions..."
npm list --depth=0 > "$SNAPSHOT_DIR/root-dependencies.txt" 2>&1 || true
cd frontend && npm list --depth=0 > "$SNAPSHOT_DIR/frontend-dependencies.txt" 2>&1 || true
cd ../functions && npm list --depth=0 > "$SNAPSHOT_DIR/functions-dependencies.txt" 2>&1 || true
cd ..

# 4. Save current bundle size (if dist exists)
if [ -d "frontend/dist" ]; then
  echo "📊 Saving bundle size..."
  du -sh frontend/dist > "$SNAPSHOT_DIR/bundle-size.txt"
  du -sh frontend/dist/assets/*.js > "$SNAPSHOT_DIR/js-bundle-sizes.txt" 2>&1 || true
fi

# 5. Run tests and save results
echo "🧪 Running tests and saving baseline..."
npm test -- --run > "$SNAPSHOT_DIR/test-results.txt" 2>&1 || echo "Some tests failed" >> "$SNAPSHOT_DIR/test-results.txt"

# 6. Check for security vulnerabilities
echo "🔒 Checking security status..."
npm audit --json > "$SNAPSHOT_DIR/security-audit.json" 2>&1 || true

# 7. Create git tag
TAG="pre-upgrade-$(date +%Y%m%d-%H%M%S)"
git tag -a "$TAG" -m "Pre-upgrade snapshot - created by snapshot.sh"

# 8. Create snapshot summary
cat > "$SNAPSHOT_DIR/README.md" << EOF
# Upgrade Snapshot

Created: $(date)
Commit: $(git rev-parse HEAD)
Branch: $(git rev-parse --abbrev-ref HEAD)
Tag: $TAG

## Contents

- \`package.json\` - Root package manifest
- \`package-lock.json\` - Root package lock
- \`frontend-package.json\` - Frontend package manifest
- \`frontend-package-lock.json\` - Frontend package lock
- \`functions-package.json\` - Functions package manifest
- \`commit-hash.txt\` - Current git commit hash
- \`git-status.txt\` - Git working tree status
- \`recent-commits.txt\` - Last 10 commits
- \`*-dependencies.txt\` - Installed dependency versions
- \`bundle-size.txt\` - Frontend bundle size (if available)
- \`test-results.txt\` - Test suite baseline results
- \`security-audit.json\` - npm audit results

## Restore Instructions

### Quick Restore (Package versions only)
\`\`\`bash
cp $SNAPSHOT_DIR/package.json .
cp $SNAPSHOT_DIR/package-lock.json .
cp $SNAPSHOT_DIR/frontend-package.json frontend/package.json
cp $SNAPSHOT_DIR/frontend-package-lock.json frontend/package-lock.json
cp $SNAPSHOT_DIR/functions-package.json functions/package.json
npm install
\`\`\`

### Full Restore (Git state)
\`\`\`bash
git checkout $TAG
npm install
\`\`\`

## Comparison After Upgrade

### Check version differences
\`\`\`bash
diff $SNAPSHOT_DIR/frontend-dependencies.txt <(cd frontend && npm list --depth=0)
\`\`\`

### Check bundle size impact
\`\`\`bash
diff $SNAPSHOT_DIR/bundle-size.txt <(du -sh frontend/dist)
\`\`\`

### Check test results
\`\`\`bash
npm test -- --run > /tmp/new-tests.txt
diff $SNAPSHOT_DIR/test-results.txt /tmp/new-tests.txt
\`\`\`
EOF

echo ""
echo "✅ Snapshot created successfully!"
echo ""
echo "📁 Location: $SNAPSHOT_DIR"
echo "🔖 Git tag: $TAG"
echo ""
echo "📋 Snapshot includes:"
echo "  - Package manifests and lock files"
echo "  - Git state and commit history"
echo "  - Dependency versions"
echo "  - Bundle size baseline"
echo "  - Test results baseline"
echo "  - Security audit"
echo ""
echo "📖 See $SNAPSHOT_DIR/README.md for restore instructions"
echo ""
echo "🚀 Ready to proceed with upgrade!"
