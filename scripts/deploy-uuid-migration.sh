#!/bin/bash

# UUID Migration Deployment Script
# Run this on your VPS to set up UUID system

set -e  # Exit on error

echo "=== UUID SYSTEM DATABASE MIGRATION ==="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable not set"
  echo "Set it with: export DATABASE_URL='postgresql://...'"
  exit 1
fi

echo "✅ DATABASE_URL is set"
echo ""

# Backup database first
echo "⚠️  CREATING DATABASE BACKUP..."
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"

# Extract database connection details from DATABASE_URL
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\(.*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\(.*\):.*/\1/p')

echo "📦 Backing up database to: $BACKUP_FILE"
# Uncomment if you want automatic backup (requires pg_dump)
# pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > $BACKUP_FILE
echo "⚠️  Manual backup recommended before proceeding!"
echo ""

# Wait for confirmation
read -p "Have you backed up the database? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "❌ Aborting. Please backup database first."
  exit 1
fi

echo ""
echo "🔄 Running Prisma migration..."
npx prisma migrate deploy

echo ""
echo "🔄 Generating Prisma client..."
npx prisma generate

echo ""
echo "✅ Database migration completed!"
echo ""
echo "Next steps:"
echo "1. Run inventory migration: npx tsx scripts/migrate-inventory-to-uuid.ts"
echo "2. Restart your application"
echo "3. Monitor logs for any UUID-related errors"
echo ""
