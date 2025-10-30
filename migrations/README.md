# Database Migrations

This directory contains database migration scripts for the BadboysInv application.

## K4System Setup

The K4System database stores CS2 server statistics including player stats, ranks, and playtime.

### Quick Setup

Run this script to automatically set up the K4System database:

```bash
# From the project root
bash migrations/setup-k4system.sh
```

### Manual Setup

If you prefer to run commands manually:

```bash
# 1. Find your PostgreSQL container name
docker ps | grep postgres

# 2. Create database
docker exec <CONTAINER_NAME> psql -U postgres -c "CREATE DATABASE k4system;"

# 3. Create user
docker exec <CONTAINER_NAME> psql -U postgres -c "CREATE USER k4user WITH PASSWORD 'Cristike3651!';"

# 4. Grant privileges
docker exec <CONTAINER_NAME> psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE k4system TO k4user;"

# 5. Run migration SQL
docker exec -i <CONTAINER_NAME> psql -U postgres -d k4system < migrations/k4system-setup.sql
```

### Database Structure

The K4System database includes the following tables:

- **k4_players** - Player basic information (steam_id, name, first/last seen)
- **k4_stats** - Combat statistics (kills, deaths, headshots, etc.)
- **k4_ranks** - Player ranks and points
- **k4_times** - Playtime and connection tracking
- **k4_vips** - VIP player management
- **k4_round_stats** - Per-round statistics

### Verify Setup

Check that all tables were created:

```bash
docker exec <CONTAINER_NAME> psql -U postgres -d k4system -c "\dt"
```

You should see 6 tables: k4_players, k4_stats, k4_ranks, k4_times, k4_vips, k4_round_stats

## Application Database

The main application database (`postgres` or `inventory`) is managed by Prisma.

### Add Missing Columns

If you need to add the `purchaseLimit` column to ShopItem:

```bash
docker exec <CONTAINER_NAME> psql -U postgres -d postgres -c 'ALTER TABLE "ShopItem" ADD COLUMN "purchaseLimit" INTEGER;'
```

### Prisma Migrations

For application schema changes, use Prisma:

```bash
# Push schema changes to database
npx prisma db push

# Generate Prisma client
npx prisma generate

# Create a new migration
npx prisma migrate dev --name your_migration_name
```

## Notes

- The K4System database is separate from the main application database
- K4System stats are populated by the CS2 server K4-System plugin
- The profile system queries both databases to display complete player information
