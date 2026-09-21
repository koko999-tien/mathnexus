export interface SpatialPoint3D {
  position: readonly [number, number, number];
}

export class SpatialHash3D<T extends SpatialPoint3D> {
  private readonly buckets = new Map<string, number[]>();
  private readonly items: readonly T[];
  readonly cellSize: number;

  constructor(items: readonly T[], cellSize = 10) {
    this.items = items;
    this.cellSize = cellSize;
    this.rebuild();
  }

  private key(x: number, y: number, z: number) {
    return `${x}:${y}:${z}`;
  }

  private cell(position: readonly [number, number, number]) {
    return [
      Math.floor(position[0] / this.cellSize),
      Math.floor(position[1] / this.cellSize),
      Math.floor(position[2] / this.cellSize),
    ] as const;
  }

  rebuild() {
    this.buckets.clear();
    this.items.forEach((item, index) => {
      const [x, y, z] = this.cell(item.position);
      const key = this.key(x, y, z);
      const bucket = this.buckets.get(key) || [];
      bucket.push(index);
      this.buckets.set(key, bucket);
    });
  }

  queryRadius(center: readonly [number, number, number], radius: number) {
    if (!Number.isFinite(radius) || radius < 0) return [];

    const [cx, cy, cz] = this.cell(center);
    const span = Math.ceil(radius / this.cellSize);
    const radius2 = radius * radius;
    const result: number[] = [];

    for (let x = cx - span; x <= cx + span; x++) {
      for (let y = cy - span; y <= cy + span; y++) {
        for (let z = cz - span; z <= cz + span; z++) {
          const bucket = this.buckets.get(this.key(x, y, z));
          if (!bucket) continue;

          for (const index of bucket) {
            const point = this.items[index].position;
            const dx = point[0] - center[0];
            const dy = point[1] - center[1];
            const dz = point[2] - center[2];
            if (dx * dx + dy * dy + dz * dz <= radius2) result.push(index);
          }
        }
      }
    }

    return result;
  }
}
