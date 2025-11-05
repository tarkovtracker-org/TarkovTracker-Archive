#!/bin/bash
# Master script to guide through PR splitting process
# This is an interactive guide, not automated execution

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  PR #111 Split Strategy - Interactive Guide                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "This will help you split PR #111 into 4 manageable PRs."
echo ""
echo "Current status of integration/reconcile-all-features:"
git log --oneline main..integration/reconcile-all-features | wc -l | xargs echo "  Total commits:"
echo ""

echo "📊 Split Overview:"
echo "  Split 1: Documentation & Chore (Very Low Risk) ✅"
echo "  Split 2: Bug Fixes & UI Polish (Low Risk) ⚠️"
echo "  Split 3: Infrastructure Refactoring (Medium Risk) ⚠️⚠️"
echo "  Split 4: Scheduled Functions (High Risk) ⚠️⚠️⚠️"
echo ""

echo "════════════════════════════════════════════════════════════════"
echo ""

# Check if we're on the right branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "integration/reconcile-all-features" ]]; then
    echo "⚠️  You're on branch: $CURRENT_BRANCH"
    echo "   Expected: integration/reconcile-all-features"
    echo ""
    read -p "Switch to integration/reconcile-all-features? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git checkout integration/reconcile-all-features
    else
        echo "Please switch manually and re-run this script."
        exit 1
    fi
fi

echo "✅ On correct branch: integration/reconcile-all-features"
echo ""

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo "⚠️  You have uncommitted changes!"
    git status -s
    echo ""
    echo "Please commit or stash changes before continuing."
    exit 1
fi

echo "✅ Working directory is clean"
echo ""

# Fetch latest
echo "📦 Fetching latest from origin..."
git fetch origin
echo "✅ Fetched latest"
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "  STEP 1: Create Split 1 - Documentation & Chore"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "This split includes:"
echo "  • Documentation updates"
echo "  • Config file changes (.gitignore, workflows)"
echo "  • Code formatting (no logic changes)"
echo ""
echo "Risk: Very Low ✅"
echo "Recommended: Merge this first"
echo ""
read -p "Create Split 1 now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Running: ./scripts/split-pr-1-docs-chore.sh"
    echo ""
    ./scripts/split-pr-1-docs-chore.sh
    
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "  Split 1 complete!"
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    echo "Next steps:"
    echo "1. Review changes: git log --oneline staging..chore/docs-and-tooling-updates"
    echo "2. Push: git push origin chore/docs-and-tooling-updates"
    echo "3. Create PR on GitHub"
    echo "4. Get it reviewed and merged"
    echo "5. Come back and run this script again for Split 2"
    echo ""
    exit 0
else
    echo "Skipped Split 1"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  STEP 2: Create Split 2 - Bug Fixes"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "⚠️  Before creating Split 2, ensure Split 1 is merged!"
echo ""
read -p "Is Split 1 merged to staging? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Please merge Split 1 first, then re-run this script."
    echo ""
    echo "To check merge status:"
    echo "  git log --oneline staging | grep 'docs-and-tooling-updates'"
    exit 0
fi

echo ""
echo "This split includes:"
echo "  • UI component bug fixes"
echo "  • Build & workflow fixes"
echo "  • State management fixes"
echo ""
echo "Risk: Low ⚠️"
echo ""
read -p "Create Split 2 now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Running: ./scripts/split-pr-2-bugfixes.sh"
    echo ""
    ./scripts/split-pr-2-bugfixes.sh
    
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "  Split 2 complete!"
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    echo "Next steps:"
    echo "1. Push: git push origin fix/ui-and-bug-fixes"
    echo "2. Create PR on GitHub"
    echo "3. Get it reviewed and merged"
    echo "4. Come back for Split 3"
    echo ""
    exit 0
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  STEP 3: Create Split 3 - Infrastructure Refactoring"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "⚠️  Before creating Split 3, ensure Splits 1 & 2 are merged!"
echo ""
read -p "Are Splits 1 & 2 merged to staging? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Please merge Splits 1 & 2 first."
    exit 0
fi

echo ""
echo "This split includes:"
echo "  • Lazy initialization refactoring"
echo "  • CORS security improvements"
echo "  • Firebase cache optimizations"
echo "  • Dev tooling improvements"
echo ""
echo "Risk: Medium ⚠️⚠️"
echo ""
read -p "Create Split 3 now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    ./scripts/split-pr-3-refactoring.sh
    echo ""
    echo "Split 3 complete! Push and create PR, then come back for Split 4."
    exit 0
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  STEP 4: Create Split 4 - Scheduled Functions"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "⚠️  Before creating Split 4, ensure Splits 1, 2, & 3 are merged!"
echo ""
read -p "Are all previous splits merged? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Please merge previous splits first."
    exit 0
fi

echo ""
echo "This split includes:"
echo "  • Scheduled Tarkov data sync"
echo "  • LRU cache implementation"
echo "  • Firestore sharding"
echo "  • Token expiration (feature flagged)"
echo ""
echo "Risk: High ⚠️⚠️⚠️"
echo "⚠️  Requires Firestore index deployment!"
echo ""
read -p "Create Split 4 now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    ./scripts/split-pr-4-scheduled-functions.sh
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "  All Splits Complete!"
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    echo "After all 4 splits are merged:"
    echo "1. Checkout integration/reconcile-all-features"
    echo "2. Rebase onto staging: git rebase staging"
    echo "3. Force push: git push --force-with-lease origin integration/reconcile-all-features"
    echo "4. PR #111 will now be much smaller and focused!"
    echo ""
    exit 0
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  Summary"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "You can run individual split scripts manually:"
echo "  ./scripts/split-pr-1-docs-chore.sh"
echo "  ./scripts/split-pr-2-bugfixes.sh"
echo "  ./scripts/split-pr-3-refactoring.sh"
echo "  ./scripts/split-pr-4-scheduled-functions.sh"
echo ""
echo "Or run this guide again: ./scripts/split-pr-master.sh"
echo ""
