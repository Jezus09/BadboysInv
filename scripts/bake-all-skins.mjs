#!/usr/bin/env node
/**
 * CS2 Texture Baking Script
 *
 * This script "bakes" CS2 skin textures by reading position maps and sampling
 * the tileable paint kit textures at the correct UV coordinates.
 *
 * CS2 uses a complex composite system:
 * - Position map (R,G channels = UV coords for where to sample the paint kit)
 * - Paint kit texture (tileable/repeating pattern)
 * - Output: Properly unwrapped texture ready for direct application
 */

import { createCanvas, loadImage } from 'canvas';
import { readdir, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PUBLIC_DIR = join(__dirname, '..', 'public');

// Weapon configurations
const WEAPONS = [
  { name: 'ak47', folder: 'ak47' },
  { name: 'awp', folder: 'awp' },
  { name: 'm4a1s', folder: 'm4a1_silencer' },
  { name: 'm4a4', folder: 'm4a1' },
];

/**
 * Bake a single texture using position map
 */
async function bakeTexture(positionMapPath, paintKitPath, outputPath, options = {}) {
  const {
    resolution = 2048,
    tileScale = 4.0, // CS2 typically uses 4x4 tiling
    skipExisting = true, // Skip if output already exists
  } = options;

  // Skip if output already exists (optimization)
  if (skipExisting && existsSync(outputPath)) {
    console.log(`\n⏭️  Skipping (already exists): ${outputPath}`);
    return 'skipped';
  }

  console.log(`\n📸 Baking texture:`);
  console.log(`   Position: ${positionMapPath}`);
  console.log(`   Paint kit: ${paintKitPath}`);
  console.log(`   Output: ${outputPath}`);

  try {
    // Load images
    const positionMap = await loadImage(positionMapPath);
    const paintKit = await loadImage(paintKitPath);

    // Create canvas for output
    const canvas = createCanvas(resolution, resolution);
    const ctx = canvas.getContext('2d');

    // Draw position map to get pixel data
    const posCanvas = createCanvas(positionMap.width, positionMap.height);
    const posCtx = posCanvas.getContext('2d');
    posCtx.drawImage(positionMap, 0, 0);
    const posData = posCtx.getImageData(0, 0, positionMap.width, positionMap.height);

    // Draw paint kit to sample from
    const paintCanvas = createCanvas(paintKit.width, paintKit.height);
    const paintCtx = paintCanvas.getContext('2d');
    paintCtx.drawImage(paintKit, 0, 0);
    const paintData = paintCtx.getImageData(0, 0, paintKit.width, paintKit.height);

    // Create output image data
    const outputData = ctx.createImageData(resolution, resolution);

    // Baking loop
    console.log(`   Processing ${resolution}x${resolution} pixels...`);
    const startTime = Date.now();

    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        // Calculate position in position map
        const posX = Math.floor((x / resolution) * positionMap.width);
        const posY = Math.floor((y / resolution) * positionMap.height);
        const posIdx = (posY * positionMap.width + posX) * 4;

        // Read UV coordinates from position map (R,G channels)
        const u = posData.data[posIdx] / 255.0;     // Red channel = U
        const v = posData.data[posIdx + 1] / 255.0; // Green channel = V
        const alpha = posData.data[posIdx + 3];      // Alpha channel

        // Sample from tiled paint kit texture
        // The texture repeats tileScale times
        const sampleX = Math.floor(((u * tileScale) % 1.0) * paintKit.width);
        const sampleY = Math.floor(((v * tileScale) % 1.0) * paintKit.height);
        const paintIdx = (sampleY * paintKit.width + sampleX) * 4;

        // Write to output
        const outIdx = (y * resolution + x) * 4;
        outputData.data[outIdx] = paintData.data[paintIdx];         // R
        outputData.data[outIdx + 1] = paintData.data[paintIdx + 1]; // G
        outputData.data[outIdx + 2] = paintData.data[paintIdx + 2]; // B
        outputData.data[outIdx + 3] = alpha;                         // A (from position map)
      }

      // Progress indicator
      if (y % 256 === 0 && y > 0) {
        const progress = ((y / resolution) * 100).toFixed(1);
        process.stdout.write(`\r   Progress: ${progress}%`);
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\r   Progress: 100.0% ✅ (${elapsed}s)`);

    // Write to canvas and save
    ctx.putImageData(outputData, 0, 0);

    // Ensure output directory exists
    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    // Save as PNG
    const fs = await import('fs');
    const stream = fs.createWriteStream(outputPath);
    const pngStream = canvas.createPNGStream();
    pngStream.pipe(stream);

    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    console.log(`   ✅ Saved: ${outputPath}`);
    return true;

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return false;
  }
}

/**
 * Process all skins for a weapon
 */
async function processWeapon(weapon) {
  console.log(`\n\n🔫 Processing weapon: ${weapon.name.toUpperCase()}`);
  console.log('═'.repeat(60));

  const positionMapPath = join(PUBLIC_DIR, 'models', 'composite_inputs', weapon.folder, 'position.png');
  const skinsDir = join(PUBLIC_DIR, 'models', 'skins');
  const outputDir = join(PUBLIC_DIR, 'models', 'baked_skins', weapon.name);

  // Check if position map exists
  if (!existsSync(positionMapPath)) {
    console.log(`⚠️  Position map not found: ${positionMapPath}`);
    console.log(`   Skipping ${weapon.name}`);
    return { success: 0, failed: 0, skipped: 1 };
  }

  // Get all skins
  const allFiles = await readdir(skinsDir);
  const skinFiles = allFiles.filter(f =>
    f.endsWith('.png') &&
    (f.includes(weapon.name) || f.includes(weapon.folder))
  );

  if (skinFiles.length === 0) {
    console.log(`ℹ️  No skins found for ${weapon.name}`);
    return { success: 0, failed: 0, skipped: 1 };
  }

  console.log(`Found ${skinFiles.length} skin(s)`);

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const skinFile of skinFiles) {
    const paintKitPath = join(skinsDir, skinFile);
    const outputPath = join(outputDir, skinFile);

    const result = await bakeTexture(positionMapPath, paintKitPath, outputPath, {
      resolution: 2048,
      tileScale: 4.0,
      skipExisting: true, // Enable caching
    });

    if (result === 'skipped') {
      skipped++;
    } else if (result) {
      success++;
    } else {
      failed++;
    }
  }

  return { success, failed, skipped };
}

/**
 * Main function
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║        CS2 TEXTURE BAKING SYSTEM                          ║');
  console.log('║        Unwraps tileable paint kits using position maps    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  let totalSuccess = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  for (const weapon of WEAPONS) {
    const result = await processWeapon(weapon);
    totalSuccess += result.success;
    totalFailed += result.failed;
    totalSkipped += result.skipped;
  }

  console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  BAKING COMPLETE                                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`\n✅ Success: ${totalSuccess}`);
  console.log(`❌ Failed:  ${totalFailed}`);
  console.log(`⊘  Skipped: ${totalSkipped}`);
  console.log(`\nBaked textures saved to: ${join(PUBLIC_DIR, 'models', 'baked_skins')}`);
}

// Run
main().catch(console.error);
