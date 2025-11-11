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

    // Scale to fit viewport - much smaller
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 0.3 / maxDim; // Small size for close camera
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

            // Create custom shader material with normalized position map
            const shaderMaterial = new THREE.ShaderMaterial({
              uniforms: {
                patternTexture: { value: patternTexture },
                positionMap: { value: positionMap },
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
                uniform float wearAmount;
                uniform float brightness;

                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vPosition;

                void main() {
                  // Sample position map (ALREADY NORMALIZED to 0-1!)
                  vec4 posData = texture2D(positionMap, vUv);

                  // DEBUG MODE 1: Show position map directly
                  // Uncomment to see if position map is loading correctly
                  // gl_FragColor = vec4(posData.rgb, 1.0);
                  // return;

                  // Position map R/G channels are already 0-1 UV coordinates
                  vec2 patternUV = posData.rg;

                  // DEBUG MODE 2: Visualize UV coordinates as colors
                  // Uncomment to see UV mapping
                  // gl_FragColor = vec4(patternUV.r, patternUV.g, 0.0, 1.0);
                  // return;

                  // Sample pattern at remapped UV
                  vec4 patternColor = texture2D(patternTexture, patternUV);

                  // DEBUG MODE 3: Show pattern texture without any processing
                  // Uncomment to see if pattern loads correctly
                  gl_FragColor = vec4(patternColor.rgb, 1.0);
                  return;

                  /* FULL RENDERING (disabled for debug)
                  // Apply wear-based brightness
                  vec3 finalColor = patternColor.rgb * brightness;

                  // Simple directional lighting
                  vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
                  float diff = max(dot(vNormal, lightDir), 0.5);
                  finalColor *= diff;

                  gl_FragColor = vec4(finalColor, 1.0);
                  */
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
