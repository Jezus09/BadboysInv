# UUID Migration Guide

## Overview

This guide explains how to migrate the inventory system from local UID-based items to globally unique UUID-based items.

## Benefits

- **Simpler Code**: No need for property matching in trades/marketplace
- **Item History**: Track who created/owned each item
- **Anti-Duplication**: Impossible to have UUID collisions
- **Better Security**: Precise item references

## Migration Steps

### 1. Run Database Migration

```bash
npx prisma migrate dev --name add_item_tracking_tables
```

This creates the `ItemHistory` and `ItemTransfer` tables.

### 2. Generate Prisma Client

```bash
npx prisma generate
```

### 3. Run Inventory Migration Script

**⚠️ BACKUP DATABASE FIRST!**

```bash
npx tsx scripts/migrate-inventory-to-uuid.ts
```

This script:
- Scans all users' inventories
- Generates UUIDs for each item
- Creates ItemHistory records
- Updates inventory structure to use UUIDs as keys

### 4. Deploy Code Changes

After migration completes successfully:
1. Deploy the new code with UUID support
2. All new items will automatically use UUIDs
3. Old items will have UUIDs from migration

## Inventory Structure Changes

### Before (UID-based):
```json
{
  "items": {
    "5": { "id": 7, "wear": 0.234 },
    "12": { "id": 7, "wear": 0.456 }
  }
}
```

### After (UUID-based):
```json
{
  "items": {
    "abc-123-def-456": { "uuid": "abc-123-def-456", "id": 7, "wear": 0.234 },
    "xyz-789-ghi-012": { "uuid": "xyz-789-ghi-012", "id": 7, "wear": 0.456 }
  }
}
```

## Code Changes

### Trade System

**Before**: Property matching to find items
```typescript
const item = inventory.items.find(i =>
  i.id === targetItem.id &&
  Math.abs(i.wear - targetItem.wear) < 0.0001
);
```

**After**: Direct UUID lookup
```typescript
const item = inventory.items[uuid];
```

### Marketplace System

**Before**: Delete item from seller, create new item for buyer
```typescript
delete sellerInventory.items[uid];
const newUid = getNextUID(buyerInventory);
buyerInventory.items[newUid] = item;
```

**After**: Transfer item with same UUID
```typescript
delete sellerInventory.items[uuid];
buyerInventory.items[uuid] = item;
await transferItem({ itemUuid: uuid, fromUser: sellerId, toUser: buyerId });
```

## Item History Tracking

Every item now has a complete history:

```typescript
// Get item history
const history = await getItemHistory(uuid);

// history.transfers contains all ownership changes:
// - INITIAL_CREATE: When item was first created
// - TRADE: Transferred via trade system
// - MARKETPLACE_SELL: Listed on marketplace
// - MARKETPLACE_BUY: Purchased from marketplace
// - TRADEUP_CONSUME: Used in trade-up contract
// - TRADEUP_REWARD: Received from trade-up
```

## API Endpoints

### Get Item History
```typescript
GET /api/item-history?uuid=abc-123-def
```

Returns:
```json
{
  "itemUuid": "abc-123-def",
  "itemId": 7,
  "createdBy": "STEAM_ID",
  "createdAt": "2025-01-01T00:00:00Z",
  "currentOwner": "STEAM_ID_2",
  "transfers": [
    {
      "fromUser": null,
      "toUser": "STEAM_ID",
      "transferType": "INITIAL_CREATE",
      "timestamp": "2025-01-01T00:00:00Z"
    },
    {
      "fromUser": "STEAM_ID",
      "toUser": "STEAM_ID_2",
      "transferType": "TRADE",
      "timestamp": "2025-01-02T00:00:00Z"
    }
  ]
}
```

## Rollback Plan

If migration fails:

1. Restore database backup
2. Revert code to previous branch
3. Investigate logs from migration script
4. Fix issues and retry

## Testing

After migration:

1. ✅ Test trade system
2. ✅ Test marketplace listing/buying
3. ✅ Test trade-up contracts
4. ✅ Test case opening
5. ✅ Test shop purchases
6. ✅ Verify item history tracking

## Notes

- Old UID field is kept during migration for reference
- All new items will use UUID as primary identifier
- Migration is one-way (cannot revert to UIDs)
- Item transfer logging happens automatically
