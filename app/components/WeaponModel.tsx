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
  // SIMPLE DEBUG - ONLY BASE COLOR
  // ==========================================

  // NO PATTERN - just testing base weapon texture
  // NO POSITION MAP - too complex for now
  // NO GRUNGE/WEAR - causing "kopott" appearance

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
    const scale = 0.8 / maxDim; // Smaller size - not "giga nagy"
    gltf.scene.scale.setScalar(scale);

    console.log("📏 Model scaled:", { maxDim, scale });
  }, [gltf]);

  // ULTRA SIMPLE - Use GLTF's original materials (NO SHADER, NO MODIFICATIONS)
  useEffect(() => {
    if (!gltf) return;

    console.log("🎨 Using original GLTF materials (no modifications)");

    // Just brighten materials slightly for better visibility
    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const material = mesh.material as THREE.MeshStandardMaterial;

        // Set PBR properties (CS2 values)
        if (material) {
          material.metalness = 0.0; // Non-metallic
          material.roughness = 0.42; // CS2 default
          material.needsUpdate = true;
        }

        console.log(`✅ Material configured for: ${mesh.name}`);
      }
    });
  }, [gltf]);

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
