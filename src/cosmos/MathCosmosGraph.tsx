import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, type ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import gsap from 'gsap';
import * as THREE from 'three';
import type { CosmosEdge, CosmosNode } from './cosmosGraph';

interface MathCosmosGraphProps {
  nodes: CosmosNode[];
  edges: CosmosEdge[];
  selectedId: string | null;
  onSelect: (node: CosmosNode) => void;
  reduceMotion?: boolean;
}

export function MathCosmosGraph({ nodes, edges, selectedId, onSelect, reduceMotion = false }: MathCosmosGraphProps) {
  const selected = nodes.find(node => node.id === selectedId);

  return <div className="math-cosmos-canvas" data-testid="math-cosmos-canvas">
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 8, 58], fov: 54, near: 0.1, far: 500 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      fallback={<div className="cosmos-webgl-fallback">Thiết bị này chưa cung cấp WebGL ổn định. Bản đồ 2D vẫn dùng được ở mục Bản đồ toán học.</div>}
    >
      <color attach="background" args={['#05070d']} />
      <fog attach="fog" args={['#05070d', 58, 130]} />
      <ambientLight intensity={0.75} />
      <pointLight position={[24, 28, 20]} intensity={95} distance={120} decay={2} color="#b8d9ff" />
      <pointLight position={[-24, -16, -18]} intensity={70} distance={100} decay={2} color="#ffb88c" />

      <Stars radius={115} depth={55} count={2200} factor={2.2} saturation={0.15} fade speed={0.18} />
      <EdgeField nodes={nodes} edges={edges} />
      <NodeInstances nodes={nodes} selectedId={selectedId} onSelect={onSelect} />
      {selected && <SelectionHalo node={selected} />}
      <CameraFlyRig selected={selected} reduceMotion={reduceMotion} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.055}
        enablePan={false}
        minDistance={4}
        maxDistance={125}
        target={selected ? selected.position : [0, 0, 0]}
      />
    </Canvas>
  </div>;
}

function NodeInstances({ nodes, selectedId, onSelect }: { nodes: CosmosNode[]; selectedId: string | null; onSelect: (node: CosmosNode) => void }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    nodes.forEach((node, index) => {
      dummy.position.set(...node.position);
      const selectedScale = node.id === selectedId ? 1.22 : 1;
      dummy.scale.setScalar(node.radius * selectedScale);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      mesh.setColorAt(index, new THREE.Color(node.color));
    });

    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [dummy, nodes, selectedId]);

  const selectInstance = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (event.instanceId == null) return;
    const node = nodes[event.instanceId];
    if (node) onSelect(node);
  };

  return <instancedMesh
    ref={meshRef}
    args={[undefined, undefined, nodes.length]}
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

function SelectionHalo({ node }: { node: CosmosNode }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
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

  useEffect(() => {
    if (!selected) return;

    const target = new THREE.Vector3(...selected.position);
    const direction = camera.position.clone().sub(target);
    if (direction.lengthSq() < 0.01) direction.set(0.35, 0.2, 1);
    direction.normalize();

    const distance = selected.kind === 'domain' ? 12 : selected.kind === 'concept' ? 7.5 : 4.2;
    const destination = target.clone().add(direction.multiplyScalar(distance));
    const duration = reduceMotion ? 0.01 : selected.kind === 'domain' ? 1.55 : 1.15;

    const timeline = gsap.timeline();
    timeline.to(camera.position, {
      x: destination.x,
      y: destination.y,
      z: destination.z,
      duration,
      ease: 'power3.inOut',
      onUpdate: () => camera.lookAt(target),
      overwrite: true,
    });

    return () => timeline.kill();
  }, [camera, reduceMotion, selected]);

  return null;
}
