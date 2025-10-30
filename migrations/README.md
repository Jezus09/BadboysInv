# Database Migrations

This directory contains **external** database migration scripts that are separate from the main Prisma migrations.

## Main Application Database (Prisma)

The main application database is managed by **Prisma**. All tables and schema changes are handled automatically via Prisma migrations located in `prisma/migrations/`.

### Automatic Setup

When deploying the application, Prisma automatically runs all migrations:

```bash
# This runs automatically on deployment
npx prisma migrate deploy
```

### Main Database Tables (Managed by Prisma)

- **User** - User accounts and authentication
- **ShopItem** - Shop items with purchaseLimit (added in migration 20251030)
- **CaseOpening** - Case opening history
- **Trade** - Trading system
- **MarketplaceListing** - Marketplace listings
- **ItemHistory** - Item tracking with UUIDs
- And many more...

## K4System Database (Separate - Manual Setup)

The K4System database stores **CS2 server statistics** and is **separate** from the main application.

### Why Separate?

- K4System data comes from the CS2 game server plugin
- Uses different database (k4system vs postgres/inventory)
- Can be on same PostgreSQL instance but different database
- Not managed by Prisma

### Quick Setup

Run this script to set up K4System database:

```bash
# From the project root
bash migrations/setup-k4system.sh
```

### Manual Setup

```bash
# 1. Find your PostgreSQL container
docker ps | grep postgres

# 2. Create database
docker exec <CONTAINER_NAME> psql -U postgres -c "CREATE DATABASE k4system;"

# 3. Create user
docker exec <CONTAINER_NAME> psql -U postgres -c "CREATE USER k4user WITH PASSWORD 'Cristike3651!';"

# 4. Grant privileges
docker exec <CONTAINER_NAME> psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE k4system TO k4user;"

# 5. Import tables
cat migrations/k4system-setup.sql | docker exec -i <CONTAINER_NAME> psql -U postgres -d k4system
```

### K4System Tables

- **k4_players** - Player information
- **k4_stats** - Combat statistics
- **k4_ranks** - Player ranks and points
- **k4_times** - Playtime tracking
- **k4_vips** - VIP management
- **k4_round_stats** - Per-round statistics

## Files in This Directory

- **k4system-setup.sql** - K4System database structure
- **setup-k4system.sh** - Automated K4System setup script
- **admin-panel-setup.sql** - ⚠️ DEPRECATED - Use Prisma migrations instead

## Deployment Checklist

When deploying to a new environment:

1. ✅ **Main Database** - Automatically handled by Prisma
   ```bash
   npx prisma migrate deploy
   ```

2. ✅ **K4System Database** - Manual setup required
   ```bash
   bash migrations/setup-k4system.sh
   ```

3. ✅ **Verify Setup**
   ```bash
   # Check main database
   docker exec <CONTAINER> psql -U postgres -d postgres -c "\dt"

   # Check K4System
   docker exec <CONTAINER> psql -U postgres -d k4system -c "\dt"
   ```

## Notes

- ✅ Main app database = Prisma handles everything automatically
- ⚠️ K4System database = Manual setup required (one-time)
- 🔄 The CS2 server plugin (K4-System) populates K4System tables automatically
- 🔗 Profile pages query both databases to show complete player info
