import { useEffect, useRef, useState } from "react";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { TextureLoader } from "three";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
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

  // ==========================================
  // ULTRA SIMPLE - DIRECT UV MAPPING (NO POSITION MAP!)
  // ==========================================

  // Pattern texture (skin design - e.g., Asiimov)
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
    const scale = 0.5 / maxDim; // MUCH smaller - not "bazi nagy"
    gltf.scene.scale.setScalar(scale);

    console.log("📏 Model scaled:", { maxDim, scale });
  }, [gltf]);

  // Apply ULTRA SIMPLE texture replacement (like inspect3d)
  useEffect(() => {
    if (!gltf) return;

    // If no skin, use vanilla materials
    if (!skinPatternUrl || !patternTexture) {
      console.log("🎨 No skin - using vanilla materials");

      gltf.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const material = mesh.material as THREE.MeshStandardMaterial;

          if (material) {
            material.metalness = 0.0;
            material.roughness = 0.42;
            material.needsUpdate = true;
          }
        }
      });
      return;
    }

    console.log("🎨 Applying ULTRA SIMPLE skin texture (direct UV, NO position map)");

    // Configure pattern texture for GLTF
    patternTexture.flipY = false; // CRITICAL for GLTF models!
    patternTexture.minFilter = THREE.LinearFilter;
    patternTexture.magFilter = THREE.LinearFilter;
    patternTexture.anisotropy = 16;

    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const material = mesh.material as THREE.MeshStandardMaterial;

        if (material) {
          // Apply skin texture to ALL meshes (simple replacement)
          material.map = patternTexture;
          material.metalness = 0.0; // Non-metallic
          material.roughness = 0.42; // CS2 default
          material.needsUpdate = true;

          console.log(`✅ Simple texture applied to: ${mesh.name}`);
        }
      }
    });
  }, [gltf, patternTexture, skinPatternUrl]);

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
