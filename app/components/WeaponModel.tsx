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
  // CS3D + MASK for proper blending!
  // ==========================================

  // Pattern texture (skin design - e.g., Asiimov)
  const patternTexture = skinPatternUrl ? useLoader(TextureLoader, skinPatternUrl) : null;

  // Base texture (vanilla AK-47)
  const baseColor = useLoader(TextureLoader, "/models/ak47/materials/ak47_default_color.png");

  // Mask texture - defines WHERE skin appears (white = skin, black = vanilla)
  const maskTexture = skinPatternUrl ? useLoader(TextureLoader, "/models/ak47/materials/composite_inputs/weapon_rif_ak47_masks.png") : null;

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

  // Apply CS3D METHOD + SELECTIVE texturing based on mesh name!
  useEffect(() => {
    if (!gltf) return;

    console.log("🎨 Applying CS3D method with selective texturing!");

    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const material = mesh.material as THREE.MeshStandardMaterial;

        if (material && material.map) {
          const meshName = mesh.name.toLowerCase();

          // Check if this mesh should get skin or vanilla texture
          const isMagazine = meshName.includes('mag') || meshName.includes('clip');
          const isGrip = meshName.includes('grip') || meshName.includes('handle');
          const isStock = meshName.includes('stock');

          // Magazine, grip, stock = ALWAYS vanilla
          if (isMagazine || isGrip || isStock) {
            material.map.image = baseColor.image;
            material.metalness = 0.1; // Slight metal
            material.roughness = 0.6; // Not too shiny
            material.map.needsUpdate = true;
            console.log(`✅ Vanilla texture for ${mesh.name}`);
          }
          // Body = skin if available
          else if (skinPatternUrl && patternTexture) {
            material.map.image = patternTexture.image;
            material.metalness = 0.0; // Non-metallic (painted)
            material.roughness = 0.42; // CS2 value
            material.map.needsUpdate = true;
            console.log(`✅ Skin texture for ${mesh.name}`);
          }
          // No skin = vanilla
          else {
            material.map.image = baseColor.image;
            material.metalness = 0.05;
            material.roughness = 0.5;
            material.map.needsUpdate = true;
            console.log(`✅ Vanilla texture for ${mesh.name}`);
          }
        }
      }
    });
  }, [gltf, patternTexture, baseColor, maskTexture, skinPatternUrl]);

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
