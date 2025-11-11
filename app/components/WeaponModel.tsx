import { useEffect, useRef, useState } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { TextureLoader } from "three";
import * as THREE from "three";

interface WeaponModelProps {
  defIndex: number;
  paintSeed: number;
  wear: number;
  skinTextureUrl?: string;
}

export function WeaponModel({ defIndex, paintSeed, wear, skinTextureUrl }: WeaponModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [modelPath, setModelPath] = useState<string>("/models/ak47/weapon_rif_ak47.gltf");

  // Load GLTF model
  const gltf = useLoader(GLTFLoader, modelPath);

  // Load baked skin texture (simple texture swap approach)
  const skinTexture = skinTextureUrl ? useLoader(TextureLoader, skinTextureUrl) : null;

  useEffect(() => {
    if (!gltf) return;

    console.log("✅ GLTF loaded:", gltf);
    console.log("🎨 Skin texture:", skinTextureUrl ? "YES" : "NO");

    // Center and scale the model
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Center the model
    gltf.scene.position.sub(center);

    // Scale to fit - EVEN SMALLER (1.5 units instead of 2)
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 1.5 / maxDim;
    gltf.scene.scale.setScalar(scale);

    console.log("📏 Model size:", {
      originalSize: size,
      maxDim,
      scale,
      finalSize: {
        x: size.x * scale,
        y: size.y * scale,
        z: size.z * scale
      }
    });

    // Apply materials - SIMPLIFIED (no complex shader)
    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        console.log(`Found mesh: "${mesh.name}"`);

        // Apply to body meshes
        if (mesh.name.includes("body_legacy") || mesh.name.includes("body_hd")) {
          const material = mesh.material as THREE.MeshStandardMaterial;

          // Simple texture swap - Use baked skin texture if available
          if (skinTexture) {
            console.log(`🎨 Applying baked skin texture to: ${mesh.name}`);
            material.map = skinTexture;
            material.needsUpdate = true;
          }

          // Apply wear effect (brightness and roughness)
          const brightness = 1.0 - wear * 0.6; // FN=1.0, BS=0.4
          material.color.setRGB(brightness, brightness, brightness);
          material.roughness = 0.42 + wear * 0.4; // FN=0.42, BS=0.82

          console.log(`Material ${mesh.name}:`, {
            hasSkin: !!skinTexture,
            brightness: brightness.toFixed(2),
            roughness: material.roughness.toFixed(2),
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
