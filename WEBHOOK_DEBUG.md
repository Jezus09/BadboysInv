# Webhook Debug Útmutató

## Ha a webhook-ok nem működnek, kövesd ezeket a lépéseket:

### 1. Ellenőrizd a környezeti változót

Coolify → Projekt → Environment Variables:
```
CS2_PLUGIN_WEBHOOK_URL=http://157.173.100.82:5005
```

### 2. Nézd meg a Coolify log-okat

Keress ilyen üzeneteket:
- `[CaseOpening] Successfully notified plugin` - MŰKÖDIK ✅
- `[CaseOpening] CS2_PLUGIN_WEBHOOK_URL not configured` - NINCS BEÁLLÍTVA ❌
- `[CaseOpening] Failed to notify plugin` - HIBA A KAPCSOLATBAN ❌

### 3. Teszteld kézzel a webhook-ot

Curl parancs a production szerverről:
```bash
curl -X POST http://157.173.100.82:5005/api/plugin/case-opened \
  -H "Content-Type: application/json" \
  -d '{
    "PlayerName": "TestPlayer",
    "ItemName": "AK-47 | Redline",
    "Rarity": "Classified",
    "StatTrak": true
  }'
```

### 4. Ellenőrizd a CS2 plugin oldalt

- Plugin fut? ✅
- 5005-ös port nyitva? ✅
- Webhook endpoint-ok működnek? ✅

### 5. Webhook payload-ok

#### Case Opening:
```json
{
  "PlayerName": "Jézus",
  "ItemName": "AK-47 | Redline",
  "Rarity": "Classified",
  "StatTrak": true
}
```

#### Inventory Refresh:
```json
{
  "SteamId": "76561199513508022"
}
```

### 6. Rarity mappings

A rendszer automatikusan konvertálja:
- "contraband" → "Contraband"
- "covert" → "Covert"
- "classified" → "Classified"
- "restricted" → "Restricted"
- "mil-spec" → "Mil-Spec"
- "industrial" → "Industrial"
- "consumer" → "Consumer"

### 7. Mikor hívódnak meg a webhook-ok?

**Inventory Refresh:**
- Amikor EQUIPPELSZ egy skint
- Amikor UNEQUIPPELSZ egy skint

**Case Opening Broadcast:**
- Amikor NYITSZ egy ládát (azonnal, amikor az item kiderül)

---

## Támogatás

Ha továbbra sem működik, küldd el:
1. Coolify deployment log-okat
2. Browser console hibákat (F12 → Console)
3. CS2 plugin log-okat
