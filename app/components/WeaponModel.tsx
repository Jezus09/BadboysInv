import { useEffect, useRef, useState } from "react";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { TextureLoader } from "three";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
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
  // CS2-ACCURATE POSITION MAP SHADER (FIXED!)
  // ==========================================

  // Pattern texture (skin design - e.g., Asiimov)
  const patternTexture = skinPatternUrl ? useLoader(TextureLoader, skinPatternUrl) : null;

  // Position map (EXR) - RGB values = 3D positions → UV coordinates
  const positionMap = skinPatternUrl ? useLoader(EXRLoader, "/models/ak47/materials/composite_inputs/weapon_rif_ak47_pos_pfm_43e02a6c.exr") : null;

  // Paint mask - defines paintable areas (white = pattern, black = base)
  const maskTexture = skinPatternUrl ? useLoader(TextureLoader, "/models/ak47/materials/composite_inputs/weapon_rif_ak47_masks.png") : null;

  // Base weapon textures
  const baseColor = useLoader(TextureLoader, "/models/ak47/materials/ak47_default_color.png");

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

    // Scale to fit viewport
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 0.8 / maxDim; // Smaller size - not too big
    gltf.scene.scale.setScalar(scale);

    console.log("📏 Model scaled:", { maxDim, scale });
  }, [gltf]);

  // Apply CS2-accurate position map shader
  useEffect(() => {
    if (!gltf || !baseColor) return;

    // If no skin, use vanilla materials
    if (!skinPatternUrl || !patternTexture || !positionMap || !maskTexture) {
      console.log("🎨 No skin - using vanilla materials");

      gltf.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const material = mesh.material as THREE.MeshStandardMaterial;

          if (material) {
            material.metalness = 0.0;
            material.roughness = 0.42;
            material.needsUpdate = true;
          }
        }
      });
      return;
    }

    console.log("🎨 Applying CS2-accurate position map shader with CORRECT values!");

    // ⭐ FIXED VALUES from cu_ak47_asiimov.vmat (NOT composite_inputs!)
    const weaponLength = 32.0;  // ✅ CORRECT (was 37.287 - WRONG!)
    const uvScale = 1.0;         // ✅ CORRECT (was 0.772 - WRONG!)
    const paintRoughness = 0.42; // CS2 default

    // Paint seed random transformations (0-1000 seed → random offset/rotation)
    const seedNormalized = paintSeed / 1000.0;
    const patternOffsetX = Math.sin(seedNormalized * Math.PI * 2) * 0.5;
    const patternOffsetY = Math.cos(seedNormalized * Math.PI * 2) * 0.5;
    const patternRotation = seedNormalized * Math.PI * 2;

    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        // Apply shader to weapon body only
        if (mesh.name.includes("body_legacy") || mesh.name.includes("body_hd")) {
          console.log(`🎨 Applying position map shader to: ${mesh.name}`);

          // Create custom shader material
          const shaderMaterial = new THREE.ShaderMaterial({
            uniforms: {
              // Position map - converts 3D positions to UV coordinates
              positionMap: { value: positionMap },

              // Pattern & paint system
              patternTexture: { value: patternTexture },
              maskTexture: { value: maskTexture },

              // Base weapon texture
              baseColor: { value: baseColor },

              // ⭐ CORRECT CS2 parameters from cu_ak47_asiimov.vmat
              weaponLength: { value: weaponLength },
              uvScale: { value: uvScale },
              paintRoughness: { value: paintRoughness },

              // Paint seed transformations
              patternOffset: { value: new THREE.Vector2(patternOffsetX, patternOffsetY) },
              patternRotation: { value: patternRotation },
              patternScale: { value: 1.0 },

              // Wear
              wearAmount: { value: wear },

              // Lighting
              lightDir: { value: new THREE.Vector3(1.0, 1.0, 1.0).normalize() },
            },
            vertexShader: `
              varying vec2 vUv;
              varying vec3 vNormal;
              varying vec3 vViewPosition;

              void main() {
                vUv = uv;
                vNormal = normalize(normalMatrix * normal);

                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                vViewPosition = -mvPosition.xyz;

                gl_Position = projectionMatrix * mvPosition;
              }
            `,
            fragmentShader: `
              uniform sampler2D positionMap;
              uniform sampler2D patternTexture;
              uniform sampler2D maskTexture;
              uniform sampler2D baseColor;

              uniform float weaponLength;
              uniform float uvScale;
              uniform float paintRoughness;
              uniform vec2 patternOffset;
              uniform float patternRotation;
              uniform float patternScale;
              uniform float wearAmount;
              uniform vec3 lightDir;

              varying vec2 vUv;
              varying vec3 vNormal;
              varying vec3 vViewPosition;

              void main() {
                // DEBUG: Simplify shader to test what's wrong

                // Sample mask to see paintable areas
                float mask = texture2D(maskTexture, vUv).r;

                // Sample base texture (vanilla AK-47)
                vec4 base = texture2D(baseColor, vUv);

                // 1. Sample position map (RGB = 3D position in weapon space)
                vec3 posData = texture2D(positionMap, vUv).rgb;

                // 2. ⭐ CS2 UV conversion formula
                // weaponLength = 32.0, uvScale = 1.0
                vec2 patternUV = vec2(posData.x, posData.y) / weaponLength * uvScale;

                // 3. Apply paint seed transformations (rotation + offset)
                float cosR = cos(patternRotation);
                float sinR = sin(patternRotation);
                vec2 rotatedUV = vec2(
                  patternUV.x * cosR - patternUV.y * sinR,
                  patternUV.x * sinR + patternUV.y * cosR
                );
                rotatedUV = rotatedUV * patternScale + patternOffset;

                // Wrap UV coordinates
                rotatedUV = fract(rotatedUV);

                // 4. Sample pattern texture
                vec4 pattern = texture2D(patternTexture, rotatedUV);

                // 5. STRICT mask-based selection
                // Only show pattern where mask is WHITE (paintable areas)
                vec3 finalColor;
                if (mask > 0.5) {
                  // Paintable area - show pattern
                  finalColor = pattern.rgb;
                } else {
                  // Non-paintable area (magazine, wood, metal) - show base
                  finalColor = base.rgb;
                }

                // 6. Simple lighting
                float diffuse = max(dot(vNormal, lightDir), 0.4);
                finalColor *= diffuse;

                // 7. Brightness based on wear
                float brightness = 1.0 - wearAmount * 0.3;
                finalColor *= brightness;

                gl_FragColor = vec4(finalColor, 1.0);
              }
            `,
            lights: false,
          });

          mesh.material = shaderMaterial;
          mesh.material.needsUpdate = true;

          console.log(`✅ CS2-accurate shader applied to ${mesh.name}`);
        } else {
          // Keep original materials for other parts (magazine, etc.)
          const material = mesh.material as THREE.MeshStandardMaterial;
          if (material) {
            material.metalness = 0.0;
            material.roughness = 0.42;
            material.needsUpdate = true;
          }
        }
      }
    });
  }, [gltf, patternTexture, positionMap, maskTexture, baseColor, skinPatternUrl, paintSeed, wear]);

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
