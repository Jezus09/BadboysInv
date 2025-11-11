import { useEffect, useRef, useState } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { TextureLoader } from "three";
import * as THREE from "three";

interface WeaponModelProps {
  defIndex: number;
  paintSeed: number;
  wear: number;
  skinTextureUrl?: string; // Optional skin texture URL
}

export function WeaponModel({ defIndex, paintSeed, wear, skinTextureUrl }: WeaponModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [modelPath, setModelPath] = useState<string>("/models/ak47/weapon_rif_ak47.gltf");

  // Load GLTF model
  const gltf = useLoader(GLTFLoader, modelPath);

  // Load skin texture if provided
  const skinTexture = skinTextureUrl ? useLoader(TextureLoader, skinTextureUrl) : null;

  useEffect(() => {
    if (!gltf) return;

    console.log("GLTF loaded:", gltf);
    console.log("Scene children:", gltf.scene.children);

    // Center and scale the model
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Center the model
    gltf.scene.position.sub(center);

    // Scale to fit (target size ~10 units)
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 10 / maxDim;
    gltf.scene.scale.setScalar(scale);

    console.log("Model centered and scaled:", { center, size, scale });

    // Apply wear to materials and skin texture
    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const material = mesh.material as THREE.MeshStandardMaterial;

          // Apply skin texture if available
          if (skinTexture) {
            console.log("🎨 Applying skin texture to material:", material.name);
            material.map = skinTexture;
            material.needsUpdate = true;
          }

          // Apply wear effect (brightness and roughness)
          const brightness = 1.0 - wear * 0.6; // FN=1.0, BS=0.4
          material.color.setRGB(brightness, brightness, brightness);
          material.roughness = 0.42 + wear * 0.4; // FN=0.42, BS=0.82

          console.log(`Material ${material.name || "unnamed"}:`, {
            brightness: brightness.toFixed(2),
            roughness: material.roughness.toFixed(2),
            hasSkinTexture: !!skinTexture,
          });
        }
      }
    });
  }, [gltf, wear, skinTexture]);

  // Rotate model slowly
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={gltf.scene} />
    </group>
  );
}
