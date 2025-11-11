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

  useEffect(() => {
    if (!gltf) return;

    console.log("✅ GLTF loaded:", gltf);
    console.log("🎨 Skin pattern:", skinPatternUrl ? "YES" : "NO");

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

    console.log("📏 Model size:", { maxDim, scale });

    // Apply materials
    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        // Apply to body meshes
        if (mesh.name.includes("body_legacy") || mesh.name.includes("body_hd")) {
          const originalMaterial = mesh.material as THREE.MeshStandardMaterial;

          if (skinPatternUrl && positionMap && maskMap && patternTexture) {
            // SIMPLIFIED TEST: Just show pattern texture with position map remapping
            console.log(`🎨 Applying SIMPLIFIED shader to: ${mesh.name}`);
            console.log(`  - Pattern texture:`, patternTexture);
            console.log(`  - Position map:`, positionMap);

            const customMaterial = new THREE.ShaderMaterial({
              uniforms: {
                patternTexture: { value: patternTexture },
                positionMap: { value: positionMap },
              },
              vertexShader: `
                varying vec2 vUv;

                void main() {
                  vUv = uv;
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
              `,
              fragmentShader: `
                uniform sampler2D patternTexture;
                uniform sampler2D positionMap;

                varying vec2 vUv;

                void main() {
                  // Sample position map to get pattern UV coordinates
                  vec4 posData = texture2D(positionMap, vUv);
                  vec2 patternUV = posData.rg; // R=U, G=V (normalized 0-1)

                  // Sample Asiimov pattern texture at remapped UV
                  vec4 patternColor = texture2D(patternTexture, patternUV);

                  // Show pattern directly (no mask blending for now)
                  gl_FragColor = patternColor;
                }
              `,
            });

            mesh.material = customMaterial;
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
