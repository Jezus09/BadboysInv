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
            // COMPOSITE SHADER APPROACH with normalized position map
            console.log(`🎨 Applying composite shader to: ${mesh.name}`);

            const customMaterial = new THREE.ShaderMaterial({
              uniforms: {
                baseTexture: { value: originalMaterial.map },
                patternTexture: { value: patternTexture },
                positionMap: { value: positionMap },
                maskMap: { value: maskMap },
                wearAmount: { value: wear },
                brightness: { value: 1.0 - wear * 0.6 },
              },
              vertexShader: `
                varying vec2 vUv;
                varying vec3 vNormal;

                void main() {
                  vUv = uv;
                  vNormal = normalize(normalMatrix * normal);
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
              `,
              fragmentShader: `
                uniform sampler2D baseTexture;
                uniform sampler2D patternTexture;
                uniform sampler2D positionMap;
                uniform sampler2D maskMap;
                uniform float wearAmount;
                uniform float brightness;

                varying vec2 vUv;
                varying vec3 vNormal;

                void main() {
                  // Sample position map (normalized UV coordinates in R/G channels)
                  vec4 posData = texture2D(positionMap, vUv);
                  vec2 patternUV = posData.rg; // Already normalized to 0-1

                  // Sample pattern texture
                  vec4 patternColor = texture2D(patternTexture, patternUV);

                  // Sample mask
                  float maskValue = texture2D(maskMap, vUv).r;

                  // Use pattern color directly (ignore base texture for now)
                  vec4 finalColor = patternColor;

                  // Apply mask blending with gray for areas without pattern
                  finalColor = mix(vec4(0.5, 0.5, 0.5, 1.0), patternColor, maskValue);

                  // Apply wear-based brightness
                  finalColor.rgb *= brightness;

                  // Simple directional lighting
                  vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
                  float NdotL = max(dot(vNormal, lightDir), 0.0);
                  finalColor.rgb *= 0.5 + 0.5 * NdotL;

                  gl_FragColor = finalColor;
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
