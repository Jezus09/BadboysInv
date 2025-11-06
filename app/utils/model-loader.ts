/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { getStickerImageSync } from "./sticker-api";
import { CS2Economy } from "@ianlucas/cs2-lib";

/**
 * Cache for loaded GLTF models to avoid redundant network requests
 */
const modelCache = new Map<string, THREE.Group>();

/**
 * Cache for loaded textures
 */
const textureCache = new Map<string, THREE.Texture>();

/**
 * Texture loader instance
 */
const textureLoader = new THREE.TextureLoader();

/**
 * GLTF loader instance
 */
const gltfLoader = new GLTFLoader();

/**
 * Default sticker positions per weapon type
 * These positions are optimized for each weapon model to ensure stickers
 * are visible and properly placed on the weapon's surface
 */
export interface StickerPreset {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

export const WEAPON_STICKER_PRESETS: Record<number, StickerPreset> = {
  // AK-47 - sticker on the receiver (right side)
  7: {
    position: [0.4, 0.15, 0.3],   // X: right side, Y: slightly up, Z: on the body
    rotation: [0, Math.PI / 2, 0], // Face forward
    scale: 1.2
  },
  // AWP - sticker on the scope area
  9: {
    position: [0.3, 0.2, 0.5],
    rotation: [0, Math.PI / 2, 0],
    scale: 1.0
  },
  // M4A4 - sticker on the receiver
  16: {
    position: [0.35, 0.12, 0.4],
    rotation: [0, Math.PI / 2, 0],
    scale: 1.1
  },
  // M4A1-S - sticker on the receiver
  60: {
    position: [0.35, 0.12, 0.4],
    rotation: [0, Math.PI / 2, 0],
    scale: 1.1
  },
  // Desert Eagle - sticker on the slide
  1: {
    position: [0.15, 0.1, 0.15],
    rotation: [0, Math.PI / 2, 0],
    scale: 0.8
  },
  // Glock-18 - sticker on the slide
  4: {
    position: [0.15, 0.08, 0.15],
    rotation: [0, Math.PI / 2, 0],
    scale: 0.7
  },
  // USP-S - sticker on the slide
  61: {
    position: [0.15, 0.08, 0.15],
    rotation: [0, Math.PI / 2, 0],
    scale: 0.75
  },
  // Default preset for weapons without specific configuration
  0: {
    position: [0.3, 0.1, 0.25],
    rotation: [0, Math.PI / 2, 0],
    scale: 1.0
  }
};

/**
 * CS2 weapon definition index to model filename mapping
 * Maps CS2 defindex to GLB model filename
 */
export const WEAPON_MODEL_MAP: Record<number, string> = {
  // Pistols
  1: "deagle.obj",           // Desert Eagle
  2: "elite.obj",            // Dual Berettas
  3: "fiveseven.obj",        // Five-SeveN
  4: "glock.obj",            // Glock-18
  7: "ak47.obj",             // AK-47
  8: "aug.obj",              // AUG
  9: "awp.obj",              // AWP
  10: "famas.obj",           // FAMAS
  11: "g3sg1.obj",           // G3SG1
  13: "galilar.obj",         // Galil AR
  14: "m249.obj",            // M249
  16: "m4a4.obj",            // M4A4
  17: "mac10.obj",           // MAC-10
  19: "p90.obj",             // P90
  24: "ump45.obj",           // UMP-45
  25: "xm1014.obj",          // XM1014
  26: "bizon.obj",           // PP-Bizon
  27: "mag7.obj",            // MAG-7
  28: "negev.obj",           // Negev
  29: "sawedoff.obj",        // Sawed-Off
  30: "tec9.obj",            // Tec-9
  32: "hkp2000.obj",         // P2000
  33: "mp7.obj",             // MP7
  34: "mp9.obj",             // MP9
  35: "nova.obj",            // Nova
  36: "p250.obj",            // P250
  38: "scar20.obj",          // SCAR-20
  39: "sg556.obj",           // SG 553
  40: "ssg08.obj",           // SSG 08
  60: "m4a1s.obj",           // M4A1-S
  61: "usps.obj",            // USP-S
  63: "cz75a.obj",           // CZ75-Auto
  64: "revolver.obj",        // R8 Revolver
  // Knives - these don't have OBJ yet, will use fallback
  500: "knife_default_ct.glb",
  503: "knife_default_t.glb",
};

/**
 * Get weapon-specific sticker preset position
 * @param weaponDefIndex CS2 weapon definition index
 * @returns StickerPreset with position, rotation, scale
 */
export function getWeaponStickerPreset(weaponDefIndex: number): StickerPreset {
  // Try weapon-specific preset first
  if (WEAPON_STICKER_PRESETS[weaponDefIndex]) {
    return WEAPON_STICKER_PRESETS[weaponDefIndex];
  }

  // Try base weapon defindex (for weapon skins)
  const econItem = CS2Economy.getById(weaponDefIndex);
  if (econItem && econItem.type === "weapon" && econItem.def) {
    if (WEAPON_STICKER_PRESETS[econItem.def]) {
      return WEAPON_STICKER_PRESETS[econItem.def];
    }
  }

  // Return default preset
  return WEAPON_STICKER_PRESETS[0];
}

/**
 * Get weapon model filename from CS2 economy item
 * @param itemId CS2 economy item ID (can be weapon skin ID)
 * @returns Model filename or null if not found
 */
export function getWeaponModelFilename(itemId: number): string | null {
  // First try direct lookup (for base weapons)
  if (WEAPON_MODEL_MAP[itemId]) {
    return WEAPON_MODEL_MAP[itemId];
  }

  // For weapon skins, try to extract base weapon defindex
  // CS2 weapon skins have IDs in ranges, base weapons are in specific slots
  const econItem = CS2Economy.getById(itemId);

  if (econItem && econItem.type === "weapon") {
    // Try to get the weapon defindex from the item's def property
    const weaponDefIndex = econItem.def;
    if (weaponDefIndex && WEAPON_MODEL_MAP[weaponDefIndex]) {
      return WEAPON_MODEL_MAP[weaponDefIndex];
    }
  }

  return null;
}

/**
 * Load a weapon GLTF model
 * @param modelPath Path to the GLB file (e.g., "/models/weapons/ak47.glb")
 * @returns Promise<THREE.Group> The loaded model
 */
export async function loadWeaponModel(modelPath: string): Promise<THREE.Group> {
  // Check cache first
  if (modelCache.has(modelPath)) {
    const cached = modelCache.get(modelPath)!;
    return cached.clone(); // Return a clone to avoid shared state
  }

  return new Promise((resolve, reject) => {
    gltfLoader.load(
      modelPath,
      (gltf) => {
        const model = gltf.scene;
        modelCache.set(modelPath, model);
        resolve(model.clone());
      },
      undefined,
      (error) => {
        console.error(`[ModelLoader] Failed to load model: ${modelPath}`, error);
        reject(error);
      }
    );
  });
}

/**
 * Load a sticker texture from URL
 * @param stickerUrl URL to the sticker PNG image
 * @returns Promise<THREE.Texture> The loaded texture
 */
export async function loadStickerTexture(stickerUrl: string): Promise<THREE.Texture> {
  // Check cache first
  if (textureCache.has(stickerUrl)) {
    return textureCache.get(stickerUrl)!;
  }

  // Use proxy for Steam CDN URLs to bypass CORS
  let proxiedUrl = stickerUrl;
  if (stickerUrl.startsWith('https://cdn.steamstatic.com/')) {
    proxiedUrl = `/api/proxy-image?url=${encodeURIComponent(stickerUrl)}`;
    console.log(`[ModelLoader] Using proxy for Steam CDN image`);
  }

  return new Promise((resolve, reject) => {
    textureLoader.load(
      proxiedUrl,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        textureCache.set(stickerUrl, texture);
        console.log(`[ModelLoader] ✅ Texture loaded successfully via ${proxiedUrl === stickerUrl ? 'direct' : 'proxy'}`);
        resolve(texture);
      },
      undefined,
      (error) => {
        console.error(`[ModelLoader] ❌ Failed to load texture:`, {
          originalUrl: stickerUrl,
          proxiedUrl: proxiedUrl,
          error: error
        });
        reject(new Error(`Failed to load texture: ${stickerUrl.substring(0, 40)}`));
      }
    );
  });
}

/**
 * Get sticker image URL from CS2 sticker definition index
 * Uses the ByMykel CSGO-API for accurate image URLs
 * @param stickerDefIndex CS2 sticker item definition index (item.def, NOT item.id)
 * @returns Sticker image URL (synchronous, uses cache)
 */
export function getStickerImageUrl(stickerDefIndex: number | string): string {
  return getStickerImageSync(stickerDefIndex);
}

/**
 * Clear all caches (useful for development/testing)
 */
export function clearModelCaches() {
  modelCache.clear();
  textureCache.clear();
  console.log("[ModelLoader] Caches cleared");
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    models: modelCache.size,
    textures: textureCache.size,
  };
}
