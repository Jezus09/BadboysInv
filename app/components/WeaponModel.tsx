import { useEffect, useRef, useState } from "react";
import { useLoader } from "@react-three/fiber";
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

  // ==========================================
  // CS3D METHOD + MASK BLENDING
  // ==========================================
  // Simple texture + mask to prevent pattern on mag/grip/stock

  // Pattern texture (skin design - e.g., Asiimov)
  const patternTexture = skinPatternUrl ? useLoader(TextureLoader, skinPatternUrl) : null;

  // Mask texture - defines where pattern should appear (white = pattern, black = base)
  const maskTexture = skinPatternUrl ? useLoader(TextureLoader, "/models/ak47/materials/composite_inputs/weapon_rif_ak47_masks.png") : null;

  // Base texture (vanilla weapon)
  const baseTexture = useLoader(TextureLoader, "/models/ak47/materials/ak47_default_color.png");

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

  // Apply MASK BLENDING SHADER
  useEffect(() => {
    if (!gltf) return;

    // Only apply skin if skinPatternUrl is provided
    if (!skinPatternUrl || !patternTexture || !maskTexture) {
      console.log("🎨 No skin - using vanilla GLTF textures");
      return;
    }

    console.log("🎨 Applying mask blending shader!");

    // Configure textures
    patternTexture.flipY = false;
    patternTexture.minFilter = THREE.LinearFilter;
    patternTexture.magFilter = THREE.LinearFilter;
    patternTexture.anisotropy = 16;

    maskTexture.flipY = false;
    baseTexture.flipY = false;

    // CS2 material values
    const paintRoughness = 0.42;

    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const material = mesh.material as THREE.MeshStandardMaterial;

        if (material && material.map) {
          console.log(`🎨 Applying mask shader to: ${mesh.name}`);

          // Create shader material with MASK BLENDING (NO position map!)
          const shaderMaterial = new THREE.ShaderMaterial({
            uniforms: {
              patternTexture: { value: patternTexture },
              maskTexture: { value: maskTexture },
              baseTexture: { value: baseTexture },
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
              uniform sampler2D patternTexture;
              uniform sampler2D maskTexture;
              uniform sampler2D baseTexture;
              uniform float wearAmount;

              varying vec2 vUv;
              varying vec3 vNormal;

              void main() {
                // Sample textures (DIRECT UV - NO position map!)
                vec4 pattern = texture2D(patternTexture, vUv);
                vec4 base = texture2D(baseTexture, vUv);
                float mask = texture2D(maskTexture, vUv).r;

                // Blend: pattern where mask is WHITE, base where mask is BLACK
                vec3 finalColor = mix(base.rgb, pattern.rgb, mask * pattern.a);

                // Simple lighting
                vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
                float diffuse = max(dot(vNormal, lightDir), 0.3);
                finalColor *= diffuse;

                // Wear darkening
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

    console.log("✅ Mask blending shader applied!");
  }, [gltf, patternTexture, maskTexture, baseTexture, skinPatternUrl, wear]);

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
