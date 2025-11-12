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
  // CS.MONEY STYLE - NO POSITION MAP!
  // ==========================================

  // Pattern texture (skin design - e.g., Asiimov)
  const patternTexture = skinPatternUrl ? useLoader(TextureLoader, skinPatternUrl) : null;

  // Material mask - defines paintable areas (like CS.MONEY)
  const maskTexture = skinPatternUrl ? useLoader(TextureLoader, "/models/ak47/materials/composite_inputs/weapon_rif_ak47_masks.png") : null;

  // Base textures (vanilla AK-47)
  const baseColor = useLoader(TextureLoader, "/models/ak47/materials/ak47_default_color.png");
  const normalMap = useLoader(TextureLoader, "/models/ak47/materials/ak47_default_normal.png");
  const roughnessMap = useLoader(TextureLoader, "/models/ak47/materials/ak47_default_rough.png");

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

  // Apply CS.MONEY-style rendering (NO POSITION MAP!)
  useEffect(() => {
    if (!gltf || !baseColor || !normalMap || !roughnessMap) return;

    console.log("🎨 Applying CS.MONEY-style rendering (NO position map!)");

    // Configure textures for GLTF
    baseColor.flipY = false;
    normalMap.flipY = false;
    roughnessMap.flipY = false;

    if (patternTexture) {
      patternTexture.flipY = false;
      patternTexture.wrapS = THREE.RepeatWrapping;
      patternTexture.wrapT = THREE.RepeatWrapping;
    }

    if (maskTexture) {
      maskTexture.flipY = false;
    }

    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        // Create or get material
        let material = mesh.material as THREE.MeshStandardMaterial;

        if (!material || !(material instanceof THREE.MeshStandardMaterial)) {
          material = new THREE.MeshStandardMaterial();
          mesh.material = material;
        }

        // Apply skin or vanilla
        if (skinPatternUrl && patternTexture && maskTexture) {
          // CS.MONEY-style: blend pattern with base using mask
          console.log(`🎨 Applying skin blend to: ${mesh.name}`);

          // Create canvas for blending
          const canvas = document.createElement('canvas');
          canvas.width = 2048;
          canvas.height = 2048;
          const ctx = canvas.getContext('2d')!;

          // Draw base
          const baseImg = new Image();
          baseImg.crossOrigin = 'anonymous';
          baseImg.src = baseColor.image.src;
          baseImg.onload = () => {
            ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);

            // Draw pattern with mask
            const patternImg = new Image();
            patternImg.crossOrigin = 'anonymous';
            patternImg.src = patternTexture.image.src;
            patternImg.onload = () => {
              const maskImg = new Image();
              maskImg.crossOrigin = 'anonymous';
              maskImg.src = maskTexture.image.src;
              maskImg.onload = () => {
                // Use mask as alpha
                ctx.globalCompositeOperation = 'source-over';

                // Create temp canvas for masked pattern
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                const tempCtx = tempCanvas.getContext('2d')!;

                // Draw pattern
                tempCtx.drawImage(patternImg, 0, 0, tempCanvas.width, tempCanvas.height);

                // Apply mask
                tempCtx.globalCompositeOperation = 'destination-in';
                tempCtx.drawImage(maskImg, 0, 0, tempCanvas.width, tempCanvas.height);

                // Draw masked pattern on main canvas
                ctx.drawImage(tempCanvas, 0, 0);

                // Create texture from canvas
                const blendedTexture = new THREE.CanvasTexture(canvas);
                blendedTexture.flipY = false;

                material.map = blendedTexture;
                material.normalMap = normalMap;
                material.roughnessMap = roughnessMap;
                material.metalness = 0.0; // CS.MONEY value
                material.roughness = 0.42; // CS.MONEY value
                material.needsUpdate = true;

                console.log(`✅ CS.MONEY-style blend applied to ${mesh.name}`);
              };
            };
          };
        } else {
          // Vanilla - just base textures
          material.map = baseColor;
          material.normalMap = normalMap;
          material.roughnessMap = roughnessMap;
          material.metalness = 0.0;
          material.roughness = 0.42;
          material.needsUpdate = true;

          console.log(`✅ Vanilla textures applied to ${mesh.name}`);
        }
      }
    });
  }, [gltf, patternTexture, maskTexture, baseColor, normalMap, roughnessMap, skinPatternUrl]);

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
