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
  skinTextureUrl?: string; // Optional skin texture URL
}

export function WeaponModel({ defIndex, paintSeed, wear, skinTextureUrl }: WeaponModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [modelPath, setModelPath] = useState<string>("/models/ak47/weapon_rif_ak47.gltf");
  const [customMaterialsApplied, setCustomMaterialsApplied] = useState(false);

  // Load GLTF model
  const gltf = useLoader(GLTFLoader, modelPath);

  // Load composite shader textures
  const positionMap = useLoader(EXRLoader, "/models/ak47/position_map.exr");
  const maskTexture = useLoader(TextureLoader, "/models/ak47/mask.png");
  const patternTexture = skinTextureUrl ? useLoader(TextureLoader, skinTextureUrl) : null;

  // Load base textures from GLTF
  const baseColorTexture = useLoader(TextureLoader, "/models/ak47/ak47_default_color_psd_5b66a23b.png");
  const normalTexture = useLoader(TextureLoader, "/models/ak47/ak47_default_normal_png_c8c5793e.png");

  useEffect(() => {
    if (!gltf || customMaterialsApplied) return;

    console.log("🔧 Setting up CS2 Composite Shader System");
    console.log("GLTF loaded:", gltf);
    console.log("Position map loaded:", positionMap ? "✅" : "❌");
    console.log("Mask texture loaded:", maskTexture ? "✅" : "❌");
    console.log("Pattern texture loaded:", patternTexture ? "✅" : "❌");

    // Center and scale the model
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Center the model
    gltf.scene.position.sub(center);

    // Scale to fit (target size ~5 units for better camera view)
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 5 / maxDim;
    gltf.scene.scale.setScalar(scale);

    console.log("Model centered and scaled:", { center, size, scale });

    // Apply composite shader to materials (only if we have pattern texture)
    if (patternTexture && positionMap && maskTexture) {
      console.log("🎨 Applying CS2 Composite Shader with pattern texture");

      gltf.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;

          // Log all mesh names for debugging
          console.log(`Found mesh: "${mesh.name}" (material: ${mesh.material ? "✅" : "❌"})`);

          // Apply shader to ALL meshes with materials (not just "weapon" named ones)
          if (mesh.material) {
            console.log(`🎨 Applying composite shader to mesh: ${mesh.name}`);

            // Create custom shader material
            const shaderMaterial = new THREE.ShaderMaterial({
              uniforms: {
                baseTexture: { value: baseColorTexture },
                normalMap: { value: normalTexture },
                patternTexture: { value: patternTexture },
                positionMap: { value: positionMap },
                maskMap: { value: maskTexture },
                wearAmount: { value: wear },
                brightness: { value: 1.0 - wear * 0.6 }
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
                uniform sampler2D baseTexture;
                uniform sampler2D normalMap;
                uniform sampler2D patternTexture;
                uniform sampler2D positionMap;
                uniform sampler2D maskMap;
                uniform float wearAmount;
                uniform float brightness;

                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vViewPosition;

                void main() {
                  // Sample position map (EXR - R/G channels contain UV coordinates for pattern)
                  vec4 posData = texture2D(positionMap, vUv);
                  vec2 patternUV = posData.rg;

                  // Sample pattern texture using position map UVs
                  vec4 patternColor = texture2D(patternTexture, patternUV);

                  // Sample base color
                  vec4 baseColor = texture2D(baseTexture, vUv);

                  // Sample mask (where should pattern be applied)
                  float mask = texture2D(maskMap, vUv).r;

                  // Mix base and pattern based on mask
                  vec4 finalColor = mix(baseColor, patternColor, mask);

                  // Apply wear (darken based on wear amount)
                  finalColor.rgb *= brightness;

                  // Simple lighting
                  vec3 normal = normalize(vNormal);
                  vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
                  float diffuse = max(dot(normal, lightDir), 0.0) * 0.5 + 0.5;

                  finalColor.rgb *= diffuse;

                  gl_FragColor = vec4(finalColor.rgb, 1.0);
                }
              `,
              lights: false,
              side: THREE.DoubleSide
            });

            mesh.material = shaderMaterial;
            console.log(`✅ Composite shader applied to ${mesh.name}`);
          }
        }
      });

      setCustomMaterialsApplied(true);
    } else {
      // Fallback: Apply simple material modifications if no pattern texture
      console.log("⚠️ No pattern texture provided, using simple material modifications");

      gltf.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.material) {
            const material = mesh.material as THREE.MeshStandardMaterial;

            // Apply wear effect (brightness and roughness)
            const brightness = 1.0 - wear * 0.6; // FN=1.0, BS=0.4
            material.color.setRGB(brightness, brightness, brightness);
            material.roughness = 0.42 + wear * 0.4; // FN=0.42, BS=0.82

            console.log(`Material ${material.name || "unnamed"}:`, {
              brightness: brightness.toFixed(2),
              roughness: material.roughness.toFixed(2),
            });
          }
        }
      });
    }
  }, [gltf, wear, patternTexture, positionMap, maskTexture, baseColorTexture, normalTexture, customMaterialsApplied]);

  // Update wear amount in shader uniforms when wear changes
  useEffect(() => {
    if (!gltf || !customMaterialsApplied) return;

    const brightness = 1.0 - wear * 0.6;

    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material && (mesh.material as any).uniforms) {
          const shaderMat = mesh.material as THREE.ShaderMaterial;
          shaderMat.uniforms.wearAmount.value = wear;
          shaderMat.uniforms.brightness.value = brightness;
          console.log(`Updated wear: ${wear.toFixed(2)}, brightness: ${brightness.toFixed(2)}`);
        }
      }
    });
  }, [wear, gltf, customMaterialsApplied]);

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
