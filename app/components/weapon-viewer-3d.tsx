/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, PerspectiveCamera } from "@react-three/drei";
import { Suspense } from "react";

interface WeaponViewer3DProps {
  weaponId?: number;
  className?: string;
}

function WeaponPlaceholder() {
  return (
    <mesh>
      {/* Weapon body (main box) */}
      <boxGeometry args={[3, 0.3, 0.3]} />
      <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughness={0.2} />

      {/* Barrel */}
      <mesh position={[1.2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1, 16]} rotation={[0, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Stock */}
      <mesh position={[-1.3, 0, 0]}>
        <boxGeometry args={[0.8, 0.25, 0.2]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Trigger guard */}
      <mesh position={[-0.2, -0.2, 0]}>
        <boxGeometry args={[0.3, 0.1, 0.15]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.3} />
      </mesh>
    </mesh>
  );
}

function Scene() {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />

      {/* Weapon Model */}
      <Suspense fallback={null}>
        <WeaponPlaceholder />
      </Suspense>

      {/* Ground Grid */}
      <Grid
        args={[10, 10]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#6f6f6f"
        sectionSize={1}
        sectionThickness={1}
        sectionColor="#9d4b4b"
        fadeDistance={25}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />

      {/* Camera Controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={10}
        enablePan={true}
        target={[0, 0, 0]}
      />

      {/* Environment Lighting */}
      <Environment preset="studio" />
    </>
  );
}

export function WeaponViewer3D({ weaponId, className = "" }: WeaponViewer3DProps) {
  return (
    <div className={`relative w-full h-full ${className}`}>
      <Canvas
        shadows
        camera={{ position: [3, 2, 3], fov: 50 }}
        className="bg-gradient-to-br from-neutral-900 to-neutral-800"
      >
        <Scene />
      </Canvas>

      {/* Overlay UI */}
      <div className="absolute top-4 left-4 rounded-lg border border-neutral-700 bg-black/60 px-3 py-2 backdrop-blur-sm">
        <p className="text-xs font-bold uppercase text-neutral-400">3D Weapon Viewer</p>
        <p className="text-sm text-white">Drag to rotate • Scroll to zoom</p>
      </div>

      {/* Debug Info */}
      <div className="absolute bottom-4 right-4 rounded-lg border border-neutral-700 bg-black/60 px-3 py-2 backdrop-blur-sm">
        <p className="text-xs text-neutral-400">
          Model: Placeholder (AK-47/M4A1-S coming soon)
        </p>
      </div>
    </div>
  );
}
