# BadBoys CS2 Rank System - Deployment Guide

## 📋 Overview

Complete rank system with XP progression, leaderboards, and admin management for your CS2 server.

---

## 🗄️ Database Setup

### 1. Run Prisma Migration

```bash
npx prisma migrate deploy
```

This will create:
- `player_stats` - Player statistics and ranks
- `ranks` - Rank definitions (19 ranks)
- `player_admins` - Admin permissions
- `player_bans` - Ban management
- `admin_logs` - Audit trail

### 2. Seed Default Ranks

```bash
npx tsx prisma/seed-ranks.ts
```

This creates 19 CS2-style ranks:
- Unranked (0-99 XP)
- Silver I-IV, Elite, Elite Master
- Gold Nova I-III, Master
- Master Guardian I, II, Elite, Distinguished
- Legendary Eagle, Eagle Master
- Supreme Master First Class
- Global Elite (40,000+ XP)

---

## 🔗 Database Connection

The system uses the same PostgreSQL database as your inventory system:

**Connection:**
- Host: `cgk8o48sg0s4sksw0ks84wkw`
- Port: `5432`
- Database: `postgres`
- User: `postgres`
- Password: `Cristike3651!`

Tables use `snake_case` naming (e.g., `player_stats`, `steam_id`)

---

## 🚀 API Endpoints

### Public Endpoints

```bash
# Get leaderboard
GET /api/leaderboard?type=rank&limit=100
# Types: rank, kills, kd

# Get player stats
GET /api/player/:steamid

# Get all ranks
GET /api/ranks
```

### Admin Endpoints (Requires Admin Permission)

```bash
# Check admin status
GET /api/admin/check/:steamid

# Get all players
GET /api/admin/rank-players?limit=1000

# Give XP to player
POST /api/admin/give-xp
Body: { steamId, xpAmount }

# Ban player
POST /api/admin/ban
Body: { steamId, reason, expiresAt? }

# Unban player
POST /api/admin/unban
Body: { steamId }

# Get active bans
GET /api/admin/bans

# Get admins
GET /api/admin/admins

# Add admin
POST /api/admin/admins
Body: { steamId, adminRole, flags }

# Get admin logs
GET /api/admin/logs?limit=100
```

---

## 🎮 CS2 Plugin Integration

Your CS2 plugin should call these endpoints:

### On Player Kill/Round End/etc:

```csharp
// Update player stats
POST https://inventory.badboyscs2.site/api/player/{steamid}/update-stats
{
  "kills": 150,
  "deaths": 100,
  "experience": 5000,
  "headshotPercentage": 45.5
}
```

### Check Admin Permissions:

```csharp
// Check if player is admin
GET https://inventory.badboyscs2.site/api/admin/check/{steamid}

Response:
{
  "success": true,
  "isAdmin": true,
  "admin": {
    "steamId": "76561198...",
    "adminRole": "admin",
    "flags": "ban,kick,mute",
    "isActive": true
  }
}
```

### Check Bans:

```csharp
// Check if player is banned
// Query player_bans table directly or use API
```

---

## 🌐 Frontend Pages

### 1. Leaderboard (`/leaderboard`)
- Top 100 players
- Filter by: Rank, Kills, K/D
- Real-time switching
- Medal icons for top 3

**URL:** `https://inventory.badboyscs2.site/leaderboard`

### 2. Ranks Info (`/ranks`)
- All 19 ranks displayed
- XP requirements
- Player counts
- How to earn XP guide

**URL:** `https://inventory.badboyscs2.site/ranks`

### 3. Admin Panel (`/admin/rank-management`)
- Player management (give XP, ban)
- Ban management (view, unban)
- Admin management (add/remove)
- Action logs

**URL:** `https://inventory.badboyscs2.site/admin/rank-management`

**Access:** Only for users with `isUserOwner()` permission

---

## 👤 Adding Your First Admin

### Method 1: Direct Database Insert

```sql
INSERT INTO player_admins (steam_id, admin_role, flags, is_active)
VALUES ('76561198...', 'superadmin', 'all', true);
```

### Method 2: Via API (after first admin)

```bash
POST /api/admin/admins
{
  "steamId": "76561198...",
  "adminRole": "admin",
  "flags": "ban,kick,mute,give_xp"
}
```

### Admin Roles:
- `moderator` - Basic moderation (mute, kick)
- `admin` - Full moderation (ban, give XP)
- `superadmin` - All permissions + admin management

---

## 🔄 XP System

### XP Sources (Configure in your plugin):

```
Kill: +10 XP
Headshot Kill: +15 XP
Round Win: +50 XP
MVP: +100 XP
Bomb Plant: +25 XP
Bomb Defuse: +25 XP
```

### Rank Progression Example:

```
0 XP → Unranked
100 XP → Silver I
2,000 XP → Silver Elite Master
8,300 XP → Master Guardian I
20,500 XP → Legendary Eagle
40,000+ XP → Global Elite
```

### K/D Ratio Calculation:

```typescript
kdRatio = deaths > 0 ? kills / deaths : kills
```

Auto-updates when stats are saved.

---

## 🛠️ Testing

### 1. Create Test Player

```bash
# Add test player stats
POST /api/admin/give-xp
{
  "steamId": "76561198012345678",
  "xpAmount": 5000
}
```

### 2. Check Leaderboard

```bash
curl https://inventory.badboyscs2.site/api/leaderboard?type=rank
```

### 3. Test Admin Panel

1. Add yourself as admin (see "Adding Your First Admin")
2. Visit `/admin/rank-management`
3. Try giving XP to a player
4. Try banning/unbanning

---

## 📊 Monitoring

### View Logs

```bash
# Admin action logs
GET /api/admin/logs?limit=50

# Database logs (optional)
docker logs <webapp-container> | grep "RankSystem"
```

### Player Stats

```bash
# Individual player
GET /api/player/76561198012345678

# Leaderboard
GET /api/leaderboard?type=kills&limit=10
```

---

## 🔒 Security

### Admin Permission Check

All admin endpoints use:
```typescript
const isAdmin = await isPlayerAdmin(steamId);
if (!isAdmin) throw unauthorized;
```

### Ban Check (Plugin side)

Your CS2 plugin should check bans on player connect:
```csharp
// Query player_bans table
bool isBanned = CheckPlayerBan(steamId);
if (isBanned) {
  KickPlayer("You are banned from this server");
}
```

---

## 🐛 Troubleshooting

### "No ranks found"
```bash
# Re-run seed script
npx tsx prisma/seed-ranks.ts
```

### "Admin endpoint returns 401"
```sql
-- Check admin exists
SELECT * FROM player_admins WHERE steam_id = '76561198...';

-- Check isActive = true
UPDATE player_admins SET is_active = true WHERE steam_id = '76561198...';
```

### "Players not showing in leaderboard"
```sql
-- Check if players exist
SELECT COUNT(*) FROM player_stats;

-- Check rank_id foreign key
SELECT ps.*, r.rank_name
FROM player_stats ps
LEFT JOIN ranks r ON ps.rank_id = r.id
WHERE r.id IS NULL;
```

### "Migration fails"
```bash
# Reset database (WARNING: deletes data)
npx prisma migrate reset

# Or manually drop tables
DROP TABLE IF EXISTS admin_logs, player_bans, player_admins, player_stats, ranks CASCADE;

# Re-run migration
npx prisma migrate deploy
```

---

## 📞 Support

If you encounter issues:

1. Check Prisma logs: `npx prisma studio`
2. Check API responses: `/api/leaderboard`, `/api/ranks`
3. Check database: `docker exec -it cgk8o48sg0s4sksw0ks84wkw psql -U postgres -d postgres`
4. Check webapp logs: `docker logs <container> --tail 100 | grep RankSystem`

---

## ✅ Deployment Checklist

- [ ] Run `npx prisma migrate deploy`
- [ ] Run `npx tsx prisma/seed-ranks.ts`
- [ ] Verify ranks exist: `SELECT * FROM ranks;`
- [ ] Add first admin to `player_admins` table
- [ ] Test leaderboard: `/leaderboard`
- [ ] Test ranks page: `/ranks`
- [ ] Test admin panel: `/admin/rank-management`
- [ ] Configure CS2 plugin to call APIs
- [ ] Test XP gain in-game
- [ ] Test ban system
- [ ] Monitor logs for errors

---

## 🎉 Done!

Your BadBoys CS2 Rank System is ready! Players will earn XP, climb ranks, and compete on the leaderboard!
