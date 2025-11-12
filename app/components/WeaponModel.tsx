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

        // Apply to body meshes AND magazine (clip)
        if (mesh.name.includes("body_legacy") || mesh.name.includes("body_hd") || mesh.name.includes("clip")) {
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
                uniform sampler2D grungeTexture;
                uniform float wearAmount;
                uniform float brightness;

                varying vec2 vUv;
                varying vec3 vNormal;

                void main() {
                  // UV transformation - flip V coordinate for correct orientation
                  vec2 uv = vUv;
                  uv.y = 1.0 - uv.y;

                  // Sample textures
                  vec4 patternColor = texture2D(patternTexture, uv);
                  vec4 baseColor = texture2D(baseTexture, vUv);
                  float grunge = texture2D(grungeTexture, vUv).r;

                  // CS2 Composite Shader:
                  // 1. Boost alpha for more pattern visibility (avoid dark center)
                  // Alpha mean is 114/255 = 0.45, boost to make pattern more prominent
                  float boostedAlpha = pow(patternColor.a, 0.7); // Curve: 0.45 → 0.57

                  // 2. Brighten base texture to compensate for dark metal
                  vec3 brightenedBase = baseColor.rgb * 1.3;

                  // 3. Blend pattern with brightened base
                  vec3 blended = mix(brightenedBase, patternColor.rgb, boostedAlpha);

                  // 4. Apply grunge overlay ONLY for wear effect (subtle)
                  // Reduce grunge intensity to prevent dark spots
                  blended *= mix(0.95, 1.05, grunge);

                  // 5. Apply wear-based brightness
                  vec3 finalColor = blended * brightness;

                  // 6. Uniform ambient lighting (no directional shadows)
                  // Removed directional lighting to prevent dark center
                  // Scene3D already has ambient + directional lights

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
  }, [gltf, wear, skinPatternUrl, patternTexture, grungeTexture]);

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
