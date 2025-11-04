#!/bin/bash
# PR Split 3: Infrastructure Refactoring
# Risk Level: Medium ⚠️⚠️

set -e

BRANCH_NAME="refactor/infrastructure-improvements"
BASE_BRANCH="staging"

echo "🚀 Creating PR Split 3: Infrastructure Refactoring"
echo "================================================="
echo ""

echo "⚠️  WARNING: This includes architectural changes."
echo "   Ensure PR Splits 1 & 2 are merged before proceeding."
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Fetch latest
echo "📦 Fetching latest changes..."
git fetch origin

# Create branch
echo "🌿 Creating branch: $BRANCH_NAME from $BASE_BRANCH"
git checkout $BASE_BRANCH
git pull origin $BASE_BRANCH
git checkout -b $BRANCH_NAME

echo ""
echo "🍒 Cherry-picking infrastructure commits..."
echo ""

# Shared utilities
echo "🔧 Shared utilities & refactoring..."
git cherry-pick 76c81a8  # refactor(functions): extract lazy init factory
git cherry-pick 50110f3  # refactor(errors): make async error handler generic
git cherry-pick 1e091ec  # refactor(auth): centralize dev auth detection

echo ""
echo "🔒 CORS & security improvements..."
# CORS and security
git cherry-pick 0ae358f  # fix(cors): stop reflecting headers
git cherry-pick e6fb89c  # fix(utils): gate sessionStorage fallback

echo ""
echo "⚡ Firebase & cache optimizations..."
# Firebase optimizations
git cherry-pick e23ce1c  # fix(firebase): optimize cache strategy
git cherry-pick 723d1dd  # chore(hosting): fix cache headers
git cherry-pick cb00e19  # chore(lint): fix flat ESLint ignores

echo ""
echo "🛠️ Dev tooling improvements..."
# Dev tooling
git cherry-pick 316b1da  # feat: data sanitization for localStorage
git cherry-pick c790d07  # fix(migration): preserve local state
git cherry-pick ebb2b74  # fix(settings): reset cached QR

echo ""
echo "✅ Cherry-picking complete!"
echo ""

# Run tests
echo "🧪 Running tests (may take longer)..."
if npm run build && npm test; then
    echo ""
    echo "✅ Tests passed! Ready to push."
    echo ""
    echo "📤 Next steps:"
    echo "1. Review: git log --oneline $BASE_BRANCH..$BRANCH_NAME"
    echo "2. Push: git push origin $BRANCH_NAME"
    echo "3. Create PR on GitHub"
    echo ""
    echo "PR Title: 'refactor: infrastructure improvements and optimizations'"
    echo ""
    echo "PR Description:"
    echo "  Part 3 of splitting PR #111."
    echo "  "
    echo "  ## Infrastructure Improvements"
    echo "  - Lazy initialization factory for shared resources"
    echo "  - Centralized dev auth detection"
    echo "  - Generic async error handlers"
    echo "  "
    echo "  ## Security & Performance"
    echo "  - CORS security hardening (static allowlist)"
    echo "  - Firebase cache optimizations"
    echo "  - sessionStorage fallback gating"
    echo "  "
    echo "  ## Developer Experience"
    echo "  - localStorage sanitization"
    echo "  - Better dev mode handling"
    echo "  - QR code caching fixes"
    echo "  "
    echo "  ## Risk Level"
    echo "  ⚠️⚠️ Medium - Architectural changes, no new features"
    echo "  "
    echo "  ## Testing"
    echo "  - ✅ Build passes"
    echo "  - ✅ All tests pass"
    echo "  - Recommended: Test in staging for 24 hours"
    echo "  "
    echo "  Depends on: [PR numbers from Splits 1 & 2]"
    echo "  Part of: #111"
else
    echo ""
    echo "❌ Tests failed! Review errors above."
    exit 1
fi
