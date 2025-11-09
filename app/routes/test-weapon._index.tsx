/*---------------------------------------------------------------------------------------------
 *  CS2 Weapon Model + Skin Texture TEST PAGE
 *  Tests if official Valve OBJ models work with CS2 skin textures
 *--------------------------------------------------------------------------------------------*/

import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, useGLTF } from "@react-three/drei";
import { Suspense } from "react";

/**
 * Test weapon component - loads GLB with embedded textures
 */
function TestWeapon() {
  // Load weapon GLB model (has textures embedded!)
  const gltf = useGLTF("/models/weapons/ak47_cs2.glb");

  console.log("✅ GLB loaded:", gltf);

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
function TestScene() {
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
        <TestWeapon />
      </Suspense>
    </>
  );
}

/**
 * Test page component
 */
export default function TestWeaponPage() {
  return (
    <div className="fixed inset-0 bg-neutral-900">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-neutral-800/90 backdrop-blur p-4 border-b border-neutral-700">
        <h1 className="font-display text-2xl font-bold text-white mb-2 uppercase">
          🧪 CS2 Weapon GLB Test - AK-47 with Embedded Textures
        </h1>
        <p className="text-neutral-400 text-sm">
          Testing official CS2 weapon model (GLB format) from Cults3D - 54 MB file
        </p>
      </div>

      {/* 3D Canvas */}
      <Canvas
        className="w-full h-full"
        gl={{ antialias: true, alpha: true }}
      >
        <TestScene />
      </Canvas>

      {/* Instructions */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-neutral-800/90 backdrop-blur p-4 border-t border-neutral-700">
        <p className="text-neutral-300 text-sm">
          <strong className="text-white">Controls:</strong> Left click + drag to rotate | Scroll to zoom | Right click + drag to pan
        </p>
        <p className="text-neutral-400 text-xs mt-1">
          ✅ If AK-47 shows with proper textures → GLB works! | ❌ If broken/white → Need optimization
        </p>
      </div>
    </div>
  );
}
