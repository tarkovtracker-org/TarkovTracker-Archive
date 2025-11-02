#!/bin/bash
# Firebase 12 Migration: Convert .exists property to .exists() method

set -e

echo "🔍 Firebase 12 Migration: Converting .exists property to .exists() method"
echo "============================================================================"
echo ""

# Backup directory
BACKUP_DIR=".upgrade-backups/firebase-exists-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📦 Creating backup in $BACKUP_DIR..."

# Find all TypeScript/JavaScript files with .exists usage
FILES=$(grep -rl "\.exists" functions/src --include="*.ts" --include="*.js" 2>/dev/null || true)

if [ -z "$FILES" ]; then
  echo "✅ No .exists usage found!"
  exit 0
fi

echo "📝 Found files with .exists usage:"
echo "$FILES" | while read file; do echo "  - $file"; done
echo ""

# Create backups
echo "$FILES" | while read file; do
  mkdir -p "$BACKUP_DIR/$(dirname "$file")"
  cp "$file" "$BACKUP_DIR/$file"
done

echo "✅ Backup complete!"
echo ""

echo "🔧 Applying migration..."
echo ""

# Counter for changes
TOTAL_CHANGES=0

# Process each file
echo "$FILES" | while read file; do
  if [ -f "$file" ]; then
    # Count occurrences before
    BEFORE=$(grep -c "\.exists[^(]" "$file" || true)

    if [ "$BEFORE" -gt 0 ]; then
      echo "📝 Processing: $file ($BEFORE occurrences)"

      # Perform replacement
      # Pattern explanation:
      # - Matches: snapshot.exists, doc.exists, userDoc.exists, etc.
      # - Excludes: .exists() (already a method call)
      # - Excludes: .exists; (likely end of statement)
      sed -i.bak \
        -e 's/\([a-zA-Z_][a-zA-Z0-9_]*\)\.exists\([^(a-zA-Z]\)/\1.exists()\2/g' \
        "$file"

      # Count occurrences after
      AFTER=$(grep -c "\.exists[^(]" "$file" || true)
      CHANGES=$((BEFORE - AFTER))
      TOTAL_CHANGES=$((TOTAL_CHANGES + CHANGES))

      echo "  ✅ Migrated $CHANGES usages"

      # Remove .bak file
      rm -f "${file}.bak"
    fi
  fi
done

echo ""
echo "✅ Migration complete!"
echo ""
echo "📊 Summary:"
echo "  - Total files processed: $(echo "$FILES" | wc -l)"
echo "  - Backup location: $BACKUP_DIR"
echo ""
echo "⚠️  IMPORTANT: Please review the changes carefully!"
echo ""
echo "🔍 Review changes with:"
echo "  git diff"
echo ""
echo "📋 Verify specific files:"
echo "  git diff functions/src/progress/progressHandler.ts"
echo "  git diff functions/src/services/ProgressService.ts"
echo "  git diff functions/src/services/TeamService.ts"
echo "  git diff functions/src/services/TokenService.ts"
echo ""
echo "✅ Test the changes with:"
echo "  npm run build:functions"
echo "  cd functions && npm test"
echo ""
echo "↩️  Rollback if needed:"
echo "  git checkout functions/"
echo "  # Or restore from backup: cp -r $BACKUP_DIR/functions/src/* functions/src/"
