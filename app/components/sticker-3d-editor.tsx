/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, useGLTF } from "@react-three/drei";
import { Suspense, useState, useEffect, useRef } from "react";
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
  }, [onModelLoad, fallbackMode]);

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
        <meshStandardMaterial color="#444444" metalness={0.8} roughness={0.2} />
      </mesh>
    );
  }

  // Real GLTF model mode
  return <LoadedWeaponModel modelPath={modelPath} meshRef={meshRef} onModelLoad={onModelLoad} />;
}

/**
 * Actual GLTF model loader component
 */
function LoadedWeaponModel({
  modelPath,
  meshRef,
  onModelLoad
}: {
  modelPath: string;
  meshRef: React.RefObject<THREE.Group>;
  onModelLoad?: (mesh: THREE.Mesh | null) => void;
}) {
  const gltf = useGLTF(modelPath);

  useEffect(() => {
    if (gltf.scene && onModelLoad) {
      // Find the first mesh in the scene
      const mesh = gltf.scene.children.find(
        (child) => child instanceof THREE.Mesh
      ) as THREE.Mesh | undefined;

      onModelLoad(mesh || null);
    }
  }, [gltf, onModelLoad]);

  return (
    <primitive
      ref={meshRef}
      object={gltf.scene.clone()}
      rotation={[0, Math.PI / 4, 0]}
      scale={1}
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
  onStickerSelect
}: {
  weaponDefIndex: number;
  stickerItemId: number;
  stickers: Map<number, StickerTransform>;
  selectedSlot: number | null;
  onStickerSelect: (slot: number) => void;
}) {
  const [weaponMesh, setWeaponMesh] = useState<THREE.Mesh | null>(null);
  const [stickerTexture, setStickerTexture] = useState<THREE.Texture | null>(null);

  // Load sticker texture
  useEffect(() => {
    const stickerUrl = getStickerImageUrl(stickerItemId);

    loadStickerTexture(stickerUrl)
      .then((texture) => {
        setStickerTexture(texture);
      })
      .catch((error) => {
        console.warn("[Scene3D] Failed to load sticker texture, using fallback", error);
        setStickerTexture(null);
      });
  }, [stickerItemId]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 1, 3]} />
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={1}
        maxDistance={10}
      />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-5, 5, 5]} intensity={0.5} />

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

  const handleSlotSelect = (slot: number) => {
    setSelectedSlot(slot);

    // Initialize sticker transform if not exists
    if (!stickers.has(slot)) {
      setStickers(new Map(stickers).set(slot, {
        position: [0, 0, 0.1],
        rotation: [0, 0, 0],
        scale: 1.0,
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
            <Canvas shadows>
              <Suspense fallback={null}>
                <Scene3D
                  weaponDefIndex={targetItem.id}
                  stickerItemId={stickerItem.id}
                  stickers={stickers}
                  selectedSlot={selectedSlot}
                  onStickerSelect={handleSlotSelect}
                />
              </Suspense>
            </Canvas>
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
