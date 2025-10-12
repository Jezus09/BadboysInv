# CS2 Inventory Simulator - Comprehensive API Documentation

This document provides comprehensive documentation for all public APIs, functions, and components in the CS2 Inventory Simulator.

## Table of Contents

1. [Public REST APIs](#public-rest-apis)
2. [Server-Side Functions](#server-side-functions)
3. [Utility Functions](#utility-functions)
4. [React Hooks](#react-hooks)
5. [React Components](#react-components)
6. [Type Definitions](#type-definitions)
7. [Constants and Enums](#constants-and-enums)

---

## Public REST APIs

The CS2 Inventory Simulator exposes several REST API endpoints for external integration.

### Authentication

Most API endpoints require authentication via API keys. API keys must be created in the `public.ApiCredential` table with appropriate scopes.

#### Available Scopes:
- `api`: Full API access (not recommended for specific use cases)
- `api_auth`: Access to authentication endpoints
- `inventory`: Access to inventory manipulation endpoints
- `stattrak_increment`: Access to StatTrak increment functionality

### Core API Endpoints

#### 1. Get User Inventory

Retrieves a user's complete inventory data.

```http
GET /api/inventory/{steamID64}.json
```

**Parameters:**
- `steamID64` (path): The user's Steam ID in 64-bit format

**Response:** `200 OK`
```typescript
type GetUserInventoryResponse = {
  items: Record<number, {
    containerId?: number;
    equipped?: boolean;
    equippedCT?: boolean;
    equippedT?: boolean;
    id: number;
    nameTag?: string;
    patches?: Record<number, number>;
    seed?: number;
    statTrak?: number;
    stickers?: Record<number, {
      id: number;
      wear?: number;
      x?: number;
      y?: number;
    }>;
    storage?: Record<number, InventoryItem>;
    updatedAt?: number;
    wear?: number;
  }>;
  version: number;
};
```

**Example Usage:**
```bash
curl "https://inventory.cstrike.app/api/inventory/76561198123456789.json"
```

#### 2. Get User Equipped Items

Retrieves a user's currently equipped items in CS2 format.

```http
GET /api/equipped/v3/{steamID64}.json
```

**Parameters:**
- `steamID64` (path): The user's Steam ID in 64-bit format

**Response:** `200 OK`
```typescript
type GetUserEquippedItemsResponse = {
  agents?: Record<number, AgentItem>;
  ctWeapons?: Record<number, WeaponEconItem>;
  gloves?: Record<number, BaseEconItem>;
  graffiti?: GraffitiItem;
  knives?: Record<number, WeaponEconItem>;
  musicKit?: MusicKitItem;
  pin?: number;
  tWeapons?: Record<number, WeaponEconItem>;
};
```

**Example Usage:**
```bash
curl "https://inventory.cstrike.app/api/equipped/v3/76561198123456789.json"
```

#### 3. Add Item to Inventory

Adds a new item to a user's inventory.

```http
POST /api/add-item
```

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```typescript
type PostAddItemRequest = {
  apiKey: string;
  userId: string;
  inventoryItem: {
    id: number;
    wear?: number;
    nameTag?: string;
    patches?: Record<string, number>;
    seed?: number;
    statTrak?: 0;
    stickers?: Record<string, {
      id: number;
      wear?: number;
      x?: number;
      y?: number;
    }>;
  };
};
```

**Responses:**
- `204 No Content`: Item successfully added
- `400 Bad Request`: Invalid request or inventory full
- `401 Unauthorized`: Invalid API key

**Required Scopes:** `api` or `inventory`

**Example Usage:**
```bash
curl -X POST "https://inventory.cstrike.app/api/add-item" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "your-api-key",
    "userId": "76561198123456789",
    "inventoryItem": {
      "id": 7,
      "wear": 0.15,
      "nameTag": "My AK-47"
    }
  }'
```

#### 4. Add Container to Inventory

Adds a random container (case) to a user's inventory based on filters.

```http
POST /api/add-container
```

**Request Body:**
```typescript
type PostAddContainerRequest = {
  apiKey: string;
  userId: string;
  name?: string;
  graffiti?: boolean;
  language?: string;
  souvenir?: boolean;
  stickerCapsule?: boolean;
  weapon?: boolean;
};
```

**Responses:**
- `200 OK`: Container added successfully (returns container details)
- `400 Bad Request`: Invalid request or inventory full
- `401 Unauthorized`: Invalid API key

**Required Scopes:** `api` or `inventory`

**Example Usage:**
```bash
curl -X POST "https://inventory.cstrike.app/api/add-container" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "your-api-key",
    "userId": "76561198123456789",
    "weapon": true,
    "language": "english"
  }'
```

#### 5. Increment Item StatTrak

Increments the StatTrak counter of a specific item.

```http
POST /api/increment-item-stattrak
```

**Request Body:**
```typescript
type PostIncrementItemStatTrakRequest = {
  apiKey: string;
  targetUid: number;
  userId: string;
};
```

**Responses:**
- `204 No Content`: StatTrak incremented successfully
- `400 Bad Request`: Invalid user or item UID
- `401 Unauthorized`: Invalid API key

**Required Scopes:** `api` or `stattrak_increment`

#### 6. User Authentication

These endpoints handle user authentication for first-party applications.

##### Get Sign-in Token
```http
POST /api/sign-in
```

**Request Body:**
```typescript
type GetUserSignInTokenRequest = {
  apiKey: string;
  userId: string;
};
```

**Response:** `200 OK`
```typescript
type GetUserSignInTokenResponse = {
  token: string; // expires in 1 minute
};
```

**Required Scopes:** `api_auth`

##### Complete Sign-in
```http
GET /api/sign-in/callback?token={token}
```

**Response:** `302 Found` (redirects to preferences or home page)

---

## Server-Side Functions

### API Wrapper Function

#### `api<T, U>(action: (args: T) => Promise<U>)`

A higher-order function that wraps API route handlers with error handling and response formatting.

**Parameters:**
- `action`: An async function that implements the API logic

**Returns:** A wrapped handler function with standardized error handling

**Features:**
- Automatic error catching and formatting
- Zod validation error handling
- Consistent JSON error responses
- Request logging for debugging

**Example Usage:**
```typescript
export const loader = api(async ({ request, params }: Route.LoaderArgs) => {
  // Your API logic here
  return { data: "success" };
});
```

### Authentication Functions

#### `requireUser(request: Request)`

Extracts and validates the authenticated user from the request.

**Parameters:**
- `request`: The incoming HTTP request

**Returns:** `Promise<User>` - The authenticated user object

**Throws:** Redirects to sign-in if user is not authenticated

### Database Model Functions

#### User Management

##### `findUniqueUser(userId: string)`

Finds a user by their Steam ID.

**Parameters:**
- `userId`: Steam ID of the user

**Returns:** `Promise<User>` - User object with inventory data

##### `manipulateUserInventory(options: ManipulateInventoryOptions)`

Safely manipulates a user's inventory with transaction support.

**Parameters:**
```typescript
type ManipulateInventoryOptions = {
  rawInventory: string | null;
  userId: string;
  syncedAt?: number;
  manipulate: (inventory: CS2Inventory) => void;
};
```

**Returns:** `Promise<{ syncedAt: Date }>` - Updated timestamp

---

## Utility Functions

### Economy Utilities (`app/utils/economy.ts`)

#### `updateEconomyLanguage(language: CS2ItemTranslationByLanguage[string])`

Updates the CS2Economy instance to use a specific language.

**Parameters:**
- `language`: Translation object for the target language

**Example Usage:**
```typescript
import { updateEconomyLanguage } from "~/utils/economy";
import { german } from "~/translations/german";

updateEconomyLanguage(german);
```

#### `isItemCountable(item: CS2EconomyItem): boolean`

Determines if an item type can be counted (stackable).

**Parameters:**
- `item`: CS2 economy item

**Returns:** `boolean` - True if item is countable

**Countable Item Types:**
- Container
- Graffiti
- Key
- Patch
- Sticker
- Tool

#### `wearToString(wear: number): string`

Converts a wear value to a formatted string.

**Parameters:**
- `wear`: Wear value (0.0 to 1.0)

**Returns:** Formatted wear string

#### `stickerWearToString(wear: number): string`

Converts sticker wear to a formatted string.

#### `validateStickerWear(wear: number): boolean`

Validates sticker wear value.

**Parameters:**
- `wear`: Wear value to validate

**Returns:** `boolean` - True if valid

#### `stickerOffsetToString(offset: number): string`

Converts sticker offset to formatted string.

#### `validateStickerOffset(offset: number): boolean`

Validates sticker position offset.

#### `validateStickerRotation(rotation: number): boolean`

Validates sticker rotation value.

### Inventory Utilities (`app/utils/inventory.ts`)

#### `parseInventory(inventory?: string | null): CS2Inventory | undefined`

Safely parses inventory data from compressed string format.

**Parameters:**
- `inventory`: Compressed inventory string

**Returns:** Parsed inventory object or undefined if invalid

#### `createFakeInventoryItem(props: CS2EconomyItem, item?: Partial<CS2InventoryItem>): CS2InventoryItem`

Creates a temporary inventory item for display purposes.

**Parameters:**
- `props`: Economy item properties
- `item`: Optional partial inventory item data

**Returns:** Fake inventory item instance

**Example Usage:**
```typescript
const fakeItem = createFakeInventoryItem(
  CS2Economy.getById(7), // AK-47
  { wear: 0.15, nameTag: "My AK" }
);
```

#### `getFreeItemsToDisplay(hideFreeItems = false): TransformedInventoryItem[]`

Gets all free items available for display.

**Parameters:**
- `hideFreeItems`: Whether to hide free items

**Returns:** Array of transformed inventory items

#### `getInventoryItemShareUrl(item: CS2InventoryItem, userId?: string): string`

Generates a shareable URL for an inventory item.

**Parameters:**
- `item`: Inventory item to share
- `userId`: Optional user ID

**Returns:** Shareable URL string

### Translation Utilities (`app/utils/translation.ts`)

#### `getSystemTranslation(key: string, language?: string): string`

Gets system translation for a specific key and language.

**Parameters:**
- `key`: Translation key
- `language`: Target language (defaults to English)

**Returns:** Translated string

### Cache Utilities

#### Inventory Cache (`app/utils/inventory-cached-data.ts`)

##### `cacheInventoryData(value: string): void`

Stores inventory data in browser cache.

##### `getCachedInventoryData(): string | null`

Retrieves cached inventory data.

##### `getSanitizedCachedInventoryData(): string | null`

Gets sanitized cached inventory data.

#### User Cache (`app/utils/user-cached-data.ts`)

##### `cacheAuthenticatedUserId(value: string): void`

Caches authenticated user ID.

##### `didUserAuthenticateInThisBrowser(): boolean`

Checks if user has authenticated in current browser.

---

## React Hooks

### Core Hooks

#### `useTranslation({ language }: { language: string })`

**File:** `app/components/hooks/use-translation.ts`

Provides translation functionality with dynamic language loading.

**Parameters:**
- `language`: Current language code

**Returns:**
```typescript
{
  system: Record<string, string>; // System translations
  items: Record<string, string>;  // Item translations  
  translate: (token: string, ...values: string[]) => string;
}
```

**Example Usage:**
```typescript
function MyComponent() {
  const { translate } = useTranslation({ language: "english" });
  
  return <div>{translate("HeaderInventory")}</div>;
}
```

#### `useInventoryState(initialState: CS2Inventory | (() => CS2Inventory))`

**File:** `app/components/hooks/use-inventory-state.ts`

Manages inventory state with optimized updates.

**Parameters:**
- `initialState`: Initial inventory or function returning inventory

**Returns:**
```typescript
[
  CS2Inventory,                    // Current inventory state
  (state: CS2Inventory) => void,   // State setter with move optimization
  (state: CS2Inventory) => void    // Direct state setter
]
```

**Example Usage:**
```typescript
function InventoryManager() {
  const [inventory, setInventory] = useInventoryState(() => new CS2Inventory());
  
  const addItem = (itemId: number) => {
    const newInventory = inventory.move();
    newInventory.add({ id: itemId });
    setInventory(newInventory);
  };
  
  return <div>Items: {inventory.size}</div>;
}
```

### Specialized Hooks

#### `useIsDesktop(): boolean`

**File:** `app/components/hooks/use-is-desktop.ts`

Detects if the current device is desktop-sized.

#### `useSync(): SyncState`

**File:** `app/components/hooks/use-sync.ts`

Manages synchronization state with the server.

#### `useTimer(duration: number): TimerState`

**File:** `app/components/hooks/use-timer.ts`

Provides countdown timer functionality.

#### `useInventoryItem(uid: number): CS2InventoryItem | undefined`

**File:** `app/components/hooks/use-inventory-item.ts`

Retrieves a specific inventory item by UID.

#### `useCounter(initialValue: number): CounterState`

**File:** `app/components/hooks/use-counter.ts`

Provides counter functionality with increment/decrement.

#### `useStorageState<T>(key: string, defaultValue: T): [T, (value: T) => void]`

**File:** `app/components/hooks/use-storage-state.ts`

Manages state synchronized with localStorage.

#### `useKeyRelease(key: string, callback: () => void): void`

**File:** `app/components/hooks/use-key-release.ts`

Handles keyboard key release events.

#### `useLockScroll(enabled: boolean): void`

**File:** `app/components/hooks/use-lock-scroll.ts`

Locks page scrolling when enabled.

---

## React Components

### Core Components

#### `Modal`

**File:** `app/components/modal.tsx`

A reusable modal component with backdrop and animation support.

**Props:**
```typescript
{
  blur?: boolean;        // Apply backdrop blur effect
  children: ReactNode;   // Modal content
  className?: string;    // Additional CSS classes
  fixed?: boolean;       // Use fixed positioning
  hidden?: boolean;      // Hide the modal
}
```

**Example Usage:**
```typescript
<Modal blur hidden={!showModal}>
  <ModalHeader title="Settings" onClose={() => setShowModal(false)} />
  <div>Modal content here</div>
</Modal>
```

#### `ModalHeader`

Modal header component with title and close button.

**Props:**
```typescript
{
  linkTo?: string;       // Link destination for close button
  onClose?: () => void;  // Close callback
  title: string;         // Modal title
}
```

#### `InventoryItem`

**File:** `app/components/inventory-item.tsx`

Displays an inventory item with full interaction support.

**Props:**
```typescript
{
  // Item data
  item: CS2InventoryItem;
  equipped: CS2TeamValues[];
  uid: number;
  
  // Interaction handlers
  onClick?: (uid: number) => void;
  onEdit?: (uid: number) => void;
  onEquip?: (uid: number, team?: CS2TeamValues) => void;
  onUnequip?: (uid: number, team?: CS2TeamValues) => void;
  onRemove?: (uid: number) => void;
  onRename?: (uid: number) => void;
  onInspectItem?: (uid: number) => void;
  onUnlockContainer?: (uid: number) => void;
  
  // Sticker operations
  onApplySticker?: (uid: number) => void;
  onScrapeSticker?: (uid: number) => void;
  ownApplicableStickers?: boolean;
  
  // Patch operations  
  onApplyPatch?: (uid: number) => void;
  onRemovePatch?: (uid: number) => void;
  ownApplicablePatches?: boolean;
  
  // Storage operations
  onDepositToStorageUnit?: (uid: number) => void;
  onRetrieveFromStorageUnit?: (uid: number) => void;
  onInspectStorageUnit?: (uid: number) => void;
  onRenameStorageUnit?: (uid: number) => void;
  
  // Other operations
  onSwapItemsStatTrak?: (uid: number) => void;
  
  // Configuration
  disableContextMenu?: boolean;
  disableHover?: boolean;
}
```

**Example Usage:**
```typescript
<InventoryItem
  item={inventoryItem.item}
  equipped={inventoryItem.equipped}
  uid={inventoryItem.uid}
  onClick={handleItemClick}
  onEdit={handleItemEdit}
  onEquip={handleItemEquip}
  onRemove={handleItemRemove}
/>
```

#### `ItemPicker`

**File:** `app/components/item-picker.tsx`

Responsive component for picking items from the economy.

**Props:**
```typescript
{
  onPickItem: (item: CS2EconomyItem) => void;
}
```

**Features:**
- Automatically switches between desktop and mobile layouts
- Filtering and search functionality
- Category-based organization

#### `LazyImage`

**File:** `app/components/lazy-image.tsx`

Image component with lazy loading support.

**Props:**
```typescript
{
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
}
```

#### `Logo`

**File:** `app/components/logo.tsx`

Application logo component.

**Props:**
```typescript
{
  className?: string;
  style?: CSSProperties;
}
```

#### `FillSpinner`

**File:** `app/components/fill-spinner.tsx`

Loading spinner component.

**Props:**
```typescript
{
  className?: string;
}
```

### Form Components

#### `Select`

Reusable select dropdown component.

#### `IconInput`

Input component with icon support.

#### `EditorInput`, `EditorRange`, `EditorSelect`

Specialized form components for item editing.

### Layout Components

#### `Header`

Main application header with navigation.

#### `Footer`

Application footer component.

#### `Background`

Dynamic background component.

### Specialized Components

#### `UnlockCase`

Complete case opening interface with wheel animation.

#### `TradeInventoryGrid`

Grid component for trading interface.

#### `ShopItemCard`

Component for displaying shop items.

#### `CraftView`, `CraftEdit`, `CraftNew`

Components for the crafting system.

---

## Type Definitions

### Core Types

#### `CS2InventoryItem`

Represents an item in a user's inventory.

```typescript
interface CS2InventoryItem {
  id: number;
  uid: number;
  containerId?: number;
  equipped?: boolean;
  equippedCT?: boolean;
  equippedT?: boolean;
  nameTag?: string;
  patches?: Record<number, number>;
  seed?: number;
  statTrak?: number;
  stickers?: Record<number, StickerData>;
  storage?: Record<number, CS2InventoryItem>;
  updatedAt?: number;
  wear?: number;
}
```

#### `StickerData`

```typescript
interface StickerData {
  id: number;
  wear?: number;
  x?: number;
  y?: number;
  rotation?: number;
}
```

#### `TransformedInventoryItem`

```typescript
interface TransformedInventoryItem {
  item: CS2InventoryItem;
  equipped: CS2TeamValues[];
  uid: number;
}
```

### API Types

#### `ApiActionSyncData`

```typescript
type ApiActionSyncData = {
  syncedAt: number;
};
```

#### `SystemTranslationTokens`

Type representing all available system translation keys.

### Hook Return Types

#### `TimerState`

```typescript
interface TimerState {
  timeLeft: number;
  isActive: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
}
```

#### `CounterState`

```typescript
interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
  set: (value: number) => void;
}
```

---

## Constants and Enums

### Item Type Constants

#### `UNLOCKABLE_ITEM_TYPE`

Array of item types that can be unlocked (cases and keys).

```typescript
const UNLOCKABLE_ITEM_TYPE: CS2ItemTypeValues[] = [
  CS2ItemType.Container,
  CS2ItemType.Key
];
```

#### `EDITABLE_ITEM_TYPE`

Array of item types that can be edited.

```typescript
const EDITABLE_ITEM_TYPE: CS2ItemTypeValues[] = [
  CS2ItemType.Agent,
  CS2ItemType.Gloves,
  CS2ItemType.Keychain,
  CS2ItemType.Melee,
  CS2ItemType.MusicKit,
  CS2ItemType.Weapon
];
```

#### `INSPECTABLE_ITEM_TYPE`

Array of item types that can be inspected.

```typescript
const INSPECTABLE_ITEM_TYPE: CS2ItemTypeValues[] = [
  CS2ItemType.Collectible,
  CS2ItemType.Gloves,
  CS2ItemType.Graffiti,
  CS2ItemType.Keychain,
  CS2ItemType.Melee,
  CS2ItemType.MusicKit,
  CS2ItemType.Patch,
  CS2ItemType.Sticker,
  CS2ItemType.Weapon
];
```

#### `COUNTABLE_ITEM_TYPES`

Array of item types that are stackable.

```typescript
const COUNTABLE_ITEM_TYPES: CS2ItemTypeValues[] = [
  CS2ItemType.Container,
  CS2ItemType.Graffiti,
  CS2ItemType.Key,
  CS2ItemType.Patch,
  CS2ItemType.Sticker,
  CS2ItemType.Tool
];
```

### Rarity Labels

#### `RarityLabel`

Mapping of rarity colors to human-readable labels.

```typescript
const RarityLabel = {
  [CS2RarityColor.Default]: "Default",
  [CS2RarityColor.Common]: "Common",
  [CS2RarityColor.Uncommon]: "Uncommon",
  [CS2RarityColor.Rare]: "Rare",
  [CS2RarityColor.Mythical]: "Mythical",
  [CS2RarityColor.Legendary]: "Legendary",
  [CS2RarityColor.Ancient]: "Ancient",
  [CS2RarityColor.Immortal]: "Immortal"
} as const;
```

### Inventory Filters

#### `INVENTORY_PRIMARY_FILTERS`

Primary filter categories for inventory items.

#### `INVENTORY_SECONDARY_FILTERS`

Secondary filter options organized by category.

#### `INVENTORY_SORTERS`

Available sorting options for inventory display.

### Validation Constants

#### Economy Constants

```typescript
const newItemStartingId = 14251;
const newItemEndAt = 1759307424677;
const minStickerOffset = -2;
const maxStickerOffset = 2;
const stickerOffsetFactor = 0.001;
```

#### String Length Constants

```typescript
const seedStringMaxLen = String(CS2_MAX_SEED).length;
const wearStringMaxLen = String(CS2_WEAR_FACTOR).length;
const stickerWearStringMaxLen = String(CS2_STICKER_WEAR_FACTOR).length;
const stickerOffsetStringMaxLen = String(stickerOffsetFactor).length;
const stickerRotationStringMaxLen = String(CS2_MAX_STICKER_ROTATION).length;
```

### Sync Actions

#### `SyncAction` Enum

```typescript
enum SyncAction {
  Add = "Add",
  AddFromCache = "AddFromCache", 
  AddFromShop = "AddFromShop",
  AddWithNametag = "AddWithNametag",
  ApplyItemPatch = "ApplyItemPatch",
  ApplyItemSticker = "ApplyItemSticker",
  Equip = "Equip",
  Unequip = "Unequip",
  RenameItem = "RenameItem",
  Remove = "Remove",
  RemoveItemPatch = "RemoveItemPatch",
  ScrapeItemSticker = "ScrapeItemSticker",
  SwapItemsStatTrak = "SwapItemsStatTrak",
  RenameStorageUnit = "RenameStorageUnit",
  DepositToStorageUnit = "DepositToStorageUnit",
  RetrieveFromStorageUnit = "RetrieveFromStorageUnit",
  Edit = "Edit",
  AddWithSticker = "AddWithSticker",
  RemoveAllItems = "RemoveAllItems"
}
```

---

## Error Handling

### API Error Responses

All API endpoints return standardized error responses:

```typescript
{
  error: string; // Error description
}
```

### Common HTTP Status Codes

- `200 OK`: Success with data
- `204 No Content`: Success without data
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Invalid or missing API key
- `404 Not Found`: Resource not found
- `405 Method Not Allowed`: Invalid HTTP method
- `500 Internal Server Error`: Server error

### Validation Errors

The application uses Zod for request validation. Validation errors return a `400` status with a generic error message directing users to check the documentation.

---

## Usage Examples

### Adding Items via API

```typescript
// Add a basic AK-47
const response = await fetch('/api/add-item', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    apiKey: 'your-api-key',
    userId: '76561198123456789',
    inventoryItem: {
      id: 7, // AK-47 Redline
      wear: 0.15,
      nameTag: 'My AK-47'
    }
  })
});
```

### Using Hooks in Components

```typescript
function InventoryComponent() {
  const { translate } = useTranslation({ language: 'english' });
  const [inventory, setInventory] = useInventoryState(() => new CS2Inventory());
  const isDesktop = useIsDesktop();
  
  return (
    <div>
      <h1>{translate('HeaderInventory')}</h1>
      {isDesktop ? <DesktopView /> : <MobileView />}
    </div>
  );
}
```

### Creating Custom Components

```typescript
function CustomItemDisplay({ item }: { item: CS2InventoryItem }) {
  const handleClick = (uid: number) => {
    console.log('Item clicked:', uid);
  };
  
  return (
    <InventoryItem
      item={item}
      equipped={[]}
      uid={item.uid}
      onClick={handleClick}
      disableContextMenu={true}
    />
  );
}
```

---

This documentation covers all major public APIs, functions, and components in the CS2 Inventory Simulator. For implementation details and internal functions, refer to the source code in the respective files.