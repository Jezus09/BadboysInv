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
  skinTextureUrl?: string;
}

export function WeaponModel({ defIndex, paintSeed, wear, skinTextureUrl }: WeaponModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [modelPath, setModelPath] = useState<string>("/models/ak47/weapon_rif_ak47.gltf");

  // Load GLTF model
  const gltf = useLoader(GLTFLoader, modelPath);

  // Load textures for composite shader (only if skinTextureUrl provided)
  const patternTexture = skinTextureUrl ? useLoader(TextureLoader, skinTextureUrl) : null;
  const positionMap = skinTextureUrl ? useLoader(EXRLoader, "/models/ak47/position_map.exr") : null;
  const maskTexture = skinTextureUrl ? useLoader(TextureLoader, "/models/ak47/mask.png") : null;

  useEffect(() => {
    if (!gltf) return;

    console.log("✅ GLTF loaded:", gltf);
    console.log("🎨 Skin texture:", skinTextureUrl ? "YES" : "NO");

    // Center and scale the model
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Center the model
    gltf.scene.position.sub(center);

    // Scale to fit - EVEN SMALLER (1.5 units instead of 2)
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 1.5 / maxDim;
    gltf.scene.scale.setScalar(scale);

    console.log("📏 Model size:", {
      originalSize: size,
      maxDim,
      scale,
      finalSize: {
        x: size.x * scale,
        y: size.y * scale,
        z: size.z * scale
      }
    });

    // Apply materials
    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        console.log(`Found mesh: "${mesh.name}"`);

        // Apply to BOTH body meshes
        if (mesh.name.includes("body_legacy") || mesh.name.includes("body_hd")) {
          if (patternTexture && positionMap && maskTexture) {
            // COMPOSITE SHADER MODE
            console.log(`🎨 Applying composite shader to: ${mesh.name}`);

            const originalMaterial = mesh.material as THREE.MeshStandardMaterial;
            const baseTexture = originalMaterial.map;

            // Custom shader material
            const shaderMaterial = new THREE.ShaderMaterial({
              uniforms: {
                baseTexture: { value: baseTexture },
                patternTexture: { value: patternTexture },
                positionMap: { value: positionMap },
                maskMap: { value: maskTexture },
                wearAmount: { value: wear },
                brightness: { value: 1.0 - wear * 0.6 }
              },
              vertexShader: `
                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vPosition;

                void main() {
                  vUv = uv;
                  vNormal = normalize(normalMatrix * normal);
                  vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
              `,
              fragmentShader: `
                uniform sampler2D baseTexture;
                uniform sampler2D patternTexture;
                uniform sampler2D positionMap;
                uniform sampler2D maskMap;
                uniform float wearAmount;
                uniform float brightness;

                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vPosition;

                void main() {
                  // DEBUG MODE: Try direct UV mapping first (no position map)
                  // Sample textures
                  vec4 baseColor = texture2D(baseTexture, vUv);
                  vec4 patternColor = texture2D(patternTexture, vUv); // Direct UV (no position map)
                  float maskValue = texture2D(maskMap, vUv).r;

                  // Blend base and pattern using mask
                  vec3 finalColor = mix(baseColor.rgb, patternColor.rgb, maskValue * 0.8);

                  // Apply wear-based brightness
                  finalColor *= brightness;

                  // Simple directional lighting
                  vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
                  float diff = max(dot(vNormal, lightDir), 0.0);
                  finalColor *= (0.5 + 0.5 * diff);

                  gl_FragColor = vec4(finalColor, 1.0);
                }
              `,
              side: THREE.DoubleSide
            });

            mesh.material = shaderMaterial;
            console.log(`✅ Shader applied to ${mesh.name}`);
          } else {
            // SIMPLE MODE (no skin)
            const material = mesh.material as THREE.MeshStandardMaterial;
            const brightness = 1.0 - wear * 0.6;
            material.color.setRGB(brightness, brightness, brightness);
            material.roughness = 0.42 + wear * 0.4;

            console.log(`Simple material on ${mesh.name}:`, {
              brightness: brightness.toFixed(2),
              roughness: material.roughness.toFixed(2),
            });
          }
        }
      }
    });
  }, [gltf, wear, patternTexture, positionMap, maskTexture, skinTextureUrl]);

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
