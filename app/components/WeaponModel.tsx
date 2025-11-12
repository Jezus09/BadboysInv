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
  // DIRECT UV + MASK (NO POSITION MAP!)
  // ==========================================

  // Pattern texture (skin design - e.g., Asiimov)
  const patternTexture = skinPatternUrl ? useLoader(TextureLoader, skinPatternUrl) : null;

  // Mask texture - defines WHERE skin appears (white = skin, black = vanilla)
  const maskTexture = skinPatternUrl ? useLoader(TextureLoader, "/models/ak47/materials/composite_inputs/weapon_rif_ak47_masks.png") : null;

  // Base texture - vanilla AK-47 texture for magazine/grip/wood
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

    // Scale to fit viewport
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 0.5 / maxDim; // MUCH smaller - not "bazi nagy"
    gltf.scene.scale.setScalar(scale);

    console.log("📏 Model scaled:", { maxDim, scale });
  }, [gltf]);

  // Apply DIRECT UV + MASK shader (NO position map!)
  useEffect(() => {
    if (!gltf || !baseTexture) return;

    // If no skin, use vanilla materials
    if (!skinPatternUrl || !patternTexture || !maskTexture) {
      console.log("🎨 No skin - using vanilla materials");

      gltf.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const material = mesh.material as THREE.MeshStandardMaterial;

          if (material) {
            material.map = baseTexture;
            material.metalness = 0.0;
            material.roughness = 0.42;
            material.needsUpdate = true;
          }
        }
      });
      return;
    }

    console.log("🎨 Applying DIRECT UV + MASK shader (magazine/grip will be vanilla!)");

    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        // Apply shader to weapon body only
        if (mesh.name.includes("body_legacy") || mesh.name.includes("body_hd")) {
          console.log(`🎨 Applying mask shader to: ${mesh.name}`);

          // Create simple mask shader (DIRECT UV, NO position map)
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
                // Use DIRECT UV (no position map remapping!)
                vec2 uv = vUv;

                // Sample textures
                vec4 pattern = texture2D(patternTexture, uv);
                vec4 base = texture2D(baseTexture, uv);
                float mask = texture2D(maskTexture, uv).r;

                // STRICT mask selection
                // White areas (mask > 0.5) = skin pattern
                // Black areas (mask < 0.5) = vanilla texture (magazine, grip, wood)
                vec3 finalColor;
                if (mask > 0.5) {
                  finalColor = pattern.rgb;
                } else {
                  finalColor = base.rgb;
                }

                // Simple lighting
                vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
                float diffuse = max(dot(vNormal, lightDir), 0.4);
                finalColor *= diffuse;

                // Brightness (wear)
                float brightness = 1.0 - wearAmount * 0.3;
                finalColor *= brightness;

                gl_FragColor = vec4(finalColor, 1.0);
              }
            `,
            lights: false,
          });

          mesh.material = shaderMaterial;
          mesh.material.needsUpdate = true;

          console.log(`✅ Mask shader applied to ${mesh.name}`);
        } else {
          // Magazine, grip, other parts - use vanilla texture
          const material = mesh.material as THREE.MeshStandardMaterial;
          if (material) {
            material.map = baseTexture;
            material.metalness = 0.0;
            material.roughness = 0.42;
            material.needsUpdate = true;
            console.log(`✅ Vanilla texture applied to ${mesh.name}`);
          }
        }
      }
    });
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
