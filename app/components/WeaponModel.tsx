import { useEffect, useRef, useState } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { TextureLoader } from "three";
import * as THREE from "three";

interface WeaponModelProps {
  defIndex: number;
  paintSeed: number;
  wear: number;
  skinPatternUrl?: string; // Pattern texture (e.g., asiimov_pattern.png)
}

export function WeaponModel({ defIndex, paintSeed, wear, skinPatternUrl }: WeaponModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [modelPath, setModelPath] = useState<string>("/models/ak47/weapon_rif_ak47.gltf");

  // Load GLTF model
  const gltf = useLoader(GLTFLoader, modelPath);

  // Load textures for composite shader approach
  const positionMap = skinPatternUrl ? useLoader(TextureLoader, "/models/ak47/position_map_normalized.png") : null;
  const maskMap = skinPatternUrl ? useLoader(TextureLoader, "/models/ak47/mask.png") : null;
  const patternTexture = skinPatternUrl ? useLoader(TextureLoader, skinPatternUrl) : null;

  // Separate effect for scaling - runs once when GLTF loads
  useEffect(() => {
    if (!gltf) return;

    console.log("✅ GLTF loaded - applying scale");

    // Center and scale the model
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Center the model
    gltf.scene.position.sub(center);

    // Scale to fit
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 1.5 / maxDim;
    gltf.scene.scale.setScalar(scale);

    console.log("📏 Model scaled:", { maxDim, scale });
  }, [gltf]);

  // Separate effect for materials - runs when textures change
  useEffect(() => {
    if (!gltf) return;

    console.log("🎨 Applying materials, skin:", skinPatternUrl ? "YES" : "NO");

    // Apply materials
    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        // Apply to body meshes
        if (mesh.name.includes("body_legacy") || mesh.name.includes("body_hd")) {
          const originalMaterial = mesh.material as THREE.MeshStandardMaterial;

          if (skinPatternUrl && patternTexture) {
            // WORKING VERSION: Just apply pattern directly (wrong UV but VISIBLE)
            console.log(`🎨 Applying pattern texture to: ${mesh.name}`);

            const simpleMaterial = new THREE.MeshStandardMaterial({
              map: patternTexture,
              roughness: 0.5,
              metalness: 0.1,
            });

            mesh.material = simpleMaterial;
            console.log(`✅ Material applied successfully`);
          } else {
            // NO SKIN - Simple material modification
            const brightness = 1.0 - wear * 0.6;
            originalMaterial.color.setRGB(brightness, brightness, brightness);
            originalMaterial.roughness = 0.42 + wear * 0.4;
          }
        }
      }
    });
  }, [gltf, wear, skinPatternUrl, positionMap, maskMap, patternTexture]);

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
