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

  // Load pattern texture (direct UV mapping, no position map needed!)
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

          if (skinPatternUrl && patternTexture) {
            // CS2 DIRECT UV MAPPING (F_PAINT_STYLE 6 - Simple Pattern)
            console.log(`🎨 Applying direct UV pattern to: ${mesh.name}`);

            // Set texture filtering for better quality
            patternTexture.minFilter = THREE.LinearFilter;
            patternTexture.magFilter = THREE.LinearFilter;
            patternTexture.anisotropy = 16;

            // CS2 sampling mode 0 = CLAMP (no repeat)
            patternTexture.wrapS = THREE.ClampToEdgeWrapping;
            patternTexture.wrapT = THREE.ClampToEdgeWrapping;

            // Try flipping texture - sometimes CS2 exports are inverted
            // patternTexture.flipY = true;

            // SIMPLE APPROACH: Use model's UV coordinates directly
            // No position map needed - CS2 already baked correct UVs into the GLTF model!

            // Get base texture from original material
            const baseTexture = originalMaterial.map;

            const shaderMaterial = new THREE.ShaderMaterial({
              uniforms: {
                patternTexture: { value: patternTexture },
                baseTexture: { value: baseTexture },
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
                uniform sampler2D patternTexture;
                uniform sampler2D baseTexture;
                uniform float wearAmount;
                uniform float brightness;

                varying vec2 vUv;
                varying vec3 vNormal;

                void main() {
                  // UV transformation - flip V coordinate for correct orientation
                  vec2 uv = vUv;
                  uv.y = 1.0 - uv.y;

                  // Sample pattern texture (has alpha channel!)
                  vec4 patternColor = texture2D(patternTexture, uv);

                  // Sample base texture (original weapon texture)
                  vec4 baseColor = texture2D(baseTexture, vUv);

                  // DEBUG: Check what's causing darkness
                  // Option 1: Show pattern only (ignore alpha)
                  // vec3 blendedColor = patternColor.rgb;

                  // Option 2: Show base only
                  // vec3 blendedColor = baseColor.rgb;

                  // Option 3: Show alpha as grayscale
                  // vec3 blendedColor = vec3(patternColor.a);

                  // Option 4: Threshold alpha (binary mask: < 0.5 = base, >= 0.5 = pattern)
                  float alphaMask = step(0.5, patternColor.a);
                  vec3 blendedColor = mix(baseColor.rgb, patternColor.rgb, alphaMask);

                  // Option 5: Original smooth blend (causes darkness)
                  // vec3 blendedColor = mix(baseColor.rgb, patternColor.rgb, patternColor.a);

                  // Apply wear-based brightness
                  vec3 finalColor = blendedColor * brightness;

                  // Simple directional lighting
                  vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
                  float diff = max(dot(vNormal, lightDir), 0.5);
                  finalColor *= diff;

                  gl_FragColor = vec4(finalColor, 1.0);
                }
              `,
            });

            mesh.material = shaderMaterial;
            console.log(`✅ Direct UV pattern applied (F_PAINT_STYLE 6)`);
          } else {
            // NO SKIN - Simple material modification
            const brightness = 1.0 - wear * 0.6;
            originalMaterial.color.setRGB(brightness, brightness, brightness);
            originalMaterial.roughness = 0.42 + wear * 0.4;
          }
        }
      }
    });
  }, [gltf, wear, skinPatternUrl, patternTexture]);

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
