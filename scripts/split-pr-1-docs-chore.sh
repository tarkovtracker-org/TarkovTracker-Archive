#!/bin/bash
# PR Split 1: Documentation and Chore Updates
# This is the SAFEST split - no functional code changes
# Risk Level: Very Low ✅

set -e  # Exit on error

BRANCH_NAME="chore/docs-and-tooling-updates"
BASE_BRANCH="staging"  # Change to 'main' if targeting main instead

echo "🚀 Creating PR Split 1: Documentation & Chore Updates"
echo "=================================================="
echo ""

# Ensure we're starting from clean state
echo "📦 Fetching latest changes..."
git fetch origin

# Create new branch from staging
echo "🌿 Creating branch: $BRANCH_NAME from $BASE_BRANCH"
git checkout $BASE_BRANCH
git pull origin $BASE_BRANCH
git checkout -b $BRANCH_NAME

echo ""
echo "🍒 Cherry-picking commits (this may take a moment)..."
echo ""

# Documentation commits
echo "📚 Documentation updates..."
git cherry-pick 2059b70  # docs: streamline technical debt documentation
git cherry-pick 8ac5037  # docs: update action item verification steps
git cherry-pick db7f9d3  # docs: update links in user guides
git cherry-pick b447b3b  # docs: update documentation dates
git cherry-pick 9a72277  # docs: update token regeneration route docs
git cherry-pick 353313f  # docs: update API docs reference Swagger→Scalar
git cherry-pick 2dc3c75  # docs: update scripts section in README
git cherry-pick 2a0b022  # docs: enhance mermaid diagram
git cherry-pick 6fdc7f1  # docs: reorganize documentation hierarchy
git cherry-pick 0ebfd22  # docs: enhance dependency upgrade strategy
git cherry-pick f7950ed  # docs: add branch strategy guides
git cherry-pick cf40705  # docs: update development docs
git cherry-pick 704b1a4  # docs: add cache verification gate
git cherry-pick af51544  # docs: reorganize rate limit guidance

echo ""
echo "🔧 Chore & config updates..."
# Chore commits
git cherry-pick ce4953c  # chore: update .gitignore AI files
git cherry-pick f5d6c21  # chore: update .gitignore BMAD
git cherry-pick 36a1484  # chore: merge Firebase workflows
git cherry-pick 9cf8f55  # chore: remove redundant workflows
git cherry-pick 54d1046  # chore: enhance Firebase staging workflow
git cherry-pick 5e46c88  # chore: remove obsolete directories
git cherry-pick 1522a77  # chore: update markdownlint config
git cherry-pick d49fa24  # chore: remove unused apollo.config.cjs
git cherry-pick 3db2fe6  # chore: update eslint dependencies

echo ""
echo "💅 Style & formatting..."
# Style commits
git cherry-pick 5113922  # style: apply prettier formatting
git cherry-pick efab263  # chore: apply code formatting

echo ""
echo "✅ Cherry-picking complete!"
echo ""

# Run tests to verify
echo "🧪 Running tests to verify changes..."
if npm run build && npm test; then
    echo ""
    echo "✅ Tests passed! Ready to push."
    echo ""
    echo "📤 Next steps:"
    echo "1. Review the changes: git log --oneline $BASE_BRANCH..$BRANCH_NAME"
    echo "2. Push the branch: git push origin $BRANCH_NAME"
    echo "3. Create PR on GitHub targeting '$BASE_BRANCH'"
    echo ""
    echo "PR Title suggestion:"
    echo "  'chore: documentation updates and tooling improvements'"
    echo ""
    echo "PR Description template:"
    echo "  This PR is part 1 of splitting PR #111 into manageable chunks."
    echo "  "
    echo "  ## Changes"
    echo "  - Documentation updates and reorganization"
    echo "  - Chore updates (configs, workflows, .gitignore)"
    echo "  - Code formatting (no logic changes)"
    echo "  "
    echo "  ## Risk Level"
    echo "  ✅ Very Low - No functional code changes"
    echo "  "
    echo "  ## Testing"
    echo "  - ✅ Build passes"
    echo "  - ✅ All tests pass"
    echo "  "
    echo "  Part of: #111"
else
    echo ""
    echo "❌ Tests failed! Please review the errors above."
    echo "You may need to resolve conflicts or fix test issues."
    echo ""
    echo "To abort and clean up:"
    echo "  git checkout $BASE_BRANCH"
    echo "  git branch -D $BRANCH_NAME"
    exit 1
fi
