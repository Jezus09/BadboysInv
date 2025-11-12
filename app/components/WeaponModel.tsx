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

  // ==========================================
  // PURE CS3D METHOD - EXACT IMPLEMENTATION
  // ==========================================

  // Pattern texture (skin design - e.g., Asiimov)
  // If skinPatternUrl is provided, load it. Otherwise, use null.
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

    // Scale to fit viewport (CS.MONEY size)
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 0.6 / maxDim; // CS.MONEY-like size
    gltf.scene.scale.setScalar(scale);

    console.log("📏 Model scaled:", { maxDim, scale });
  }, [gltf]);

  // Apply PURE CS3D METHOD - Exact implementation from CS3D/base/assets/js/render.js
  useEffect(() => {
    if (!gltf) return;

    // Only apply skin if skinPatternUrl is provided
    if (!skinPatternUrl || !patternTexture) {
      console.log("🎨 No skin - using vanilla GLTF textures");
      return;
    }

    console.log("🎨 Applying PURE CS3D method - replacing texture.image on ALL meshes!");

    // CS3D Method: Apply skin texture to ALL meshes in the model
    // Source: CS3D/base/assets/js/render.js lines 97-102
    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const material = mesh.material as THREE.MeshStandardMaterial;

        // CS3D does this: mesh.material.map.image = texture.image
        if (material && material.map) {
          console.log(`🎨 Applying skin to mesh: ${mesh.name}`);
          material.map.image = patternTexture.image;
          material.map.needsUpdate = true;
          // CS3D does NOT modify metalness/roughness - keeps GLTF defaults!
        }
      }
    });

    console.log("✅ PURE CS3D method applied!");
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
