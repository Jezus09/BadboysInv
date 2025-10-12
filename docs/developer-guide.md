# CS2 Inventory Simulator - Developer Guide

This guide provides practical examples and best practices for working with the CS2 Inventory Simulator codebase.

## Quick Start

### Setting Up Development Environment

1. **Prerequisites**
   ```bash
   # Node.js 20.x required
   node --version  # Should be 20.x
   ```

2. **Installation**
   ```bash
   git clone <repository-url>
   cd cs2-inventory-simulator
   npm install
   ```

3. **Database Setup**
   ```bash
   # Set up your .env file first
   cp .env.example .env
   # Edit .env with your database connection details
   
   # Run migrations
   npx prisma migrate deploy
   ```

4. **Development Server**
   ```bash
   npm run dev
   ```

## Common Development Patterns

### Working with Inventory State

The application uses a specialized hook for managing inventory state:

```typescript
// Basic inventory management
function InventoryManager() {
  const [inventory, setInventory] = useInventoryState(() => new CS2Inventory());
  
  // Adding items optimally
  const addItem = useCallback((itemData: Partial<CS2BaseInventoryItem>) => {
    const newInventory = inventory.move(); // Creates optimized copy
    newInventory.add(itemData);
    setInventory(newInventory);
  }, [inventory, setInventory]);
  
  return { inventory, addItem };
}
```

### Creating Custom Item Components

```typescript
// Reusable item display component
function CustomItemCard({ 
  item, 
  showDetails = false,
  onAction 
}: {
  item: CS2InventoryItem;
  showDetails?: boolean;
  onAction?: (action: string, uid: number) => void;
}) {
  const { translate } = useTranslation({ language: "english" });
  
  const handleClick = () => {
    onAction?.("click", item.uid);
  };
  
  return (
    <div onClick={handleClick} className="item-card">
      <InventoryItemTile item={item} />
      {showDetails && (
        <div className="item-details">
          <p>{translate("ItemName")}: {item.name}</p>
          {item.wear && <p>Wear: {wearToString(item.wear)}</p>}
        </div>
      )}
    </div>
  );
}
```

### Implementing API Integrations

```typescript
// Custom API client
class InventoryAPIClient {
  constructor(private apiKey: string) {}
  
  async addItem(userId: string, itemData: Partial<CS2BaseInventoryItem>) {
    const response = await fetch('/api/add-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: this.apiKey,
        userId,
        inventoryItem: itemData
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add item');
    }
    
    return response.status === 204;
  }
  
  async getUserInventory(steamId: string) {
    const response = await fetch(`/api/inventory/${steamId}.json`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch inventory');
    }
    
    return await response.json();
  }
}

// Usage
const apiClient = new InventoryAPIClient('your-api-key');

// Add an AK-47 with custom properties
await apiClient.addItem('76561198123456789', {
  id: 7,
  wear: 0.15,
  nameTag: 'Custom AK-47',
  stickers: {
    0: { id: 1, wear: 0.0, x: 0, y: 0 }
  }
});
```

### Working with Translations

```typescript
// Multi-language component
function MultiLanguageComponent({ 
  currentLanguage 
}: { 
  currentLanguage: string 
}) {
  const { translate, system, items } = useTranslation({ 
    language: currentLanguage 
  });
  
  // System translations (UI text)
  const title = translate("HeaderInventory");
  
  // Item name translation (if available)
  const getItemName = (itemId: number) => {
    return items[itemId]?.name || `Item ${itemId}`;
  };
  
  return (
    <div>
      <h1>{title}</h1>
      <p>{getItemName(7)}</p> {/* AK-47 name in current language */}
    </div>
  );
}
```

### Custom Hooks Examples

```typescript
// Custom hook for item filtering
function useItemFilter() {
  const [filters, setFilters] = useState({
    type: '',
    rarity: '',
    search: ''
  });
  
  const filterItems = useCallback((items: CS2InventoryItem[]) => {
    return items.filter(item => {
      if (filters.type && item.type !== filters.type) return false;
      if (filters.rarity && item.rarity !== filters.rarity) return false;
      if (filters.search && !item.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [filters]);
  
  return { filters, setFilters, filterItems };
}

// Custom hook for inventory operations
function useInventoryOperations() {
  const [inventory, setInventory] = useInventoryState(() => new CS2Inventory());
  
  const operations = useMemo(() => ({
    addItem: (itemData: Partial<CS2BaseInventoryItem>) => {
      const newInventory = inventory.move();
      newInventory.add(itemData);
      setInventory(newInventory);
    },
    
    removeItem: (uid: number) => {
      const newInventory = inventory.move();
      newInventory.remove(uid);
      setInventory(newInventory);
    },
    
    equipItem: (uid: number, team?: CS2TeamValues) => {
      const newInventory = inventory.move();
      newInventory.equip(uid, team);
      setInventory(newInventory);
    },
    
    renameItem: (toolUid: number, targetUid: number, nameTag: string) => {
      const newInventory = inventory.move();
      newInventory.renameItem(toolUid, targetUid, nameTag);
      setInventory(newInventory);
    }
  }), [inventory, setInventory]);
  
  return { inventory, ...operations };
}
```

## Advanced Integration Examples

### Creating a Custom Shop Interface

```typescript
function CustomShop() {
  const { inventory, addItem } = useInventoryOperations();
  const [selectedCategory, setSelectedCategory] = useState<CS2ItemTypeValues>();
  
  // Get available shop items
  const shopItems = useMemo(() => {
    return CS2Economy.filterItems({
      type: selectedCategory,
      // Add other filters as needed
    });
  }, [selectedCategory]);
  
  const handlePurchase = async (item: CS2EconomyItem) => {
    try {
      // Add item to inventory
      addItem({ 
        id: item.id,
        // Set default properties
        wear: item.wearMin ? (item.wearMin + item.wearMax!) / 2 : undefined
      });
      
      // Sync with server if authenticated
      // await syncInventoryWithServer();
      
      alert(`Purchased ${item.name}!`);
    } catch (error) {
      console.error('Purchase failed:', error);
    }
  };
  
  return (
    <div className="custom-shop">
      <div className="category-selector">
        {Object.values(CS2ItemType).map(type => (
          <button 
            key={type}
            onClick={() => setSelectedCategory(type)}
            className={selectedCategory === type ? 'active' : ''}
          >
            {type}
          </button>
        ))}
      </div>
      
      <div className="items-grid">
        {shopItems.map(item => (
          <div key={item.id} className="shop-item">
            <InventoryItemTile 
              item={createFakeInventoryItem(item)} 
            />
            <button onClick={() => handlePurchase(item)}>
              Purchase
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Building a Case Opening System

```typescript
function CaseOpener() {
  const { inventory, addItem, removeItem } = useInventoryOperations();
  const [isOpening, setIsOpening] = useState(false);
  const [result, setResult] = useState<CS2EconomyItem | null>(null);
  
  const openCase = async (caseUid: number, keyUid: number) => {
    const caseItem = inventory.get(caseUid);
    const keyItem = inventory.get(keyUid);
    
    if (!caseItem?.isContainer() || !keyItem?.isKey()) {
      throw new Error('Invalid case or key');
    }
    
    setIsOpening(true);
    
    try {
      // Simulate case opening animation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Get random item from case contents
      const possibleItems = caseItem.getContentsItems();
      const randomItem = possibleItems[Math.floor(Math.random() * possibleItems.length)];
      
      // Remove case and key
      removeItem(caseUid);
      removeItem(keyUid);
      
      // Add won item
      addItem({
        id: randomItem.id,
        wear: randomItem.wearMin ? 
          Math.random() * (randomItem.wearMax! - randomItem.wearMin) + randomItem.wearMin :
          undefined
      });
      
      setResult(randomItem);
    } finally {
      setIsOpening(false);
    }
  };
  
  return (
    <div className="case-opener">
      {isOpening && <div className="opening-animation">Opening case...</div>}
      {result && (
        <div className="case-result">
          <h2>You won:</h2>
          <InventoryItemTile item={createFakeInventoryItem(result)} />
        </div>
      )}
      {/* Case opening interface */}
    </div>
  );
}
```

### Creating Custom Filters and Sorting

```typescript
// Advanced filtering system
function AdvancedInventoryFilter() {
  const { inventory } = useInventoryOperations();
  const [filters, setFilters] = useState({
    types: new Set<CS2ItemTypeValues>(),
    rarities: new Set<CS2RarityColorValues>(),
    equipped: null as boolean | null,
    hasNameTag: null as boolean | null,
    hasStickers: null as boolean | null,
    wearRange: [0, 1] as [number, number],
    searchText: ''
  });
  
  const filteredItems = useMemo(() => {
    return inventory.items.filter(item => {
      // Type filter
      if (filters.types.size > 0 && !filters.types.has(item.type)) {
        return false;
      }
      
      // Rarity filter
      if (filters.rarities.size > 0 && !filters.rarities.has(item.rarity)) {
        return false;
      }
      
      // Equipped filter
      if (filters.equipped !== null) {
        const isEquipped = item.equipped || item.equippedCT || item.equippedT;
        if (filters.equipped !== !!isEquipped) return false;
      }
      
      // Name tag filter
      if (filters.hasNameTag !== null) {
        const hasNameTag = !!item.nameTag;
        if (filters.hasNameTag !== hasNameTag) return false;
      }
      
      // Stickers filter
      if (filters.hasStickers !== null) {
        const hasStickers = item.stickers && Object.keys(item.stickers).length > 0;
        if (filters.hasStickers !== !!hasStickers) return false;
      }
      
      // Wear range filter
      if (item.wear !== undefined) {
        const [minWear, maxWear] = filters.wearRange;
        if (item.wear < minWear || item.wear > maxWear) return false;
      }
      
      // Text search
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        if (!item.name.toLowerCase().includes(searchLower) &&
            !item.nameTag?.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      return true;
    });
  }, [inventory.items, filters]);
  
  return {
    filters,
    setFilters,
    filteredItems,
    clearFilters: () => setFilters({
      types: new Set(),
      rarities: new Set(),
      equipped: null,
      hasNameTag: null,
      hasStickers: null,
      wearRange: [0, 1],
      searchText: ''
    })
  };
}
```

## Performance Optimization Tips

### 1. Efficient Inventory Updates

```typescript
// ❌ Don't create new inventory for every change
const badUpdate = (items: CS2BaseInventoryItem[]) => {
  let newInventory = new CS2Inventory();
  items.forEach(item => {
    newInventory = newInventory.move();
    newInventory.add(item);
  });
  return newInventory;
};

// ✅ Batch operations
const goodUpdate = (items: CS2BaseInventoryItem[]) => {
  const newInventory = inventory.move();
  items.forEach(item => newInventory.add(item));
  return newInventory;
};
```

### 2. Memoize Expensive Calculations

```typescript
// Memoize filtered and sorted items
const processedItems = useMemo(() => {
  const filtered = filterItems(inventory.items, filters);
  return sortItems(filtered, sortMethod);
}, [inventory.items, filters, sortMethod]);
```

### 3. Optimize Component Rendering

```typescript
// Use React.memo for expensive components
const MemoizedInventoryItem = React.memo(InventoryItem, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return prevProps.item.uid === nextProps.item.uid &&
         prevProps.equipped === nextProps.equipped;
});
```

## Testing Strategies

### Unit Testing Utilities

```typescript
// Test helper for creating mock inventory items
export function createMockInventoryItem(overrides: Partial<CS2InventoryItem> = {}) {
  return createFakeInventoryItem(CS2Economy.getById(7), {
    uid: Math.floor(Math.random() * 10000),
    ...overrides
  });
}

// Test helper for inventory operations
export function createTestInventory(items: Partial<CS2InventoryItem>[] = []) {
  const inventory = new CS2Inventory();
  items.forEach(item => {
    inventory.add({ id: 7, ...item });
  });
  return inventory;
}
```

### Component Testing Examples

```typescript
// Example test for inventory component
import { render, screen, fireEvent } from '@testing-library/react';

test('inventory item displays correctly', () => {
  const mockItem = createMockInventoryItem({
    nameTag: 'Test Item'
  });
  
  render(
    <InventoryItem
      item={mockItem}
      equipped={[]}
      uid={mockItem.uid}
    />
  );
  
  expect(screen.getByText('Test Item')).toBeInTheDocument();
});
```

## Debugging Tips

### 1. Inventory State Debugging

```typescript
// Add debug logging to inventory operations
const debugInventoryOperations = (inventory: CS2Inventory) => {
  console.group('Inventory Debug');
  console.log('Total items:', inventory.size);
  console.log('Items by type:', inventory.items.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>));
  console.groupEnd();
};
```

### 2. API Response Debugging

```typescript
// Debug API responses
const debugAPICall = async (url: string, options: RequestInit) => {
  console.log('API Call:', url, options);
  const response = await fetch(url, options);
  console.log('API Response:', response.status, await response.clone().text());
  return response;
};
```

### 3. Translation Debugging

```typescript
// Debug missing translations
const debugTranslation = (key: string, result: string) => {
  if (!result || result === key) {
    console.warn('Missing translation for key:', key);
  }
  return result;
};
```

This developer guide provides practical examples and patterns for working effectively with the CS2 Inventory Simulator codebase. Combine this with the comprehensive API documentation for complete development guidance.