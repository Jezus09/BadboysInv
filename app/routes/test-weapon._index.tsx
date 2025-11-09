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
function TestWeapon({ skinTexture }: { skinTexture: string | null }) {
  // Load weapon GLB model - Official CS2 export (3.1 MB)
  const gltf = useGLTF("/models/weapons/ak47_cs2_official.glb");

  // Apply extracted CS2 paint kit texture to model
  useEffect(() => {
    if (!gltf) return;

    if (!skinTexture) {
      // No skin selected - show base weapon textures
      console.log("✅ Showing base weapon textures");
      return;
    }

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      skinTexture,
      (texture) => {
        console.log("✅ Extracted CS2 skin texture loaded:", skinTexture);
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            // Apply extracted CS2 paint kit texture
            child.material = new THREE.MeshStandardMaterial({
              map: texture,
              metalness: 0.6,
              roughness: 0.4,
            });
            console.log("✅ Applied extracted skin to mesh:", child.name);
          }
        });
      },
      undefined,
      (error) => {
        console.error("❌ Failed to load extracted skin texture:", error);
      }
    );
  }, [gltf, skinTexture]);

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
function TestScene({ skinTexture }: { skinTexture: string | null }) {
  return (
    <>
      {/* Camera */}
      <PerspectiveCamera makeDefault position={[2, 1, 3]} fov={50} near={0.01} far={100} />
      <OrbitControls enableDamping dampingFactor={0.05} minDistance={0.5} maxDistance={10} />

      {/* Lighting */}
      <ambientLight intensity={1} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} />
      <directionalLight position={[-5, 3, -5]} intensity={0.8} />
      <pointLight position={[0, 2, 0]} intensity={0.5} />

      {/* Weapon */}
      <Suspense fallback={null}>
        <TestWeapon skinTexture={skinTexture} />
      </Suspense>
    </>
  );
}

/**
 * Test page component
 */
export default function TestWeaponPage() {
  const [skinTexture, setSkinTexture] = useState<string | null>(null);

  // Test skins - using extracted CS2 paint kit textures
  const testSkins = [
    { texture: null, name: "AK-47 (Base)" },
    { texture: "/models/skins/fireserpent_ak47.png", name: "AK-47 | Fire Serpent" },
    { texture: "/models/skins/ak47_asiimov.png", name: "AK-47 | Asiimov" },
  ];

  return (
    <div className="fixed inset-0 bg-neutral-900">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-neutral-800/90 backdrop-blur p-4 border-b border-neutral-700">
        <h1 className="font-display text-2xl font-bold text-white mb-2 uppercase">
          🧪 Official CS2 Model Test
        </h1>
        <p className="text-neutral-400 text-sm mb-3">
          Official CS2 weapon model (3.1 MB) extracted from game files - Base weapon texture
        </p>

        {/* Skin selector */}
        <div className="flex gap-2 flex-wrap">
          {testSkins.map((skin, idx) => (
            <button
              key={idx}
              onClick={() => setSkinTexture(skin.texture)}
              className={`px-3 py-1 rounded text-sm transition ${
                skinTexture === skin.texture
                  ? "bg-blue-600 text-white"
                  : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
              }`}
            >
              {skin.name}
            </button>
          ))}
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas
        className="w-full h-full"
        gl={{ antialias: true, alpha: true }}
      >
        <TestScene skinTexture={skinTexture} />
      </Canvas>

      {/* Instructions */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-neutral-800/90 backdrop-blur p-4 border-t border-neutral-700">
        <p className="text-neutral-300 text-sm">
          <strong className="text-white">Controls:</strong> Left click + drag to rotate | Scroll to zoom
        </p>
        <p className="text-neutral-400 text-xs mt-1">
          Testing extracted CS2 paint kit textures from game files - Fire Serpent & Asiimov available!
        </p>
      </div>
    </div>
  );
}
