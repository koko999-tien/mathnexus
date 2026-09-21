import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, type ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SpatialHash3D } from './spatialIndex';
import type { CosmosEdge, CosmosNode } from './cosmosGraph';

interface MathCosmosGraphProps {
  nodes: CosmosNode[];
  edges: CosmosEdge[];
  selectedId: string | null;
  onSelect: (node: CosmosNode) => void;
  reduceMotion?: boolean;
  quality?: 'mobile' | 'desktop';
}

export function MathCosmosGraph({
  nodes,
  edges,
  selectedId,
  onSelect,
  reduceMotion = false,
  quality = 'desktop',
}: MathCosmosGraphProps) {
  const selected = nodes.find(node => node.id === selectedId);
  const mobile = quality === 'mobile';

  return <div className="math-cosmos-canvas" data-testid="math-cosmos-canvas" data-quality={quality} data-reduced-motion={reduceMotion ? "true" : "false"}>
    <Canvas
      dpr={mobile ? [0.75, 1] : [1, 1.5]}
      camera={{ position: [0, 8, 58], fov: 54, near: 0.1, far: 500 }}
      gl={{ antialias: !mobile, powerPreference: 'high-performance' }}
      fallback={<div className="cosmos-webgl-fallback">Thiết bị này chưa cung cấp WebGL ổn định. Bản đồ 2D vẫn dùng được ở mục Bản đồ toán học.</div>}
    >
      <color attach="background" args={['#05070d']} />
      <fog attach="fog" args={['#05070d', 58, 130]} />
      <ambientLight intensity={0.75} />
      <pointLight position={[24, 28, 20]} intensity={95} distance={120} decay={2} color="#b8d9ff" />
      {!mobile && <pointLight position={[-24, -16, -18]} intensity={70} distance={100} decay={2} color="#ffb88c" />}

      <StarField
        count={mobile ? 850 : 2200}
        radius={115}
        depth={55}
        size={mobile ? 0.34 : 0.46}
        reduceMotion={reduceMotion}
      />
      <EdgeField nodes={nodes} edges={edges} />
      <NodeInstances nodes={nodes} selectedId={selectedId} onSelect={onSelect} quality={quality} />
      {selected && <SelectionHalo node={selected} reduceMotion={reduceMotion} />}
      <CameraFlyRig selected={selected} reduceMotion={reduceMotion} />
      <LightweightOrbitControls target={selected ? selected.position : [0, 0, 0]} />
    </Canvas>
  </div>;
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function StarField({
  count,
  radius,
  depth,
  size,
  reduceMotion,
}: {
  count: number;
  radius: number;
  depth: number;
  size: number;
  reduceMotion: boolean;
}) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const random = seededRandom(0x4d415448);
    const values = new Float32Array(count * 3);
    const innerRadius = Math.max(8, radius - depth);

    for (let index = 0; index < count; index += 1) {
      const u = random();
      const v = random();
      const distance = innerRadius + random() * depth;
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const offset = index * 3;

      values[offset] = distance * Math.sin(phi) * Math.cos(theta);
      values[offset + 1] = distance * Math.cos(phi);
      values[offset + 2] = distance * Math.sin(phi) * Math.sin(theta);
    }

    return values;
  }, [count, depth, radius]);

  useFrame((_, delta) => {
    if (!ref.current || reduceMotion) return;
    ref.current.rotation.y += delta * 0.006;
    ref.current.rotation.x += delta * 0.0015;
  });

  return <points ref={ref} frustumCulled={false}>
    <bufferGeometry>
      <bufferAttribute attach="attributes-position" args={[positions, 3]} />
    </bufferGeometry>
    <pointsMaterial
      color="#d8e7ff"
      size={size}
      sizeAttenuation
      transparent
      opacity={0.72}
      depthWrite={false}
      blending={THREE.AdditiveBlending}
    />
  </points>;
}

function LightweightOrbitControls({
  target,
}: {
  target: readonly [number, number, number];
}) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<ThreeOrbitControls | null>(null);

  useEffect(() => {
    const controls = new ThreeOrbitControls(camera, gl.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.enablePan = false;
    controls.minDistance = 4;
    controls.maxDistance = 125;
    controls.target.set(...target);
    controls.update();
    controlsRef.current = controls;

    return () => {
      controls.dispose();
      controlsRef.current = null;
    };
  }, [camera, gl]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.target.set(...target);
  }, [target]);

  useFrame(() => {
    controlsRef.current?.update();
  });

  return null;
}

function NodeInstances({
  nodes,
  selectedId,
  onSelect,
  quality,
}: {
  nodes: CosmosNode[];
  selectedId: string | null;
  onSelect: (node: CosmosNode) => void;
  quality: 'mobile' | 'desktop';
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const visibleNodeIndexesRef = useRef<number[]>([]);
  const lastCameraRef = useRef(new THREE.Vector3(Number.POSITIVE_INFINITY, 0, 0));
  const frameRef = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const spatial = useMemo(() => new SpatialHash3D(nodes, 14), [nodes]);
  const { camera } = useThree();
  const radius = quality === 'mobile' ? 58 : 84;

  const writeInstances = useCallback((cameraPosition: THREE.Vector3) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const nearby = spatial.queryRadius(
      [cameraPosition.x, cameraPosition.y, cameraPosition.z],
      radius,
    );

    const required = nodes
      .map((node, index) => node.kind === 'domain' || node.id === selectedId ? index : -1)
      .filter(index => index >= 0);

    const visible = [...new Set([...nearby, ...required])].sort((a, b) => a - b);
    visibleNodeIndexesRef.current = visible;
    mesh.count = visible.length;

    visible.forEach((nodeIndex, instanceIndex) => {
      const node = nodes[nodeIndex];
      dummy.position.set(...node.position);
      const selectedScale = node.id === selectedId ? 1.22 : 1;
      dummy.scale.setScalar(node.radius * selectedScale);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(instanceIndex, dummy.matrix);
      mesh.setColorAt(instanceIndex, new THREE.Color(node.color));
    });

    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [dummy, nodes, radius, selectedId, spatial]);

  useLayoutEffect(() => {
    lastCameraRef.current.copy(camera.position);
    writeInstances(camera.position);
  }, [camera, writeInstances]);

  useFrame(() => {
    frameRef.current += 1;
    if (frameRef.current % 12 !== 0) return;

    if (camera.position.distanceToSquared(lastCameraRef.current) < 16) return;
    lastCameraRef.current.copy(camera.position);
    writeInstances(camera.position);
  });

  const selectInstance = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (event.instanceId == null) return;
    const nodeIndex = visibleNodeIndexesRef.current[event.instanceId];
    const node = nodes[nodeIndex];
    if (node) onSelect(node);
  };

  return <instancedMesh
    ref={meshRef}
    args={[undefined, undefined, Math.max(1, nodes.length)]}
    onClick={selectInstance}
    onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
    onPointerOut={() => { document.body.style.cursor = ''; }}
    frustumCulled
  >
    <icosahedronGeometry args={[1, 2]} />
    <meshStandardMaterial
      roughness={0.42}
      metalness={0.14}
      emissive="#0b1120"
      emissiveIntensity={0.48}
      vertexColors
    />
  </instancedMesh>;
}

function EdgeField({ nodes, edges }: { nodes: CosmosNode[]; edges: CosmosEdge[] }) {
  const geometry = useMemo(() => {
    const byId = new Map(nodes.map(node => [node.id, node]));
    const positions: number[] = [];

    for (const edge of edges) {
      const source = byId.get(edge.source);
      const target = byId.get(edge.target);
      if (!source || !target) continue;
      positions.push(...source.position, ...target.position);
    }

    const result = new THREE.BufferGeometry();
    result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return result;
  }, [nodes, edges]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return <lineSegments geometry={geometry} frustumCulled>
    <lineBasicMaterial color="#61708e" transparent opacity={0.22} depthWrite={false} />
  </lineSegments>;
}

function SelectionHalo({ node, reduceMotion }: { node: CosmosNode; reduceMotion: boolean }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current || reduceMotion) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 2.4) * 0.07;
    ref.current.scale.setScalar(pulse);
    ref.current.rotation.z += 0.004;
  });

  return <mesh ref={ref} position={node.position}>
    <torusGeometry args={[node.radius * 1.7, Math.max(0.045, node.radius * 0.08), 8, 64]} />
    <meshBasicMaterial color="#ffffff" transparent opacity={0.7} depthWrite={false} />
  </mesh>;
}

function CameraFlyRig({ selected, reduceMotion }: { selected?: CosmosNode; reduceMotion: boolean }) {
  const { camera } = useThree();
  const animationRef = useRef<{
    from: THREE.Vector3;
    to: THREE.Vector3;
    target: THREE.Vector3;
    elapsed: number;
    duration: number;
  } | null>(null);

  useEffect(() => {
    if (!selected) {
      animationRef.current = null;
      return;
    }

    const target = new THREE.Vector3(...selected.position);
    const direction = camera.position.clone().sub(target);
    if (direction.lengthSq() < 0.01) direction.set(0.35, 0.2, 1);
    direction.normalize();

    const distance = selected.kind === 'domain' ? 12 : selected.kind === 'concept' ? 7.5 : 4.2;
    const destination = target.clone().add(direction.multiplyScalar(distance));

    if (reduceMotion) {
      camera.position.copy(destination);
      camera.lookAt(target);
      animationRef.current = null;
      return;
    }

    animationRef.current = {
      from: camera.position.clone(),
      to: destination,
      target,
      elapsed: 0,
      duration: selected.kind === 'domain' ? 1.55 : 1.15,
    };
  }, [camera, reduceMotion, selected]);

  useFrame((_, delta) => {
    const animation = animationRef.current;
    if (!animation) return;

    animation.elapsed = Math.min(animation.duration, animation.elapsed + delta);
    const progress = animation.duration > 0 ? animation.elapsed / animation.duration : 1;
    const eased = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    camera.position.lerpVectors(animation.from, animation.to, eased);
    camera.lookAt(animation.target);

    if (progress >= 1) animationRef.current = null;
  });

  return null;
}
