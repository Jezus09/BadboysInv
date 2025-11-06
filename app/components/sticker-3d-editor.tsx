/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, useGLTF } from "@react-three/drei";
import { Suspense, useState, useEffect, useRef, Component, ReactNode } from "react";
import * as THREE from "three";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";
import { useNameItemString } from "~/components/hooks/use-name-item";
import { useSync } from "~/components/hooks/use-sync";
import { SyncAction } from "~/data/sync";
import { playSound } from "~/utils/sound";
import { useInventory, useTranslate } from "./app-context";
import { ModalButton } from "./modal-button";
import { UseItemFooter } from "./use-item-footer";
import { UseItemHeader } from "./use-item-header";
import { CS2Economy } from "@ianlucas/cs2-lib";
import {
  getWeaponModelFilename,
  loadStickerTexture,
  getStickerImageUrl,
  getWeaponStickerPreset,
} from "~/utils/model-loader";

interface StickerTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  wear: number;
}

interface Sticker3DEditorProps {
  onClose: () => void;
  targetUid: number;
  stickerUid: number;
}

/**
 * Error Boundary for 3D components
 * Prevents crashes from propagating to the entire app
 */
class ThreeErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error?.message || error?.toString() || 'Unknown error' };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("[3D Editor] ❌❌❌ ERROR CAUGHT BY BOUNDARY ❌❌❌");
    console.error("[3D Editor] Error:", error);
    console.error("[3D Editor] Error message:", error?.message);
    console.error("[3D Editor] Error stack:", error?.stack);
    console.error("[3D Editor] Error info:", errorInfo);
    console.error("[3D Editor] ❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌");
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex items-center justify-center h-full text-neutral-400 p-4">
            <div className="text-center max-w-lg">
              <div className="text-4xl mb-2">⚠️</div>
              <div className="text-lg font-bold mb-2">3D mode unavailable</div>
              <div className="text-xs mt-2 p-3 bg-red-900/50 border border-red-500 rounded">
                <div className="font-bold text-red-300 mb-1">Error:</div>
                <div className="text-red-200 font-mono text-left break-words">
                  {this.state.errorMessage}
                </div>
              </div>
              <div className="text-xs mt-2 text-gray-400">
                Check browser console for full details
              </div>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

/**
 * 3D Weapon Model Component
 * Loads actual weapon GLTF models from /public/models/weapons/
 */
function WeaponModel({
  weaponDefIndex,
  onModelLoad
}: {
  weaponDefIndex: number;
  onModelLoad?: (mesh: THREE.Mesh | null) => void;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const [fallbackMode, setFallbackMode] = useState(false);

  // Get the model filename
  const modelFilename = getWeaponModelFilename(weaponDefIndex);
  const modelPath = modelFilename ? `/models/weapons/${modelFilename}` : null;

  // Try to load the GLTF model
  useEffect(() => {
    if (!modelPath) {
      setFallbackMode(true);
      return;
    }

    // Load model using useGLTF pattern
    let mounted = true;

    fetch(modelPath, { method: 'HEAD' })
      .then(response => {
        if (!response.ok) {
          throw new Error('Model not found');
        }
        // Model exists, will be loaded by useGLTF
      })
      .catch(() => {
        if (mounted) {
          console.log(`[WeaponModel] Model not found: ${modelPath}, using fallback`);
          setFallbackMode(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, [modelPath]);

  // Notify parent of mesh reference for decal placement
  useEffect(() => {
    if (meshRef.current && onModelLoad) {
      // Find the first mesh in the group
      const mesh = meshRef.current.children.find(
        (child) => child instanceof THREE.Mesh
      ) as THREE.Mesh | undefined;

      onModelLoad(mesh || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fallbackMode]);

  // Fallback mode: simple box geometry
  if (fallbackMode || !modelPath) {
    return (
      <mesh
        ref={meshRef as any}
        rotation={[0, Math.PI / 4, 0]}
        onClick={() => {
          if (meshRef.current && onModelLoad) {
            const mesh = meshRef.current as any as THREE.Mesh;
            onModelLoad(mesh);
          }
        }}
      >
        <boxGeometry args={[2, 0.3, 0.1]} />
        <meshStandardMaterial
          color="#888888"
          metalness={0.5}
          roughness={0.5}
          emissive="#222222"
          emissiveIntensity={0.2}
        />
      </mesh>
    );
  }

  // Real GLTF model mode
  return <LoadedWeaponModel modelPath={modelPath} weaponDefIndex={weaponDefIndex} meshRef={meshRef} onModelLoad={onModelLoad} />;
}

/**
 * Actual GLTF model loader component
 */
function LoadedWeaponModel({
  modelPath,
  weaponDefIndex,
  meshRef,
  onModelLoad
}: {
  modelPath: string;
  weaponDefIndex: number;
  meshRef: React.RefObject<THREE.Group>;
  onModelLoad?: (mesh: THREE.Mesh | null) => void;
}) {
  const gltf = useGLTF(modelPath);
  const [clonedScene, setClonedScene] = useState<THREE.Group | null>(null);

  // Clone the scene once and store it
  useEffect(() => {
    if (gltf.scene) {
      const clone = gltf.scene.clone(true); // Deep clone including materials
      setClonedScene(clone);

      // Find the first mesh for parent callback
      if (onModelLoad) {
        const mesh = clone.children.find(
          (child) => child instanceof THREE.Mesh
        ) as THREE.Mesh | undefined;
        onModelLoad(mesh || null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gltf]);

  // Load and apply weapon skin texture
  useEffect(() => {
    if (!clonedScene) return;

    const econItem = CS2Economy.getById(weaponDefIndex);
    console.log(`[WeaponModel] Loading weapon:`, {
      weaponDefIndex,
      econItem: econItem ? {
        id: econItem.id,
        name: econItem.name,
        type: econItem.type,
        hasImage: !!econItem.image,
        imageUrl: econItem.image
      } : null
    });

    if (econItem) {
      // Use getImage() method which handles baseUrl prefix
      const imageUrl = econItem.getImage();
      const textureLoader = new THREE.TextureLoader();
      console.log(`[WeaponModel] Loading texture from: ${imageUrl}`);

      textureLoader.load(
        imageUrl,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;

          // Fix texture mapping for CS2 weapon skins
          // CS2 skin textures need proper UV mapping configuration
          texture.flipY = true; // CS2 textures need Y-flip for correct orientation
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;

          // Apply weapon-specific texture transformations
          // These values fix UV mapping issues for different weapon models
          const weaponTextureConfig: Record<number, { offset?: [number, number]; repeat?: [number, number]; rotation?: number }> = {
            7: { // AK-47
              offset: [0, 0],
              repeat: [1, 1],
              rotation: 0
            },
            // Add more weapon-specific configs here as needed
          };

          const baseWeaponDef = econItem.def || weaponDefIndex;
          const config = weaponTextureConfig[baseWeaponDef];

          if (config) {
            if (config.offset) {
              texture.offset.set(config.offset[0], config.offset[1]);
              console.log(`[WeaponModel] Applied offset [${config.offset[0]}, ${config.offset[1]}] for weapon ${baseWeaponDef}`);
            }
            if (config.repeat) {
              texture.repeat.set(config.repeat[0], config.repeat[1]);
              console.log(`[WeaponModel] Applied repeat [${config.repeat[0]}, ${config.repeat[1]}] for weapon ${baseWeaponDef}`);
            }
            if (config.rotation !== undefined) {
              texture.rotation = config.rotation;
              console.log(`[WeaponModel] Applied rotation ${config.rotation} for weapon ${baseWeaponDef}`);
            }
          }

          let meshCount = 0;
          let materialCount = 0;

          // Apply texture to all meshes in the cloned scene
          clonedScene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              meshCount++;
              console.log(`[WeaponModel] Found mesh:`, child.name, `Material type:`, child.material.constructor.name);

              if (Array.isArray(child.material)) {
                child.material.forEach((mat, idx) => {
                  materialCount++;
                  console.log(`[WeaponModel] Material[${idx}] type:`, mat.constructor.name);
                  if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhongMaterial) {
                    mat.map = texture;
                    // Enhance material properties for better visibility
                    if (mat instanceof THREE.MeshStandardMaterial) {
                      mat.metalness = 0.3;
                      mat.roughness = 0.7;
                      mat.emissive = new THREE.Color(0x111111);
                      mat.emissiveIntensity = 0.1;
                    }
                    mat.color = new THREE.Color(0xffffff); // Bright white base
                    mat.needsUpdate = true;
                    console.log(`[WeaponModel] ✅ Applied texture to material[${idx}]`);
                  }
                });
              } else if (child.material instanceof THREE.MeshStandardMaterial || child.material instanceof THREE.MeshPhongMaterial) {
                materialCount++;
                child.material.map = texture;
                // Enhance material properties for better visibility
                if (child.material instanceof THREE.MeshStandardMaterial) {
                  child.material.metalness = 0.3;
                  child.material.roughness = 0.7;
                  child.material.emissive = new THREE.Color(0x111111);
                  child.material.emissiveIntensity = 0.1;
                }
                child.material.color = new THREE.Color(0xffffff); // Bright white base
                child.material.needsUpdate = true;
                console.log(`[WeaponModel] ✅ Applied texture to single material`);
              } else {
                console.warn(`[WeaponModel] ⚠️ Unsupported material type:`, child.material.constructor.name);
              }
            }
          });

          console.log(`[WeaponModel] ✅ Texture applied to ${meshCount} meshes, ${materialCount} materials. Item: ${econItem.name}`);
        },
        (progress) => {
          console.log(`[WeaponModel] Loading texture... ${Math.round((progress.loaded / progress.total) * 100)}%`);
        },
        (error) => {
          console.error("[WeaponModel] ❌ Failed to load skin texture", error);
        }
      );
    } else {
      console.warn("[WeaponModel] ⚠️ No image available for weapon", weaponDefIndex);
    }
  }, [clonedScene, weaponDefIndex]);

  if (!clonedScene) return null;

  return (
    <primitive
      ref={meshRef}
      object={clonedScene}
      rotation={[0, Math.PI / 4, 0]}
      scale={3} // Optimal scale - visible but not too large
    />
  );
}

/**
 * Sticker Preview Component
 * Renders a sticker decal on the weapon using DecalGeometry
 */
function StickerDecal({
  transform,
  stickerTexture,
  targetMesh,
  onPointerDown,
  useDecal = false
}: {
  transform: StickerTransform;
  stickerTexture?: THREE.Texture;
  targetMesh?: THREE.Mesh | null;
  onPointerDown?: () => void;
  useDecal?: boolean;
}) {
  const { position, rotation, scale, wear } = transform;
  const meshRef = useRef<THREE.Mesh>(null);

  // Create material
  const material = new THREE.MeshPhongMaterial({
    map: stickerTexture,
    transparent: true,
    opacity: 1 - wear,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    side: THREE.DoubleSide,
  });

  // If we have a target mesh and decal mode is enabled, use DecalGeometry
  if (useDecal && targetMesh) {
    // Create DecalGeometry
    const decalPosition = new THREE.Vector3(...position);
    const decalOrientation = new THREE.Euler(...rotation);
    const decalSize = new THREE.Vector3(0.3 * scale, 0.3 * scale, 0.1);

    try {
      const decalGeometry = new DecalGeometry(
        targetMesh,
        decalPosition,
        decalOrientation,
        decalSize
      );

      return (
        <mesh
          ref={meshRef}
          geometry={decalGeometry}
          material={material}
          onPointerDown={(e) => {
            e.stopPropagation();
            onPointerDown?.();
          }}
        />
      );
    } catch (error) {
      console.warn("[StickerDecal] DecalGeometry failed, falling back to plane", error);
      // Fall through to plane mode
    }
  }

  // Fallback: Simple plane geometry (when no target mesh or decal mode disabled)
  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      scale={scale}
      material={material}
      onPointerDown={(e) => {
        e.stopPropagation();
        onPointerDown?.();
      }}
    >
      <planeGeometry args={[0.3, 0.3]} />
    </mesh>
  );
}

/**
 * 3D Scene Component
 */
function Scene3D({
  weaponDefIndex,
  stickerItemId,
  stickers,
  selectedSlot,
  onStickerSelect,
  onDebugInfo,
  onStatusChange
}: {
  weaponDefIndex: number;
  stickerItemId: number;
  stickers: Map<number, StickerTransform>;
  selectedSlot: number | null;
  onStickerSelect: (slot: number) => void;
  onDebugInfo?: (info: string) => void;
  onStatusChange?: (status: string) => void;
}) {
  const [weaponMesh, setWeaponMesh] = useState<THREE.Mesh | null>(null);
  const [stickerTexture, setStickerTexture] = useState<THREE.Texture | null>(null);

  // Load sticker texture
  useEffect(() => {
    // Get sticker item from CS2Economy
    const stickerEconItem = CS2Economy.getById(stickerItemId);

    const debugInfo = {
      stickerItemId,
      econItem: stickerEconItem ? {
        id: stickerEconItem.id,
        def: stickerEconItem.def,
        name: stickerEconItem.name,
        type: stickerEconItem.type
      } : null
    };

    console.log(`[Scene3D] Loading sticker:`, debugInfo);
    const statusMsg = `Sticker: id=${stickerItemId}, def=${stickerEconItem?.def}`;
    onDebugInfo?.(statusMsg);
    onStatusChange?.(statusMsg);

    if (!stickerEconItem) {
      console.warn("[Scene3D] Sticker not found in CS2Economy", stickerItemId);
      onDebugInfo?.(`❌ Sticker not found: ${stickerItemId}`);
      setStickerTexture(null);
      return;
    }

    // Use def (definition index) to get image from CSGO-API
    const stickerDefIndex = stickerEconItem.def;
    const stickerUrl = getStickerImageUrl(stickerDefIndex);

    console.log(`[Scene3D] Loading texture from CSGO-API with def_index: ${stickerDefIndex}`);
    console.log(`[Scene3D] Texture URL: ${stickerUrl}`);

    // Check if it's a placeholder (data URI)
    const isPlaceholder = stickerUrl.startsWith('data:');
    const urlPreview = isPlaceholder ? 'PLACEHOLDER (base64)' : stickerUrl.substring(0, 50);

    if (isPlaceholder) {
      const msg = `⚠️ PLACEHOLDER! Cache not loaded?`;
      onDebugInfo?.(msg);
      onStatusChange?.(msg);
    } else {
      const msg = `Loading: ${urlPreview}...`;
      onDebugInfo?.(msg);
      onStatusChange?.(msg);
    }

    loadStickerTexture(stickerUrl)
      .then((texture) => {
        console.log(`[Scene3D] ✅ Sticker texture loaded successfully`);
        onDebugInfo?.(`✅ Sticker texture loaded!`);
        setStickerTexture(texture);
      })
      .catch((error) => {
        console.error("[Scene3D] ❌ Failed to load sticker texture", error);

        // Extract meaningful error message
        let errorMsg = 'Unknown error';
        if (error instanceof ErrorEvent) {
          errorMsg = `Image load failed: ${stickerUrl.substring(0, 40)}`;
        } else if (error?.message) {
          errorMsg = error.message;
        } else if (typeof error === 'string') {
          errorMsg = error;
        }

        const fullMsg = `❌ FAILED: ${errorMsg}`;
        onDebugInfo?.(fullMsg);
        onStatusChange?.(fullMsg);

        // Don't set to null - keep trying with a fallback white color
        console.warn("[Scene3D] Creating fallback white texture");
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 64, 64);
          const fallbackTexture = new THREE.CanvasTexture(canvas);
          setStickerTexture(fallbackTexture);
        } else {
          setStickerTexture(null);
        }
      });
  }, [stickerItemId, onDebugInfo]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0.5, 2]} />
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={0.3}
        maxDistance={8}
      />

      {/* Lighting - Enhanced for better texture visibility */}
      <ambientLight intensity={1.2} />
      <hemisphereLight intensity={0.8} groundColor="#444444" color="#ffffff" />
      <directionalLight position={[5, 5, 5]} intensity={1.5} castShadow />
      <directionalLight position={[-5, 3, 5]} intensity={1.2} />
      <directionalLight position={[0, -3, 3]} intensity={0.8} />
      <pointLight position={[0, 2, 2]} intensity={1.5} />
      <pointLight position={[-2, 1, -2]} intensity={0.8} />

      {/* Weapon Model */}
      <WeaponModel
        weaponDefIndex={weaponDefIndex}
        onModelLoad={(mesh) => setWeaponMesh(mesh)}
      />

      {/* Stickers */}
      {Array.from(stickers.entries()).map(([slot, transform]) => (
        <StickerDecal
          key={slot}
          transform={transform}
          stickerTexture={stickerTexture || undefined}
          targetMesh={weaponMesh}
          useDecal={!!weaponMesh} // Use decal mode if we have a weapon mesh
          onPointerDown={() => onStickerSelect(slot)}
        />
      ))}
    </>
  );
}

/**
 * Control Panel for Position/Rotation/Scale adjustments
 */
function ControlPanel({
  selectedSlot,
  transform,
  onChange
}: {
  selectedSlot: number | null;
  transform: StickerTransform | null;
  onChange: (newTransform: StickerTransform) => void;
}) {
  const translate = useTranslate();

  if (selectedSlot === null || !transform) {
    return (
      <div className="p-4 sm:p-6 bg-neutral-800 rounded-lg">
        <div className="text-center text-neutral-400 text-sm sm:text-base py-4 sm:py-8">
          <div className="text-2xl sm:text-4xl mb-2">👆</div>
          <div className="font-medium">Select a slot above (0-4)</div>
          <div className="text-xs sm:text-sm mt-1">Choose where to place your sticker</div>
        </div>
      </div>
    );
  }

  const handlePositionChange = (axis: 0 | 1 | 2, value: number) => {
    const newPosition: [number, number, number] = [...transform.position];
    newPosition[axis] = value;
    onChange({ ...transform, position: newPosition });
  };

  const handleRotationChange = (axis: 0 | 1 | 2, value: number) => {
    const newRotation: [number, number, number] = [...transform.rotation];
    newRotation[axis] = (value * Math.PI) / 180; // Convert degrees to radians
    onChange({ ...transform, rotation: newRotation });
  };

  return (
    <div className="space-y-2 sm:space-y-3 p-2 sm:p-4 bg-neutral-800 rounded-lg">
      <div className="text-xs sm:text-sm font-bold text-neutral-200 mb-1 sm:mb-2">
        Slot {selectedSlot} Controls
      </div>

      {/* Position Controls */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <label className="text-xs sm:text-sm text-neutral-400 font-medium">Position X</label>
          <span className="text-xs sm:text-sm text-neutral-300 font-bold min-w-[3rem] text-right">
            {transform.position[0].toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min="-2"
          max="2"
          step="0.01"
          value={transform.position[0]}
          onChange={(e) => handlePositionChange(0, parseFloat(e.target.value))}
          className="w-full h-8 sm:h-6"
        />
      </div>

      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <label className="text-xs sm:text-sm text-neutral-400 font-medium">Position Y</label>
          <span className="text-xs sm:text-sm text-neutral-300 font-bold min-w-[3rem] text-right">
            {transform.position[1].toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.01"
          value={transform.position[1]}
          onChange={(e) => handlePositionChange(1, parseFloat(e.target.value))}
          className="w-full h-8 sm:h-6"
        />
      </div>

      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <label className="text-xs sm:text-sm text-neutral-400 font-medium">Position Z</label>
          <span className="text-xs sm:text-sm text-neutral-300 font-bold min-w-[3rem] text-right">
            {transform.position[2].toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.01"
          value={transform.position[2]}
          onChange={(e) => handlePositionChange(2, parseFloat(e.target.value))}
          className="w-full h-8 sm:h-6"
        />
      </div>

      {/* Divider */}
      <div className="border-t border-neutral-700 my-2 sm:my-3"></div>

      {/* Rotation Controls */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <label className="text-xs sm:text-sm text-neutral-400 font-medium">Rotation X</label>
          <span className="text-xs sm:text-sm text-neutral-300 font-bold min-w-[3rem] text-right">
            {((transform.rotation[0] * 180) / Math.PI).toFixed(0)}°
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="360"
          step="1"
          value={(transform.rotation[0] * 180) / Math.PI}
          onChange={(e) => handleRotationChange(0, parseFloat(e.target.value))}
          className="w-full h-8 sm:h-6"
        />
      </div>

      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <label className="text-xs sm:text-sm text-neutral-400 font-medium">Rotation Y</label>
          <span className="text-xs sm:text-sm text-neutral-300 font-bold min-w-[3rem] text-right">
            {((transform.rotation[1] * 180) / Math.PI).toFixed(0)}°
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="360"
          step="1"
          value={(transform.rotation[1] * 180) / Math.PI}
          onChange={(e) => handleRotationChange(1, parseFloat(e.target.value))}
          className="w-full h-8 sm:h-6"
        />
      </div>

      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <label className="text-xs sm:text-sm text-neutral-400 font-medium">Rotation Z</label>
          <span className="text-xs sm:text-sm text-neutral-300 font-bold min-w-[3rem] text-right">
            {((transform.rotation[2] * 180) / Math.PI).toFixed(0)}°
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="360"
          step="1"
          value={(transform.rotation[2] * 180) / Math.PI}
          onChange={(e) => handleRotationChange(2, parseFloat(e.target.value))}
          className="w-full h-8 sm:h-6"
        />
      </div>

      {/* Divider */}
      <div className="border-t border-neutral-700 my-2 sm:my-3"></div>

      {/* Scale Control */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <label className="text-xs sm:text-sm text-neutral-400 font-medium">Scale</label>
          <span className="text-xs sm:text-sm text-neutral-300 font-bold min-w-[3rem] text-right">
            {transform.scale.toFixed(1)}x
          </span>
        </div>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={transform.scale}
          onChange={(e) => onChange({ ...transform, scale: parseFloat(e.target.value) })}
          className="w-full h-8 sm:h-6"
        />
      </div>

      {/* Wear Control */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <label className="text-xs sm:text-sm text-neutral-400 font-medium">Wear/Scrape</label>
          <span className="text-xs sm:text-sm text-neutral-300 font-bold min-w-[3rem] text-right">
            {(transform.wear * 100).toFixed(0)}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={transform.wear}
          onChange={(e) => onChange({ ...transform, wear: parseFloat(e.target.value) })}
          className="w-full h-8 sm:h-6"
        />
      </div>
    </div>
  );
}

/**
 * Main 3D Sticker Editor Component
 */
export function Sticker3DEditor({
  onClose,
  targetUid,
  stickerUid
}: Sticker3DEditorProps) {
  const [inventory, setInventory] = useInventory();
  const translate = useTranslate();
  const sync = useSync();
  const nameItemString = useNameItemString();

  const targetItem = inventory.get(targetUid);
  const stickerItem = inventory.get(stickerUid);

  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [stickers, setStickers] = useState<Map<number, StickerTransform>>(
    new Map()
  );
  const [debugInfo, setDebugInfo] = useState<string[]>(["🔍 Debug Info - Waiting for data..."]);
  const [debugPaused, setDebugPaused] = useState(false);
  const [stickerStatus, setStickerStatus] = useState<string>("Initializing...");

  const handleSlotSelect = (slot: number) => {
    setSelectedSlot(slot);

    // Initialize sticker transform if not exists
    if (!stickers.has(slot)) {
      // Get weapon-specific preset position for better initial placement
      const preset = getWeaponStickerPreset(targetItem.id);

      console.log(`[3D Editor] Using weapon preset for ${targetItem.id}:`, preset);

      setStickers(new Map(stickers).set(slot, {
        position: [...preset.position],
        rotation: [...preset.rotation],
        scale: preset.scale,
        wear: 0
      }));
    }
  };

  const handleTransformChange = (newTransform: StickerTransform) => {
    if (selectedSlot === null) return;

    const newStickers = new Map(stickers);
    newStickers.set(selectedSlot, newTransform);
    setStickers(newStickers);
  };

  const handleDebugInfo = (info: string) => {
    if (debugPaused) return; // Don't update if paused

    setDebugInfo(prev => {
      const newInfo = [...prev, info];

      // Auto-pause on error
      if (info.includes('❌')) {
        setDebugPaused(true);
      }

      // Keep last 20 lines
      return newInfo.slice(-20);
    });
  };

  const handleApply = () => {
    if (selectedSlot === null) return;

    const transform = stickers.get(selectedSlot);
    if (!transform) return;

    // Convert 3D coordinates to 2D for legacy backend
    // Simple projection: use X and Y, ignore Z
    const x = transform.position[0];
    const y = transform.position[1];
    const rotation = Math.round((transform.rotation[2] * 180) / Math.PI); // Use Z rotation only

    sync({
      type: SyncAction.ApplyItemSticker,
      targetUid,
      slot: selectedSlot,
      stickerUid,
      x,
      y,
      rotation
    });

    setInventory(inventory.applyItemSticker(targetUid, stickerUid, selectedSlot, x, y, rotation));
    playSound("sticker_apply_confirm");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4">
      <div className="w-full max-w-6xl h-full sm:h-[90vh] bg-neutral-900 rounded-lg overflow-hidden flex flex-col">
        {/* Header */}
        <UseItemHeader
          actionDesc={translate("ApplyStickerUseOn")}
          actionItem={nameItemString(targetItem)}
          title="3D Sticker Editor"
          warning="Position your sticker using 3D controls"
        />

        {/* Main Content: 3D View + Controls */}
        <div className="flex-1 flex flex-col lg:flex-row gap-2 sm:gap-4 p-2 sm:p-4 overflow-hidden">
          {/* 3D Canvas - mobile: smaller height, desktop: full */}
          <div className="h-64 sm:h-80 lg:h-auto lg:flex-1 bg-neutral-800 rounded-lg overflow-hidden">
            <ThreeErrorBoundary>
              <Canvas shadows>
                <Suspense fallback={null}>
                  <Scene3D
                    weaponDefIndex={targetItem.id}
                    stickerItemId={stickerItem.id}
                    stickers={stickers}
                    selectedSlot={selectedSlot}
                    onStickerSelect={handleSlotSelect}
                    onDebugInfo={handleDebugInfo}
                    onStatusChange={setStickerStatus}
                  />
                </Suspense>
              </Canvas>
            </ThreeErrorBoundary>
          </div>

          {/* Control Panel - mobile: scrollable, desktop: fixed width */}
          <div className="flex-1 lg:w-80 lg:flex-none overflow-y-auto">
            {/* Slot Selector */}
            <div className="mb-2 sm:mb-4 p-2 sm:p-4 bg-neutral-800 rounded-lg">
              <div className="text-xs sm:text-sm font-bold text-neutral-200 mb-2">
                Select Slot (0-4)
              </div>
              <div className="flex gap-1 sm:gap-2">
                {[0, 1, 2, 3, 4].map((slot) => (
                  <button
                    key={slot}
                    onClick={() => handleSlotSelect(slot)}
                    className={`
                      flex-1 py-2 sm:py-3 rounded transition text-sm sm:text-base font-bold
                      ${selectedSlot === slot
                        ? 'bg-blue-600 text-white'
                        : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600 active:bg-neutral-600'
                      }
                    `}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* Transform Controls */}
            <ControlPanel
              selectedSlot={selectedSlot}
              transform={selectedSlot !== null ? stickers.get(selectedSlot) || null : null}
              onChange={handleTransformChange}
            />
          </div>
        </div>

        {/* Debug Info Panel - Mobile Friendly */}
        <div className="p-2 sm:p-4 border-t border-neutral-700 bg-black/90">
          {/* Current Status - Always Visible */}
          <div className="mb-2 p-2 bg-neutral-800 rounded border-l-4 border-yellow-400">
            <div className="text-xs font-bold text-yellow-400 mb-1">Current Status:</div>
            <div className={`text-xs font-mono ${
              stickerStatus.includes('❌') ? 'text-red-400 font-bold' :
              stickerStatus.includes('✅') ? 'text-green-400' :
              stickerStatus.includes('⚠️') ? 'text-yellow-400' :
              'text-cyan-400'
            }`}>
              {stickerStatus}
            </div>
          </div>

          {/* Debug Log */}
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs font-bold text-white">
              📊 Debug Log {debugPaused && <span className="text-yellow-400">(PAUSED)</span>}
            </div>
            <button
              onClick={() => setDebugPaused(!debugPaused)}
              className="px-3 py-1 text-xs font-bold rounded bg-blue-600 text-white active:bg-blue-700"
            >
              {debugPaused ? '▶ Resume' : '⏸ Pause'}
            </button>
          </div>
          <div className="max-h-32 overflow-y-auto text-xs font-mono space-y-1">
            {debugInfo.map((info, idx) => (
              <div
                key={idx}
                className={`${
                  info.includes('❌') ? 'text-red-400 font-bold' :
                  info.includes('✅') ? 'text-green-400' :
                  info.includes('⚠️') ? 'text-yellow-400' :
                  info.includes('def=') ? 'text-cyan-400' :
                  'text-gray-300'
                }`}
              >
                {info}
              </div>
            ))}
          </div>
        </div>

        {/* Footer - mobile: stacked buttons, desktop: horizontal */}
        <div className="p-2 sm:p-4 border-t border-neutral-700">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-end">
            <ModalButton
              children="Apply Sticker"
              disabled={selectedSlot === null}
              onClick={handleApply}
              variant="primary"
              className="w-full sm:w-auto"
            />
            <ModalButton
              children="Cancel"
              onClick={onClose}
              variant="secondary"
              className="w-full sm:w-auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
