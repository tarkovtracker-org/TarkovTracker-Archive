#!/bin/bash
# batch-update.sh - Automate batch dependency updates

set -e

BATCH=$1

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if [ -z "$BATCH" ]; then
  echo "Usage: ./scripts/batch-update.sh <batch-number>"
  echo ""
  echo "Available batches:"
  echo "  1 - Patch updates (safe, quick)"
  echo "  2 - Minor updates (low risk)"
  echo "  3 - Firebase 12 (breaking changes)"
  echo "  4 - Apollo Client 4 (breaking changes)"
  echo "  5 - Remaining major updates"
  exit 1
fi

echo -e "${GREEN}🚀 Starting Batch $BATCH upgrade...${NC}"
echo ""

case $BATCH in
  1)
    echo "📦 Batch 1: Updating patch versions..."
    echo "  - concurrently, vite, globals, taze, happy-dom"
    echo ""

    # Root updates
    npm update concurrently globals taze firebase-tools

    # Frontend updates
    cd frontend
    npm update vite happy-dom
    cd ..

    echo ""
    echo -e "${GREEN}✅ Batch 1 complete!${NC}"
    ;;

  2)
    echo "📦 Batch 2: Updating minor versions..."
    echo "  - eslint-plugin-vue, firebase-tools"
    echo ""

    npm update eslint-plugin-vue firebase-tools

    echo ""
    echo -e "${GREEN}✅ Batch 2 complete!${NC}"
    ;;

  3)
    echo "📦 Batch 3: Updating Firebase to v12..."
    echo ""
    echo -e "${YELLOW}⚠️  This is a BREAKING CHANGE upgrade!${NC}"
    echo ""

    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Aborted."
      exit 1
    fi

    # Create git branch
    BRANCH="upgrade/firebase-12"
    git checkout -b "$BRANCH" 2>/dev/null || git checkout "$BRANCH"

    # Update Firebase
    cd frontend
    npm install firebase@^12.4.0
    cd ..
    npm install firebase@^12.4.0

    echo ""
    echo -e "${GREEN}✅ Firebase packages updated!${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  NEXT STEPS:${NC}"
    echo "1. Run migration script: ./scripts/migrate-firebase-exists.sh"
    echo "2. Review changes: git diff"
    echo "3. Test: npm run build && npm test"
    echo "4. See DEPENDENCY_UPGRADE_STRATEGY.md for details"
    ;;

  4)
    echo "📦 Batch 4: Updating Apollo Client to v4..."
    echo ""
    echo -e "${YELLOW}⚠️  This is a BREAKING CHANGE upgrade!${NC}"
    echo ""

    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Aborted."
      exit 1
    fi

    # Create git branch
    BRANCH="upgrade/apollo-4"
    git checkout -b "$BRANCH" 2>/dev/null || git checkout "$BRANCH"

    # Update Apollo Client
    cd frontend
    npm install rxjs@^7.8.1
    npm install @apollo/client@^4.0.7
    cd ..

    echo ""
    echo -e "${GREEN}✅ Apollo Client updated!${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  NEXT STEPS:${NC}"
    echo "1. Update Apollo configuration (see migration guide)"
    echo "2. Run codemod: cd frontend && npx @apollo/client-codemod@latest migrate-to-4.0"
    echo "3. Review changes: git diff"
    echo "4. Test: npm run build && npm test"
    echo "5. See DEPENDENCY_UPGRADE_STRATEGY.md for details"
    ;;

  5)
    echo "📦 Batch 5: Updating remaining packages..."
    echo "  - uuid, jsdom, ts-essentials, @intlify/unplugin-vue-i18n, @types/node"
    echo ""
    echo -e "${YELLOW}⚠️  These are MAJOR VERSION upgrades!${NC}"
    echo ""

    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Aborted."
      exit 1
    fi

    # Create git branch
    BRANCH="upgrade/batch-5"
    git checkout -b "$BRANCH" 2>/dev/null || git checkout "$BRANCH"

    # Update packages
    cd frontend
    npm install uuid@^13.0.0
    npm install jsdom@^27.0.0
    npm install ts-essentials@^10.1.1
    npm install -D @intlify/unplugin-vue-i18n@^11.0.1
    cd ..

    npm install -D @types/node@^24.7.2

    echo ""
    echo -e "${GREEN}✅ Batch 5 packages updated!${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  NEXT STEPS:${NC}"
    echo "1. Review changes: git diff"
    echo "2. Test thoroughly: npm run build && npm test"
    echo "3. Check for TypeScript errors: cd frontend && npm run type-check"
    echo "4. See DEPENDENCY_UPGRADE_STRATEGY.md for details"
    ;;

  *)
    echo -e "${RED}❌ Invalid batch number: $BATCH${NC}"
    echo ""
    echo "Valid batches: 1, 2, 3, 4, 5"
    exit 1
    ;;
esac

echo ""
echo "🧪 Running health check..."
echo ""

if [ -f "scripts/health-check.sh" ]; then
  ./scripts/health-check.sh
else
  echo -e "${YELLOW}⚠️  Health check script not found${NC}"
  echo "Run manually: npm run build && npm test"
fi

echo ""
echo -e "${GREEN}✅ Batch $BATCH upgrade process complete!${NC}"
