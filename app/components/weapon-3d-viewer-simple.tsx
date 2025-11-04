/**
 * Simple 3D Weapon Viewer with Sticker Decals
 * Uses React Three Fiber + Drei Decal component
 * Based on: https://dev.to/high5dev/applying-an-image-on-a-3d-model-with-react-three-dreis-decal-2a3c
 */
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Decal, useTexture } from "@react-three/drei";
import { Suspense } from "react";

interface StickerData {
  id: number;
  imageUrl: string;
  position: [number, number, number];
  rotation: number;
  scale: number;
}

interface WeaponViewerProps {
  stickers: StickerData[];
  onSurfaceClick?: (position: [number, number, number]) => void;
}

function WeaponBox({ stickers }: { stickers: StickerData[] }) {
  return (
    <mesh castShadow receiveShadow>
      {/* Simple box representing weapon (replace with GLB model later) */}
      <boxGeometry args={[2, 0.3, 0.3]} />
      <meshStandardMaterial color="#4a5568" metalness={0.8} roughness={0.2} />

      {/* Render stickers as decals */}
      {stickers.map((sticker) => (
        <StickerDecal key={sticker.id} sticker={sticker} />
      ))}
    </mesh>
  );
}

function StickerDecal({ sticker }: { sticker: StickerData }) {
  const texture = useTexture(sticker.imageUrl);

  return (
    <Decal
      position={sticker.position}
      rotation={[0, 0, (sticker.rotation * Math.PI) / 180]}
      scale={sticker.scale}
      map={texture}
    />
  );
}

export default function WeaponViewer3DSimple({ stickers, onSurfaceClick }: WeaponViewerProps) {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
          <pointLight position={[-5, 5, 5]} intensity={0.5} />

          {/* Weapon with stickers */}
          <WeaponBox stickers={stickers} />

          {/* Camera controls */}
          <OrbitControls
            enableZoom={true}
            enablePan={true}
            minDistance={1}
            maxDistance={10}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
