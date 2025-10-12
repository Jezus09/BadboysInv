# 💾 Backup & Restore Rendszer

Ez a backup rendszer biztosítja, hogy soha ne vesszenek el az adatok az adatbázisból.

## 🚀 Gyors használat

```bash
# Backup készítése
npm run backup

# Legutóbbi backup visszaállítása
npm run restore

# Teljes adatbázis újra beállítása (shop + owner + backup)
npm run setup-db
```

## 📋 Részletes parancsok

### Backup készítése
```bash
npx tsx backup-database.ts
```
- Elmenti az összes shop item-et, rule-t és user-t
- Timestamp-pel ellátott fájl készül a `backups/` mappában
- Legutóbbi backup: `backups/latest-backup.json`

### Backup visszaállítása
```bash
# Legutóbbi backup visszaállítása
npx tsx restore-database.ts

# Konkrét backup visszaállítása
npx tsx restore-database.ts backups/backup-2025-10-10T19-30-49-808Z.json
```

### Teljes setup
```bash
npx tsx setup-complete-database.ts
```
Ez a parancs:
1. ✅ Backup készít a jelenlegi állapotról
2. ✅ Beállítja a Jézus accountot ownernek
3. ✅ Feltölti a shop-ot mind a 479 item-mel (39 kulcs + 440 láda)
4. ✅ Végső backup készít

## 📊 Mit mentenek a backup-ok

### Shop Items (479 db)
- 🔑 **39 kulcs** - Minden CS2 kulcs
- 📦 **44 fegyver láda** - Weapon Case-ek  
- 🏷️ **226 matrica kapszula** - Sticker Capsule-ok
- 🎨 **5 graffiti doboz** - Graffiti Box-ok
- 🏆 **141 souvenir láda** - Souvenir Case-ek
- 📋 **24 egyéb láda** - Más container-ek

### Rules (1 db)
- 👑 **ownerSteamId** - Owner Steam ID (Jézus account)

### Users
- 👥 Minden user adatai (csak backup, nem restore-olódnak automatikusan)

## 🔄 Automatikus mentés

A `setup-complete-database.ts` minden futáskor backup-ot készít, így sosem vesznek el az adatok.

## 📁 Backup fájlok

```
backups/
├── latest-backup.json              # Legutóbbi backup
├── backup-2025-10-10T19-30-49-808Z.json  # Timestamp backup
└── backup-2025-10-10T20-15-32-156Z.json  # Újabb backup
```

## ⚠️ Fontos tudnivalók

1. **User-ek** csak backup-olódnak, automatikusan nem állítódnak vissza (hogy ne legyenek ID konfliktusok)
2. **Shop item-ek** és **Rule-ok** teljesen visszaállítódnak
3. **Backup-ok** JSON formátumban tárolódnak, könnyen olvashatók
4. **Timestamp-ek** UTC időben vannak

## 🛠️ Hibakeresés

Ha valami probléma van:

```bash
# Ellenőrizd a backup tartalmát
cat backups/latest-backup.json

# Nézd meg mi van az adatbázisban
npx prisma studio

# Ha minden rossz, teljes reset:
npx prisma db push --force-reset
npm run setup-db
```

---

✅ **Most már sosem vesznek el az adatok!** 🎉