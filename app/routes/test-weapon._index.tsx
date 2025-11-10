/*---------------------------------------------------------------------------------------------
 *  CS2 Weapon Model + Skin Texture TEST PAGE
 *  Tests if official Valve OBJ models work with CS2 skin textures
 *--------------------------------------------------------------------------------------------*/

import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useState } from "react";
import { CS2Economy } from "@ianlucas/cs2-lib";
import * as THREE from "three";

/**
 * Test weapon component - loads GLB and applies CS2 skin texture
 */
function TestWeapon({ skinName, wear, seed }: { skinName: string | null; wear: number; seed: number }) {
  // Load weapon GLB model
  const gltf = useGLTF("/models/weapons/ak47_with_textures.glb");

  // Apply CS2 baked skin texture
  useEffect(() => {
    if (!gltf || !skinName) {
      console.log("No skin selected - showing default model");
      return;
    }

    console.log(`Applying baked CS2 skin: ${skinName} (wear: ${wear.toFixed(2)}, seed: ${seed})`);
    const textureLoader = new THREE.TextureLoader();

    // Load the pre-baked texture (position map already applied during baking)
    textureLoader.load(
      `/models/baked_skins/ak47/${skinName}.png`,
      (bakedTexture) => {
        console.log("✅ Loaded baked skin texture");

        // Configure texture
        bakedTexture.colorSpace = THREE.SRGBColorSpace;
        bakedTexture.flipY = false; // CS2 textures don't need flipping

        // Apply seed-based texture offset
        // CS2 seed (0-1000) determines pattern placement on weapon
        // Convert seed to normalized offset values
        const seedNormalized = seed / 1000; // 0.0 - 1.0
        bakedTexture.offset.set(
          (seedNormalized * 0.5) % 1.0,  // X offset (max 50% shift)
          (seedNormalized * 0.3) % 1.0   // Y offset (max 30% shift)
        );

        // Some skins also rotate slightly based on seed
        bakedTexture.rotation = (seedNormalized * Math.PI * 0.1); // Max ±18 degrees
        bakedTexture.center.set(0.5, 0.5); // Rotate around center

        // Texture wrapping for seamless pattern
        bakedTexture.wrapS = THREE.RepeatWrapping;
        bakedTexture.wrapT = THREE.RepeatWrapping;

        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            console.log(`🔍 Found mesh: "${child.name}", has UV: ${child.geometry.attributes.uv ? 'YES' : 'NO'}`);

            // Calculate wear-based material properties
            // Wear: 0.00 = Factory New (pristine)
            // Wear: 1.00 = Battle-Scarred (heavily worn)

            // Roughness increases with wear (shiny -> dull)
            const roughness = 0.3 + (wear * 0.5); // 0.3 -> 0.8

            // Metalness decreases with wear (metallic -> matte)
            const metalness = 0.15 - (wear * 0.1); // 0.15 -> 0.05

            // Color gets slightly brighter for better visibility
            const colorMultiplier = 1.1 - (wear * 0.15); // 1.1 -> 0.95 (brighter!)

            // Ambient occlusion intensity increases with wear
            const aoMapIntensity = 1.0 + (wear * 1.5); // 1.0 -> 2.5

            // Clone the texture for each mesh to allow independent UV mapping
            const meshTexture = bakedTexture.clone();
            meshTexture.needsUpdate = true;

            // Fix texture flipping issues
            meshTexture.flipY = false;

            // Check if this mesh has proper UV coordinates
            if (!child.geometry.attributes.uv) {
              console.warn(`⚠️  Mesh "${child.name}" has no UV coordinates - using default material`);

              // Apply neutral material for meshes without UVs
              child.material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(0.3, 0.3, 0.3), // Dark gray
                metalness: metalness,
                roughness: roughness,
              });
            } else {
              // Use the properly unwrapped texture
              const material = new THREE.MeshStandardMaterial({
                map: meshTexture,
                metalness: metalness,
                roughness: roughness,
                side: THREE.FrontSide, // Changed from DoubleSide to fix mirroring
                color: new THREE.Color(colorMultiplier, colorMultiplier, colorMultiplier),
                aoMapIntensity: aoMapIntensity,
              });

              child.material = material;
            }

            child.material.needsUpdate = true;
            console.log(`✅ Applied material to: ${child.name}`);
            console.log(`   Wear: ${wear.toFixed(4)} | Seed: ${seed}`);
            console.log(`   Roughness: ${roughness.toFixed(2)}, Metalness: ${metalness.toFixed(2)}, Color: ${(colorMultiplier * 100).toFixed(0)}%`);
          }
        });
      },
      undefined,
      (error) => {
        console.error("❌ Failed to load baked texture:", error);
        console.log("💡 Make sure to run: node scripts/bake-all-skins.mjs");
      }
    );
  }, [gltf, skinName, wear, seed]);

  return (
    <primitive
      object={gltf.scene}
      scale={1.5}
      rotation={[0, Math.PI, 0]}
    />
  );
}

/**
 * Test scene with lighting
 */
function TestScene({ skinName, wear, seed }: { skinName: string | null; wear: number; seed: number }) {
  return (
    <>
      {/* Camera */}
      <PerspectiveCamera makeDefault position={[2, 1, 3]} fov={50} near={0.01} far={100} />
      <OrbitControls enableDamping dampingFactor={0.05} minDistance={0.5} maxDistance={10} />

      {/* Lighting - Multiple angles for better visibility */}
      <ambientLight intensity={2.5} /> {/* Increased base light */}

      {/* Key light (main) */}
      <directionalLight position={[5, 5, 5]} intensity={3} castShadow />

      {/* Fill lights (soften shadows) */}
      <directionalLight position={[-5, 3, -5]} intensity={2} />
      <directionalLight position={[0, -3, 5]} intensity={1.5} />

      {/* Rim lights (edge definition) */}
      <pointLight position={[3, 2, -3]} intensity={2} color="#ffffff" />
      <pointLight position={[-3, 2, -3]} intensity={2} color="#ffffff" />

      {/* Top light */}
      <spotLight position={[0, 8, 0]} intensity={1.5} angle={0.5} penumbra={0.5} />

      {/* Weapon */}
      <Suspense fallback={null}>
        <TestWeapon skinName={skinName} wear={wear} seed={seed} />
      </Suspense>
    </>
  );
}

/**
 * Test page component
 */
export default function TestWeaponPage() {
  const [skinName, setSkinName] = useState<string | null>(null);
  const [wear, setWear] = useState<number>(0.0); // 0.0 = Factory New, 1.0 = Battle-Scarred
  const [seed, setSeed] = useState<number>(0); // 0-1000 pattern template

  // CS2 wear categories
  const getWearCategory = (wearValue: number): string => {
    if (wearValue < 0.07) return "Factory New";
    if (wearValue < 0.15) return "Minimal Wear";
    if (wearValue < 0.38) return "Field-Tested";
    if (wearValue < 0.45) return "Well-Worn";
    return "Battle-Scarred";
  };

  // Test skins - Using baked textures
  const testSkins = [
    { skin: null, name: "AK-47 (Base Model)" },
    { skin: "ak47_fire_serpent", name: "AK-47 | Fire Serpent" },
    { skin: "ak47_asiimov", name: "AK-47 | Asiimov" },
    { skin: "fireserpent_ak47", name: "AK-47 | Fire Serpent (Alt)" },
  ];

  return (
    <div className="fixed inset-0 bg-neutral-900">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-neutral-800/90 backdrop-blur p-4 border-b border-neutral-700">
        <h1 className="font-display text-2xl font-bold text-white mb-2 uppercase">
          🎨 CS2 Skin Test - Baked Textures
        </h1>
        <p className="text-neutral-400 text-sm mb-3">
          Using pre-baked textures with position map UV unwrapping applied
        </p>

        {/* Skin selector */}
        <div className="flex gap-2 flex-wrap mb-3">
          {testSkins.map((skin, idx) => (
            <button
              key={idx}
              onClick={() => setSkinName(skin.skin)}
              className={`px-3 py-1 rounded text-sm transition ${
                skinName === skin.skin
                  ? "bg-blue-600 text-white"
                  : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
              }`}
            >
              {skin.name}
            </button>
          ))}
        </div>

        {/* Wear slider */}
        <div className="bg-neutral-700/50 rounded p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-white font-bold text-sm">
              Wear (Float Value)
            </label>
            <span className="text-blue-400 font-mono text-sm">
              {wear.toFixed(4)} - {getWearCategory(wear)}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={wear}
            onChange={(e) => setWear(parseFloat(e.target.value))}
            className="w-full h-2 bg-neutral-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-neutral-400 mt-1">
            <span>0.00 (FN)</span>
            <span>0.07 (MW)</span>
            <span>0.15 (FT)</span>
            <span>0.38 (WW)</span>
            <span>0.45 (BS)</span>
            <span>1.00</span>
          </div>
        </div>

        {/* Seed slider */}
        <div className="bg-neutral-700/50 rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-white font-bold text-sm">
              Seed (Pattern Template)
            </label>
            <span className="text-green-400 font-mono text-sm">
              #{seed}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1000"
            step="1"
            value={seed}
            onChange={(e) => setSeed(parseInt(e.target.value))}
            className="w-full h-2 bg-neutral-600 rounded-lg appearance-none cursor-pointer accent-green-600"
          />
          <div className="flex justify-between text-xs text-neutral-400 mt-1">
            <span>0</span>
            <span>250</span>
            <span>500</span>
            <span>750</span>
            <span>1000</span>
          </div>
          <p className="text-xs text-neutral-500 mt-2">
            💡 Different seeds produce different pattern placements on the weapon
          </p>
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas
        className="w-full h-full"
        gl={{ antialias: true, alpha: true }}
      >
        <TestScene skinName={skinName} wear={wear} seed={seed} />
      </Canvas>

      {/* Instructions */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-neutral-800/90 backdrop-blur p-4 border-t border-neutral-700">
        <p className="text-neutral-300 text-sm">
          <strong className="text-white">Controls:</strong> Left click + drag to rotate | Scroll to zoom
        </p>
        <p className="text-neutral-400 text-xs mt-1">
          Baked textures with correct UV mapping. Wear affects material properties. Seed changes pattern placement (offset + rotation).
        </p>
      </div>
    </div>
  );
}
