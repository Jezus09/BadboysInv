import { Canvas, useThree, extend } from "@react-three/fiber";
import { useGLTF, PerspectiveCamera } from "@react-three/drei";
import { Suspense, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";
import { OrbitControls as OrbitControlsImpl } from "three/examples/jsm/controls/OrbitControls.js";

// Extend Three.js with OrbitControls
extend({ OrbitControls: OrbitControlsImpl });

interface WeaponModelProps {
  modelUrl: string;
  stickers?: Array<{
    id: string;
    imageUrl: string;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: number;
    slot: number;
  }>;
  onMeshClick?: (point: THREE.Vector3, normal: THREE.Vector3) => void;
}

function WeaponModel({ modelUrl, stickers = [], onMeshClick }: WeaponModelProps) {
  const { scene } = useGLTF(modelUrl);
  const weaponRef = useRef<THREE.Group>(null);
  const [decals, setDecals] = useState<THREE.Mesh[]>([]);

  // Load sticker textures and create decals
  useEffect(() => {
    if (!weaponRef.current || stickers.length === 0) return;

    const textureLoader = new THREE.TextureLoader();
    const newDecals: THREE.Mesh[] = [];

    // Find the weapon mesh (usually the main mesh in the GLB)
    let weaponMesh: THREE.Mesh | null = null;
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && !weaponMesh) {
        weaponMesh = child;
      }
    });

    if (!weaponMesh) {
      console.warn("No mesh found in weapon model");
      return;
    }

    stickers.forEach((sticker) => {
      textureLoader.load(
        sticker.imageUrl,
        (texture) => {
          // Create decal material
          const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            polygonOffset: true,
            polygonOffsetFactor: -4,
            depthTest: true,
            depthWrite: false,
          });

          // Create decal geometry
          const position = new THREE.Vector3(...sticker.position);
          const rotation = new THREE.Euler(...sticker.rotation);
          const size = new THREE.Vector3(sticker.scale, sticker.scale, sticker.scale);

          try {
            const decalGeometry = new DecalGeometry(
              weaponMesh as THREE.Mesh,
              position,
              rotation,
              size
            );

            const decalMesh = new THREE.Mesh(decalGeometry, material);
            decalMesh.userData = { stickerId: sticker.id, slot: sticker.slot };
            newDecals.push(decalMesh);

            if (weaponRef.current) {
              weaponRef.current.add(decalMesh);
            }
          } catch (error) {
            console.error(`Failed to create decal for sticker ${sticker.id}:`, error);
          }
        },
        undefined,
        (error) => {
          console.error(`Failed to load sticker texture ${sticker.imageUrl}:`, error);
        }
      );
    });

    setDecals(newDecals);

    // Cleanup
    return () => {
      newDecals.forEach((decal) => {
        decal.geometry.dispose();
        if (decal.material instanceof THREE.Material) {
          decal.material.dispose();
        }
        if (weaponRef.current) {
          weaponRef.current.remove(decal);
        }
      });
    };
  }, [scene, stickers]);

  // Handle click events for sticker placement
  const handleClick = (event: THREE.Event) => {
    if (!onMeshClick) return;

    event.stopPropagation();
    const intersect = event.intersections[0];

    if (intersect && intersect.point && intersect.face) {
      const point = intersect.point.clone();
      const normal = intersect.face.normal.clone();

      // Transform normal to world space
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(intersect.object.matrixWorld);
      normal.applyMatrix3(normalMatrix).normalize();

      onMeshClick(point, normal);
    }
  };

  return (
    <group ref={weaponRef}>
      <primitive object={scene} onClick={handleClick} />
    </group>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#888" />
    </mesh>
  );
}

function CameraControls() {
  const { camera, gl } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.update();
    }
  });

  return (
    // @ts-ignore - OrbitControls extended type
    <orbitControls
      ref={controlsRef}
      args={[camera, gl.domElement]}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      minDistance={1}
      maxDistance={10}
    />
  );
}

interface Weapon3DViewerProps {
  modelUrl: string;
  stickers?: Array<{
    id: string;
    imageUrl: string;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: number;
    slot: number;
  }>;
  onMeshClick?: (point: THREE.Vector3, normal: THREE.Vector3) => void;
  className?: string;
}

export default function Weapon3DViewer({
  modelUrl,
  stickers,
  onMeshClick,
  className = "",
}: Weapon3DViewerProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas>
        <PerspectiveCamera makeDefault position={[2, 1, 2]} fov={50} />

        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} />

        <Suspense fallback={<LoadingFallback />}>
          <WeaponModel
            modelUrl={modelUrl}
            stickers={stickers}
            onMeshClick={onMeshClick}
          />
        </Suspense>

        <CameraControls />
      </Canvas>
    </div>
  );
}

// Preload a weapon model
export function preloadWeaponModel(modelUrl: string) {
  useGLTF.preload(modelUrl);
}
