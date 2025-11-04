/**
 * Simple 3D Weapon Viewer - Client Side Only
 * Completely rewritten to fix bundling issues
 */
import { useEffect, useRef, useState } from "react";

interface StickerData {
  id: number;
  imageUrl: string;
  position: [number, number, number];
  rotation: number;
  scale: number;
  slot: number;
}

interface SimpleWeapon3DViewerProps {
  weaponName: string;
  stickers?: StickerData[];
  onSurfaceClick?: (position: [number, number, number], surfaceName: string) => void;
  enableClickToPlace?: boolean;
  className?: string;
}

export default function SimpleWeapon3DViewer({
  weaponName,
  stickers = [],
  onSurfaceClick,
  enableClickToPlace = false,
  className = "",
}: SimpleWeapon3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Dynamic import to ensure client-side only execution
    let cleanup: (() => void) | undefined;

    const initThreeJS = async () => {
      try {
        // Check if we're in browser
        if (typeof window === 'undefined') {
          return;
        }

        const THREE = await import('three');
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');

        if (!containerRef.current) return;

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1c1917);

        // Camera
        const camera = new THREE.PerspectiveCamera(
          50,
          containerRef.current.clientWidth / containerRef.current.clientHeight,
          0.1,
          1000
        );
        camera.position.set(0, 1, 4);

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        containerRef.current.appendChild(renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight1.position.set(5, 5, 5);
        scene.add(directionalLight1);

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight2.position.set(-5, -5, -5);
        scene.add(directionalLight2);

        // Weapon (simple box for now)
        const weaponGeometry = new THREE.BoxGeometry(3, 0.5, 0.3);
        const weaponMaterial = new THREE.MeshStandardMaterial({
          color: 0x2a2a2a,
          metalness: 0.6,
          roughness: 0.4,
        });
        const weaponMesh = new THREE.Mesh(weaponGeometry, weaponMaterial);
        scene.add(weaponMesh);

        // Raycaster for click detection
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        // Click handler
        const handleClick = (event: MouseEvent) => {
          if (!enableClickToPlace || !onSurfaceClick || !containerRef.current) return;

          const rect = containerRef.current.getBoundingClientRect();
          mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

          raycaster.setFromCamera(mouse, camera);
          const intersects = raycaster.intersectObject(weaponMesh);

          if (intersects.length > 0) {
            const point = intersects[0].point;
            onSurfaceClick([point.x, point.y, point.z], 'weapon_surface');
          }
        };

        renderer.domElement.addEventListener('click', handleClick);

        // Stickers
        const stickerMeshes: THREE.Mesh[] = [];
        const textureLoader = new THREE.TextureLoader();

        const loadStickers = async () => {
          for (const sticker of stickers) {
            try {
              const texture = await new Promise<THREE.Texture>((resolve, reject) => {
                textureLoader.load(
                  sticker.imageUrl,
                  resolve,
                  undefined,
                  reject
                );
              });

              const stickerGeometry = new THREE.PlaneGeometry(
                0.3 * sticker.scale,
                0.3 * sticker.scale
              );
              const stickerMaterial = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                opacity: 1,
                side: THREE.DoubleSide,
                depthTest: true,
                depthWrite: false,
              });
              const stickerMesh = new THREE.Mesh(stickerGeometry, stickerMaterial);
              stickerMesh.position.set(...sticker.position);
              stickerMesh.rotation.z = sticker.rotation * (Math.PI / 180);
              scene.add(stickerMesh);
              stickerMeshes.push(stickerMesh);
            } catch (err) {
              console.error('Failed to load sticker:', sticker.imageUrl, err);
            }
          }
        };

        loadStickers();

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enablePan = false;
        controls.minDistance = 2;
        controls.maxDistance = 8;

        // Animation loop
        const animate = () => {
          requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);
        };
        animate();

        // Handle resize
        const handleResize = () => {
          if (!containerRef.current) return;
          camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        setIsLoading(false);

        // Cleanup function
        cleanup = () => {
          window.removeEventListener('resize', handleResize);
          renderer.domElement.removeEventListener('click', handleClick);
          controls.dispose();
          renderer.dispose();
          weaponGeometry.dispose();
          weaponMaterial.dispose();
          stickerMeshes.forEach(mesh => {
            mesh.geometry.dispose();
            if (mesh.material instanceof THREE.Material) {
              mesh.material.dispose();
            }
          });
          if (containerRef.current && renderer.domElement.parentElement) {
            containerRef.current.removeChild(renderer.domElement);
          }
        };
      } catch (err) {
        console.error('Three.js initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize 3D viewer');
        setIsLoading(false);
      }
    };

    initThreeJS();

    return () => {
      if (cleanup) cleanup();
    };
  }, [stickers, onSurfaceClick, enableClickToPlace]);

  if (error) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-stone-900 rounded ${className}`}>
        <div className="text-center text-red-400">
          <p className="text-sm">3D Viewer Error</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-stone-900 rounded ${className}`}>
        <div className="text-center text-neutral-400">
          <p className="text-sm">Loading 3D Viewer...</p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className={`w-full h-full ${className}`} />;
}
