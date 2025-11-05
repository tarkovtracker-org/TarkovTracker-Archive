#!/bin/bash
# PR Split 4: Scheduled Functions & Data Management
# Risk Level: High ⚠️⚠️⚠️

set -e

BRANCH_NAME="feat/scheduled-functions-and-data"
BASE_BRANCH="staging"

echo "🚀 Creating PR Split 4: Scheduled Functions & Data Management"
echo "============================================================="
echo ""

echo "⚠️  WARNING: This includes new backend features."
echo "   Ensure PR Splits 1, 2, & 3 are merged before proceeding."
echo "   This PR should be feature-flagged for safe rollout."
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
echo "🍒 Cherry-picking scheduled function commits..."
echo ""

# Scheduled functions infrastructure
echo "⏰ Scheduled functions & data management..."
git cherry-pick 56f29ae  # fix(functions): shard Firestore items
git cherry-pick efdab6a  # fix(graphql): use GraphQL print
git cherry-pick a5cd555  # feat(lruCache): implement LRU cache
git cherry-pick 8d2ded8  # feat(health-check): add health check script

echo ""
echo "🗄️ Firestore improvements..."
# Firestore improvements
git cherry-pick 328cdf0  # chore(firestore): add composite indexes
git cherry-pick 8fc7bb9  # docs(tokens): align rate limiter naming
git cherry-pick cda837e  # fix(error-handler): enforce function type
git cherry-pick 72a2ac8  # docs(rate-limits): update event schema
git cherry-pick 81299f3  # docs(rate-limits): clarify tokenOwner

echo ""
echo "🚩 Feature flags..."
# Feature flags
git cherry-pick cad0c1f  # chore(features): document flags

echo ""
echo "✅ Cherry-picking complete!"
echo ""

# Run tests
echo "🧪 Running tests (may take several minutes)..."
if npm run build && npm test; then
    echo ""
    echo "✅ Tests passed! Ready to push."
    echo ""
    echo "📤 Next steps:"
    echo "1. Review: git log --oneline $BASE_BRANCH..$BRANCH_NAME"
    echo "2. Push: git push origin $BRANCH_NAME"
    echo "3. Create PR on GitHub"
    echo ""
    echo "PR Title: 'feat: scheduled functions and data management'"
    echo ""
    echo "PR Description:"
    echo "  Part 4 of splitting PR #111."
    echo "  "
    echo "  ## New Features (Feature Flagged)"
    echo "  - Scheduled Tarkov data sync with sharding"
    echo "  - LRU cache implementation for performance"
    echo "  - Token expiration infrastructure"
    echo "  - Health check tooling"
    echo "  "
    echo "  ## Database Changes"
    echo "  - ⚠️ Firestore composite indexes (deploy before functions!)"
    echo "  - Sharded items collection for >1MB documents"
    echo "  - Rate limit events collection"
    echo "  "
    echo "  ## Feature Flags"
    echo "  All new features are disabled by default."
    echo "  Set environment variables to enable:"
    echo "  - ENABLE_SCHEDULED_SYNC=true"
    echo "  - ENABLE_TOKEN_EXPIRATION=true"
    echo "  "
    echo "  ## Deployment Order (CRITICAL)"
    echo "  1. Deploy Firestore indexes: \`firebase deploy --only firestore:indexes\`"
    echo "  2. Wait for indexes to build (~5-15 minutes)"
    echo "  3. Deploy functions: \`firebase deploy --only functions\`"
    echo "  4. Enable features via environment variables"
    echo "  "
    echo "  ## Risk Level"
    echo "  ⚠️⚠️⚠️ High - New backend features"
    echo "  "
    echo "  ## Testing"
    echo "  - ✅ Build passes"
    echo "  - ✅ All tests pass"
    echo "  - ⚠️ MUST test in staging with features enabled for 48 hours"
    echo "  - Monitor Firebase usage/quotas"
    echo "  "
    echo "  Depends on: [PR numbers from Splits 1, 2, & 3]"
    echo "  Part of: #111"
    echo ""
    echo "⚠️  IMPORTANT: Review firestore.indexes.json before deploying!"
else
    echo ""
    echo "❌ Tests failed! Review errors above."
    exit 1
fi
