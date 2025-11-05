#!/bin/bash
# Create subset PRs from integration/reconcile-all-features
# This creates SMALLER PRs that branch FROM the integration branch
# instead of trying to cherry-pick to staging (which causes conflicts)

set -e

echo "🎯 PR #111 Subset Strategy - Conflict-Free Approach"
echo "===================================================="
echo ""
echo "Instead of cherry-picking (which has conflicts), we'll create"
echo "smaller PRs that branch FROM integration/reconcile-all-features."
echo ""
echo "Each PR targets staging and contains a SUBSET of the changes."
echo ""

# Ensure we're on integration branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "integration/reconcile-all-features" ]]; then
    echo "⚠️  Please switch to integration/reconcile-all-features first"
    echo "   Current branch: $CURRENT_BRANCH"
    exit 1
fi

echo "✅ On integration/reconcile-all-features"
echo ""

# Check for clean working directory
if [[ -n $(git status -s) ]]; then
    echo "⚠️  Please commit or stash changes first"
    git status -s
    exit 1
fi

echo "✅ Working directory clean"
echo ""

echo "📋 Available subset options:"
echo ""
echo "1. Documentation Only (~30 files, zero risk)"
echo "   - All .md files in docs/"
echo "   - README updates"
echo "   - No code changes"
echo ""
echo "2. Configuration & Tooling (~15 files, very low risk)"
echo "   - eslint.config.js"
echo "   - .gitignore"
echo "   - GitHub workflows"
echo "   - package.json (deps only)"
echo ""
echo "3. UI Bug Fixes (~10 files, low risk)"
echo "   - Vue component fixes"
echo "   - CSS/style fixes"
echo "   - No backend changes"
echo ""
echo "4. Tests & Build Improvements (~20 files, low risk)"
echo "   - Test file updates"
echo "   - Vitest config"
echo "   - Build script improvements"
echo ""
echo "Or choose 'custom' to manually select files"
echo ""

read -p "Which subset do you want to create? (1-4 or 'custom'): " CHOICE

case $CHOICE in
    1)
        BRANCH_NAME="docs/subset-from-pr111"
        PR_TITLE="docs: documentation updates from PR #111"
        PATTERN="docs/**/*.md README.md CONTRIBUTING.md SUPPORT.md"
        ;;
    2)
        BRANCH_NAME="chore/config-tooling-from-pr111"
        PR_TITLE="chore: configuration and tooling updates from PR #111"
        PATTERN="eslint.config.js .gitignore .github/**/*.yml package.json scripts/*.sh"
        ;;
    3)
        BRANCH_NAME="fix/ui-fixes-from-pr111"
        PR_TITLE="fix: UI component fixes from PR #111"
        PATTERN="frontend/src/features/**/*.vue frontend/src/components/**/*.vue frontend/src/**/*.css"
        ;;
    4)
        BRANCH_NAME="test/improvements-from-pr111"
        PR_TITLE="test: test and build improvements from PR #111"
        PATTERN="**/*.spec.ts **/*.test.ts vitest.config.ts playwright.config.ts"
        ;;
    custom)
        echo ""
        echo "Custom mode - you'll manually select files after branch creation"
        read -p "Enter branch name (e.g., 'fix/my-subset'): " BRANCH_NAME
        read -p "Enter PR title: " PR_TITLE
        PATTERN=""
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "Creating subset PR:"
echo "  Branch: $BRANCH_NAME"
echo "  Title: $PR_TITLE"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted"
    exit 0
fi

# Create new branch FROM integration branch
echo "🌿 Creating branch: $BRANCH_NAME"
git checkout -b "$BRANCH_NAME"

if [[ -n "$PATTERN" ]]; then
    echo "📝 Showing files that match pattern..."
    echo ""
    
    # Show files that will be included
    git diff --name-only staging..integration/reconcile-all-features -- $PATTERN | head -20
    
    echo ""
    echo "💡 Next steps:"
    echo "1. Review changes: git diff staging...$BRANCH_NAME -- $PATTERN | less"
    echo "2. If happy, push: git push origin $BRANCH_NAME"
    echo "3. Create PR on GitHub with title: $PR_TITLE"
    echo "4. PR description should explain it's a subset of #111"
else
    echo ""
    echo "💡 Custom mode next steps:"
    echo "1. Review all changes: git diff staging...$BRANCH_NAME"
    echo "2. Identify files you want in THIS PR"
    echo "3. Create commits with just those changes"
    echo "4. Push and create PR"
fi

echo ""
echo "✅ Branch created: $BRANCH_NAME"
echo ""
echo "To see what changed from staging:"
echo "  git diff staging...$BRANCH_NAME --stat"
echo ""
echo "To go back:"
echo "  git checkout integration/reconcile-all-features"
echo "  git branch -D $BRANCH_NAME"
