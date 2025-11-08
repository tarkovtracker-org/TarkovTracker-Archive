#!/bin/bash
# health-check.sh

echo "🏥 Post-Upgrade Health Check"
echo "=============================="

# 1. Build check
echo "📦 Building project..."
if npm run build; then
  echo "✅ Build successful"
else
  echo "❌ Build failed"
  exit 1
fi

# 2. Test check
echo "🧪 Running tests..."
if npm test -- --run; then
  echo "✅ Tests passing"
else
  echo "❌ Tests failing"
  exit 1
fi

# 3. Lint check
echo "🔍 Linting code..."
if npm run lint; then
  echo "✅ No lint errors"
else
  echo "⚠️  Lint warnings present"
fi

# 4. Type check
echo "📘 Type checking..."
if pushd frontend > /dev/null; then
  npm run type-check
  TYPE_EXIT_CODE=$?
  popd > /dev/null
  POPD_EXIT_CODE=$?
  if [ $POPD_EXIT_CODE -ne 0 ]; then
    echo "❌ Failed to return from frontend directory"
    exit 1
  fi
  if [ $TYPE_EXIT_CODE -eq 0 ]; then
    echo "✅ No type errors"
  else
    echo "❌ Type errors found"
    exit 1
  fi
else
  echo "❌ Unable to enter frontend directory"
  exit 1
fi

echo ""
echo "✅ Health check complete!"
