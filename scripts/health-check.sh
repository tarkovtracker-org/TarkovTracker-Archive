#!/bin/bash
# health-check.sh - Post-upgrade health verification

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🏥 Post-Upgrade Health Check"
echo "=============================="
echo ""

FAILED=0

# Function to check status
check_status() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ $1${NC}"
  else
    echo -e "${RED}❌ $1${NC}"
    FAILED=1
  fi
}

# 1. Build check
echo "📦 Building project..."
npm run build > /tmp/health-build.log 2>&1
check_status "Build successful"

if [ $FAILED -eq 1 ]; then
  echo ""
  echo "Build errors:"
  tail -20 /tmp/health-build.log
fi

# 2. Functions build check
echo "🔧 Building functions..."
npm run build:functions > /tmp/health-functions.log 2>&1
check_status "Functions build successful"

# 3. Frontend type check
echo "📘 Type checking frontend..."
cd frontend && npm run type-check > /tmp/health-typecheck.log 2>&1
cd ..
check_status "No type errors"

if [ $FAILED -eq 1 ]; then
  echo ""
  echo "Type errors:"
  tail -20 /tmp/health-typecheck.log
fi

# 4. Lint check
echo "🔍 Linting code..."
npm run lint > /tmp/health-lint.log 2>&1
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ No lint errors${NC}"
else
  echo -e "${YELLOW}⚠️  Lint warnings present${NC}"
  echo "Run 'npm run lint' for details"
fi

# 5. Unit tests - functions
echo "🧪 Running functions tests..."
cd functions && npm test -- --run > /tmp/health-test-functions.log 2>&1
cd ..
check_status "Functions tests passing"

# 6. Unit tests - frontend
echo "🧪 Running frontend tests..."
cd frontend && npm test -- --run > /tmp/health-test-frontend.log 2>&1
cd ..
check_status "Frontend tests passing"

if [ $FAILED -eq 1 ]; then
  echo ""
  echo "Test failures:"
  tail -30 /tmp/health-test-functions.log /tmp/health-test-frontend.log
fi

# 7. Bundle size check (if dist exists)
if [ -d "frontend/dist" ]; then
  echo "📊 Checking bundle size..."
  BUNDLE_SIZE=$(du -sm frontend/dist | cut -f1)
  THRESHOLD=10 # 10MB threshold

  if [ $BUNDLE_SIZE -lt $THRESHOLD ]; then
    echo -e "${GREEN}✅ Bundle size OK: ${BUNDLE_SIZE}MB${NC}"
  else
    echo -e "${YELLOW}⚠️  Bundle size large: ${BUNDLE_SIZE}MB (threshold: ${THRESHOLD}MB)${NC}"
  fi
fi

# 8. Dependencies check
echo "🔒 Checking for security vulnerabilities..."
npm audit --audit-level=moderate > /tmp/health-audit.log 2>&1
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ No security vulnerabilities${NC}"
else
  echo -e "${RED}❌ Security vulnerabilities found${NC}"
  npm audit --audit-level=moderate
  FAILED=1
fi

echo ""
echo "=============================="

if [ $FAILED -eq 1 ]; then
  echo -e "${RED}❌ Health check failed!${NC}"
  echo ""
  echo "Review logs in /tmp/health-*.log"
  exit 1
else
  echo -e "${GREEN}✅ All health checks passed!${NC}"
  echo ""
  echo "🎉 System is healthy and ready for deployment"
fi

# Cleanup
rm -f /tmp/health-*.log
