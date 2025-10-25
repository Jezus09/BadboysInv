# ⚡ Gyors Telepítés - 5 Lépés

## 1️⃣ Adatbázis és Redis (Coolify)

### PostgreSQL
```
Resources → New → Database → PostgreSQL
Név: badboys-db
```
**Jegyezd fel:**
- Username: `CS`
- Password: `(generált jelszó)`
- Internal hostname: `o0kcg4soo84...`
- Port: `5432`

### Redis
```
Resources → New → Database → Redis
Név: badboys-redis
```
**Jegyezd fel:**
- Internal hostname: `redis-badboys`
- Port: `6379`

---

## 2️⃣ Application (Coolify)

```
Resources → New → Application → Public Repository
```

**Repository URL:**
```
https://github.com/Jezus09/BadboysInv
```

**Branch:** `main`

**Port:** `5000`

### ⚠️ FONTOS: Build Pack Beállítás

**Application → General → Build Pack**
```
Válaszd: dockerfile (nem nixpacks!)
```

**Dockerfile Location:** `./Dockerfile`

❗ Ha nixpacks-et használsz, a build elbukhat! Lásd: `COOLIFY_FIX.md`

---

## 3️⃣ Environment Variables

**Application → Environment Variables → Bulk Edit**

Másold be és **CSERÉLD KI az értékeket**:

```bash
# === KÖTELEZŐ ===
SESSION_SECRET=your-random-32-char-string-here
STEAM_API_KEY=YOUR_STEAM_API_KEY
STEAM_CALLBACK_URL=https://YOUR-DOMAIN.com/sign-in/steam/callback

# Database - használd a Coolify által generált értékeket!
DATABASE_URL=postgresql://CS:PASSWORD@INTERNAL_HOSTNAME:5432/postgres

# Redis - használd a Redis service hostname-jét!
REDIS_URL=redis://REDIS_HOSTNAME:6379

# === OPCIONÁLIS ===
SOURCE_COMMIT=production
PLUGIN_API_KEY=badboys_secure_api_key_2025
```

### 🔑 Honnan szerezd be:

**SESSION_SECRET:**
```bash
openssl rand -base64 32
```

**STEAM_API_KEY:**
https://steamcommunity.com/dev/apikey

**DATABASE_URL példa:**
```
postgresql://CS:Cristike365%21@o0kcg4soo84sg8g4o4k8cwo4:5432/postgres
```
⚠️ Speciális karakterek: `!` → `%21`, `@` → `%40`, `#` → `%23`

**REDIS_URL példa:**
```
redis://redis-badboys:6379
```

---

## 4️⃣ Deploy

1. **Save** az environment variables-t
2. **Deploy** gombra kattintás
3. Várakozás 5-10 perc

**Logs követése:**
```
Application → Logs
```

**Sikeres build jelei:**
```
✓ Prisma migrations applied
✓ HTTP server listening on port 5000
✓ Redis connected
```

---

## 5️⃣ Domain és SSL

```
Application → Domains → Add Domain
```

**Domain:** `cs2badboysinv.yourdomain.com`

**SSL:** Automatic (Let's Encrypt)

**Frissítsd az environment variable-t:**
```bash
STEAM_CALLBACK_URL=https://cs2badboysinv.yourdomain.com/sign-in/steam/callback
```

**Redeploy** után készen is vagy!

---

## ✅ Tesztelés

1. **Nyisd meg:** `https://your-domain.com`
2. **Steam Login:** Kattints "Sign In"
3. **Admin Panel:** `https://your-domain.com/admin`

---

## 🐛 Ha valami nem működik

### Database connection error
```bash
# Ellenőrizd:
- DATABASE_URL formátum helyes-e
- PostgreSQL service fut-e (Coolify)
- Internal hostname-t használod (nem IP)
```

### Redis connection error
```bash
# Ellenőrizd:
- REDIS_URL helyes-e
- Redis service fut-e
- Internal hostname-t használod
```

### Steam redirect error
```bash
# Ellenőrizd:
- STEAM_CALLBACK_URL pontos-e
- HTTPS használata (nem HTTP)
- Domain elérhető-e
```

### Build fails
```bash
# Coolify Logs-ban nézd meg a hibát
# Gyakori okok:
- Hiányzó environment variable
- Prisma migration error
- Out of memory (növeld a RAM-ot)
```

---

## 📊 Hasznos Parancsok

### Container Terminal (Coolify → Terminal)

```bash
# Prisma status
npx prisma migrate status

# Database migráció
npx prisma migrate deploy

# UUID migration (ha van régi adat)
npx tsx scripts/migrate-inventory-to-uuid.ts
```

### PostgreSQL Terminal

```bash
# Táblák listázása
\dt

# Users ellenőrzés
SELECT COUNT(*) FROM "User";

# Items ellenőrzés
SELECT COUNT(*) FROM "ItemHistory";
```

---

## 🎉 Kész!

Az applikáció most már fut!

- **Frontend:** `https://your-domain.com`
- **Admin Panel:** `https://your-domain.com/admin`
- **Steam Login:** `https://your-domain.com/sign-in`

Részletes útmutató: `COOLIFY_DEPLOYMENT_GUIDE.md`
