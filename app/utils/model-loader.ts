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
 * CS2 weapon definition index to model filename mapping
 * Maps CS2 defindex to GLB model filename
 */
export const WEAPON_MODEL_MAP: Record<number, string> = {
  // Pistols
  1: "deagle.glb",           // Desert Eagle
  2: "elite.glb",            // Dual Berettas
  3: "fiveseven.glb",        // Five-SeveN
  4: "glock.glb",            // Glock-18
  7: "ak47.glb",             // AK-47
  8: "aug.glb",              // AUG
  9: "awp.glb",              // AWP
  10: "famas.glb",           // FAMAS
  11: "g3sg1.glb",           // G3SG1
  13: "galilar.glb",         // Galil AR
  14: "m249.glb",            // M249
  16: "m4a4.glb",            // M4A4
  17: "mac10.glb",           // MAC-10
  19: "p90.glb",             // P90
  24: "ump45.glb",           // UMP-45
  25: "xm1014.glb",          // XM1014
  26: "bizon.glb",           // PP-Bizon
  27: "mag7.glb",            // MAG-7
  28: "negev.glb",           // Negev
  29: "sawedoff.glb",        // Sawed-Off
  30: "tec9.glb",            // Tec-9
  32: "hkp2000.glb",         // P2000
  33: "mp7.glb",             // MP7
  34: "mp9.glb",             // MP9
  35: "nova.glb",            // Nova
  36: "p250.glb",            // P250
  38: "scar20.glb",          // SCAR-20
  39: "sg556.glb",           // SG 553
  40: "ssg08.glb",           // SSG 08
  60: "m4a1s.glb",           // M4A1-S
  61: "usps.glb",            // USP-S
  63: "cz75a.glb",           // CZ75-Auto
  64: "revolver.glb",        // R8 Revolver
  // Knives
  500: "knife_default_ct.glb",
  503: "knife_default_t.glb",
};

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

  return new Promise((resolve, reject) => {
    // Try to load with Image first to get better error messages
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Try CORS

    img.onload = () => {
      console.log(`[ModelLoader] ✅ Image loaded successfully: ${stickerUrl.substring(0, 50)}`);

      // Now load with TextureLoader
      textureLoader.load(
        stickerUrl,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          textureCache.set(stickerUrl, texture);
          resolve(texture);
        },
        undefined,
        (error) => {
          console.error(`[ModelLoader] TextureLoader failed: ${stickerUrl}`, error);
          reject(new Error(`TextureLoader failed: ${stickerUrl.substring(0, 40)}`));
        }
      );
    };

    img.onerror = (error) => {
      console.error(`[ModelLoader] ❌ Image load failed:`, {
        url: stickerUrl,
        error: error,
        type: error.type,
        message: (error as any)?.message
      });

      // Determine error type
      if (stickerUrl.startsWith('http') && !stickerUrl.startsWith(window.location.origin)) {
        reject(new Error(`CORS error: Cannot load ${stickerUrl.substring(0, 40)}... from external domain`));
      } else {
        reject(new Error(`Failed to load image: ${stickerUrl.substring(0, 40)}`));
      }
    };

    img.src = stickerUrl;
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
