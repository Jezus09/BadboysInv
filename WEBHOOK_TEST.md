# Webhook Teszt Útmutató

## Teszt Webhook.site-tal (Ajánlott!)

### 1. Készíts egy teszt endpoint-ot

1. Menj: https://webhook.site
2. **Másoldd ki** az egyedi URL-t (pl: `https://webhook.site/12345678-abcd-...`)

### 2. Állítsd be a Coolify-ban

Coolify → Environment Variables:
```
CS2_PLUGIN_WEBHOOK_URL=https://webhook.site/YOUR-UNIQUE-ID
```

⚠️ **Restart** a service-t!

### 3. Nyiss egy ládát a weboldalon

1. Menj: badboyscs2.site
2. Nyiss egy ládát

### 4. Nézd meg a webhook.site-ot

**Látnod kell 2 request-et:**

#### Request 1 - Case Opening:
```
POST /api/plugin/case-opened
{
  "PlayerName": "Jézus",
  "ItemName": "AK-47 | Redline",
  "Rarity": "Classified",
  "StatTrak": true
}
```

#### Request 2 (ha equippelsz is) - Inventory Refresh:
```
POST /api/plugin/refresh-inventory
{
  "SteamId": "76561199513508022"
}
```

---

## Teszt Coolify Log-okkal

### 1. Állítsd vissza az eredeti URL-t

Coolify → Environment Variables:
```
CS2_PLUGIN_WEBHOOK_URL=http://157.173.100.82:5005
```

### 2. Nyiss egy ládát

badboyscs2.site → Nyiss egy case-t

### 3. Nézd a Coolify log-okat

**Sikeres hívás:**
```
[CaseOpening] Successfully notified plugin - Jézus opened AK-47 | Redline
```

**Sikertelen hívás:**
```
[CaseOpening] Failed to notify plugin: ECONNREFUSED
```

**Nincs beállítva:**
```
[CaseOpening] CS2_PLUGIN_WEBHOOK_URL not configured, skipping webhook
```

---

## Teszt Browser Console-lal

1. Nyisd meg a weboldalat (F12 → Console)
2. Nyiss egy ládát
3. **Nem fogsz látni hibát** - a webhook háttérben fut

De ha van network error, akkor a server log-okban látszódik!

---

## ⚠️ FONTOS!

A webhook hívások **fire-and-forget** módban futnak:
- Nem lassítják a weboldalt
- Nem dobnak error-t a felhasználónak
- Csak a server log-okban látszódnak

Ezért a **legjobb teszt módszer**:
1. ✅ **webhook.site** - látod élőben mi megy ki
2. ✅ **Coolify logs** - látod a siker/hiba üzeneteket
3. ✅ **CS2 plugin logs** - látod mi érkezik be (ha hozzáférsz)
