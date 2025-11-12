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
  // CS2 POSITION MAP SYSTEM - CORRECT UV REMAPPING
  // ==========================================

  // Pattern texture (skin design - e.g., Asiimov)
  const patternTexture = skinPatternUrl ? useLoader(TextureLoader, skinPatternUrl) : null;

  // Position map (EXR) - Converts 3D weapon positions → UV coordinates
  // This is REQUIRED for CS2-accurate skin placement!
  const positionMap = skinPatternUrl ? useLoader(EXRLoader, "/models/ak47/materials/composite_inputs/weapon_rif_ak47_pos_pfm_43e02a6c.exr") : null;

  // Paint mask - Defines paintable areas (white = pattern, black = base)
  const maskTexture = skinPatternUrl ? useLoader(TextureLoader, "/models/ak47/materials/composite_inputs/weapon_rif_ak47_masks.png") : null;

  // Base color texture (vanilla AK-47)
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

    // Scale to fit viewport (CS.MONEY size)
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 0.6 / maxDim; // CS.MONEY-like size
    gltf.scene.scale.setScalar(scale);

    console.log("📏 Model scaled:", { maxDim, scale });
  }, [gltf]);

  // Apply CS2-ACCURATE POSITION MAP SHADER
  useEffect(() => {
    if (!gltf) return;

    // Only apply skin if skinPatternUrl is provided
    if (!skinPatternUrl || !patternTexture || !positionMap || !maskTexture) {
      console.log("🎨 No skin - using vanilla GLTF textures");
      return;
    }

    console.log("🎨 Applying CS2-ACCURATE position map shader!");

    // CS2 material values from cu_ak47_asiimov.vmat
    const weaponLength = 32.0;    // g_flWeaponLength1
    const uvScale = 1.0;           // g_flUvScale1
    const paintRoughness = 0.42;   // g_flPaintRoughness

    // Paint seed transformations (0-1000 → rotation/offset)
    const seedNormalized = paintSeed / 1000.0;
    const patternOffsetX = Math.sin(seedNormalized * Math.PI * 2) * 0.5;
    const patternOffsetY = Math.cos(seedNormalized * Math.PI * 2) * 0.5;
    const patternRotation = seedNormalized * Math.PI * 2;

    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const material = mesh.material as THREE.MeshStandardMaterial;

        if (material && material.map) {
          console.log(`🎨 Applying position map shader to: ${mesh.name}`);

          // Create custom shader material with position map UV remapping
          const shaderMaterial = new THREE.ShaderMaterial({
            uniforms: {
              positionMap: { value: positionMap },
              patternTexture: { value: patternTexture },
              maskTexture: { value: maskTexture },
              baseColor: { value: baseColor },
              weaponLength: { value: weaponLength },
              uvScale: { value: uvScale },
              patternOffset: { value: new THREE.Vector2(patternOffsetX, patternOffsetY) },
              patternRotation: { value: patternRotation },
              wearAmount: { value: wear },
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
              uniform sampler2D positionMap;
              uniform sampler2D patternTexture;
              uniform sampler2D maskTexture;
              uniform sampler2D baseColor;
              uniform float weaponLength;
              uniform float uvScale;
              uniform vec2 patternOffset;
              uniform float patternRotation;
              uniform float wearAmount;

              varying vec2 vUv;
              varying vec3 vNormal;

              void main() {
                // 1. Sample position map (RGB = 3D weapon position)
                vec3 posData = texture2D(positionMap, vUv).rgb;

                // 2. Convert 3D position → UV coordinates (CS2 algorithm)
                vec2 patternUV = vec2(posData.x, posData.y) / weaponLength * uvScale;

                // 3. Apply paint seed rotation
                float cosR = cos(patternRotation);
                float sinR = sin(patternRotation);
                vec2 rotatedUV = vec2(
                  patternUV.x * cosR - patternUV.y * sinR,
                  patternUV.x * sinR + patternUV.y * cosR
                );

                // 4. Apply offset and wrap UVs
                rotatedUV = rotatedUV + patternOffset;
                rotatedUV = fract(rotatedUV); // Wrap (repeat)

                // 5. Sample textures
                vec4 pattern = texture2D(patternTexture, rotatedUV);
                vec4 base = texture2D(baseColor, vUv);
                float mask = texture2D(maskTexture, vUv).r;

                // 6. Blend pattern with base using mask
                vec3 finalColor = mix(base.rgb, pattern.rgb, mask * pattern.a);

                // 7. Simple lighting
                vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
                float diffuse = max(dot(vNormal, lightDir), 0.3);
                finalColor *= diffuse;

                // 8. Wear darkening
                float brightness = 1.0 - wearAmount * 0.3;
                finalColor *= brightness;

                gl_FragColor = vec4(finalColor, 1.0);
              }
            `,
          });

          mesh.material = shaderMaterial;
          mesh.material.needsUpdate = true;
        }
      }
    });

    console.log("✅ CS2-accurate position map shader applied!");
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
