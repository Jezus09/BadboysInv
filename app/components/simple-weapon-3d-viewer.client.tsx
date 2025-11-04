import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Suspense, useRef } from "react";
import * as THREE from "three";

interface StickerData {
  id: number;
  imageUrl: string;
  position: [number, number, number];
  rotation: number;
  scale: number;
  slot: number;
}

interface SimpleWeapon3DViewerProps {
  weaponName: string;
  stickers?: StickerData[];
  onSurfaceClick?: (position: [number, number, number], surfaceName: string) => void;
  enableClickToPlace?: boolean;
  className?: string;
}

function StickerMesh({ sticker }: { sticker: StickerData }) {
  try {
    // Use useLoader for proper texture loading with caching
    const texture = useLoader(THREE.TextureLoader, sticker.imageUrl);

    return (
      <mesh
        position={sticker.position}
        rotation={[0, 0, sticker.rotation * (Math.PI / 180)]}
      >
        <planeGeometry args={[0.3 * sticker.scale, 0.3 * sticker.scale]} />
        <meshBasicMaterial
          map={texture}
          transparent
          opacity={1}
          side={THREE.DoubleSide}
          depthTest={true}
          depthWrite={false}
        />
      </mesh>
    );
  } catch (error) {
    console.error("Failed to load sticker texture:", sticker.imageUrl, error);
    // Return a fallback plane with solid color
    return (
      <mesh
        position={sticker.position}
        rotation={[0, 0, sticker.rotation * (Math.PI / 180)]}
      >
        <planeGeometry args={[0.3 * sticker.scale, 0.3 * sticker.scale]} />
        <meshBasicMaterial
          color="#ff0000"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
    );
  }
}

function WeaponBox({
  stickers = [],
  onSurfaceClick,
  enableClickToPlace
}: {
  stickers: StickerData[];
  onSurfaceClick?: (position: [number, number, number], surfaceName: string) => void;
  enableClickToPlace?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  const handleClick = (event: any) => {
    if (!enableClickToPlace || !onSurfaceClick) return;

    event.stopPropagation();
    const point = event.point;
    const position: [number, number, number] = [point.x, point.y, point.z];
    onSurfaceClick(position, "weapon_surface");
  };

  return (
    <group>
      {/* Main weapon body - elongated box to simulate weapon shape */}
      <mesh ref={meshRef} onClick={handleClick} position={[0, 0, 0]}>
        <boxGeometry args={[3, 0.5, 0.3]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Stickers as decals on the weapon */}
      <Suspense fallback={null}>
        {stickers.map((sticker) => (
          <StickerMesh key={sticker.slot} sticker={sticker} />
        ))}
      </Suspense>
    </group>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#666" />
    </mesh>
  );
}

export default function SimpleWeapon3DViewer({
  weaponName,
  stickers = [],
  onSurfaceClick,
  enableClickToPlace = false,
  className = "",
}: SimpleWeapon3DViewerProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        gl={{ preserveDrawingBuffer: true }}
        onCreated={({ gl }) => {
          gl.setClearColor("#1c1917", 1);
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 1, 4]} fov={50} />

        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <directionalLight position={[-5, -5, -5]} intensity={0.5} />

        <Suspense fallback={<LoadingFallback />}>
          <WeaponBox
            stickers={stickers}
            onSurfaceClick={onSurfaceClick}
            enableClickToPlace={enableClickToPlace}
          />
        </Suspense>

        <OrbitControls
          enablePan={false}
          minDistance={2}
          maxDistance={8}
          makeDefault
        />
      </Canvas>
    </div>
  );
}
