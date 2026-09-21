export type SimulationBackend = 'cpu' | 'webgpu';

export interface SimulationMetrics {
  backend: SimulationBackend;
  particleCount: number;
  simulatedTime: number;
  stepCount: number;
  lastStepMs: number;
}

export interface ParticleSimulationEngine {
  readonly backend: SimulationBackend;
  readonly particleCount: number;
  step(dtSeconds: number): void;
  writePositions(target?: Float32Array): Float32Array;
  getMetrics(): SimulationMetrics;
  reset(seed?: number): void;
  dispose(): void;
}
