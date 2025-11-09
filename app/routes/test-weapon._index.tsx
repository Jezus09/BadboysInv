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
function TestWeapon({ skinName }: { skinName: string | null }) {
  // Load weapon GLB model
  const gltf = useGLTF("/models/weapons/ak47_with_textures.glb");

  // Apply CS2 composite skin
  useEffect(() => {
    if (!gltf || !skinName) {
      console.log("No skin selected - showing default model");
      return;
    }

    console.log(`Applying CS2 composite skin: ${skinName}`);
    const textureLoader = new THREE.TextureLoader();

    // Load ALL composite inputs: position map, mask map, and paint kit
    Promise.all([
      new Promise<THREE.Texture>((resolve, reject) =>
        textureLoader.load("/models/composite_inputs/ak47/position.png", resolve, undefined, reject)
      ),
      new Promise<THREE.Texture>((resolve, reject) =>
        textureLoader.load("/models/composite_inputs/ak47/masks.png", resolve, undefined, reject)
      ),
      new Promise<THREE.Texture>((resolve, reject) =>
        textureLoader.load(`/models/skins/${skinName}.png`, resolve, undefined, reject)
      ),
    ]).then(([positionMap, maskMap, paintKitTexture]) => {
      console.log("✅ Loaded all composite textures");

      // Set texture wrap mode to repeat for paint kit
      paintKitTexture.wrapS = THREE.RepeatWrapping;
      paintKitTexture.wrapT = THREE.RepeatWrapping;

      gltf.scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Simple approach: just use the paint kit texture with UV wrapping
          // The position map tells us the paint kit is tileable/repeating
          const material = new THREE.MeshStandardMaterial({
            map: paintKitTexture,
            metalness: 0.3,
            roughness: 0.6,
          });

          child.material = material;
          child.material.needsUpdate = true;
          console.log("✅ Applied composite skin to mesh:", child.name);
        }
      });
    }).catch((error) => {
      console.error("❌ Failed to load composite textures:", error);
    });
  }, [gltf, skinName]);

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
function TestScene({ skinName }: { skinName: string | null }) {
  return (
    <>
      {/* Camera */}
      <PerspectiveCamera makeDefault position={[2, 1, 3]} fov={50} near={0.01} far={100} />
      <OrbitControls enableDamping dampingFactor={0.05} minDistance={0.5} maxDistance={10} />

      {/* Lighting */}
      <ambientLight intensity={1.5} />
      <directionalLight position={[5, 5, 5]} intensity={2} />
      <directionalLight position={[-5, 3, -5]} intensity={1} />

      {/* Weapon */}
      <Suspense fallback={null}>
        <TestWeapon skinName={skinName} />
      </Suspense>
    </>
  );
}

/**
 * Test page component
 */
export default function TestWeaponPage() {
  const [skinName, setSkinName] = useState<string | null>(null);

  // Test skins - Simple texture application
  const testSkins = [
    { skin: null, name: "AK-47 (Base Model)" },
    { skin: "fireserpent_ak47", name: "AK-47 | Fire Serpent" },
  ];

  return (
    <div className="fixed inset-0 bg-neutral-900">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-neutral-800/90 backdrop-blur p-4 border-b border-neutral-700">
        <h1 className="font-display text-2xl font-bold text-white mb-2 uppercase">
          🧪 CS2 Skin Test - Simple Texture Application
        </h1>
        <p className="text-neutral-400 text-sm mb-3">
          Testing direct paint kit texture application without composite shader
        </p>

        {/* Skin selector */}
        <div className="flex gap-2 flex-wrap">
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
      </div>

      {/* 3D Canvas */}
      <Canvas
        className="w-full h-full"
        gl={{ antialias: true, alpha: true }}
      >
        <TestScene skinName={skinName} />
      </Canvas>

      {/* Instructions */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-neutral-800/90 backdrop-blur p-4 border-t border-neutral-700">
        <p className="text-neutral-300 text-sm">
          <strong className="text-white">Controls:</strong> Left click + drag to rotate | Scroll to zoom
        </p>
        <p className="text-neutral-400 text-xs mt-1">
          Simple MeshStandardMaterial with paint kit texture. UV mapping may be incorrect.
        </p>
      </div>
    </div>
  );
}
