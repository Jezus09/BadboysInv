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
  // CS.MONEY STYLE - NO POSITION MAP!
  // ==========================================

  // Pattern texture (skin design - e.g., Asiimov)
  const patternTexture = skinPatternUrl ? useLoader(TextureLoader, skinPatternUrl) : null;

  // Material mask - defines paintable areas (like CS.MONEY)
  const maskTexture = skinPatternUrl ? useLoader(TextureLoader, "/models/ak47/materials/composite_inputs/weapon_rif_ak47_masks.png") : null;

  // Base textures (vanilla AK-47)
  const baseColor = useLoader(TextureLoader, "/models/ak47/materials/ak47_default_color.png");
  const normalMap = useLoader(TextureLoader, "/models/ak47/materials/ak47_default_normal.png");
  const roughnessMap = useLoader(TextureLoader, "/models/ak47/materials/ak47_default_rough.png");

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

  // Apply CS.MONEY-style MeshStandardMaterial with simple texture (NO complex blending!)
  useEffect(() => {
    if (!gltf || !baseColor) return;

    console.log("🎨 Applying CS.MONEY-style materials");

    // Configure textures
    baseColor.flipY = false;
    normalMap.flipY = false;
    roughnessMap.flipY = false;

    if (patternTexture) {
      patternTexture.flipY = false;
    }

    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        // Create MeshStandardMaterial (CS.MONEY uses this!)
        const material = new THREE.MeshStandardMaterial({
          map: skinPatternUrl && patternTexture ? patternTexture : baseColor,
          normalMap: normalMap,
          roughnessMap: roughnessMap,
          metalness: 0.0, // CS.MONEY value
          roughness: 0.42, // CS.MONEY value
        });

        mesh.material = material;
        mesh.material.needsUpdate = true;

        console.log(`✅ Material applied to ${mesh.name}: ${skinPatternUrl ? 'SKIN' : 'VANILLA'}`);
      }
    });
  }, [gltf, patternTexture, baseColor, normalMap, roughnessMap, skinPatternUrl]);

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
