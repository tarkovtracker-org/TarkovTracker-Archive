#!/bin/bash
# PR Split 2: Bug Fixes & UI Polish
# Risk Level: Low ⚠️

set -e

BRANCH_NAME="fix/ui-and-bug-fixes"
BASE_BRANCH="staging"

echo "🚀 Creating PR Split 2: Bug Fixes & UI Polish"
echo "============================================="
echo ""

# Ensure we're starting from clean state
echo "📦 Fetching latest changes..."
git fetch origin

# Create new branch from staging (should include PR Split 1 if merged)
echo "🌿 Creating branch: $BRANCH_NAME from $BASE_BRANCH"
git checkout $BASE_BRANCH
git pull origin $BASE_BRANCH
git checkout -b $BRANCH_NAME

echo ""
echo "🍒 Cherry-picking bug fix commits..."
echo ""

# UI/Component fixes
echo "🎨 UI & Component fixes..."
git cherry-pick dc8a2b3  # fix: move v-else directive in TaskCardList
git cherry-pick 12fc62c  # fix: correct MDI font loading comment
git cherry-pick 9689e24  # fix: simplify preload link cleanup
git cherry-pick 6801dcc  # fix: tighten background preload typing
git cherry-pick c6b7984  # fix: decouple vue lint rules

echo ""
echo "🔨 Build & config fixes..."
# Build/config fixes
git cherry-pick 405fe16  # fix: ensure checkout in API docs workflow
git cherry-pick d9e9bf4  # fix: update docs:generate script path
git cherry-pick 031ea05  # fix: add missing checks permission
git cherry-pick 254489f  # fix: improve Firebase PR preview deployment
git cherry-pick 967c597  # fix: resolve PR preview deployment errors
git cherry-pick c3ec307  # fix: add missing logger utility

echo ""
echo "🗄️ Store & state fixes..."
# Store/state fixes
git cherry-pick d630264  # fix(user-store): correct default state
git cherry-pick 7a01b10  # Fix saving state property inconsistency
git cherry-pick 7e35d9c  # Remove redundant null check

echo ""
echo "✅ Cherry-picking complete!"
echo ""

# Run tests
echo "🧪 Running tests to verify changes..."
if npm run build && npm test; then
    echo ""
    echo "✅ Tests passed! Ready to push."
    echo ""
    echo "📤 Next steps:"
    echo "1. Review: git log --oneline $BASE_BRANCH..$BRANCH_NAME"
    echo "2. Push: git push origin $BRANCH_NAME"
    echo "3. Create PR on GitHub"
    echo ""
    echo "PR Title: 'fix: UI polish and bug fixes'"
    echo ""
    echo "PR Description:"
    echo "  Part 2 of splitting PR #111."
    echo "  "
    echo "  ## Bug Fixes"
    echo "  - UI component fixes (TaskCardList, preload, fonts)"
    echo "  - Build & workflow fixes"
    echo "  - Store state consistency fixes"
    echo "  "
    echo "  ## Risk Level"
    echo "  ⚠️ Low - Isolated bug fixes, no architectural changes"
    echo "  "
    echo "  ## Testing"
    echo "  - ✅ Build passes"
    echo "  - ✅ All tests pass"
    echo "  - Manual testing: [describe any manual tests]"
    echo "  "
    echo "  Depends on: [PR number from Split 1]"
    echo "  Part of: #111"
else
    echo ""
    echo "❌ Tests failed! Review errors above."
    exit 1
fi
