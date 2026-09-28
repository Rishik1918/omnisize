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
 * Douglas-Peucker Polyline Simplification Algorithm
 */
function perpendicularDistance(p: { x: number; y: number }, p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - p1.x, p.y - p1.y);
  const t = Math.max(0, Math.min(1, ((p.x - p1.x) * dx + (p.y - p1.y) * dy) / lenSq));
  const projX = p1.x + t * dx;
  const projY = p1.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

function douglasPeucker(pts: { x: number; y: number }[], epsilon: number): { x: number; y: number }[] {
  if (pts.length <= 2) return pts;
  let dmax = 0;
  let index = 0;
  const end = pts.length - 1;

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(pts[i], pts[0], pts[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  if (dmax > epsilon) {
    const rec1 = douglasPeucker(pts.slice(0, index + 1), epsilon);
    const rec2 = douglasPeucker(pts.slice(index), epsilon);
    return rec1.slice(0, -1).concat(rec2);
  } else {
    return [pts[0], pts[end]];
  }
}

/**
 * Snaps hand-drawn stroke into an accurate geometric shape (Microsoft OneNote / Whiteboard Style)
 */
export function snapStrokeWithDollarP(points: { x: number; y: number }[]): { x: number; y: number }[] {
  if (points.length < 5) return points;

  // Compute bounding box and path length
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
  const diag = Math.hypot(bboxW, bboxH);
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

  // 2. Closed-shape check (stroke start and end are reasonably close)
  const isClosed = chordDist < totalLength * 0.28 || chordDist < Math.max(25, diag * 0.25);

  if (isClosed) {
    // Run Douglas-Peucker simplification with dynamic epsilon (proportional to bounding box diameter)
    const epsilon = Math.max(4, diag * 0.09);
    const simplified = douglasPeucker(points, epsilon);

    // Filter out redundant duplicate closing vertex if present
    const uniqueVertices: { x: number; y: number }[] = [];
    for (let i = 0; i < simplified.length; i++) {
      const v = simplified[i];
      if (
        uniqueVertices.length === 0 ||
        Math.hypot(v.x - uniqueVertices[uniqueVertices.length - 1].x, v.y - uniqueVertices[uniqueVertices.length - 1].y) > epsilon * 0.5
      ) {
        uniqueVertices.push(v);
      }
    }
    if (
      uniqueVertices.length > 2 &&
      Math.hypot(uniqueVertices[0].x - uniqueVertices[uniqueVertices.length - 1].x, uniqueVertices[0].y - uniqueVertices[uniqueVertices.length - 1].y) < epsilon * 1.5
    ) {
      uniqueVertices.pop();
    }

    const vertexCount = uniqueVertices.length;

    // Check circularity = 4 * PI * Area / Perimeter^2
    let polygonArea = 0;
    for (let i = 0; i < uniqueVertices.length; i++) {
      const j = (i + 1) % uniqueVertices.length;
      polygonArea += uniqueVertices[i].x * uniqueVertices[j].y - uniqueVertices[j].x * uniqueVertices[i].y;
    }
    polygonArea = Math.abs(polygonArea) / 2;
    const circularity = totalLength > 0 ? (4 * Math.PI * polygonArea) / (totalLength * totalLength) : 0;

    // (A) Triangle Detection (3 vertices or vertexCount === 3)
    if (vertexCount === 3 || (vertexCount <= 4 && circularity < 0.65)) {
      if (uniqueVertices.length === 3) {
        return [
          uniqueVertices[0],
          uniqueVertices[1],
          uniqueVertices[2],
          uniqueVertices[0],
        ];
      } else {
        // Fallback triangle orientation aligned to bounds
        return [
          { x: cx, y: minY },
          { x: maxX, y: maxY },
          { x: minX, y: maxY },
          { x: cx, y: minY },
        ];
      }
    }

    // (B) Circle / Ellipse Detection (high circularity > 0.72)
    if (circularity > 0.72 || vertexCount >= 6) {
      const rx = bboxW / 2;
      const ry = bboxH / 2;
      const isNearCircle = Math.abs(bboxW - bboxH) / Math.max(bboxW, bboxH) < 0.22;
      const finalRx = isNearCircle ? (rx + ry) / 2 : rx;
      const finalRy = isNearCircle ? (rx + ry) / 2 : ry;

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

    // (C) Rectangle / Square Detection (4 vertices or vertexCount === 4)
    if (vertexCount === 4 || (vertexCount >= 4 && vertexCount <= 5)) {
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
  }

  // 3. Fallback to $P Multistroke Classifier for complex shapes like Star
  const recognized = recognizeDollarP(points);

  if (recognized.name === 'triangle') {
    return [
      { x: cx, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
      { x: cx, y: minY },
    ];
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

  if (recognized.name === 'rectangle') {
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
    const circlePts: { x: number; y: number }[] = [];
    const steps = 48;
    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * 2 * Math.PI;
      circlePts.push({
        x: cx + rx * Math.cos(theta),
        y: cy + ry * Math.sin(theta),
      });
    }
    return circlePts;
  }

  // Fallback to straight line
  return [pStart, pEnd];
}
