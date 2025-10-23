# UUID Rendszer Gyors Deploy - VPS

## 🚨 FONTOS: Backup először!

```bash
# PostgreSQL backup
pg_dump -h <host> -U <user> -d <database> > backup_$(date +%Y%m%d).sql
```

---

## 📋 Lépések (Coolify VPS)

### 1. Push a branch-et
```bash
git push origin claude/uuid-system-011CUNtzu1gPyYT1nMPaNi8H
```

### 2. Coolify-ban deploy az új branch-et

**Coolify UI-ban:**
1. Menj a projekt settings-be
2. Változtasd a branch-et: `claude/uuid-system-011CUNtzu1gPyYT1nMPaNi8H`
3. Deploy

### 3. Futtasd a database migration-t

**Coolify terminal-ban vagy SSH-val:**

```bash
# Lépj be a container-be
docker exec -it <container_name> bash

# Vagy ha Coolify UI terminal:
# Csak írj be terminálban

# Set DATABASE_URL ha nincs (általában már be van állítva)
# export DATABASE_URL="postgresql://..."

# Futtasd a migration-t
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Kilépés
exit
```

### 4. Futtasd az inventory migration-t

**⚠️ Ez konvertálja az összes meglévő itemet UUID-ra**

```bash
# Container-ben:
npx tsx scripts/migrate-inventory-to-uuid.ts
```

**Output példa:**
```
=== STARTING INVENTORY UUID MIGRATION ===
Found 15 users to process

Processing user: Player1 (STEAM_ID)
  📦 Found 125 items
  🔄 Migrating 125 items...
  ✅ Migrated 125 items successfully

...

=== MIGRATION COMPLETE ===
✅ Migrated users: 15/15
✅ Total items migrated: 1847
❌ Errors: 0
```

### 5. Restart az alkalmazást

```bash
# Coolify UI-ban vagy:
docker restart <container_name>
```

### 6. Ellenőrzés

```bash
# Nézd meg a database-t
npx prisma studio

# Vagy SQL-lel:
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"ItemHistory\";"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"ItemTransfer\";"
```

---

## 🐛 Ha valami elromlik

### Rollback:

1. **Stop alkalmazás**
```bash
docker stop <container_name>
```

2. **Restore backup**
```bash
psql $DATABASE_URL < backup_20250123.sql
```

3. **Switch branch vissza**
```bash
# Coolify UI-ban:
# Branch: claude/webupload-debug-011CUNtzu1gPyYT1nMPaNi8H
```

4. **Deploy régi branch**

---

## 📊 Monitoring után

**Nézd meg a logokat:**
```bash
docker logs -f <container_name>
```

**Keress UUID-val kapcsolatos hibákat:**
```bash
docker logs <container_name> 2>&1 | grep -i "uuid\|itemhistory"
```

---

## ⚡ Gyors parancsok (1-liner)

### Full migration (ha minden környezeti változó be van állítva):
```bash
npx prisma migrate deploy && npx prisma generate && npx tsx scripts/migrate-inventory-to-uuid.ts
```

### Ellenőrzés:
```bash
echo "ItemHistory count:" && psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM \"ItemHistory\";" && echo "ItemTransfer count:" && psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM \"ItemTransfer\";"
```

---

## 🎯 Következő lépések után

A migration után még **nem működik** minden automatikusan!

**Még hátra van:**
- Item creation endpoints átírása (case opening, shop, etc.)
- Trade frontend UUID küldés
- Marketplace frontend UUID küldés
- Trade Up UUID implementáció

Lásd: `UUID_IMPLEMENTATION_STATUS.md`

---

## 💡 Tippek

1. **Teszteld staging-en először** ha van
2. **Csúcsidőn kívül** futtasd (kevesebb user)
3. **Backup mindig** migration előtt
4. **Monitor logs** deployment után
5. **Rollback plan** legyen kéznél

---

## 📞 Support

Ha bármi probléma, nézd meg:
- `UUID_MIGRATION_GUIDE.md` - részletes útmutató
- `UUID_IMPLEMENTATION_STATUS.md` - mi van kész, mi van hátra
- Logs: `docker logs <container_name>`
