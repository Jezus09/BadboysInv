/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ClientOnly } from "remix-utils/client-only";
import { Overlay } from "./overlay";
import { ModalButton } from "./modal-button";
import { useInventoryItem } from "./hooks/use-inventory-item";
import { useNameItemString } from "./hooks/use-name-item";

// Mapping of CS2 paint kit IDs to available textures
// Currently we only have unwrapped textures for these skins from Inspect3D
const AVAILABLE_SKINS: Record<number, string> = {
  801: "asiimov", // AK-47 | Asiimov
  600: "neon_revolution", // AK-47 | Neon Revolution
  941: "phantom_disruptor", // AK-47 | Phantom Disruptor
  // Note: Default_OBJ.003_baseColor.png is Wild Lotus embedded in model
  // We need to map more skin IDs to textures as we get them
};

export function Inspect3D({
  onClose,
  uid
}: {
  onClose: () => void;
  uid: number;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const frameRef = useRef<number>();
  const [loading, setLoading] = useState(true);
  const [skinAvailable, setSkinAvailable] = useState(false);

  const item = useInventoryItem(uid);
  const nameItemString = useNameItemString();

  // Check if we have a texture for this skin
  const skinTexture = item.paintIndex !== undefined ? AVAILABLE_SKINS[item.paintIndex] : null;

  useEffect(() => {
    if (!canvasRef.current) return;

    let mounted = true;

    // Dynamic import Three.js
    const initScene = async () => {
      const THREE = await import("three");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");

      if (!mounted || !canvasRef.current) return;

      // Setup scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1a1a);

      // Setup camera
      const camera = new THREE.PerspectiveCamera(
        50,
        canvasRef.current.clientWidth / canvasRef.current.clientHeight,
        0.01,
        100
      );
      camera.position.set(2, 1, 3);

      // Setup renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      canvasRef.current.appendChild(renderer.domElement);

      // Controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 1;
      controls.maxDistance = 5;

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
      scene.add(ambientLight);

      const dirLight1 = new THREE.DirectionalLight(0xffffff, 2);
      dirLight1.position.set(5, 5, 5);
      scene.add(dirLight1);

      const dirLight2 = new THREE.DirectionalLight(0xffffff, 1);
      dirLight2.position.set(-5, 3, -5);
      scene.add(dirLight2);

      // Load weapon model
      const loader = new GLTFLoader();
      const textureLoader = new THREE.TextureLoader();

      // Check weapon type - for now we only have AK-47
      const weaponModel = item.model === "weapon_ak47" ? "weapon_ak47" : null;

      if (!weaponModel) {
        console.warn("No 3D model available for weapon:", item.model);
        setLoading(false);
        return;
      }

      loader.load(
        `/3d-models/${weaponModel}/scene.gltf`,
        (gltf) => {
          if (!mounted) return;

          const model = gltf.scene;

          // Normalize size & center
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxSize = Math.max(size.x, size.y, size.z);
          const scale = 10 / maxSize;

          model.scale.multiplyScalar(scale);
          model.position.sub(center.multiplyScalar(scale));

          // Apply skin texture if available
          if (skinTexture) {
            const texturePath = `/3d-models/${weaponModel}/textures/${skinTexture}.png`;

            textureLoader.load(texturePath, (customTexture) => {
              customTexture.colorSpace = THREE.SRGBColorSpace;

              model.traverse((child: any) => {
                if (child.isMesh) {
                  child.material = new THREE.MeshStandardMaterial({
                    map: customTexture,
                    metalness: 0.3,
                    roughness: 0.6,
                  });
                  child.material.needsUpdate = true;
                }
              });

              setSkinAvailable(true);
            }, undefined, (error) => {
              console.warn("Failed to load skin texture:", error);
              // Use default grey if texture fails
              applyDefaultMaterial();
            });
          } else {
            // No skin texture available, use grey
            applyDefaultMaterial();
          }

          function applyDefaultMaterial() {
            model.traverse((child: any) => {
              if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({
                  color: 0x666666,
                  metalness: 0.4,
                  roughness: 0.5,
                });
              }
            });
          }

          scene.add(model);
          setLoading(false);
        },
        undefined,
        (error) => {
          console.error("Failed to load weapon model:", error);
          setLoading(false);
        }
      );

      sceneRef.current = scene;
      rendererRef.current = renderer;

      // Animation loop
      const animate = () => {
        if (!mounted) return;
        frameRef.current = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      // Handle window resize
      const handleResize = () => {
        if (!canvasRef.current) return;
        camera.aspect = canvasRef.current.clientWidth / canvasRef.current.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
      };
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    };

    initScene();

    return () => {
      mounted = false;
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (canvasRef.current && rendererRef.current?.domElement) {
        canvasRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, [item, skinTexture]);

  return (
    <ClientOnly
      children={() =>
        createPortal(
          <Overlay className="flex flex-col">
            <div className="flex-none text-center py-4">
              <div className="inline-block border-b-4 pb-2 px-4" style={{ borderColor: item.rarity }}>
                <div className="text-3xl font-display font-bold text-white">
                  {nameItemString(item)}
                </div>
                {!skinAvailable && skinTexture && (
                  <div className="text-sm text-yellow-400 mt-1">
                    3D skin preview coming soon
                  </div>
                )}
                {!skinTexture && item.paintIndex !== undefined && (
                  <div className="text-sm text-gray-400 mt-1">
                    3D skin not available yet
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 relative" ref={canvasRef}>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white">Loading 3D model...</div>
                </div>
              )}
            </div>

            <div className="flex-none p-4 bg-neutral-900/50 backdrop-blur">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-400">
                  Left click + drag to rotate | Scroll to zoom
                </div>
                <ModalButton
                  variant="secondary"
                  onClick={onClose}
                  children="Close"
                />
              </div>
            </div>
          </Overlay>,
          document.body
        )
      }
    />
  );
}