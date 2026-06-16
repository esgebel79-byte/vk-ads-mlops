import type { CpmSweepPoint } from "../types";

export function countSweepPoints(min: number, max: number, step: number): number {
  return Math.floor((max - min) / step) + 1;
}

export type BestSweepResult = {
  cpm: number;
  predicted_reach: number;
};

export function findBestSweepPoint(
  points: CpmSweepPoint[],
): BestSweepResult | null {
  if (points.length === 0) {
    return null;
  }

  let best: CpmSweepPoint = points[0]!;
  for (let i = 1; i < points.length; i += 1) {
    const point = points[i]!;
    if (point.predicted_reach > best.predicted_reach) {
      best = point;
    } else if (
      point.predicted_reach === best.predicted_reach &&
      point.cpm < best.cpm
    ) {
      best = point;
    }
  }

  return { cpm: best.cpm, predicted_reach: best.predicted_reach };
}

export function countDriftFlaggedPoints(points: CpmSweepPoint[]): number {
  return points.filter((p) => p.drift_flag).length;
}

export function hasSweepDrift(points: CpmSweepPoint[]): boolean {
  return points.some((p) => p.drift_flag);
}
