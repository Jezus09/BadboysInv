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
  // POSITION MAP + MASK BLENDING (OFFICIAL VALVE VALUES)
  // ==========================================
  // weaponLength=32, uvScale=1 from cu_ak47_asiimov.vmat (OFFICIAL!)

  // Pattern texture (skin design - e.g., Asiimov)
  const patternTexture = skinPatternUrl ? useLoader(TextureLoader, skinPatternUrl) : null;

  // Position map (EXR) - UV remapping with ASIIMOV VMAT values
  const positionMap = skinPatternUrl ? useLoader(EXRLoader, "/models/ak47/materials/composite_inputs/weapon_rif_ak47_pos_pfm_43e02a6c.exr") : null;

  // Mask texture - defines where pattern should appear (white = pattern, black = base)
  const maskTexture = skinPatternUrl ? useLoader(TextureLoader, "/models/ak47/materials/composite_inputs/weapon_rif_ak47_masks.png") : null;

  // Base texture (vanilla weapon) - ONLY load if skin is applied!
  const baseTexture = skinPatternUrl ? useLoader(TextureLoader, "/models/ak47/materials/ak47_default_color.png") : null;

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

  // Apply POSITION MAP + MASK BLENDING SHADER
  useEffect(() => {
    if (!gltf) return;

    // Only apply skin if skinPatternUrl is provided
    if (!skinPatternUrl || !patternTexture || !positionMap || !maskTexture) {
      console.log("🎨 No skin - using vanilla GLTF textures");
      return;
    }

    console.log("🎨 Applying position map + mask blending shader!");

    // Configure textures
    patternTexture.flipY = false;
    patternTexture.minFilter = THREE.LinearFilter;
    patternTexture.magFilter = THREE.LinearFilter;
    patternTexture.anisotropy = 16;

    maskTexture.flipY = false;
    baseTexture.flipY = false;

    // OFFICIAL VALVE VALUES from cu_ak47_asiimov.vmat
    const weaponLength = 32.0;    // g_flWeaponLength1
    const uvScale = 1.0;           // g_flUvScale1
    const paintRoughness = 0.42;   // g_flPaintRoughness

    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const material = mesh.material as THREE.MeshStandardMaterial;

        if (material && material.map) {
          console.log(`🎨 Applying position map shader to: ${mesh.name}`);

          // Create shader material with POSITION MAP UV REMAPPING + MASK BLENDING
          const shaderMaterial = new THREE.ShaderMaterial({
            uniforms: {
              positionMap: { value: positionMap },
              patternTexture: { value: patternTexture },
              maskTexture: { value: maskTexture },
              baseTexture: { value: baseTexture },
              weaponLength: { value: weaponLength },
              uvScale: { value: uvScale },
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
              uniform sampler2D baseTexture;
              uniform float weaponLength;
              uniform float uvScale;
              uniform float wearAmount;

              varying vec2 vUv;
              varying vec3 vNormal;

              void main() {
                // 1. Sample position map (RGB = 3D weapon position)
                vec3 posData = texture2D(positionMap, vUv).rgb;

                // 2. Convert 3D position → UV coordinates (OFFICIAL VALVE ALGORITHM)
                //    weaponLength=32, uvScale=1 from cu_ak47_asiimov.vmat
                vec2 patternUV = vec2(posData.x, posData.y) / weaponLength * uvScale;

                // 3. Sample textures
                vec4 pattern = texture2D(patternTexture, patternUV);  // ← Position map UV!
                vec4 base = texture2D(baseTexture, vUv);              // ← Direct UV
                float mask = texture2D(maskTexture, vUv).r;

                // 4. Blend: pattern where mask is WHITE, base where mask is BLACK
                vec3 finalColor = mix(base.rgb, pattern.rgb, mask * pattern.a);

                // 5. Simple lighting
                vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
                float diffuse = max(dot(vNormal, lightDir), 0.3);
                finalColor *= diffuse;

                // 6. Wear darkening
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

    console.log("✅ Position map + mask blending shader applied!");
  }, [gltf, patternTexture, positionMap, maskTexture, baseTexture, skinPatternUrl, wear]);

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
