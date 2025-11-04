/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Decal, useTexture } from "@react-three/drei";
import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface StickerDecalProps {
  stickerId: number;
  position: [number, number, number];
  rotation: number; // degrees
  scale: number;
  onClick?: () => void;
  isSelected?: boolean;
}

/**
 * Renders a sticker as a decal on the weapon surface
 */
export function StickerDecal({
  stickerId,
  position,
  rotation,
  scale,
  onClick,
  isSelected = false
}: StickerDecalProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Load sticker texture
  // Note: Sticker images should be in /public/images/stickers/{id}.png
  // For now, we'll use a placeholder texture
  const texture = useTexture("/images/placeholder-sticker.svg", (tex) => {
    if (Array.isArray(tex)) return;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
  });

  // Animate selected sticker (pulse effect)
  useFrame((state) => {
    if (meshRef.current && isSelected) {
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.05 + 1;
      meshRef.current.scale.setScalar(scale * pulse);
    } else if (meshRef.current) {
      meshRef.current.scale.setScalar(scale);
    }
  });

  // Convert rotation from degrees to radians
  const rotationRad = (rotation * Math.PI) / 180;

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={[0, 0, rotationRad]}
      onClick={onClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <planeGeometry args={[0.3, 0.3]} />
      <meshStandardMaterial
        map={texture}
        transparent
        alphaTest={0.5}
        side={THREE.DoubleSide}
        emissive={hovered || isSelected ? "#ffffff" : "#000000"}
        emissiveIntensity={hovered ? 0.3 : isSelected ? 0.5 : 0}
      />

      {/* Selection indicator ring */}
      {isSelected && (
        <mesh rotation={[0, 0, 0]}>
          <ringGeometry args={[0.18, 0.2, 32]} />
          <meshBasicMaterial color="#00ff00" side={THREE.DoubleSide} />
        </mesh>
      )}
    </mesh>
  );
}

/**
 * Sticker layer manager - handles multiple stickers on weapon
 */
export function StickerLayer({
  stickers,
  onStickerClick
}: {
  stickers: Array<{
    id: number;
    slot: number;
    position: [number, number, number];
    rotation: number;
    scale: number;
  }>;
  onStickerClick?: (slot: number) => void;
}) {
  const [selectedSlot, setSelectedSlot] = useState<number>();

  return (
    <group>
      {stickers.map((sticker) => (
        <StickerDecal
          key={sticker.slot}
          stickerId={sticker.id}
          position={sticker.position}
          rotation={sticker.rotation}
          scale={sticker.scale}
          isSelected={selectedSlot === sticker.slot}
          onClick={() => {
            setSelectedSlot(sticker.slot);
            onStickerClick?.(sticker.slot);
          }}
        />
      ))}
    </group>
  );
}

/**
 * Preview sticker (ghost/transparent before placement)
 */
export function StickerPreview({
  stickerId,
  position,
  rotation,
  scale
}: {
  stickerId: number;
  position: [number, number, number];
  rotation: number;
  scale: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Animate preview (breathing effect)
  useFrame((state) => {
    if (meshRef.current) {
      const breath = Math.sin(state.clock.elapsedTime * 2) * 0.1;
      meshRef.current.position.z = position[2] + breath * 0.02;
    }
  });

  const texture = useTexture("/images/placeholder-sticker.svg");
  const rotationRad = (rotation * Math.PI) / 180;

  return (
    <mesh ref={meshRef} position={position} rotation={[0, 0, rotationRad]}>
      <planeGeometry args={[0.3 * scale, 0.3 * scale]} />
      <meshStandardMaterial
        map={texture}
        transparent
        opacity={0.6}
        alphaTest={0.3}
        side={THREE.DoubleSide}
        emissive="#00ff00"
        emissiveIntensity={0.5}
      />
    </mesh>
  );
}
