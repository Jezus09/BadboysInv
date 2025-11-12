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
  // CS3D METHOD - SIMPLE TEXTURE REPLACEMENT
  // ==========================================
  // Based on CS3D (SamJUK/CS3D): Simple material.map.image replacement
  // NO position map, NO UV remapping, NO complex shader
  // This is proven to work for most CS2 skins!

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

    // Scale to fit viewport (CS.MONEY size)
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 0.6 / maxDim; // CS.MONEY-like size
    gltf.scene.scale.setScalar(scale);

    console.log("📏 Model scaled:", { maxDim, scale });
  }, [gltf]);

  // Apply CS3D METHOD - Simple texture replacement
  useEffect(() => {
    if (!gltf) return;

    // Only apply skin if skinPatternUrl is provided
    if (!skinPatternUrl || !patternTexture) {
      console.log("🎨 No skin - using vanilla GLTF textures");
      return;
    }

    console.log("🎨 Applying CS3D simple method!");

    // Configure pattern texture (CRITICAL for GLTF compatibility!)
    patternTexture.flipY = false;  // GLTF uses different Y-axis orientation
    patternTexture.minFilter = THREE.LinearFilter;
    patternTexture.magFilter = THREE.LinearFilter;
    patternTexture.anisotropy = 16; // Better texture quality at angles

    // CS2 material values
    const paintRoughness = 0.42;   // g_flPaintRoughness from .vmat

    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const material = mesh.material as THREE.MeshStandardMaterial;

        if (material && material.map) {
          console.log(`🎨 Applying CS3D method to: ${mesh.name}`);

          // CS3D METHOD: Simply replace the material.map with pattern texture
          // This is how CS3D, inspect3d, and CS.MONEY do it!
          material.map = patternTexture;
          material.needsUpdate = true;

          // CS2-accurate PBR properties (from .vmat files)
          material.metalness = 0.0; // Weapon skins are NOT metallic!
          material.roughness = paintRoughness + wear * 0.4; // Wear increases roughness
        }
      }
    });

    console.log("✅ CS3D simple method applied!");
  }, [gltf, patternTexture, skinPatternUrl, wear]);

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
