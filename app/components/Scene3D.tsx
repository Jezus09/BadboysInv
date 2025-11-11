import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { WeaponModel } from "./WeaponModel";

interface Scene3DProps {
  defIndex: number;
  paintSeed: number;
  wear: number;
  skinTextureUrl?: string;
}

export function Scene3D({ defIndex, paintSeed, wear, skinTextureUrl }: Scene3DProps) {
  return (
    <div className="h-full w-full">
      <Canvas
        camera={{ position: [0, 0, 15], fov: 50 }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <color attach="background" args={["#000814"]} />

        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} />

        {/* Environment map for reflections */}
        <Environment preset="city" />

        {/* Weapon Model */}
        <WeaponModel
          defIndex={defIndex}
          paintSeed={paintSeed}
          wear={wear}
          skinTextureUrl={skinTextureUrl}
        />

        {/* Camera Controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={30}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}
