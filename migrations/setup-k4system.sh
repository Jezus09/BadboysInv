#!/bin/bash
# K4System Database Setup Script
# This script automates the creation of K4System database and tables

set -e  # Exit on error

echo "🚀 K4System Database Setup"
echo "=========================="
echo ""

# Find PostgreSQL container
POSTGRES_CONTAINER=$(docker ps --filter "ancestor=postgres" --format "{{.Names}}" | head -n 1)

if [ -z "$POSTGRES_CONTAINER" ]; then
    echo "❌ Error: PostgreSQL container not found!"
    echo "Make sure PostgreSQL is running in Docker."
    exit 1
fi

echo "✅ Found PostgreSQL container: $POSTGRES_CONTAINER"
echo ""

# Step 1: Create database
echo "📦 Step 1/4: Creating k4system database..."
docker exec $POSTGRES_CONTAINER psql -U postgres -c "CREATE DATABASE k4system;" 2>/dev/null || echo "   Database already exists, continuing..."

# Step 2: Create user
echo "👤 Step 2/4: Creating k4user..."
docker exec $POSTGRES_CONTAINER psql -U postgres -c "CREATE USER k4user WITH PASSWORD 'Cristike3651!';" 2>/dev/null || echo "   User already exists, continuing..."

# Step 3: Grant privileges
echo "🔐 Step 3/4: Granting privileges..."
docker exec $POSTGRES_CONTAINER psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE k4system TO k4user;"

# Step 4: Create tables
echo "📋 Step 4/4: Creating tables..."
docker exec -i $POSTGRES_CONTAINER psql -U postgres -d k4system < "$(dirname "$0")/k4system-setup.sql"

echo ""
echo "✅ K4System database setup completed successfully!"
echo ""

# Verify
echo "📊 Verifying tables..."
docker exec $POSTGRES_CONTAINER psql -U postgres -d k4system -c "\dt"

echo ""
echo "🎉 All done! K4System database is ready."
echo ""
echo "📝 Database Details:"
echo "   Database: k4system"
echo "   User: k4user"
echo "   Password: Cristike3651!"
echo "   Container: $POSTGRES_CONTAINER"
