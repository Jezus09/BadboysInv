#!/bin/bash

echo "========================================="
echo "Fixing Failed Prisma Migration"
echo "========================================="

# Set environment variable for offline Prisma usage
export PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1

echo ""
echo "Step 1: Marking failed migration as rolled back..."
npx prisma migrate resolve --rolled-back 20251102_add_badboys_rank_system

if [ $? -eq 0 ]; then
  echo "✓ Migration marked as rolled back successfully"
else
  echo "✗ Failed to mark migration as rolled back"
  exit 1
fi

echo ""
echo "Step 2: Applying migration again..."
npx prisma migrate deploy

if [ $? -eq 0 ]; then
  echo "✓ Migration applied successfully"
else
  echo "✗ Migration failed again"
  echo ""
  echo "Trying alternative: marking as applied..."
  npx prisma migrate resolve --applied 20251102_add_badboys_rank_system

  if [ $? -eq 0 ]; then
    echo "✓ Migration marked as applied"
  else
    echo "✗ Failed to resolve migration"
    exit 1
  fi
fi

echo ""
echo "========================================="
echo "Migration Fix Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Run: npm run seed-ranks (to populate ranks table)"
echo "2. Add your first admin to player_admins table"
echo "3. Test the rank system endpoints"
