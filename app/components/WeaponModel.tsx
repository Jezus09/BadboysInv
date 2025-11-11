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

  // Load textures for CS2 composite shader approach
  const positionMap = skinPatternUrl ? useLoader(TextureLoader, "/textures/position_map.png") : null;
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

    // Scale to fit
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 1.5 / maxDim;
    gltf.scene.scale.setScalar(scale);

    console.log("📏 Model scaled:", { maxDim, scale });
  }, [gltf]);

  // Separate effect for materials - runs when textures change
  useEffect(() => {
    if (!gltf) return;

    console.log("🎨 Applying materials, skin:", skinPatternUrl ? "YES" : "NO");

    // Apply materials
    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        // Apply to body meshes
        if (mesh.name.includes("body_legacy") || mesh.name.includes("body_hd")) {
          const originalMaterial = mesh.material as THREE.MeshStandardMaterial;

          if (skinPatternUrl && patternTexture && positionMap) {
            // CS2 COMPOSITE SHADER: Use position map for UV remapping
            console.log(`🎨 Applying CS2 composite shader to: ${mesh.name}`);

            // Get base texture from original material
            const baseTexture = originalMaterial.map;

            // Create custom shader material
            const shaderMaterial = new THREE.ShaderMaterial({
              uniforms: {
                baseTexture: { value: baseTexture },
                patternTexture: { value: patternTexture },
                positionMap: { value: positionMap },
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
                uniform float wearAmount;
                uniform float brightness;

                varying vec2 vUv;
                varying vec3 vNormal;

                void main() {
                  // Sample position map to get pattern UV coordinates
                  vec4 posData = texture2D(positionMap, vUv);
                  vec2 patternUV = posData.rg; // R=U, G=V

                  // Sample pattern at remapped UV
                  vec4 patternColor = texture2D(patternTexture, patternUV);

                  // Sample base texture
                  vec4 baseColor = texture2D(baseTexture, vUv);

                  // Blend base + pattern (simple mix)
                  vec4 finalColor = mix(baseColor, patternColor, 0.9);

                  // Apply wear-based brightness
                  finalColor.rgb *= brightness;

                  // Simple directional lighting
                  vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
                  float diff = max(dot(vNormal, lightDir), 0.3);
                  finalColor.rgb *= diff;

                  gl_FragColor = finalColor;
                }
              `,
            });

            mesh.material = shaderMaterial;
            console.log(`✅ CS2 composite shader applied with position map UV remapping`);
          } else {
            // NO SKIN - Simple material modification
            const brightness = 1.0 - wear * 0.6;
            originalMaterial.color.setRGB(brightness, brightness, brightness);
            originalMaterial.roughness = 0.42 + wear * 0.4;
          }
        }
      }
    });
  }, [gltf, wear, skinPatternUrl, positionMap, patternTexture]);

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
