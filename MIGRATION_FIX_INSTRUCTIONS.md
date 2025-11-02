# Fix Failed Migration - Instructions

## Problem
The migration `20251102_add_badboys_rank_system` started but failed during execution. This is preventing new migrations from being applied (Prisma Error P3009).

## Solution Options

### Option 1: Mark as Rolled Back (Recommended)
This tells Prisma the migration failed and needs to be re-applied.

```bash
# Run this command in your environment
npx prisma migrate resolve --rolled-back 20251102_add_badboys_rank_system

# Then try deploying again
npx prisma migrate deploy
```

### Option 2: Mark as Applied (If tables were actually created)
If the migration partially succeeded and created the tables, mark it as applied.

```bash
# First, check if tables exist in your database
# Then mark as applied:
npx prisma migrate resolve --applied 20251102_add_badboys_rank_system
```

### Option 3: Manual Database Reset (Nuclear option)
If nothing else works, you can manually drop the tables and retry:

```bash
# Connect to your PostgreSQL database
docker exec -it cgk8o48sg0s4sksw0ks84wkw psql -U postgres -d postgres

# In psql, run:
DROP TABLE IF EXISTS admin_logs CASCADE;
DROP TABLE IF EXISTS player_bans CASCADE;
DROP TABLE IF EXISTS player_admins CASCADE;
DROP TABLE IF EXISTS player_stats CASCADE;
DROP TABLE IF EXISTS ranks CASCADE;
\q

# Then mark migration as rolled back
npx prisma migrate resolve --rolled-back 20251102_add_badboys_rank_system

# And deploy again
npx prisma migrate deploy
```

## After Migration is Fixed

### 1. Seed the Ranks Table
```bash
npm run seed-ranks
```

This will populate the `ranks` table with the 19 CS2 competitive ranks.

### 2. Add Your First Admin
You need to manually add at least one admin to access the admin panel.

```bash
docker exec -it cgk8o48sg0s4sksw0ks84wkw psql -U postgres -d postgres

# In psql, run (replace with your Steam ID):
INSERT INTO player_admins (steam_id, admin_role, flags, is_active, created_at, updated_at)
VALUES ('YOUR_STEAM_ID_HERE', 'Super Admin', 'all', true, NOW(), NOW());
\q
```

### 3. Test the System
After successful migration and seeding:

1. **Test Leaderboard Page**: Visit `https://inventory.badboyscs2.site/leaderboard`
2. **Test Ranks Page**: Visit `https://inventory.badboyscs2.site/ranks`
3. **Test Admin Panel**: Visit `https://inventory.badboyscs2.site/admin/rank-management`

### 4. Test API Endpoints

```bash
# Public endpoints (should work without auth)
curl https://inventory.badboyscs2.site/api/leaderboard
curl https://inventory.badboyscs2.site/api/ranks
curl https://inventory.badboyscs2.site/api/player/STEAM_0:1:123456789

# Admin endpoints (requires admin auth)
# You need to be logged in as an admin via Steam
curl https://inventory.badboyscs2.site/api/admin/bans
curl https://inventory.badboyscs2.site/api/admin/admins
```

## Verify Migration Success

Run this to check migration status:
```bash
npx prisma migrate status
```

You should see all migrations as "Applied" with no warnings.

## Tables Created by This Migration

The migration creates these 5 tables:
- `ranks` - 19 CS2 competitive ranks
- `player_stats` - Player statistics and XP
- `player_admins` - Admin permissions
- `player_bans` - Ban management
- `admin_logs` - Audit trail for admin actions

## Need Help?

If you're still having issues:
1. Check the PostgreSQL logs: `docker logs cgk8o48sg0s4sksw0ks84wkw`
2. Verify database connection in `.env` file
3. Make sure the `postgres` database exists
4. Check if there are permission issues
