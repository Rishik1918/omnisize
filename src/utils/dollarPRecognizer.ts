/**
 * Vector Ink Shape Recognizer & Geometric Snapping Engine
 * (Inspired by Microsoft OneNote / Whiteboard Ink Telemetry & $P Point-Cloud Matcher)
 *
 * Pipeline:
 * 1. Ink Input Vectorization: Cartesian coordinates (x, y) with timestamp & pressure
 * 2. Stroke Segmentation & Curvature Analysis: Sharp corner detection, tangent deviation,
 *    and radial variance from centroid
 * 3. Closing Constraint Evaluation: End-to-start proximity thresholding for closed vs open geometries
 * 4. Snapping & Geometric Fitting: Mathematical optimization to replace hand-drawn coordinates
 *    with clean geometric primitives (Line, Arrow, Circle, Ellipse, Rectangle, Square, Triangle, Star, Pentagon)
 */

export interface InkPoint {
  x: number;
  y: number;
  time?: number;
  pressure?: number;
}

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
  const I = pathLength(points) / Math.max(1, n - 1);
  let D = 0.0;
  const newPoints: PPoint[] = [{ ...points[0] }];
  const pts = [...points];

  for (let i = 1; i < pts.length; i++) {
    const d = distance(pts[i - 1], pts[i]);
    if (D + d >= I) {
      const qx = pts[i - 1].x + ((I - D) / Math.max(1e-4, d)) * (pts[i].x - pts[i - 1].x);
      const qy = pts[i - 1].y + ((I - D) / Math.max(1e-4, d)) * (pts[i].y - pts[i - 1].y);
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
  return { x: x / Math.max(1, points.length), y: y / Math.max(1, points.length) };
}

function distance(p1: PPoint, p2: PPoint): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

function pathLength(points: PPoint[]): number {
  let d = 0.0;
  for (let i = 1; i < points.length; i++) {
    d += distance(points[i - 1], points[i]);
  }
  return d;
}

/**
 * Douglas-Peucker Polyline Simplification Algorithm
 */
function perpendicularDistance(
  p: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - p1.x, p.y - p1.y);
  const t = Math.max(0, Math.min(1, ((p.x - p1.x) * dx + (p.y - p1.y) * dy) / lenSq));
  const projX = p1.x + t * dx;
  const projY = p1.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

export function douglasPeucker(pts: { x: number; y: number }[], epsilon: number): { x: number; y: number }[] {
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
 * Detect sharp corners in a stroke by analyzing tangent angle deviation
 */
function detectCorners(pts: { x: number; y: number }[]): number[] {
  if (pts.length < 5) return [0, pts.length - 1];
  const corners: number[] = [0];
  const windowSize = Math.max(2, Math.floor(pts.length * 0.05));

  for (let i = windowSize; i < pts.length - windowSize; i++) {
    const prev = pts[i - windowSize];
    const curr = pts[i];
    const next = pts[i + windowSize];

    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;

    const len1 = Math.hypot(v1x, v1y);
    const len2 = Math.hypot(v2x, v2y);

    if (len1 > 1e-3 && len2 > 1e-3) {
      const dot = (v1x * v2x + v1y * v2y) / (len1 * len2);
      const angle = Math.acos(Math.max(-1, Math.min(1, dot))); // in radians
      // Sharp deviation > 50 degrees (0.87 rad)
      if (angle > 0.87) {
        if (i - corners[corners.length - 1] > windowSize * 1.5) {
          corners.push(i);
        }
      }
    }
  }
  if (pts.length - 1 - corners[corners.length - 1] > windowSize) {
    corners.push(pts.length - 1);
  }
  return corners;
}

/**
 * Snaps hand-drawn stroke into an accurate geometric shape (OneNote / Ink-Telemetry algorithm)
 */
export function snapStrokeWithDollarP(rawPoints: { x: number; y: number }[]): { x: number; y: number }[] {
  if (!rawPoints || rawPoints.length < 4) return rawPoints;

  // 1. Vector coordinates extraction & bounds
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let totalLength = 0;
  for (let i = 0; i < rawPoints.length; i++) {
    const p = rawPoints[i];
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
    if (i > 0) totalLength += Math.hypot(p.x - rawPoints[i - 1].x, p.y - rawPoints[i - 1].y);
  }

  const pStart = rawPoints[0];
  const pEnd = rawPoints[rawPoints.length - 1];
  const chordDist = Math.hypot(pEnd.x - pStart.x, pEnd.y - pStart.y);
  const bboxW = Math.max(1, maxX - minX);
  const bboxH = Math.max(1, maxY - minY);
  const diag = Math.hypot(bboxW, bboxH);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  // 2. Curvature & Radial Variance from Centroid
  let sumR = 0;
  const samplePts = resample(rawPoints, 32);
  const radii: number[] = [];
  for (const sp of samplePts) {
    const r = Math.hypot(sp.x - cx, sp.y - cy);
    radii.push(r);
    sumR += r;
  }
  const meanR = sumR / samplePts.length;
  let varianceR = 0;
  for (const r of radii) {
    varianceR += Math.pow(r - meanR, 2);
  }
  const stdDevR = Math.sqrt(varianceR / samplePts.length);
  const normalizedVariance = meanR > 0 ? stdDevR / meanR : 1.0;

  // 3. Closing Constraint Evaluation
  // If the distance between the starting vector and the ending coordinate falls within a threshold,
  // the path is classified as a closed geometric shape
  const isClosed =
    chordDist < Math.max(28, diag * 0.32) ||
    (totalLength > 20 && chordDist / totalLength < 0.35);

  // --- BRANCH A: OPEN SHAPES (Line, Arrow) ---
  if (!isClosed) {
    // Check if it's a straight line: chord length almost matches total path length
    if (totalLength > 10 && chordDist / totalLength > 0.82) {
      // Angle snapping: snap to horizontal, vertical, or 45 degrees
      const dx = pEnd.x - pStart.x;
      const dy = pEnd.y - pStart.y;
      const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
      const absAngle = Math.abs(angleDeg);

      // Snap to horizontal (within 8 deg)
      if (absAngle < 8 || absAngle > 172) {
        return [pStart, { x: pEnd.x, y: pStart.y }];
      }
      // Snap to vertical (within 8 deg)
      if (Math.abs(absAngle - 90) < 8) {
        return [pStart, { x: pStart.x, y: pEnd.y }];
      }
      // Snap to 45 deg diagonal
      if (Math.abs(absAngle - 45) < 6 || Math.abs(absAngle - 135) < 6) {
        const signX = dx >= 0 ? 1 : -1;
        const signY = dy >= 0 ? 1 : -1;
        const len = Math.max(Math.abs(dx), Math.abs(dy));
        return [pStart, { x: pStart.x + signX * len, y: pStart.y + signY * len }];
      }
      return [pStart, pEnd];
    }

    // Check for Arrow: line with arrowhead at one end
    const corners = detectCorners(rawPoints);
    if (corners.length >= 3 && corners.length <= 5) {
      // Shaft from start to main corner
      const mainCornerIdx = corners[1];
      const mainCorner = rawPoints[mainCornerIdx];
      const shaftLen = Math.hypot(mainCorner.x - pStart.x, mainCorner.y - pStart.y);
      if (shaftLen > diag * 0.4) {
        // Return structured arrow path: start -> head tip -> wing1 -> tip -> wing2
        const headAngle = Math.atan2(mainCorner.y - pStart.y, mainCorner.x - pStart.x);
        const wingLen = Math.max(10, Math.min(24, diag * 0.18));
        const wing1 = {
          x: mainCorner.x - wingLen * Math.cos(headAngle - Math.PI / 6),
          y: mainCorner.y - wingLen * Math.sin(headAngle - Math.PI / 6),
        };
        const wing2 = {
          x: mainCorner.x - wingLen * Math.cos(headAngle + Math.PI / 6),
          y: mainCorner.y - wingLen * Math.sin(headAngle + Math.PI / 6),
        };
        return [pStart, mainCorner, wing1, mainCorner, wing2];
      }
    }

    // Fallback open stroke: straight line
    return [pStart, pEnd];
  }

  // --- BRANCH B: CLOSED GEOMETRIC SHAPES (Circle, Ellipse, Rectangle, Triangle, Pentagon, Star) ---
  // 1. Circle / Ellipse Detection: low radial variance from centroid (< 0.20)
  if (normalizedVariance < 0.20) {
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

  // 2. Corner segmentation via Douglas-Peucker
  const epsilon = Math.max(5, diag * 0.08);
  const simplified = douglasPeucker(rawPoints, epsilon);
  const uniqueVertices: { x: number; y: number }[] = [];
  for (let i = 0; i < simplified.length; i++) {
    const v = simplified[i];
    if (
      uniqueVertices.length === 0 ||
      Math.hypot(v.x - uniqueVertices[uniqueVertices.length - 1].x, v.y - uniqueVertices[uniqueVertices.length - 1].y) > epsilon * 0.6
    ) {
      uniqueVertices.push(v);
    }
  }
  // Remove closing duplicate
  if (
    uniqueVertices.length > 2 &&
    Math.hypot(uniqueVertices[0].x - uniqueVertices[uniqueVertices.length - 1].x, uniqueVertices[0].y - uniqueVertices[uniqueVertices.length - 1].y) < epsilon * 1.8
  ) {
    uniqueVertices.pop();
  }

  const vCount = uniqueVertices.length;

  // (A) Triangle Detection (3 vertices or 3 sharp angles)
  if (vCount === 3) {
    return [
      uniqueVertices[0],
      uniqueVertices[1],
      uniqueVertices[2],
      uniqueVertices[0],
    ];
  }

  // (B) Rectangle / Square Detection (4 vertices)
  if (vCount === 4 || vCount === 5) {
    const isSquare = Math.abs(bboxW - bboxH) / Math.max(bboxW, bboxH) < 0.18;
    if (isSquare) {
      const side = (bboxW + bboxH) / 2;
      const sqX = cx - side / 2;
      const sqY = cy - side / 2;
      return [
        { x: sqX, y: sqY },
        { x: sqX + side, y: sqY },
        { x: sqX + side, y: sqY + side },
        { x: sqX + side, y: sqY },
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

  // (C) Pentagon Detection (5 vertices)
  if (vCount === 5) {
    const r = Math.min(bboxW, bboxH) / 2;
    const pentPts: { x: number; y: number }[] = [];
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      pentPts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
    pentPts.push(pentPts[0]);
    return pentPts;
  }

  // (D) Star Detection (6-10 vertices with alternating radius)
  if (vCount >= 6 && vCount <= 12) {
    const outerR = Math.min(bboxW, bboxH) / 2;
    const innerR = outerR * 0.42;
    const starPts: { x: number; y: number }[] = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      starPts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
    starPts.push(starPts[0]);
    return starPts;
  }

  // Fallback: If circularity is somewhat high, fit ellipse, else rectangle
  let polygonArea = 0;
  for (let i = 0; i < uniqueVertices.length; i++) {
    const j = (i + 1) % uniqueVertices.length;
    polygonArea += uniqueVertices[i].x * uniqueVertices[j].y - uniqueVertices[j].x * uniqueVertices[i].y;
  }
  polygonArea = Math.abs(polygonArea) / 2;
  const circularity = totalLength > 0 ? (4 * Math.PI * polygonArea) / (totalLength * totalLength) : 0;

  if (circularity > 0.55) {
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

  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
    { x: minX, y: minY },
  ];
}
