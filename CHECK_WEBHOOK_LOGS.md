# Webhook Log Ellenőrzési Útmutató

## 1. Coolify Runtime Logs ellenőrzése

### Hol találod?
```
Coolify Dashboard
  → BadboysInv projekt
    → Deployments
      → Latest Deployment
        → Runtime Logs (vagy Application Logs)
```

### Mit keress? (CTRL+F)

#### ✅ SIKERES webhook hívások:

**Case Opening:**
```
[CaseOpening] Successfully notified plugin - Jézus opened XM1014 | Black Tie
```

**Inventory Refresh:**
```
[InventorySync] Successfully notified plugin for SteamId 76561199513508022
```

#### ❌ HIBA üzenetek:

**Nincs beállítva:**
```
[CaseOpening] CS2_PLUGIN_WEBHOOK_URL not configured, skipping webhook
[InventorySync] CS2_PLUGIN_WEBHOOK_URL not configured, skipping webhook
```

**Kapcsolódási hiba:**
```
[CaseOpening] Failed to notify plugin: fetch failed
[CaseOpening] Plugin webhook returned status 500
[InventorySync] Failed to notify plugin: ECONNREFUSED
```

---

## 2. Ha NEM LÁTOD a log üzeneteket

### Ellenőrizd a környezeti változót:

```
Coolify → BadboysInv → Settings → Environment Variables

Név: CS2_PLUGIN_WEBHOOK_URL
Érték: http://157.173.100.82:5005
```

Ha most adtad hozzá → **RESTART** a service-t!

---

## 3. Log időbélyegek

A log üzenetek AZONNAL megjelennek amikor:
- ✅ Nyitsz egy ládát → `[CaseOpening] ...`
- ✅ Equippelsz/unequippelsz → `[InventorySync] ...`

Keresd az időbélyeget amikor nyitottad a ládát!

---

## 4. Példa log kimenet

```
2025-10-21 12:34:56 POST /api/action/unlock-case 200 - - 101.706 ms
2025-10-21 12:34:56 [CaseOpening] Successfully notified plugin - Jézus opened AK-47 | Redline
```

vagy

```
2025-10-21 12:35:10 POST /api/action/sync 200 - - 85.234 ms
2025-10-21 12:35:10 [InventorySync] Successfully notified plugin for SteamId 76561199513508022
```

---

## 5. Webhook payload-ok a logban

**NEM** fogsz látni payload részleteket a standard logban (biztonsági okok miatt).

Ha látni szeretnéd a pontos payload-okat:

### Használj webhook.site-ot:

1. Menj: https://webhook.site
2. Másold ki az URL-t
3. Coolify → Environment Variables:
   ```
   CS2_PLUGIN_WEBHOOK_URL=https://webhook.site/YOUR-UNIQUE-ID
   ```
4. Restart service
5. Nyiss egy ládát
6. Nézd meg webhook.site-on ÉLŐBEN!

---

## 6. Debug információk

**Webhook hívás időzítése:**
- Case opening: **AZONNAL** amikor a láda kinyílik
- Inventory refresh: **AZONNAL** amikor equippelsz/unequippelsz

**Fire-and-forget mód:**
- A webhook hívások háttérben futnak
- NEM lassítják a weboldalt
- NEM dobnak hibát a felhasználónak

**Log szintek:**
- `Successfully notified plugin` = ✅ SIKER
- `CS2_PLUGIN_WEBHOOK_URL not configured` = ⚠️ Nincs beállítva
- `Failed to notify plugin` = ❌ HIBA

---

## 7. Támogatott Rarity értékek

A rendszer automatikusan konvertálja:
```
"contraband" → "Contraband"
"covert" → "Covert"
"classified" → "Classified"
"restricted" → "Restricted"
"mil-spec" → "Mil-Spec"
"industrial" → "Industrial"
"consumer" → "Consumer"
```

---

## 8. Gyakori problémák

### ❌ "CS2_PLUGIN_WEBHOOK_URL not configured"
**Megoldás:** Állítsd be a környezeti változót és restart-old a service-t

### ❌ "Failed to notify plugin: fetch failed"
**Megoldás:** Ellenőrizd hogy a CS2 plugin szerver fut-e (157.173.100.82:5005)

### ❌ "Plugin webhook returned status 403"
**Megoldás:** A plugin nem fogadja el az IP címed (whitelist probléma)

### ✅ Nincs log üzenet
**Megoldás:** Lehet hogy a console.log nem jelenik meg → használj webhook.site-ot

---

## 9. Gyors teszt

Nyiss 1 ládát, majd keress a logban:
```
CTRL+F: "Successfully notified"
```

Ha megvan → **MŰKÖDIK** ✅
Ha nincs → Ellenőrizd a környezeti változót!
