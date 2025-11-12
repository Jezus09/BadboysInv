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
  // FULL CS2 TEXTURE SYSTEM - ALL INPUTS
  // ==========================================

  // Pattern texture (skin design - e.g., Asiimov)
  const patternTexture = skinPatternUrl ? useLoader(TextureLoader, skinPatternUrl) : null;

  // Position map (EXR) - RGB values = 3D positions → UV coordinates
  const positionMap = useLoader(EXRLoader, "/models/ak47/materials/composite_inputs/weapon_rif_ak47_pos_pfm_43e02a6c.exr");

  // Paint mask - defines paintable areas (white = pattern, black = base)
  const maskTexture = useLoader(TextureLoader, "/models/ak47/materials/composite_inputs/weapon_rif_ak47_masks.png");

  // Grunge texture - adds wear/dirt overlay
  const grungeTexture = useLoader(TextureLoader, "/textures/skins/gun_grunge.png");

  // Wear mask - controls where wear appears
  const wearTexture = useLoader(TextureLoader, "/textures/skins/paint_wear.png");

  // Base weapon textures (no-skin defaults)
  const baseColor = useLoader(TextureLoader, "/models/ak47/materials/ak47_default_color.png");
  const cavity = useLoader(TextureLoader, "/models/ak47/materials/composite_inputs/weapon_rif_ak47_cavity.png");
  const ao = useLoader(TextureLoader, "/models/ak47/materials/composite_inputs/weapon_rif_ak47_cavity_952ab3_ao.png");

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
    const scale = 1.8 / maxDim; // Larger size - easy to inspect
    gltf.scene.scale.setScalar(scale);

    console.log("📏 Model scaled:", { maxDim, scale });
  }, [gltf]);

  // Apply CS2-accurate position map shader
  useEffect(() => {
    if (!gltf || !positionMap || !maskTexture) return;

    console.log("🎨 Applying CS2-accurate position map shader");

    // CS2 material values from .vmat files
    const weaponLength = 37.287; // g_flWeaponLength1 from composite_inputs.vmat
    const uvScale = 0.772; // g_flUvScale1
    const paintRoughness = 0.42; // g_flPaintRoughness

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
              patternTexture: { value: patternTexture || null },
              maskTexture: { value: maskTexture },
              grungeTexture: { value: grungeTexture },
              wearTexture: { value: wearTexture },

              // Base weapon textures
              baseColor: { value: baseColor },
              cavity: { value: cavity },
              ao: { value: ao },

              // CS2 parameters
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
              uniform sampler2D grungeTexture;
              uniform sampler2D wearTexture;
              uniform sampler2D baseColor;
              uniform sampler2D cavity;
              uniform sampler2D ao;

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
                // 1. Sample position map (RGB = 3D position in weapon space)
                vec3 posData = texture2D(positionMap, vUv).rgb;

                // 2. Convert position to UV coordinates (CS2 algorithm)
                // X and Y positions map to UV, normalized by weapon length
                vec2 patternUV = vec2(posData.x, posData.y) / weaponLength * uvScale;

                // 3. Apply paint seed transformations (rotation + offset)
                float cosR = cos(patternRotation);
                float sinR = sin(patternRotation);
                vec2 rotatedUV = vec2(
                  patternUV.x * cosR - patternUV.y * sinR,
                  patternUV.x * sinR + patternUV.y * cosR
                );
                rotatedUV = rotatedUV * patternScale + patternOffset;

                // Wrap UV coordinates (repeat pattern)
                rotatedUV = fract(rotatedUV);

                // 4. Sample all textures
                vec4 pattern = texture2D(patternTexture, rotatedUV);
                vec4 base = texture2D(baseColor, vUv);
                float mask = texture2D(maskTexture, vUv).r;
                vec4 grunge = texture2D(grungeTexture, rotatedUV);
                float wearMask = texture2D(wearTexture, rotatedUV).r;
                float cavityVal = texture2D(cavity, vUv).r;
                float aoVal = texture2D(ao, vUv).r;

                // 5. Blend pattern with base using mask
                vec3 finalColor = mix(base.rgb, pattern.rgb, mask * pattern.a);

                // 6. Apply grunge/wear overlay
                float wearFactor = wearAmount * wearMask;
                finalColor = mix(finalColor, finalColor * grunge.rgb, wearFactor * 0.5);

                // 7. Apply cavity and AO
                finalColor *= cavityVal * aoVal;

                // 8. Simple lighting
                float diffuse = max(dot(vNormal, lightDir), 0.3);
                finalColor *= diffuse;

                // 9. Brightness based on wear
                float brightness = 1.0 - wearAmount * 0.6;
                finalColor *= brightness;

                gl_FragColor = vec4(finalColor, 1.0);
              }
            `,
            lights: false,
          });

          mesh.material = shaderMaterial;
          mesh.material.needsUpdate = true;

          console.log(`✅ Position map shader applied to ${mesh.name}`);
        }
      }
    });
  }, [gltf, positionMap, maskTexture, grungeTexture, wearTexture, baseColor, cavity, ao, patternTexture, paintSeed, wear]);

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
