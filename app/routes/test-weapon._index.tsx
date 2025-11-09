/*---------------------------------------------------------------------------------------------
 *  CS2 Weapon Model + Skin Texture TEST PAGE
 *  Tests if official Valve OBJ models work with CS2 skin textures
 *--------------------------------------------------------------------------------------------*/

import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useState } from "react";
import { CS2Economy } from "@ianlucas/cs2-lib";
import * as THREE from "three";

/**
 * Test weapon component - loads GLB and applies CS2 skin texture
 */
function TestWeapon({ skinName }: { skinName: string | null }) {
  // Load weapon GLB model - Official CS2 export (3.1 MB)
  const gltf = useGLTF("/models/weapons/ak47_cs2_official.glb");

  // Apply CS2 composite skin (position map + paint kit texture)
  useEffect(() => {
    if (!gltf || !skinName) return;

    const textureLoader = new THREE.TextureLoader();

    // Load composite inputs and paint kit texture
    Promise.all([
      new Promise<THREE.Texture>((resolve) =>
        textureLoader.load("/models/composite_inputs/ak47/position.png", resolve)
      ),
      new Promise<THREE.Texture>((resolve) =>
        textureLoader.load("/models/composite_inputs/ak47/masks.png", resolve)
      ),
      new Promise<THREE.Texture>((resolve) =>
        textureLoader.load(`/models/skins/${skinName}.png`, resolve)
      ),
    ]).then(([positionMap, maskMap, paintKitTexture]) => {
      console.log("✅ Loaded composite inputs + paint kit");

      gltf.scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Create custom shader material for composite rendering
          const material = new THREE.ShaderMaterial({
            uniforms: {
              positionMap: { value: positionMap },
              maskMap: { value: maskMap },
              paintKitTexture: { value: paintKitTexture },
            },
            vertexShader: `
              varying vec2 vUv;
              void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `,
            fragmentShader: `
              uniform sampler2D positionMap;
              uniform sampler2D maskMap;
              uniform sampler2D paintKitTexture;
              varying vec2 vUv;

              void main() {
                // Sample position map (RGB = XYZ coordinates in paint kit space)
                vec3 posInPaintKit = texture2D(positionMap, vUv).rgb;

                // Sample mask (where to apply paint kit)
                float mask = texture2D(maskMap, vUv).r;

                // Sample paint kit texture using position map coordinates
                vec2 paintKitUV = posInPaintKit.xy;
                vec4 paintKitColor = texture2D(paintKitTexture, paintKitUV);

                // Mix base color with paint kit based on mask
                vec4 baseColor = vec4(0.3, 0.3, 0.3, 1.0); // Grey base
                vec4 finalColor = mix(baseColor, paintKitColor, mask);

                gl_FragColor = finalColor;
              }
            `,
          });

          child.material = material;
          console.log("✅ Applied composite shader to mesh:", child.name);
        }
      });
    }).catch((error) => {
      console.error("❌ Failed to load composite textures:", error);
    });
  }, [gltf, skinName]);

  return (
    <primitive
      object={gltf.scene}
      scale={1.5}
      rotation={[0, Math.PI, 0]}
    />
  );
}

/**
 * Test scene with lighting
 */
function TestScene({ skinName }: { skinName: string | null }) {
  return (
    <>
      {/* Camera */}
      <PerspectiveCamera makeDefault position={[2, 1, 3]} fov={50} near={0.01} far={100} />
      <OrbitControls enableDamping dampingFactor={0.05} minDistance={0.5} maxDistance={10} />

      {/* Lighting */}
      <ambientLight intensity={1.5} />
      <directionalLight position={[5, 5, 5]} intensity={2} />
      <directionalLight position={[-5, 3, -5]} intensity={1} />

      {/* Weapon */}
      <Suspense fallback={null}>
        <TestWeapon skinName={skinName} />
      </Suspense>
    </>
  );
}

/**
 * Test page component
 */
export default function TestWeaponPage() {
  const [skinName, setSkinName] = useState<string | null>(null);

  // Test skins - Extracted CS2 paint kits
  const testSkins = [
    { skin: null, name: "AK-47 (Base)" },
    { skin: "fireserpent_ak47", name: "AK-47 | Fire Serpent" },
  ];

  return (
    <div className="fixed inset-0 bg-neutral-900">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-neutral-800/90 backdrop-blur p-4 border-b border-neutral-700">
        <h1 className="font-display text-2xl font-bold text-white mb-2 uppercase">
          🧪 CS2 Composite Shader Test
        </h1>
        <p className="text-neutral-400 text-sm mb-3">
          Official CS2 model + position map + paint kit texture = REAL CS2 skins!
        </p>

        {/* Skin selector */}
        <div className="flex gap-2 flex-wrap">
          {testSkins.map((skin, idx) => (
            <button
              key={idx}
              onClick={() => setSkinName(skin.skin)}
              className={`px-3 py-1 rounded text-sm transition ${
                skinName === skin.skin
                  ? "bg-blue-600 text-white"
                  : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
              }`}
            >
              {skin.name}
            </button>
          ))}
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas
        className="w-full h-full"
        gl={{ antialias: true, alpha: true }}
      >
        <TestScene skinName={skinName} />
      </Canvas>

      {/* Instructions */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-neutral-800/90 backdrop-blur p-4 border-t border-neutral-700">
        <p className="text-neutral-300 text-sm">
          <strong className="text-white">Controls:</strong> Left click + drag to rotate | Scroll to zoom
        </p>
        <p className="text-neutral-400 text-xs mt-1">
          Using position map + paint kit texture + custom GLSL shader for CS2-accurate rendering
        </p>
      </div>
    </div>
  );
}
