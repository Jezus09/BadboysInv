# 🚀 Coolify Deployment Guide - BadboysInv CS2 Inventory

Teljes telepítési útmutató az új VPS-hez Coolify-val.

---

## 📋 Előfeltételek

✅ VPS szerver Coolify-val
✅ PostgreSQL adatbázis létrehozva
✅ Redis service létrehozva
✅ Git repository elérés
✅ Steam API key

---

## 🗄️ 1. Adatbázis és Redis Beállítása

### PostgreSQL Adatbázis

Coolify-ban:
1. **"Resources" → "New" → "Database" → "PostgreSQL"**
2. Jegyezd fel:
   - **Database name:** `postgres` (vagy amit választottál)
   - **Username:** pl. `CS`
   - **Password:** generált jelszó
   - **Internal hostname:** pl. `o0kcg4soo84sg8g4o4k8cwo4`
   - **Port:** `5432`

📝 **DATABASE_URL formátum:**
```
postgresql://USERNAME:PASSWORD@HOSTNAME:5432/DATABASE_NAME
```

**Példa:**
```
postgresql://CS:Cristike365%21@o0kcg4soo84sg8g4o4k8cwo4:5432/postgres
```

⚠️ **Fontos:** Ha a jelszóban speciális karakterek vannak (`!`, `@`, `#` stb.), URL-kódold őket:
- `!` → `%21`
- `@` → `%40`
- `#` → `%23`

### Redis

Coolify-ban:
1. **"Resources" → "New" → "Database" → "Redis"**
2. Jegyezd fel:
   - **Internal hostname:** pl. `redis-hostname`
   - **Port:** `6379`

📝 **REDIS_URL formátum:**
```
redis://HOSTNAME:6379
```

**Példa:**
```
redis://redis-badboys:6379
```

---

## 🔧 2. Application Létrehozása Coolify-ban

### GitHub Repository Összekapcsolása

1. **"Resources" → "New" → "Application" → "Public Repository"**
2. **Repository URL:**
   ```
   https://github.com/Jezus09/BadboysInv
   ```
3. **Branch:** `main` (vagy `claude/update-text-011CUNtzu1gPyYT1nMPaNi8H`)
4. **Build Pack:** `nixpacks` (auto-detect)

### Build Settings

Coolify automatikusan észleli:
- ✅ `Dockerfile` → multi-stage build
- ✅ `package.json` → Node.js app
- ✅ `prisma/schema.prisma` → Prisma migrations

**Port:** `5000` (default Node.js port)

---

## 🔐 3. Environment Variables Beállítása

Coolify-ban: **Application → Environment Variables**

### 🔴 KÖTELEZŐ változók:

```bash
# ===== Session & Security =====
SESSION_SECRET=your-super-secret-random-string-min-32-chars
# Generálás: openssl rand -base64 32

# ===== Steam API =====
STEAM_API_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
# Szerezd be: https://steamcommunity.com/dev/apikey
STEAM_CALLBACK_URL=https://your-domain.com/sign-in/steam/callback
# Helyettesítsd be a saját domain-edet!

# ===== Database (PostgreSQL) =====
DATABASE_URL=postgresql://CS:Cristike365%21@o0kcg4soo84sg8g4o4k8cwo4:5432/postgres
# Használd a Coolify által generált értékeket!

# ===== Redis Cache =====
REDIS_URL=redis://redis-badboys:6379
# Használd a Redis service internal hostname-jét!
```

### ⚙️ OPCIONÁLIS változók:

```bash
# ===== CS2 Server Integration (ha van CS2 szerver) =====
CS2_SERVER_IP=157.173.100.82
CS2_SERVER_PORT=27015
CS2_RCON_PASSWORD=your-rcon-password
CS2_SERVER_NAME=BadBoys CS2 Server
CS2_PLUGIN_WEBHOOK_URL=http://157.173.100.82:5005

# ===== Build & Analytics =====
SOURCE_COMMIT=production
ASSETS_BASE_URL=
CLOUDFLARE_ANALYTICS_TOKEN=

# ===== Plugin API Security =====
PLUGIN_API_KEY=badboys_secure_api_key_2025
# Változtasd meg biztonsági okokból!
```

---

## 🏗️ 4. Build és Deploy

### Első Deploy

1. **Mentsd el az environment variables-t**
2. **Kattints: "Deploy"**
3. **Várd meg a build-et** (5-10 perc):
   ```
   [1] Installing dependencies...
   [2] Running Prisma generate...
   [3] Building React Router app...
   [4] Creating Docker image...
   [5] Starting container...
   ```

### Build Hibák Javítása

Ha a build elakad:

**Prisma Error (403 Forbidden):**
```bash
# Lokálisan futtasd:
npm run build
```

**TypeScript Errors:**
```bash
# Ellenőrizd a típusokat:
npx tsc --noEmit
```

**Out of Memory:**
- Növeld a RAM-ot Coolify-ban (min 2GB javasolt)

---

## 🔍 5. Deployment Ellenőrzése

### Health Check

1. **Nyisd meg:** `https://your-domain.com`
2. **Ellenőrizd:**
   - ✅ Főoldal betöltődik
   - ✅ Steam login működik
   - ✅ Inventory látható

### Logs Ellenőrzés

Coolify-ban: **Application → Logs**

**Sikeres indítás jelei:**
```
[Prisma] Migrations applied successfully
[Server] HTTP server listening on port 5000
[Redis] Connected to Redis cache
```

**Hibák keresése:**
```bash
# Adatbázis kapcsolat hiba:
Error: connect ECONNREFUSED

# Redis hiba:
Redis connection failed

# Prisma migration hiba:
Migration failed
```

---

## 🗃️ 6. Adatbázis Migráció

A `start.sh` automatikusan futtatja:
```bash
npx prisma migrate deploy
```

### Manuális Migráció (ha szükséges)

Coolify-ban nyiss egy **Web Terminal**-t:

```bash
# Belépés a container-be
cd /app

# Prisma status ellenőrzés
npx prisma migrate status

# Migráció futtatása
npx prisma migrate deploy

# Prisma Studio (ha kell debug)
npx prisma studio
```

### Táblák Ellenőrzése

PostgreSQL Web Terminal-ban (Coolify):
```sql
-- Összes tábla listázása
\dt

-- User tábla ellenőrzés
SELECT id, name FROM "User" LIMIT 5;

-- ItemHistory tábla (UUID rendszer)
SELECT COUNT(*) FROM "ItemHistory";
```

---

## 🔄 7. UUID Tracking System Setup

Az UUID rendszer automatikusan beállításra kerül a migrációkkal.

### Meglévő Inventory Migráció

Ha már van adat az adatbázisban, futtasd a migration scriptet:

```bash
# Container terminál
cd /app
npx tsx scripts/migrate-inventory-to-uuid.ts
```

**Output:**
```
Found 2 users
  - mta200209: 4 items
  - Jézus: 50 items
✅ Migrated 54 items successfully!
```

---

## 🌐 8. Domain Beállítása

### Coolify Domain

1. **Application → Domains**
2. **Add Domain:** `cs2badboysinv.yourdomain.com`
3. **SSL Certificate:** Automatic (Let's Encrypt)
4. **Update Environment:**
   ```bash
   STEAM_CALLBACK_URL=https://cs2badboysinv.yourdomain.com/sign-in/steam/callback
   ```

### DNS Beállítás

Domain registrar-nél (pl. Cloudflare):
```
Type: A
Name: cs2badboysinv
Value: YOUR_VPS_IP
Proxy: ✅ Enabled (ha Cloudflare)
```

---

## 🧪 9. Tesztelés

### Funkciók Tesztelése

1. **✅ Steam Login**
   - Kattints "Sign In" gombra
   - Steam authentication átirányítás
   - Sikeres visszatérés

2. **✅ Inventory**
   - Case opening működik
   - Drop system működik
   - Items megjelennek

3. **✅ Shop**
   - Items vásárolhatók
   - Coins levonódnak

4. **✅ Marketplace**
   - Listing létrehozás
   - Vásárlás működik

5. **✅ Trades**
   - Trade offer küldése
   - Trade elfogadása

6. **✅ Admin Panel** (owner-ként)
   - `/admin` elérhető
   - UUID tracking látható
   - Statistics betöltődnek

---

## 🐛 10. Hibaelhárítás

### Application nem indul

**Logs-ban:**
```
Error: Cannot connect to database
```

**Megoldás:**
1. Ellenőrizd a `DATABASE_URL` formátumot
2. Teszteld a connection-t:
   ```bash
   psql "postgresql://CS:password@hostname:5432/postgres"
   ```

### Redis Connection Failed

**Logs-ban:**
```
Redis connection timeout
```

**Megoldás:**
1. Ellenőrizd a `REDIS_URL`-t
2. Nézd meg a Redis service status-ét Coolify-ban
3. Internal hostname használata (nem IP)

### Prisma Migration Error

**Logs-ban:**
```
Migration `20240101_initial` failed
```

**Megoldás:**
```bash
# Container terminal
npx prisma migrate reset --force
npx prisma migrate deploy
```

### Steam Login Redirect Error

**Hiba:**
```
Invalid return_to URL
```

**Megoldás:**
1. Ellenőrizd a `STEAM_CALLBACK_URL`-t
2. HTTPS használata (nem HTTP)
3. Steam API key érvényessége

---

## 📊 11. Monitorozás

### Coolify Dashboard

- **CPU Usage:** <70% normál működésnél
- **Memory:** 1-2GB tipikusan
- **Disk:** Build után ~500MB

### Application Logs

**Fontos log üzenetek:**
```bash
# Sikeres startup
[Server] Listening on 0.0.0.0:5000

# Database kapcsolat
[Prisma] Connected to database

# Redis kapcsolat
[Redis] Cache connected

# UUID tracking
[UUID] ItemHistory table initialized
```

### Performance

**Válaszidők:**
- Főoldal: <500ms
- API endpoints: <200ms
- Database queries: <100ms

---

## 🔄 12. Frissítések és Újratelepítés

### Automatic Deployment

Ha GitHub-ot használsz:
1. Push a main branch-re
2. Coolify automatikusan rebuild
3. Új verzió deploy

### Manual Deployment

Coolify-ban:
1. **Application → "Deploy"**
2. Latest commit-ot használja
3. Zero-downtime deployment

### Rollback

Ha valami elromlik:
1. **Application → "Deployments"**
2. Válassz egy korábbi successful deployment-et
3. **"Redeploy"**

---

## 📞 Támogatás

### Hasznos Parancsok

```bash
# Container terminal megnyitása (Coolify)
docker exec -it container_name sh

# Logs követése
docker logs -f container_name

# Database backup
docker exec container_name pg_dump -U username database > backup.sql

# Redis flush (vigyázat!)
docker exec redis-container redis-cli FLUSHALL
```

### Debug Mode

```bash
# Node.js verbose logging
NODE_ENV=development npm start

# Prisma debug
DEBUG=prisma:* npx prisma migrate deploy
```

---

## ✅ Sikeres Telepítés Checklist

- [ ] PostgreSQL adatbázis létrehozva
- [ ] Redis service létrehozva
- [ ] GitHub repository összekapcsolva
- [ ] Environment variables beállítva
- [ ] Első build sikeres
- [ ] Application elérhető domain-en
- [ ] Steam login működik
- [ ] UUID tracking aktív
- [ ] Admin panel elérhető
- [ ] Backup stratégia beállítva

---

## 🎉 Kész!

Most már működik a CS2 Inventory Simulator az új VPS-en!

**Admin Panel:** `https://your-domain.com/admin`
**Steam Login:** `https://your-domain.com/sign-in`

További kérdések esetén nézd meg:
- `DEPLOYMENT.md` - Általános deployment útmutató
- `DEPLOY_UUID_QUICK.md` - UUID rendszer telepítése
- Coolify docs: https://coolify.io/docs
