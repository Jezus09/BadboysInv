import { useEffect, useRef, useState } from "react";
import { useLoader } from "@react-three/fiber";
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

  // Load pattern texture (SIMPLE - no position map, no mask, no grunge)
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

    // Scale to fit viewport
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 1.8 / maxDim; // Larger size - easy to inspect
    gltf.scene.scale.setScalar(scale);

    console.log("📏 Model scaled:", { maxDim, scale });
  }, [gltf]);

  // Separate effect for materials - runs when textures change
  useEffect(() => {
    if (!gltf) return;

    console.log("🎨 Applying materials, skin:", skinPatternUrl ? "YES" : "NO");

    // SIMPLE APPROACH - Based on inspect3d + Three.js community best practices
    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        // Apply to body meshes ONLY (NOT magazine/clip)
        if (mesh.name.includes("body_legacy") || mesh.name.includes("body_hd")) {
          const material = mesh.material as THREE.MeshStandardMaterial;

          if (skinPatternUrl && patternTexture) {
            console.log(`🎨 Applying skin texture to: ${mesh.name}`);

            // SIMPLE TEXTURE REPLACEMENT - No custom shader needed!
            // This is how inspect3d and other viewers do it

            // Configure texture (IMPORTANT for GLTF models)
            patternTexture.flipY = false; // CRITICAL for GLTF!
            patternTexture.minFilter = THREE.LinearFilter;
            patternTexture.magFilter = THREE.LinearFilter;
            patternTexture.anisotropy = 16;
            patternTexture.wrapS = THREE.ClampToEdgeWrapping;
            patternTexture.wrapT = THREE.ClampToEdgeWrapping;

            // Apply texture to material
            material.map = patternTexture;
            material.needsUpdate = true;

            // Wear effect
            const brightness = 1.0 - wear * 0.6;
            material.color.setRGB(brightness, brightness, brightness);
            material.roughness = 0.42 + wear * 0.4;

            console.log(`✅ Skin texture applied (simple map replacement)`);
          } else {
            // NO SKIN - Simple brightness modification
            const brightness = 1.0 - wear * 0.6;
            material.color.setRGB(brightness, brightness, brightness);
            material.roughness = 0.42 + wear * 0.4;
          }
        } else if (mesh.name.includes("clip") || mesh.name.includes("mag")) {
          // Magazine/Clip meshes - brighten them
          const material = mesh.material as THREE.MeshStandardMaterial;
          if (material.map) {
            material.color.setRGB(1.5, 1.5, 1.5);
          } else {
            material.color.setRGB(0.3, 0.3, 0.3);
          }
          console.log(`🔧 Magazine brightened: ${mesh.name}`);
        }
      }
    });
  }, [gltf, wear, skinPatternUrl, patternTexture]);

  // NO ROTATION - User requested to remove it
  // useFrame((state, delta) => {
  //   if (groupRef.current) {
  //     groupRef.current.rotation.z += delta * 0.2;
  //   }
  // });

  return (
    <group ref={groupRef}>
      <primitive object={gltf.scene} />
    </group>
  );
}
