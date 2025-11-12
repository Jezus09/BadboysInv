import { useEffect, useRef, useState } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
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

  // Load pattern texture
  const patternTexture = skinPatternUrl ? useLoader(TextureLoader, skinPatternUrl) : null;

  // Load position map for UV remapping (CS2 composite shader) - EXR format requires EXRLoader!
  const positionMap = skinPatternUrl ? useLoader(EXRLoader, "/models/ak47/materials/composite_inputs/weapon_rif_ak47_pos_pfm_43e02a6c.exr") : null;

  // Load mask texture (defines where pattern should be applied)
  const maskTexture = skinPatternUrl ? useLoader(TextureLoader, "/models/ak47/materials/composite_inputs/weapon_rif_ak47_masks.png") : null;

  // Load grunge texture for realistic wear effect
  const grungeTexture = useLoader(TextureLoader, "/textures/gun_grunge.png");

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
    const scale = 1.5 / maxDim; // Bigger scale for better visibility
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

        // Apply to body meshes ONLY (NOT magazine/clip)
        // Magazine should use original material, not skin pattern
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
                positionMap: { value: positionMap },
                maskTexture: { value: maskTexture },
                grungeTexture: { value: grungeTexture },
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
                uniform sampler2D positionMap;
                uniform sampler2D maskTexture;
                uniform sampler2D grungeTexture;
                uniform float wearAmount;
                uniform float brightness;

                varying vec2 vUv;
                varying vec3 vNormal;

                void main() {
                  // SIMPLE DIRECT UV - No position map (for debugging)

                  // Flip V coordinate (CS2 textures are often inverted)
                  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);

                  // Sample textures with direct UV
                  vec4 patternColor = texture2D(patternTexture, uv);
                  vec4 baseColor = texture2D(baseTexture, vUv);

                  // Simple alpha blending - if pattern has alpha, use it
                  vec3 blended;
                  if (patternColor.a > 0.1) {
                    blended = patternColor.rgb;
                  } else {
                    blended = baseColor.rgb * 1.5;  // Brighten base
                  }

                  // Apply wear-based brightness
                  vec3 finalColor = blended * brightness;

                  // Simple lighting
                  vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
                  float diffuse = max(dot(vNormal, lightDir), 0.3);
                  finalColor *= diffuse;

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
        } else if (mesh.name.includes("clip") || mesh.name.includes("mag")) {
          // Magazine/Clip meshes - brighten them to avoid dark appearance
          const originalMaterial = mesh.material as THREE.MeshStandardMaterial;
          if (originalMaterial.map) {
            // Has texture - just increase brightness
            originalMaterial.color.setRGB(1.5, 1.5, 1.5); // 50% brighter
          } else {
            // No texture - set to medium gray
            originalMaterial.color.setRGB(0.3, 0.3, 0.3);
          }
          console.log(`🔧 Magazine brightened: ${mesh.name}`);
        }
      }
    });
  }, [gltf, wear, skinPatternUrl, patternTexture, positionMap, maskTexture, grungeTexture]);

  // Rotate model slowly (horizontal rotation around Z axis)
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.z += delta * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={gltf.scene} />
    </group>
  );
}
