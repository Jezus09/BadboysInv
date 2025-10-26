/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useState } from "react";
import { data, redirect, useFetcher, useLoaderData } from "react-router";
import { CS2EconomyItem } from "@ianlucas/cs2-lib";
import { middleware } from "~/http.server";
import { isUserOwner } from "~/models/rule";
import { getRequestUserId } from "~/auth.server";
import { getMetaTitle } from "~/root-meta";
import { Modal, ModalHeader } from "~/components/modal";
import { ItemPicker } from "~/components/item-picker";
import { ItemImage } from "~/components/item-image";
import { getShopItems } from "~/models/shop.server";
import { prisma } from "~/db.server";
import { Decimal } from "@prisma/client/runtime/library";
import type { Route } from "./+types/admin.shop._index";

export const meta = getMetaTitle("Admin - Shop Management");

export async function loader({ request }: Route.LoaderArgs) {
  await middleware(request);

  const userId = await getRequestUserId(request);
  const isOwner = await isUserOwner(userId);

  if (!isOwner) {
    throw redirect("/?error=AccessDenied");
  }

  const shopItems = await getShopItems();

  return data({
    shopItems: shopItems.map((item) => ({
      ...item,
      price: item.price.toString()
    }))
  });
}

export async function action({ request }: Route.ActionArgs) {
  await middleware(request);

  const userId = await getRequestUserId(request);
  const isOwner = await isUserOwner(userId);

  if (!isOwner) {
    throw redirect("/?error=AccessDenied");
  }

  const formData = await request.formData();
  const actionType = String(formData.get("action"));

  try {
    if (actionType === "add") {
      const itemId = parseInt(String(formData.get("itemId")));
      const name = String(formData.get("name"));
      const price = new Decimal(String(formData.get("price")));
      const category = String(formData.get("category"));

      await prisma.shopItem.create({
        data: {
          name,
          price,
          category,
          itemId,
          enabled: true,
          sortOrder: 0,
        }
      });

      return data({ success: true, message: "Item added to shop!" });
    }

    if (actionType === "delete") {
      const shopItemId = String(formData.get("shopItemId"));

      await prisma.shopItem.delete({
        where: { id: shopItemId }
      });

      return data({ success: true, message: "Item deleted from shop!" });
    }

    if (actionType === "toggle") {
      const shopItemId = String(formData.get("shopItemId"));
      const enabled = String(formData.get("enabled")) === "true";

      await prisma.shopItem.update({
        where: { id: shopItemId },
        data: { enabled }
      });

      return data({ success: true, message: enabled ? "Item enabled!" : "Item disabled!" });
    }

    return data({ success: false, message: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Admin shop error:", error);
    return data(
      { success: false, message: "Operation failed" },
      { status: 500 }
    );
  }
}

export default function AdminShop() {
  const { shopItems } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const [selectedItem, setSelectedItem] = useState<CS2EconomyItem | null>(null);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [price, setPrice] = useState("0.99");
  const [purchaseLimit, setPurchaseLimit] = useState("");
  const [category, setCategory] = useState("weapon-case");

  function handleSelectItem(item: CS2EconomyItem) {
    setSelectedItem(item);
    setShowItemPicker(false);

    // Auto-detect category
    if (item.isKey()) {
      setCategory("key");
      setPrice("2.49");
    } else if (item.isWeaponCase()) {
      setCategory("weapon-case");
      setPrice("0.99");
    } else if (item.isStickerCapsule()) {
      setCategory("sticker-capsule");
      setPrice("0.99");
    } else if (item.isGraffitiBox()) {
      setCategory("graffiti-box");
      setPrice("0.75");
    } else if (item.isSouvenirCase()) {
      setCategory("souvenir-case");
      setPrice("1.99");
    } else {
      setCategory("other-container");
      setPrice("1.25");
    }
  }

  function handleSave() {
    if (!selectedItem) return;

    const formData = new FormData();
    formData.append("action", "add");
    formData.append("itemId", selectedItem.id.toString());
    formData.append("name", selectedItem.name);
    formData.append("price", price);
    formData.append("category", category);
    if (purchaseLimit) {
      formData.append("purchaseLimit", purchaseLimit);
    }

    fetcher.submit(formData, { method: "POST" });

    // Reset form
    setSelectedItem(null);
    setPrice("0.99");
    setPurchaseLimit("");
  }

  function handleDelete(shopItemId: string) {
    if (!confirm("Biztosan törlöd ezt az itemet a shopból?")) return;

    const formData = new FormData();
    formData.append("action", "delete");
    formData.append("shopItemId", shopItemId);

    fetcher.submit(formData, { method: "POST" });
  }

  function handleToggleEnabled(shopItemId: string, currentEnabled: boolean) {
    const formData = new FormData();
    formData.append("action", "toggle");
    formData.append("shopItemId", shopItemId);
    formData.append("enabled", (!currentEnabled).toString());

    fetcher.submit(formData, { method: "POST" });
  }

  return (
    <>
      <Modal className="w-[95%] max-w-[1400px] max-h-[90vh]">
        <ModalHeader title="Shop Management" linkTo="/admin" />

        <div className="mt-4 px-4 pb-4 overflow-y-auto max-h-[80vh]">
          {/* Title */}
          <div className="relative mb-6 text-center">
            <h1 className="font-display bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-4xl font-black text-transparent drop-shadow-2xl">
              SHOP MANAGEMENT
            </h1>
            <div className="absolute inset-0 text-4xl font-black text-yellow-400/10 blur-sm">
              SHOP MANAGEMENT
            </div>
          </div>

          {/* Add Item Section */}
          <div className="rounded-sm border border-neutral-500/20 bg-neutral-800/50 p-4 mb-6">
            <h2 className="text-xl font-bold mb-4">Add New Item</h2>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Item Selector */}
              <div>
                <label className="block text-sm font-medium mb-2">Select Item</label>
                <button
                  onClick={() => setShowItemPicker(true)}
                  className="w-full rounded-sm border border-neutral-500/30 bg-black/40 p-4 hover:bg-black/60 transition-colors min-h-[120px] flex items-center justify-center"
                >
                  {selectedItem ? (
                    <div className="text-center">
                      <ItemImage item={selectedItem} className="w-32 h-24 mx-auto mb-2" />
                      <div className="text-sm font-medium">{selectedItem.name}</div>
                    </div>
                  ) : (
                    <div className="text-neutral-400">Click to select item</div>
                  )}
                </button>
              </div>

              {/* Settings */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full rounded-sm border border-neutral-500/30 bg-black/40 px-3 py-2 text-white focus:border-neutral-400 focus:outline-none"
                    placeholder="0.99"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-sm border border-neutral-500/30 bg-black/40 px-3 py-2 text-white focus:border-neutral-400 focus:outline-none"
                  >
                    <option value="key">Kulcs</option>
                    <option value="weapon-case">Fegyver láda</option>
                    <option value="sticker-capsule">Matrica kapszula</option>
                    <option value="graffiti-box">Graffiti doboz</option>
                    <option value="souvenir-case">Souvenir láda</option>
                    <option value="other-container">Egyéb láda</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Purchase Limit (optional)</label>
                  <input
                    type="number"
                    min="1"
                    value={purchaseLimit}
                    onChange={(e) => setPurchaseLimit(e.target.value)}
                    className="w-full rounded-sm border border-neutral-500/30 bg-black/40 px-3 py-2 text-white focus:border-neutral-400 focus:outline-none"
                    placeholder="Unlimited"
                  />
                </div>

                <button
                  onClick={handleSave}
                  disabled={!selectedItem || fetcher.state !== "idle"}
                  className="w-full rounded-sm bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:bg-neutral-700 disabled:cursor-not-allowed transition-colors"
                >
                  {fetcher.state !== "idle" ? "Saving..." : "Add to Shop"}
                </button>
              </div>
            </div>
          </div>

          {/* Current Shop Items */}
          <div className="rounded-sm border border-neutral-500/20 bg-neutral-800/50 p-4">
            <h2 className="text-xl font-bold mb-4">Current Shop Items ({shopItems.length})</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shopItems.map((shopItem) => (
                <div
                  key={shopItem.id}
                  className={`rounded-sm border ${shopItem.enabled ? 'border-green-500/30' : 'border-neutral-500/30'} bg-black/40 p-3`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-neutral-400">
                      {shopItem.category}
                    </span>
                    <span className={`text-xs font-medium ${shopItem.enabled ? 'text-green-400' : 'text-red-400'}`}>
                      {shopItem.enabled ? '● Enabled' : '○ Disabled'}
                    </span>
                  </div>

                  <div className="text-sm font-medium mb-1">{shopItem.name}</div>
                  <div className="text-xl font-bold text-green-400 mb-3">${shopItem.price}</div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleEnabled(shopItem.id, shopItem.enabled)}
                      className={`flex-1 rounded-sm px-2 py-1 text-xs font-medium ${
                        shopItem.enabled
                          ? 'bg-orange-600 hover:bg-orange-700'
                          : 'bg-green-600 hover:bg-green-700'
                      } text-white transition-colors`}
                    >
                      {shopItem.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => handleDelete(shopItem.id)}
                      className="rounded-sm bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {shopItems.length === 0 && (
              <div className="text-center py-8 text-neutral-400">
                No items in shop yet. Add your first item above!
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Item Picker Modal */}
      {showItemPicker && (
        <ItemPicker
          onPickItem={handleSelectItem}
          onClose={() => setShowItemPicker(false)}
        />
      )}
    </>
  );
}
