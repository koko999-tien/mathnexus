import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { CpuNBodyEngine, NBodyDiagnostics } from './nbody/CpuNBodyEngine';

interface NBodySceneProps {
  engine: CpuNBodyEngine;
  running: boolean;
  speed: number;
  mobile?: boolean;
  reduceMotion?: boolean;
  onMetrics: (metrics: NBodyDiagnostics) => void;
}

export function NBodyScene({
  engine,
  running,
  speed,
  mobile = false,
  reduceMotion = false,
  onMetrics,
}: NBodySceneProps) {
  return <div
    className="nbody-canvas"
    data-testid="nbody-canvas"
    data-backend={engine.backend}
    data-quality={mobile ? 'mobile' : 'desktop'}
    data-reduced-motion={reduceMotion ? 'true' : 'false'}
  >
    <Canvas
      dpr={mobile ? [0.75, 1] : [1, 1.5]}
      camera={{ position: [0, 34, 74], fov: 52, near: 0.1, far: 400 }}
      gl={{ antialias: !mobile, powerPreference: 'high-performance' }}
      fallback={<div className="simulation-webgl-fallback">Không thể khởi tạo WebGL. Phần giải thích toán học bên dưới vẫn sử dụng được.</div>}
    >
      <color attach="background" args={['#04070d']} />
      <fog attach="fog" args={['#04070d', 85, 180]} />
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 12, 0]} intensity={80} distance={120} decay={2} color="#fff4d6" />
      <Stars
        radius={130}
        depth={70}
        count={mobile ? 600 : 1500}
        factor={mobile ? 1.4 : 1.8}
        fade
        speed={reduceMotion ? 0 : 0.08}
      />
      <ParticleField engine={engine} running={running} speed={speed} onMetrics={onMetrics} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.055} enablePan={false} minDistance={18} maxDistance={150} />
    </Canvas>
  </div>;
}

function ParticleField({
  engine,
  running,
  speed,
  onMetrics,
}: {
  engine: CpuNBodyEngine;
  running: boolean;
  speed: number;
  onMetrics: (metrics: NBodyDiagnostics) => void;
}) {
  const positions = useMemo(() => engine.writePositions(new Float32Array(engine.particleCount * 3)), [engine]);
  const colors = useMemo(() => buildColors(engine), [engine]);
  const geometry = useMemo(() => {
    const value = new THREE.BufferGeometry();
    value.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    value.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    value.computeBoundingSphere();
    return value;
  }, [colors, positions]);
  const lastMetricsAt = useRef(0);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }, delta) => {
    if (running) engine.step(Math.min(delta, 0.05) * speed);

    engine.writePositions(positions);
    const attribute = geometry.getAttribute('position') as THREE.BufferAttribute;
    attribute.needsUpdate = true;

    const now = clock.elapsedTime;
    if (now - lastMetricsAt.current >= 0.5) {
      lastMetricsAt.current = now;
      onMetrics(engine.diagnostics());
    }
  });

  return <points frustumCulled={false}>
    <primitive object={geometry} attach="geometry" />
    <pointsMaterial
      size={0.42}
      sizeAttenuation
      vertexColors
      transparent
      opacity={0.93}
      depthWrite={false}
      blending={THREE.AdditiveBlending}
    />
  </points>;
}

function buildColors(engine: CpuNBodyEngine) {
  const colors = new Float32Array(engine.particleCount * 3);
  const masses = engine.getMasses();

  for (let i = 0; i < engine.particleCount; i++) {
    const color = i === 0
      ? new THREE.Color('#fff4c2')
      : new THREE.Color(masses[i] > 1.6 ? '#f6a55c' : masses[i] > 0.8 ? '#8fc7ff' : '#b9d7ff');

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  return colors;
}
