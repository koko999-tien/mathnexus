import type { ParticleSimulationEngine, SimulationMetrics } from '../types.ts';

export interface NBodyConfig {
  bodyCount: number;
  seed: number;
  gravitationalConstant?: number;
  softening?: number;
  centralMass?: number;
  radialExtent?: number;
}

export interface NBodyDiagnostics extends SimulationMetrics {
  totalEnergy: number;
  kineticEnergy: number;
  potentialEnergy: number;
  centerOfMass: [number, number, number];
}

const DEFAULT_G = 1;
const DEFAULT_SOFTENING = 0.35;
const DEFAULT_CENTRAL_MASS = 650;
const DEFAULT_RADIAL_EXTENT = 38;
const MAX_BODY_COUNT = 512;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function seededRandom(seed: number) {
  let state = (seed >>> 0) || 1;
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class CpuNBodyEngine implements ParticleSimulationEngine {
  readonly backend = 'cpu' as const;
  readonly particleCount: number;

  private readonly positions: Float64Array;
  private readonly velocities: Float64Array;
  private readonly accelerations: Float64Array;
  private readonly masses: Float64Array;
  private readonly output: Float32Array;

  private seed: number;
  private readonly gravitationalConstant: number;
  private readonly softeningSquared: number;
  private readonly centralMass: number;
  private readonly radialExtent: number;

  private simulatedTime = 0;
  private stepCount = 0;
  private lastStepMs = 0;

  constructor(config: NBodyConfig) {
    if (!Number.isInteger(config.bodyCount) || config.bodyCount < 2 || config.bodyCount > MAX_BODY_COUNT) {
      throw new RangeError(`bodyCount must be an integer in [2, ${MAX_BODY_COUNT}]`);
    }

    this.particleCount = config.bodyCount;
    this.seed = Number.isFinite(config.seed) ? Math.trunc(config.seed) : 1;
    this.gravitationalConstant = config.gravitationalConstant ?? DEFAULT_G;

    const softening = config.softening ?? DEFAULT_SOFTENING;
    if (!Number.isFinite(softening) || softening <= 0 || softening > 5) {
      throw new RangeError('softening must be finite and in (0, 5]');
    }
    this.softeningSquared = softening * softening;

    this.centralMass = config.centralMass ?? DEFAULT_CENTRAL_MASS;
    this.radialExtent = config.radialExtent ?? DEFAULT_RADIAL_EXTENT;
    if (!Number.isFinite(this.centralMass) || this.centralMass <= 0) throw new RangeError('centralMass must be positive');
    if (!Number.isFinite(this.radialExtent) || this.radialExtent <= 4) throw new RangeError('radialExtent must be greater than 4');

    this.positions = new Float64Array(this.particleCount * 3);
    this.velocities = new Float64Array(this.particleCount * 3);
    this.accelerations = new Float64Array(this.particleCount * 3);
    this.masses = new Float64Array(this.particleCount);
    this.output = new Float32Array(this.particleCount * 3);

    this.reset(this.seed);
  }

  reset(seed = this.seed) {
    this.seed = Number.isFinite(seed) ? Math.trunc(seed) : 1;
    this.positions.fill(0);
    this.velocities.fill(0);
    this.accelerations.fill(0);
    this.masses.fill(0);
    this.simulatedTime = 0;
    this.stepCount = 0;
    this.lastStepMs = 0;

    const random = seededRandom(this.seed);
    this.masses[0] = this.centralMass;

    let totalOrbitingMass = 0;
    for (let i = 1; i < this.particleCount; i++) {
      const radius = 5.5 + Math.sqrt(random()) * (this.radialExtent - 5.5);
      const angle = random() * Math.PI * 2;
      const verticalPhase = random() * Math.PI * 2;
      const inclination = (random() - 0.5) * 0.22;
      const y = Math.sin(verticalPhase) * radius * inclination;

      const index = i * 3;
      this.positions[index] = Math.cos(angle) * radius;
      this.positions[index + 1] = y;
      this.positions[index + 2] = Math.sin(angle) * radius;

      const mass = 0.18 + random() * 2.4;
      this.masses[i] = mass;
      totalOrbitingMass += mass;

      const orbitalSpeed = Math.sqrt(this.gravitationalConstant * this.centralMass / Math.max(radius, 0.25));
      const speedJitter = 0.88 + random() * 0.22;
      const verticalVelocity = (random() - 0.5) * orbitalSpeed * 0.08;

      this.velocities[index] = -Math.sin(angle) * orbitalSpeed * speedJitter;
      this.velocities[index + 1] = verticalVelocity;
      this.velocities[index + 2] = Math.cos(angle) * orbitalSpeed * speedJitter;
    }

    // Shift orbiters so the whole system starts close to its barycentric frame.
    const totalMass = this.centralMass + totalOrbitingMass;
    const center = this.centerOfMass();
    const momentum = this.totalMomentum();

    for (let i = 0; i < this.particleCount; i++) {
      const index = i * 3;
      this.positions[index] -= center[0];
      this.positions[index + 1] -= center[1];
      this.positions[index + 2] -= center[2];
      this.velocities[index] -= momentum[0] / totalMass;
      this.velocities[index + 1] -= momentum[1] / totalMass;
      this.velocities[index + 2] -= momentum[2] / totalMass;
    }

    this.computeAccelerations();
    this.writePositions(this.output);
  }

  step(dtSeconds: number) {
    if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) return;

    const requested = clamp(dtSeconds, 0, 0.12);
    const maxSubstep = 0.006;
    const substeps = Math.max(1, Math.min(24, Math.ceil(requested / maxSubstep)));
    const dt = requested / substeps;
    const startedAt = performance.now();

    for (let substep = 0; substep < substeps; substep++) {
      const half = dt * 0.5;

      for (let i = 0; i < this.velocities.length; i++) {
        this.velocities[i] += this.accelerations[i] * half;
      }

      for (let i = 0; i < this.positions.length; i++) {
        this.positions[i] += this.velocities[i] * dt;
      }

      this.computeAccelerations();

      for (let i = 0; i < this.velocities.length; i++) {
        this.velocities[i] += this.accelerations[i] * half;
      }

      this.simulatedTime += dt;
      this.stepCount += 1;
    }

    this.lastStepMs = Math.max(0, performance.now() - startedAt);
  }

  writePositions(target = this.output) {
    if (target.length !== this.positions.length) {
      throw new RangeError('target position buffer has the wrong length');
    }

    for (let i = 0; i < this.positions.length; i++) target[i] = this.positions[i];
    return target;
  }

  getMasses() {
    return this.masses;
  }

  getMetrics(): SimulationMetrics {
    return {
      backend: this.backend,
      particleCount: this.particleCount,
      simulatedTime: this.simulatedTime,
      stepCount: this.stepCount,
      lastStepMs: this.lastStepMs,
    };
  }

  diagnostics(): NBodyDiagnostics {
    let kineticEnergy = 0;
    for (let i = 0; i < this.particleCount; i++) {
      const index = i * 3;
      const vx = this.velocities[index];
      const vy = this.velocities[index + 1];
      const vz = this.velocities[index + 2];
      kineticEnergy += 0.5 * this.masses[i] * (vx * vx + vy * vy + vz * vz);
    }

    let potentialEnergy = 0;
    for (let i = 0; i < this.particleCount; i++) {
      const ia = i * 3;
      for (let j = i + 1; j < this.particleCount; j++) {
        const ib = j * 3;
        const dx = this.positions[ib] - this.positions[ia];
        const dy = this.positions[ib + 1] - this.positions[ia + 1];
        const dz = this.positions[ib + 2] - this.positions[ia + 2];
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz + this.softeningSquared);
        potentialEnergy -= this.gravitationalConstant * this.masses[i] * this.masses[j] / distance;
      }
    }

    return {
      ...this.getMetrics(),
      kineticEnergy,
      potentialEnergy,
      totalEnergy: kineticEnergy + potentialEnergy,
      centerOfMass: this.centerOfMass(),
    };
  }

  dispose() {
    // No GPU resources are owned by the CPU engine. Method exists for backend symmetry.
  }

  private computeAccelerations() {
    this.accelerations.fill(0);

    for (let i = 0; i < this.particleCount; i++) {
      const ia = i * 3;
      for (let j = i + 1; j < this.particleCount; j++) {
        const ib = j * 3;
        const dx = this.positions[ib] - this.positions[ia];
        const dy = this.positions[ib + 1] - this.positions[ia + 1];
        const dz = this.positions[ib + 2] - this.positions[ia + 2];

        const distanceSquared = dx * dx + dy * dy + dz * dz + this.softeningSquared;
        const invDistance = 1 / Math.sqrt(distanceSquared);
        const invDistance3 = invDistance * invDistance * invDistance;
        const scale = this.gravitationalConstant * invDistance3;

        const iScale = scale * this.masses[j];
        const jScale = scale * this.masses[i];

        this.accelerations[ia] += dx * iScale;
        this.accelerations[ia + 1] += dy * iScale;
        this.accelerations[ia + 2] += dz * iScale;

        this.accelerations[ib] -= dx * jScale;
        this.accelerations[ib + 1] -= dy * jScale;
        this.accelerations[ib + 2] -= dz * jScale;
      }
    }
  }

  private totalMomentum(): [number, number, number] {
    let x = 0, y = 0, z = 0;
    for (let i = 0; i < this.particleCount; i++) {
      const index = i * 3;
      x += this.velocities[index] * this.masses[i];
      y += this.velocities[index + 1] * this.masses[i];
      z += this.velocities[index + 2] * this.masses[i];
    }
    return [x, y, z];
  }

  private centerOfMass(): [number, number, number] {
    let x = 0, y = 0, z = 0, totalMass = 0;

    for (let i = 0; i < this.particleCount; i++) {
      const index = i * 3;
      const mass = this.masses[i];
      totalMass += mass;
      x += this.positions[index] * mass;
      y += this.positions[index + 1] * mass;
      z += this.positions[index + 2] * mass;
    }

    if (!totalMass) return [0, 0, 0];
    return [x / totalMass, y / totalMass, z / totalMass];
  }
}

export function createNBodyEngine(config: NBodyConfig) {
  return new CpuNBodyEngine(config);
}
