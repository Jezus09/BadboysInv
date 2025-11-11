import { useEffect, useRef, useState } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
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

  useEffect(() => {
    if (!gltf) return;

    console.log("✅ GLTF loaded:", gltf);

    // Center and scale the model - SMALLER SIZE
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Center the model
    gltf.scene.position.sub(center);

    // Scale to fit - MUCH SMALLER (2 units instead of 5)
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim;
    gltf.scene.scale.setScalar(scale);

    console.log("📏 Model size:", { center, size, scale });

    // Simple material modifications - NO COMPOSITE SHADER
    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        console.log(`Found mesh: "${mesh.name}"`);

        if (mesh.material) {
          const material = mesh.material as THREE.MeshStandardMaterial;

          // Apply wear effect (brightness and roughness)
          const brightness = 1.0 - wear * 0.6; // FN=1.0, BS=0.4
          material.color.setRGB(brightness, brightness, brightness);
          material.roughness = 0.42 + wear * 0.4; // FN=0.42, BS=0.82

          console.log(`Material ${material.name || "unnamed"}:`, {
            brightness: brightness.toFixed(2),
            roughness: material.roughness.toFixed(2),
          });
        }
      }
    });
  }, [gltf, wear]);

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
