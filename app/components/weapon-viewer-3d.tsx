/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, Grid } from "@react-three/drei";
import { Suspense, useRef, useState } from "react";
import { RifleModel } from "./weapon-models";
import { StickerLayer } from "./sticker-decal";
import * as THREE from "three";

interface WeaponViewer3DProps {
  weaponId?: number;
  className?: string;
  stickers?: Array<{
    id: number;
    slot: number;
    position: [number, number, number];
    rotation: number;
    scale: number;
  }>;
  onStickerClick?: (slot: number) => void;
  onSurfaceClick?: (position: [number, number, number], surfaceName: string) => void;
  enableClickToPlace?: boolean;
}

function Scene({
  weaponId,
  stickers,
  onStickerClick,
  onSurfaceClick,
  enableClickToPlace
}: {
  weaponId?: number;
  stickers?: WeaponViewer3DProps["stickers"];
  onStickerClick?: (slot: number) => void;
  onSurfaceClick?: (position: [number, number, number], surfaceName: string) => void;
  enableClickToPlace?: boolean;
}) {
  const { camera, gl } = useThree();
  const [hoveredSurface, setHoveredSurface] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState<[number, number, number] | null>(null);
  const raycaster = useRef(new THREE.Raycaster()).current;
  const pointer = useRef(new THREE.Vector2()).current;

  // Handle pointer move for hover effect
  const handlePointerMove = (event: any) => {
    if (!enableClickToPlace) return;

    const rect = gl.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const scene = gl.domElement.parentElement?.querySelector("canvas");

    // Find weapon surfaces
    const weaponGroup = gl.domElement as any;
    if (weaponGroup.__r3f?.root?.getState) {
      const state = weaponGroup.__r3f.root.getState();
      const intersects = raycaster.intersectObjects(state.scene.children, true);

      // Find first sticker surface
      const surfaceHit = intersects.find((hit) => hit.object.name?.includes("side"));

      if (surfaceHit) {
        setHoveredSurface(surfaceHit.object.name || null);
        setHoverPosition([
          surfaceHit.point.x,
          surfaceHit.point.y,
          surfaceHit.point.z
        ]);
      } else {
        setHoveredSurface(null);
        setHoverPosition(null);
      }
    }
  };

  // Handle click on weapon surface
  const handleClick = (event: any) => {
    if (!enableClickToPlace || !onSurfaceClick) return;

    const rect = gl.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    if ((gl.domElement as any).__r3f?.root?.getState) {
      const state = (gl.domElement as any).__r3f.root.getState();
      const intersects = raycaster.intersectObjects(state.scene.children, true);

      const surfaceHit = intersects.find((hit) => hit.object.name?.includes("side"));

      if (surfaceHit) {
        onSurfaceClick(
          [surfaceHit.point.x, surfaceHit.point.y, surfaceHit.point.z],
          surfaceHit.object.name || "unknown"
        );
      }
    }
  };

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />

      {/* Weapon Model */}
      <Suspense fallback={null}>
        <RifleModel weaponId={weaponId} />
      </Suspense>

      {/* Hover indicator */}
      {enableClickToPlace && hoverPosition && hoveredSurface && (
        <mesh position={hoverPosition}>
          <circleGeometry args={[0.1, 32]} />
          <meshBasicMaterial
            color="#00ff00"
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Stickers Layer */}
      {stickers && stickers.length > 0 && (
        <Suspense fallback={null}>
          <StickerLayer stickers={stickers} onStickerClick={onStickerClick} />
        </Suspense>
      )}

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

      {/* Event handlers */}
      {enableClickToPlace && (
        <mesh
          onPointerMove={handlePointerMove}
          onClick={handleClick}
          visible={false}
        >
          <planeGeometry args={[100, 100]} />
        </mesh>
      )}
    </>
  );
}

export function WeaponViewer3D({
  weaponId,
  className = "",
  stickers,
  onStickerClick,
  onSurfaceClick,
  enableClickToPlace = false
}: WeaponViewer3DProps) {
  return (
    <div className={`relative w-full h-full ${className}`}>
      <Canvas
        shadows
        camera={{ position: [3, 2, 3], fov: 50 }}
        className="bg-gradient-to-br from-neutral-900 to-neutral-800"
      >
        <Scene
          weaponId={weaponId}
          stickers={stickers}
          onStickerClick={onStickerClick}
          onSurfaceClick={onSurfaceClick}
          enableClickToPlace={enableClickToPlace}
        />
      </Canvas>

      {/* Overlay UI */}
      <div className="absolute top-4 left-4 rounded-lg border border-neutral-700 bg-black/60 px-3 py-2 backdrop-blur-sm">
        <p className="text-xs font-bold uppercase text-neutral-400">3D Weapon Viewer</p>
        <p className="text-sm text-white">
          {enableClickToPlace ? "Click weapon to place sticker" : "Drag to rotate • Scroll to zoom"}
        </p>
      </div>

      {/* Debug Info */}
      <div className="absolute bottom-4 right-4 rounded-lg border border-neutral-700 bg-black/60 px-3 py-2 backdrop-blur-sm">
        <p className="text-xs text-neutral-400">
          Model: Procedural Rifle ({stickers?.length || 0} stickers)
        </p>
        <p className="text-[10px] text-neutral-500">
          GLB models: Drop files in /public/models/
        </p>
      </div>
    </div>
  );
}
