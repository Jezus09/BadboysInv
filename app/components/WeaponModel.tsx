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

  // Load pattern texture + AK-47 specific position map
  const positionMap = skinPatternUrl ? useLoader(TextureLoader, "/textures/ak47_position_map.png") : null;
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

    // Scale to fit viewport properly
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 1.0 / maxDim; // Balanced size
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
            // CS2 COMPOSITE SHADER with CORRECT position map scaling
            console.log(`🎨 Applying CS2 composite shader to: ${mesh.name}`);

            // Set texture filtering for better quality
            patternTexture.minFilter = THREE.LinearFilter;
            patternTexture.magFilter = THREE.LinearFilter;
            patternTexture.anisotropy = 16;

            // CS2 weapon parameters (from .vmat file)
            const weaponLength = 32.0; // g_flWeaponLength1 from cu_ak47_asiimov.vmat

            // Create custom shader material with proper position map handling
            const shaderMaterial = new THREE.ShaderMaterial({
              uniforms: {
                patternTexture: { value: patternTexture },
                positionMap: { value: positionMap },
                weaponLength: { value: weaponLength },
                wearAmount: { value: wear },
                brightness: { value: 1.0 - wear * 0.6 },
              },
              vertexShader: `
                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vPosition;

                void main() {
                  vUv = uv;
                  vNormal = normalize(normalMatrix * normal);
                  vPosition = position;
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
              `,
              fragmentShader: `
                uniform sampler2D patternTexture;
                uniform sampler2D positionMap;
                uniform float weaponLength;
                uniform float wearAmount;
                uniform float brightness;

                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vPosition;

                void main() {
                  // Sample position map (values are in absolute coordinates, not 0-1!)
                  vec4 posData = texture2D(positionMap, vUv);

                  // CS2 position map format:
                  // R channel: X coordinate (range: -56 to 56 mm)
                  // G channel: Y coordinate (range: -366 to 370 mm)
                  // We need to normalize these to 0-1 UV space

                  // Normalize to 0-1 range based on weapon length
                  float u = (posData.r + weaponLength) / (weaponLength * 2.0);
                  float v = (posData.g + 370.0) / (370.0 + 366.0); // Y range from position map

                  vec2 patternUV = vec2(u, v);

                  // Clamp to 0-1 to avoid texture wrapping issues
                  patternUV = clamp(patternUV, 0.0, 1.0);

                  // Sample pattern at remapped UV
                  vec4 patternColor = texture2D(patternTexture, patternUV);

                  // Apply wear-based brightness
                  vec3 finalColor = patternColor.rgb * brightness;

                  // Simple directional lighting
                  vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
                  float diff = max(dot(vNormal, lightDir), 0.5);
                  finalColor *= diff;

                  gl_FragColor = vec4(finalColor, 1.0);
                }
              `,
            });

            mesh.material = shaderMaterial;
            console.log(`✅ CS2 composite shader with AK-47 specific position map`);
          } else {
            // NO SKIN - Simple material modification
            const brightness = 1.0 - wear * 0.6;
            originalMaterial.color.setRGB(brightness, brightness, brightness);
            originalMaterial.roughness = 0.42 + wear * 0.4;
          }
        }
      }
    });
  }, [gltf, wear, skinPatternUrl, patternTexture, positionMap]);

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
