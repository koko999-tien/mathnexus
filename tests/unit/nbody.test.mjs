import test from 'node:test';
import assert from 'node:assert/strict';
import { CpuNBodyEngine, createNBodyEngine } from '../../src/simulations/nbody/CpuNBodyEngine.ts';

function snapshot(engine) {
  return Array.from(engine.writePositions(new Float32Array(engine.particleCount * 3)));
}

test('N-body engine initializes deterministically from seed', () => {
  const a = createNBodyEngine({ bodyCount: 24, seed: 42, softening: 0.35 });
  const b = createNBodyEngine({ bodyCount: 24, seed: 42, softening: 0.35 });
  const c = createNBodyEngine({ bodyCount: 24, seed: 43, softening: 0.35 });

  assert.deepEqual(snapshot(a), snapshot(b));
  assert.notDeepEqual(snapshot(a), snapshot(c));
  assert.equal(a.backend, 'cpu');
  assert.equal(a.particleCount, 24);
});

test('N-body engine evolves TypedArray state without changing buffer shape', () => {
  const engine = new CpuNBodyEngine({ bodyCount: 18, seed: 7 });
  const before = snapshot(engine);

  for (let i = 0; i < 40; i++) engine.step(0.003);

  const afterBuffer = engine.writePositions(new Float32Array(engine.particleCount * 3));
  const after = Array.from(afterBuffer);

  assert.equal(afterBuffer.length, engine.particleCount * 3);
  assert.notDeepEqual(after, before);
  assert.ok(after.every(Number.isFinite));

  const metrics = engine.getMetrics();
  assert.ok(metrics.stepCount >= 40);
  assert.ok(metrics.simulatedTime > 0);
  assert.ok(metrics.lastStepMs >= 0);
});

test('leapfrog N-body integration remains numerically controlled over a short interval', () => {
  const engine = new CpuNBodyEngine({ bodyCount: 20, seed: 1234, softening: 0.45 });
  const initial = engine.diagnostics();

  for (let i = 0; i < 180; i++) engine.step(0.0025);

  const current = engine.diagnostics();
  const drift = Math.abs((current.totalEnergy - initial.totalEnergy) / initial.totalEnergy) * 100;
  const centerDistance = Math.hypot(...current.centerOfMass);

  assert.ok(Number.isFinite(current.totalEnergy));
  assert.ok(Number.isFinite(current.kineticEnergy));
  assert.ok(Number.isFinite(current.potentialEnergy));
  assert.ok(drift < 0.5, `energy drift too large: ${drift}%`);
  assert.ok(centerDistance < 1e-8, `center of mass drift too large: ${centerDistance}`);
});

test('N-body engine validates stability-sensitive configuration', () => {
  assert.throws(() => new CpuNBodyEngine({ bodyCount: 1, seed: 1 }), /bodyCount/);
  assert.throws(() => new CpuNBodyEngine({ bodyCount: 513, seed: 1 }), /bodyCount/);
  assert.throws(() => new CpuNBodyEngine({ bodyCount: 10, seed: 1, softening: 0 }), /softening/);

  const engine = new CpuNBodyEngine({ bodyCount: 10, seed: 1 });
  assert.throws(() => engine.writePositions(new Float32Array(3)), /wrong length/);
  engine.step(Number.NaN);
  engine.step(-1);
  assert.equal(engine.getMetrics().stepCount, 0);
});
