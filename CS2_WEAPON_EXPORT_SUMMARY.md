# CS2 Weapon Model & Skin Export - Session Summary

**Date:** 2025-11-10
**Branch:** `new`
**Project:** BadboysInv (https://inventory.badboyscs2.site)

---

## 🎯 What We Accomplished

### 1. ✅ Exported 34 CS2 Weapon Models (GLB format)

**Location:** `/tmp/cs2_export/all_weapons/`

**Categories:**
- **Rifles (7):** AK-47, M4A4, M4A1-S, AUG, FAMAS, Galil AR, SG 553
- **Pistols (9):** Desert Eagle, Glock-18, USP-S, P250, CZ75-Auto, Five-SeveN, Dual Berettas, R8 Revolver, Tec-9, P2000
- **SMGs (7):** P90, MP9, MP7, MP5-SD, UMP-45, MAC-10, PP-Bizon
- **Snipers (4):** AWP, SSG 08, G3SG1, SCAR-20
- **Shotguns (4):** Nova, MAG-7, Sawed-Off, XM1014
- **Machine Guns (2):** M249, Negev

**Export Method:**
```bash
Source2Viewer-CLI -i /opt/cs2-docker/game/csgo/pak01_dir.vpk \
  --vpk_filepath "weapons/models/{weapon}/weapon_{type}_{name}.vmdl_c" \
  -d --gltf_export_format glb --gltf_export_materials
```

**Files Per Weapon:**
- Main model: `weapon_{type}_{name}.glb` (3-6 MB)
- Physics model: `weapon_{type}_{name}_physics.glb` (4-6 KB)
- PBR Textures: color, normal, roughness, AO maps (embedded in GLB)

**Currently in Repo (7 weapons):**
- `public/models/weapons/ak47/weapon_rif_ak47.glb`
- `public/models/weapons/awp/weapon_snip_awp.glb`
- `public/models/weapons/m4a1_silencer/weapon_rif_m4a1_silencer.glb`
- `public/models/weapons/m4a4/weapon_rif_m4a4.glb`
- `public/models/weapons/deagle/weapon_pist_deagle.glb`
- `public/models/weapons/usp_silencer/weapon_pist_usp_silencer.glb`
- `public/models/weapons/p250/weapon_pist_p250.glb`

---

### 2. ✅ Exported Weapon Skin Textures

**Method:** Export `.vmat_c` material files (NOT just `.vtex_c`)

**Why .vmat?**
- `.vtex_c` = single texture file (color only)
- `.vmat_c` = complete material definition (all texture layers + parameters)

**Example Export:**
```bash
Source2Viewer-CLI -i /opt/cs2-docker/game/csgo/pak01_dir.vpk \
  -o /tmp/cs2_skins \
  --vpk_filepath "materials/models/weapons/customization/paints/vmats/cu_ak47_asiimov.vmat_c" \
  -d
```

**Exported Skins:**
1. **AK-47 Asiimov** (`ak47_asiimov.png` - 3.9 MB)
2. **AK-47 Fire Serpent** (`ak47_fire_serpent.png` - 3.3 MB)
3. **M4A1-S Howl** (`m4a1s_howl.png` - 4.9 MB)
4. **AWP Hyper Beast** (`awp_hyper_beast.png` - 2.4 MB)
5. **P250 Asiimov** (`p250_asiimov.png` - 4.0 MB)

**Shared Textures (Composite Shader System):**
- `gun_grunge.png` (11 MB) - wear/grunge overlay
- `paint_wear.png` (2.4 MB) - wear mask
- `metalness.png` (80 bytes) - default metalness
- `glitter_mask.png` (30 KB) - glitter effect

**Location:** `public/models/skins/`

---

### 3. ✅ Built 3D Weapon Viewer with Wear System

**URL:** https://inventory.badboyscs2.site/test-3d-viewer.html

**Features:**
- Weapon selector (7 weapons)
- Skin selector (5 skins)
- Wear slider (0.00-1.00 float)
- Wear condition labels (FN/MW/FT/WW/BS)
- Interactive 3D controls (rotate, zoom, pan)

**Tech Stack:**
- Three.js (3D rendering)
- GLTFLoader (model loading)
- OrbitControls (camera controls)
- MeshStandardMaterial (PBR)

---

## 🔧 CS2 Composite Shader System

### How CS2 Applies Skins

**CS2 Weapon Material Structure:**
```
csgo_customweapon.vfx shader:
├─ TextureColor1 (base weapon color) ← from GLB model
├─ TexturePattern (skin design) ← from .vmat export
├─ TextureGrunge (wear overlay) ← shared texture
├─ TextureWear (wear mask) ← shared texture
├─ TextureRoughness1 (material roughness) ← from GLB model
├─ TextureMetalness1 (metal areas) ← from GLB model
├─ TextureAmbientOcclusion1 (AO) ← from GLB model
└─ Parameters:
   ├─ g_flPaintRoughness: 0.42
   ├─ g_flWearAmount: 0.0-1.0
   └─ g_flWeaponLength1: weapon-specific
```

### Implementation in Three.js

**Current Approach:**
```javascript
// WRONG (before):
mat.map = skinTexture; // Replaces ALL textures ❌

// CORRECT (after):
mat.map = skinTexture; // Replace base color only
mat.normalMap = originalNormalMap; // Keep from GLB ✅
mat.roughnessMap = originalRoughnessMap; // Keep from GLB ✅
mat.aoMap = originalAoMap; // Keep from GLB ✅
mat.metalnessMap = originalMetalnessMap; // Keep from GLB ✅
```

**Wear System:**
```javascript
// CS2 formula
roughness = 0.42 + (wearAmount × 0.4)
// Result: 0.42 (FN) → 0.82 (BS)
```

---

## 🐛 Current Issues

### Issue #1: Textures Not Matching CS2 Appearance

**Problem:** Models load but don't look like CS2
- Lighting seems off
- Materials appear flat
- Wear slider has no visible effect

**Possible Causes:**
1. GLB files may not contain PBR maps (need to verify)
2. Texture paths incorrect
3. Material properties not set correctly
4. Composite shader not implemented properly

**Debug Tools:**
- `/test-3d-viewer.html` - main viewer
- `/debug-materials.html` - material inspector (shows what textures are in GLB)

### Issue #2: Wear System Not Working

**Implemented:**
```javascript
function updateWear(wearAmount) {
    mat.roughness = 0.42 + (wearAmount * 0.4);
    mat.aoMapIntensity = 0.5 + (wearAmount * 0.5);
}
```

**Expected:** Slider 0→1 should show wear progression
**Actual:** No visible change

---

## 📁 File Structure

```
/tmp/badboys-inventory/
├── public/
│   ├── models/
│   │   ├── weapons/
│   │   │   ├── ak47/
│   │   │   │   ├── weapon_rif_ak47.glb (3.2 MB)
│   │   │   │   ├── ak47_default_color_psd_*.png (20 MB)
│   │   │   │   ├── ak47_default_normal_png_*.png (18 MB)
│   │   │   │   ├── ak47_default_rough_psd_*.png (14 MB)
│   │   │   │   └── ak47_default_ao_png_*.png (9.5 MB)
│   │   │   ├── awp/
│   │   │   ├── m4a1_silencer/
│   │   │   ├── m4a4/
│   │   │   ├── deagle/
│   │   │   ├── usp_silencer/
│   │   │   └── p250/
│   │   └── skins/
│   │       ├── ak47_asiimov.png (3.9 MB)
│   │       ├── ak47_fire_serpent.png (3.3 MB)
│   │       ├── awp_hyper_beast.png (2.4 MB)
│   │       ├── m4a1s_howl.png (4.9 MB)
│   │       ├── p250_asiimov.png (4.0 MB)
│   │       └── shared/
│   │           ├── gun_grunge.png (11 MB)
│   │           ├── paint_wear.png (2.4 MB)
│   │           ├── metalness.png (80 bytes)
│   │           └── glitter_mask.png (30 KB)
│   ├── test-3d-viewer.html
│   └── debug-materials.html
└── /tmp/cs2_export/
    └── all_weapons/ (34 weapons × ~5 MB = 170 MB)
```

---

## 🚀 Next Steps

### To Fix Rendering Issues:

1. **Verify GLB Contents:**
   - Open `/debug-materials.html`
   - Check if normalMap, roughnessMap, aoMap exist
   - If ❌ NO → textures not embedded in GLB

2. **If Textures Missing from GLB:**
   ```bash
   # Re-export with texture embedding
   Source2Viewer-CLI --gltf_export_materials --gltf_textures_adapt
   ```

3. **If Textures Present:**
   - Fix texture path loading
   - Implement proper composite blending
   - Add custom shader for CS2 composite system

4. **Test Wear System:**
   - Verify roughness changes in debug view
   - Check if grunge texture applies
   - Validate wear mask functionality

### To Add More Content:

1. **Export Remaining 27 Weapons:**
   ```bash
   cp -r /tmp/cs2_export/all_weapons/weapons/models/* \
     /tmp/badboys-inventory/public/models/weapons/
   ```

2. **Export Popular Skins:**
   - Doppler phases (Karambit, Bayonet knives)
   - Fade skins (AWP, Glock, etc.)
   - Redline, Vulcan, Neo-Noir, etc.

3. **Update Viewer:**
   - Add all weapons to dropdown
   - Organize by category (Rifles, Pistols, etc.)
   - Add search/filter

---

## 📚 References

- **Steam Guide:** https://steamcommunity.com/sharedfiles/filedetails/?id=3599755887
- **Valve Workshop:** https://developer.valvesoftware.com/wiki/Counter-Strike_2_Workshop_Tools/Weapon_Finishes
- **Source2Viewer:** https://github.com/ValveResourceFormat/ValveResourceFormat
- **Three.js Docs:** https://threejs.org/docs/

---

## 💾 Backup Locations

- **CS2 Game Files:** `/opt/cs2-docker/game/csgo/pak01_dir.vpk`
- **Source2Viewer CLI:** `/tmp/source2viewer/Source2Viewer-CLI`
- **Export Cache:** `/tmp/cs2_export/` and `/tmp/cs2_skins/`
- **Git Repository:** `origin/new` branch

---

**Last Updated:** 2025-11-10 12:40 UTC
**Session Status:** Active - Debugging material rendering
