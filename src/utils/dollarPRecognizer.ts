/**
 * $P Point-Cloud Recognizer
 * Based on the $P gesture recognizer by Radu-Daniel Vatavu, Lisa Anthony, and Jacob O. Wobbrock
 * Designed for fast, accurate recognition of geometric shapes:
 * Triangle, Rectangle, Square, Circle, Ellipse, Star, Arrow, Line.
 */

export interface PPoint {
  x: number;
  y: number;
  id?: number;
}

export interface PTemplate {
  name: string;
  points: PPoint[];
}

const NUM_POINTS = 32;

/**
 * Resample polyline to exactly n equidistant points
 */
export function resample(points: PPoint[], n: number = NUM_POINTS): PPoint[] {
  if (points.length === 0) return [];
  const I = pathLength(points) / (n - 1);
  let D = 0.0;
  const newPoints: PPoint[] = [{ ...points[0] }];
  const pts = [...points];

  for (let i = 1; i < pts.length; i++) {
    const d = distance(pts[i - 1], pts[i]);
    if (D + d >= I) {
      const qx = pts[i - 1].x + ((I - D) / d) * (pts[i].x - pts[i - 1].x);
      const qy = pts[i - 1].y + ((I - D) / d) * (pts[i].y - pts[i - 1].y);
      const q: PPoint = { x: qx, y: qy };
      newPoints.push(q);
      pts.splice(i, 0, q);
      D = 0.0;
    } else {
      D += d;
    }
  }
  while (newPoints.length < n) {
    newPoints.push({ ...pts[pts.length - 1] });
  }
  return newPoints;
}

/**
 * Scale points to fit standard [0..1] x [0..1] box
 */
export function scale(points: PPoint[]): PPoint[] {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const size = Math.max(maxX - minX, maxY - minY, 1e-4);
  return points.map((p) => ({
    x: (p.x - minX) / size,
    y: (p.y - minY) / size,
  }));
}

/**
 * Translate points so their centroid is at (0, 0)
 */
export function translateToCentroid(points: PPoint[]): PPoint[] {
  const c = centroid(points);
  return points.map((p) => ({
    x: p.x - c.x,
    y: p.y - c.y,
  }));
}

function centroid(points: PPoint[]): PPoint {
  let x = 0.0, y = 0.0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return { x: x / points.length, y: y / points.length };
}

function distance(p1: PPoint, p2: PPoint): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.hypot(dx, dy);
}

function pathLength(points: PPoint[]): number {
  let d = 0.0;
  for (let i = 1; i < points.length; i++) {
    d += distance(points[i - 1], points[i]);
  }
  return d;
}

/**
 * Greedy Cloud Match distance between two point clouds
 */
function cloudDistance(pts1: PPoint[], pts2: PPoint[], startIdx: number): number {
  const matched = new Array(pts1.length).fill(false);
  let sum = 0;
  let i = startIdx;
  do {
    let index = -1;
    let minD = Infinity;
    for (let j = 0; j < pts2.length; j++) {
      if (!matched[j]) {
        const d = distance(pts1[i], pts2[j]);
        if (d < minD) {
          minD = d;
          index = j;
        }
      }
    }
    matched[index] = true;
    const weight = 1 - ((i - startIdx + pts1.length) % pts1.length) / pts1.length;
    sum += weight * minD;
    i = (i + 1) % pts1.length;
  } while (i !== startIdx);
  return sum;
}

function greedyCloudMatch(points: PPoint[], template: PPoint[]): number {
  const step = Math.floor(Math.pow(points.length, 0.5));
  let minDistance = Infinity;
  for (let i = 0; i < points.length; i += step) {
    const d1 = cloudDistance(points, template, i);
    const d2 = cloudDistance(template, points, i);
    minDistance = Math.min(minDistance, Math.min(d1, d2));
  }
  return minDistance;
}

// Generate canonical template point clouds
function createPolygonTemplate(vertices: PPoint[]): PPoint[] {
  const pts: PPoint[] = [];
  for (let i = 0; i < vertices.length; i++) {
    const p1 = vertices[i];
    const p2 = vertices[(i + 1) % vertices.length];
    const segSteps = 16;
    for (let s = 0; s < segSteps; s++) {
      pts.push({
        x: p1.x + (p2.x - p1.x) * (s / segSteps),
        y: p1.y + (p2.y - p1.y) * (s / segSteps),
      });
    }
  }
  return translateToCentroid(scale(resample(pts, NUM_POINTS)));
}

function createCircleTemplate(): PPoint[] {
  const pts: PPoint[] = [];
  for (let i = 0; i < NUM_POINTS; i++) {
    const theta = (i / NUM_POINTS) * 2 * Math.PI;
    pts.push({
      x: 0.5 + 0.5 * Math.cos(theta),
      y: 0.5 + 0.5 * Math.sin(theta),
    });
  }
  return translateToCentroid(scale(pts));
}

function createLineTemplate(): PPoint[] {
  const pts: PPoint[] = [];
  for (let i = 0; i < NUM_POINTS; i++) {
    pts.push({ x: i / (NUM_POINTS - 1), y: 0.5 });
  }
  return translateToCentroid(scale(pts));
}

function createStarTemplate(): PPoint[] {
  const pts: PPoint[] = [];
  const outerR = 0.5;
  const innerR = 0.2;
  const cx = 0.5;
  const cy = 0.5;
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return createPolygonTemplate(pts);
}

// Pre-computed standard geometric templates
const TEMPLATES: PTemplate[] = [
  {
    name: 'triangle',
    points: createPolygonTemplate([
      { x: 0.5, y: 0.0 },
      { x: 1.0, y: 1.0 },
      { x: 0.0, y: 1.0 },
    ]),
  },
  {
    name: 'rectangle',
    points: createPolygonTemplate([
      { x: 0.0, y: 0.0 },
      { x: 1.0, y: 0.0 },
      { x: 1.0, y: 1.0 },
      { x: 0.0, y: 1.0 },
    ]),
  },
  {
    name: 'circle',
    points: createCircleTemplate(),
  },
  {
    name: 'line',
    points: createLineTemplate(),
  },
  {
    name: 'star',
    points: createStarTemplate(),
  },
];

export interface PRecognitionResult {
  name: string;
  score: number;
}

/**
 * Recognizes a stroke using $P Point-Cloud Matcher
 */
export function recognizeDollarP(rawPoints: PPoint[]): PRecognitionResult {
  if (rawPoints.length < 5) {
    return { name: 'line', score: 1.0 };
  }
  const processed = translateToCentroid(scale(resample(rawPoints, NUM_POINTS)));
  let bestDist = Infinity;
  let bestTemplate = 'line';

  for (const t of TEMPLATES) {
    const d = greedyCloudMatch(processed, t.points);
    if (d < bestDist) {
      bestDist = d;
      bestTemplate = t.name;
    }
  }

  // Score normalized from distance (closer to 1.0 is better)
  const score = Math.max(0, 1.0 - bestDist / 2.0);
  return { name: bestTemplate, score };
}

/**
 * Snaps hand-drawn stroke into an accurate geometric shape using $P algorithm
 */
export function snapStrokeWithDollarP(points: { x: number; y: number }[]): { x: number; y: number }[] {
  if (points.length < 5) return points;

  // Compute bounding box
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let totalLength = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
    if (i > 0) totalLength += Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y);
  }

  const pStart = points[0];
  const pEnd = points[points.length - 1];
  const chordDist = Math.hypot(pEnd.x - pStart.x, pEnd.y - pStart.y);
  const bboxW = Math.max(1, maxX - minX);
  const bboxH = Math.max(1, maxY - minY);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  // 1. Straight line check: chord length is almost equal to total length
  if (totalLength > 10 && chordDist / totalLength > 0.85) {
    const dx = Math.abs(pEnd.x - pStart.x);
    const dy = Math.abs(pEnd.y - pStart.y);
    if (dy / Math.max(1, dx) < 0.08) {
      return [pStart, { x: pEnd.x, y: pStart.y }];
    }
    if (dx / Math.max(1, dy) < 0.08) {
      return [pStart, { x: pStart.x, y: pEnd.y }];
    }
    return [pStart, pEnd];
  }

  // 2. Classify with $P Multistroke Recognizer
  const recognized = recognizeDollarP(points);

  if (recognized.name === 'triangle') {
    // Determine orientation of triangle based on user's highest / lowest / leftmost point
    // Default: apex at top-center, base along bottom
    return [
      { x: cx, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
      { x: cx, y: minY },
    ];
  }

  if (recognized.name === 'rectangle') {
    const isSquare = Math.abs(bboxW - bboxH) / Math.max(bboxW, bboxH) < 0.18;
    if (isSquare) {
      const side = (bboxW + bboxH) / 2;
      const sqX = cx - side / 2;
      const sqY = cy - side / 2;
      return [
        { x: sqX, y: sqY },
        { x: sqX + side, y: sqY },
        { x: sqX + side, y: sqY + side },
        { x: sqX, y: sqY + side },
        { x: sqX, y: sqY },
      ];
    }
    return [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
      { x: minX, y: minY },
    ];
  }

  if (recognized.name === 'circle') {
    const rx = bboxW / 2;
    const ry = bboxH / 2;
    const isCircle = Math.abs(bboxW - bboxH) / Math.max(bboxW, bboxH) < 0.2;
    const finalRx = isCircle ? (rx + ry) / 2 : rx;
    const finalRy = isCircle ? (rx + ry) / 2 : ry;

    const circlePts: { x: number; y: number }[] = [];
    const steps = 48;
    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * 2 * Math.PI;
      circlePts.push({
        x: cx + finalRx * Math.cos(theta),
        y: cy + finalRy * Math.sin(theta),
      });
    }
    return circlePts;
  }

  if (recognized.name === 'star') {
    const outerR = Math.min(bboxW, bboxH) / 2;
    const innerR = outerR * 0.4;
    const starPts: { x: number; y: number }[] = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      starPts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
    starPts.push(starPts[0]);
    return starPts;
  }

  // Fallback to straight line
  return [pStart, pEnd];
}
