/*---------------------------------------------------------------------------------------------
 *  CS2 Weapon Model + Skin Texture TEST PAGE
 *  Tests if official Valve OBJ models work with CS2 skin textures
 *--------------------------------------------------------------------------------------------*/

import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Suspense, useEffect, useState } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { CS2Economy } from "@ianlucas/cs2-lib";

/**
 * Test weapon component - loads OBJ and applies CS2 skin texture
 */
function TestWeapon({ weaponDefIndex }: { weaponDefIndex: number }) {
  const [textureUrl, setTextureUrl] = useState<string | null>(null);

  // Load weapon OBJ model
  const obj = useLoader(OBJLoader, "/models/weapons/weapon_rif_ak47.obj");

  // Get CS2 skin texture URL
  useEffect(() => {
    try {
      const item = CS2Economy.getById(weaponDefIndex);
      const url = item.getTextureImage();
      console.log("🎨 Weapon:", item.name);
      console.log("🖼️ Texture URL:", url);
      setTextureUrl(url);
    } catch (e) {
      console.error("❌ Failed to get texture:", e);
    }
  }, [weaponDefIndex]);

  // Load texture
  const texture = useLoader(THREE.TextureLoader, textureUrl || "");

  // Apply texture to model
  useEffect(() => {
    if (!obj || !texture) return;

    console.log("✅ OBJ loaded, vertices:", obj.children.length);

    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Apply CS2 skin texture
        child.material = new THREE.MeshStandardMaterial({
          map: texture,
          metalness: 0.6,
          roughness: 0.4,
        });

        console.log("✅ Applied texture to mesh:", child.name);
      }
    });
  }, [obj, texture]);

  return (
    <primitive
      object={obj}
      scale={0.5}
      rotation={[0, Math.PI / 2, 0]}
    />
  );
}

/**
 * Test scene with lighting
 */
function TestScene({ weaponDefIndex }: { weaponDefIndex: number }) {
  return (
    <>
      {/* Camera */}
      <PerspectiveCamera makeDefault position={[2, 1, 3]} fov={50} />
      <OrbitControls enableDamping dampingFactor={0.05} />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <directionalLight position={[-5, 3, -5]} intensity={0.5} />

      {/* Weapon */}
      <Suspense fallback={null}>
        <TestWeapon weaponDefIndex={weaponDefIndex} />
      </Suspense>
    </>
  );
}

/**
 * Test page component
 */
export default function TestWeaponPage() {
  const [weaponId, setWeaponId] = useState(44); // AK-47 | Redline (example)

  // Test weapons list
  const testWeapons = [
    { id: 7, name: "AK-47 (Base)" },
    { id: 44, name: "AK-47 | Redline" },
    { id: 359, name: "AK-47 | Fire Serpent" },
    { id: 489, name: "AK-47 | Neon Revolution" },
    { id: 9, name: "AWP (Base)" },
    { id: 344, name: "AWP | Dragon Lore" },
    { id: 39, name: "M4A4 (Base)" },
    { id: 60, name: "M4A1-S (Base)" },
  ];

  return (
    <div className="fixed inset-0 bg-neutral-900">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-neutral-800/90 backdrop-blur p-4 border-b border-neutral-700">
        <h1 className="font-display text-2xl font-bold text-white mb-2 uppercase">
          🧪 CS2 Weapon Model + Skin Texture Test
        </h1>
        <p className="text-neutral-400 text-sm mb-3">
          Testing if official Valve OBJ models work with CS2 skin textures (UV mapping test)
        </p>

        {/* Weapon selector */}
        <div className="flex gap-2 flex-wrap">
          {testWeapons.map((weapon) => (
            <button
              key={weapon.id}
              onClick={() => setWeaponId(weapon.id)}
              className={`px-3 py-1 rounded text-sm transition ${
                weaponId === weapon.id
                  ? "bg-blue-600 text-white"
                  : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
              }`}
            >
              {weapon.name}
            </button>
          ))}
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas
        className="w-full h-full"
        gl={{ antialias: true, alpha: true }}
      >
        <TestScene weaponDefIndex={weaponId} />
      </Canvas>

      {/* Instructions */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-neutral-800/90 backdrop-blur p-4 border-t border-neutral-700">
        <p className="text-neutral-300 text-sm">
          <strong className="text-white">Controls:</strong> Left click + drag to rotate | Scroll to zoom | Right click + drag to pan
        </p>
        <p className="text-neutral-400 text-xs mt-1">
          ✅ If skin texture shows correctly → UV mapping works! | ❌ If texture is wrong/broken → UV mapping incompatible
        </p>
      </div>
    </div>
  );
}
