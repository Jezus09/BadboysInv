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
function TestWeapon({ weaponDefIndex }: { weaponDefIndex: number }) {
  // Load weapon GLB model - Testing CS2 (New) version (54 MB)
  // GLB has embedded textures (3x 4096x4096 = base weapon texture)
  const gltf = useGLTF("/models/weapons/ak47_cs2.glb");

  console.log("✅ GLB loaded with embedded textures");

  return (
    <primitive
      object={gltf.scene}
      scale={0.01}
      rotation={[0, Math.PI, 0]}
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
      <ambientLight intensity={1} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} />
      <directionalLight position={[-5, 3, -5]} intensity={0.8} />
      <pointLight position={[0, 2, 0]} intensity={0.5} />

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
  const [weaponId, setWeaponId] = useState(44); // AK-47 | Redline

  // Test skins
  const testSkins = [
    { id: 7, name: "AK-47 (Base)" },
    { id: 44, name: "AK-47 | Redline" },
    { id: 359, name: "AK-47 | Fire Serpent" },
    { id: 489, name: "AK-47 | Neon Revolution" },
    { id: 675, name: "AK-47 | Bloodsport" },
    { id: 1086, name: "AK-47 | Asiimov" },
  ];

  return (
    <div className="fixed inset-0 bg-neutral-900">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-neutral-800/90 backdrop-blur p-4 border-b border-neutral-700">
        <h1 className="font-display text-2xl font-bold text-white mb-2 uppercase">
          🧪 CS2 Model + CS2 Skin Test
        </h1>
        <p className="text-neutral-400 text-sm mb-3">
          CS2 weapon model (54 MB) with CS2 skin textures - Testing if skins apply correctly
        </p>

        {/* Skin selector */}
        <div className="flex gap-2 flex-wrap">
          {testSkins.map((skin) => (
            <button
              key={skin.id}
              onClick={() => setWeaponId(skin.id)}
              className={`px-3 py-1 rounded text-sm transition ${
                weaponId === skin.id
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
        <TestScene weaponDefIndex={weaponId} />
      </Canvas>

      {/* Instructions */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-neutral-800/90 backdrop-blur p-4 border-t border-neutral-700">
        <p className="text-neutral-300 text-sm">
          <strong className="text-white">Controls:</strong> Left click + drag to rotate | Scroll to zoom
        </p>
        <p className="text-neutral-400 text-xs mt-1">
          Testing CS2 model with CS2 skin textures - Click different skins to verify rendering
        </p>
      </div>
    </div>
  );
}
