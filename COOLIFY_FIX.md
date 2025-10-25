# 🔧 Coolify Build Fix

Ha a deployment hibát ad (`npm run build failed`), kövesd ezeket a lépéseket:

---

## 🐛 Hiba:
```
ERROR: failed to build: failed to solve:
process "/bin/bash -ol pipefail -c npm run build" did not complete successfully:
exit code: 1
```

---

## ✅ Megoldás 1: Használd a Dockerfile-t (AJÁNLOTT)

### Coolify-ban:

1. **Application → General → Build Pack**
   ```
   Változtasd: nixpacks → dockerfile
   ```

2. **Build Pack Settings:**
   ```
   Dockerfile Location: ./Dockerfile
   ```
   VAGY ha nem működik:
   ```
   Dockerfile Location: ./Dockerfile.coolify
   ```

3. **Environment Variables:**
   Győződj meg róla, hogy ezek be vannak állítva build time-ra is:
   ```bash
   DATABASE_URL=postgresql://...
   REDIS_URL=redis://...
   ```

4. **Save & Deploy**

---

## ✅ Megoldás 2: Nixpacks konfiguráció (ha ragaszkodsz Nixpacks-hez)

A projekt már tartalmazza a `nixpacks.toml` fájlt.

### Coolify-ban:

1. **Ellenőrizd:** Build Pack = `nixpacks`

2. **Build Command:** (ha nincs automatikusan)
   ```bash
   npx prisma generate && npm run build
   ```

3. **Start Command:**
   ```bash
   sh start.sh
   ```

4. **Deploy**

---

## ✅ Megoldás 3: Environment Variables Build Time-ra

Néhány környezeti változó szükséges build time alatt is:

### Coolify-ban: Environment Variables

**Kapcsold BE ezt a kapcsolót minden változónál:**
```
☑ Build Time
☑ Runtime
```

Különösen ennél a kettőnél:
- `DATABASE_URL`
- `SESSION_SECRET` (ha szükséges build-hez)

---

## 🔍 Debug: Nézd meg a pontos hibát

### Coolify Logs-ban keresd:

```bash
# TypeScript hiba:
error TS2307: Cannot find module

# Prisma hiba:
Error: Prisma schema not found

# Out of memory:
JavaScript heap out of memory

# Missing dependency:
Module not found
```

### Gyakori hibák és megoldásaik:

#### 1. **Prisma generation failed**
```bash
# Megoldás: Coolify Build Command-ban
npx prisma generate && npm run build
```

#### 2. **TypeScript errors**
```bash
# Lokálisan teszteld:
npm run build

# Ha lokálisan működik, de Coolify-ban nem:
# → Ellenőrizd a Node.js verziót (20 legyen)
```

#### 3. **Out of Memory**
```bash
# Coolify → Resources → Increase Memory
Minimum: 2GB RAM
Recommended: 4GB RAM
```

#### 4. **Missing environment variables**
```bash
# Coolify → Environment Variables
# Állítsd be build time-ra is!
```

---

## 📋 Ellenőrzőlista

- [ ] Build Pack = `dockerfile` VAGY `nixpacks.toml` létezik
- [ ] `start.sh` executable (chmod +x)
- [ ] `DATABASE_URL` beállítva (build + runtime)
- [ ] `REDIS_URL` beállítva (build + runtime)
- [ ] RAM minimum 2GB
- [ ] Node.js verzió: 20
- [ ] Git branch helyes (main vagy feature branch)

---

## 🚀 Dockerfile vs Nixpacks

### Használd **Dockerfile**-t ha:
- ✅ Teljes kontroll kell
- ✅ Reproducible builds kellenek
- ✅ Custom build steps vannak
- ✅ Multi-stage build optimalizáció

### Használd **Nixpacks**-et ha:
- ✅ Egyszerű Node.js app
- ✅ Nincs custom build logic
- ✅ Auto-detect elég
- ✅ `nixpacks.toml` konfigurálja

---

## 💡 Tipp: Build Logs elemzése

### Coolify-ban:

1. **Application → Deployments**
2. **Kattints a failed deployment-re**
3. **Logs** tab
4. **Keresd meg az első ERROR sort**

### Példa log elemzés:

```bash
# ❌ Ez a hiba:
npm error code ELIFECYCLE
npm error errno 1

# ✅ Ezt keresd előtte:
ERROR: TypeScript compilation failed
ERROR: Prisma Client generation failed
ERROR: Out of memory
```

---

## 🔄 Ha minden más elbukik: Clean Rebuild

### Coolify-ban:

1. **Application → Cleanup → Prune Builder Cache**
2. **Application → Cleanup → Delete Build Cache**
3. **Redeploy**

---

## 📞 Még mindig nem működik?

### Próbáld lokálisan Docker-rel:

```bash
# Build
docker build -t badboys-test -f Dockerfile.coolify .

# Run
docker run -p 5000:5000 \
  -e DATABASE_URL="postgresql://..." \
  -e REDIS_URL="redis://..." \
  -e SESSION_SECRET="test" \
  -e STEAM_API_KEY="test" \
  -e STEAM_CALLBACK_URL="http://localhost:5000/..." \
  badboys-test
```

Ha lokálisan működik, akkor a probléma Coolify konfigurációban van.

---

## ✅ Sikeres Build Jelei

Coolify Logs-ban keresd:
```
✓ Installing dependencies
✓ Prisma Client generated
✓ TypeScript compilation successful
✓ React Router build complete
✓ Docker image built successfully
✓ Container started
```

Akkor minden rendben! 🎉
