/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useGLTF, useTexture } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

/**
 * Improved procedural weapon model (looks more like a rifle)
 * This is a placeholder until we load real GLB models
 */
export function RifleModel({ weaponId }: { weaponId?: number }) {
  return (
    <group>
      {/* Main body (receiver) */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.25, 0.3]} />
        <meshStandardMaterial
          color="#2a2a2a"
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* Barrel */}
      <mesh position={[1.2, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 1.2, 16]} />
        <meshStandardMaterial
          color="#1a1a1a"
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Handguard */}
      <mesh position={[0.5, -0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.15, 0.25]} />
        <meshStandardMaterial
          color="#3a3a3a"
          metalness={0.5}
          roughness={0.4}
        />
      </mesh>

      {/* Stock (shoulder rest) */}
      <mesh position={[-0.9, 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.6, 0.2, 0.18]} />
        <meshStandardMaterial
          color="#4a4a4a"
          metalness={0.3}
          roughness={0.6}
        />
      </mesh>

      {/* Pistol grip */}
      <mesh position={[-0.3, -0.25, 0]} rotation={[0, 0, -0.3]} castShadow>
        <boxGeometry args={[0.15, 0.35, 0.2]} />
        <meshStandardMaterial
          color="#2a2a2a"
          metalness={0.5}
          roughness={0.5}
        />
      </mesh>

      {/* Magazine */}
      <mesh position={[-0.15, -0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.12, 0.5, 0.18]} />
        <meshStandardMaterial
          color="#3a3a3a"
          metalness={0.6}
          roughness={0.4}
        />
      </mesh>

      {/* Trigger guard */}
      <mesh position={[-0.25, -0.15, 0]} castShadow>
        <torusGeometry args={[0.08, 0.02, 8, 16, Math.PI]} />
        <meshStandardMaterial
          color="#2a2a2a"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Front sight */}
      <mesh position={[1.6, 0.15, 0]} castShadow>
        <boxGeometry args={[0.05, 0.08, 0.05]} />
        <meshStandardMaterial
          color="#1a1a1a"
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Rear sight */}
      <mesh position={[0.3, 0.15, 0]} castShadow>
        <boxGeometry args={[0.05, 0.1, 0.08]} />
        <meshStandardMaterial
          color="#1a1a1a"
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Rail system (top) */}
      <mesh position={[0.2, 0.13, 0]} castShadow>
        <boxGeometry args={[1, 0.03, 0.15]} />
        <meshStandardMaterial
          color="#2a2a2a"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Sticker surface planes (invisible, used for raycasting) */}
      <StickerSurface position={[0.3, 0, 0.16]} rotation={[0, 0, 0]} name="right-side" />
      <StickerSurface position={[0.3, 0, -0.16]} rotation={[0, Math.PI, 0]} name="left-side" />
      <StickerSurface position={[0.5, -0.08, 0.13]} rotation={[0, 0, 0]} name="handguard-right" />
      <StickerSurface position={[0.5, -0.08, -0.13]} rotation={[0, Math.PI, 0]} name="handguard-left" />
    </group>
  );
}

/**
 * Invisible plane for sticker placement detection
 */
function StickerSurface({
  position,
  rotation,
  name
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  name: string;
}) {
  return (
    <mesh position={position} rotation={rotation} name={name}>
      <planeGeometry args={[1, 0.5]} />
      <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

/**
 * Load weapon model from GLB file (for future use)
 * Usage: <WeaponModelGLB path="/models/m4a1s.glb" />
 */
export function WeaponModelGLB({ path }: { path: string }) {
  const { scene } = useGLTF(path);
  const modelRef = useRef<THREE.Group>(null);

  return (
    <group ref={modelRef}>
      <primitive object={scene.clone()} castShadow receiveShadow />
    </group>
  );
}

/**
 * Preload GLB models
 */
export function preloadWeaponModels() {
  // Preload models when available
  // useGLTF.preload('/models/m4a1s.glb');
  // useGLTF.preload('/models/ak47.glb');
}
