// Line of sight and vision-cone tests: what a guard or a camera can
// actually see. Walls and display cases block sight; shadow pools and lamp
// light change how fast a guard's suspicion fills.

/** Angle difference wrapped to [-PI, PI]. */
export function angleDelta(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** True when (x, y) lies inside a cone from (ox, oy) facing `angle`. */
export function pointInCone(x, y, ox, oy, angle, range, halfAngle) {
  const dx = x - ox;
  const dy = y - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 8) return true;
  const toTarget = Math.atan2(dy, dx);
  return Math.abs(angleDelta(toTarget, angle)) <= halfAngle;
}

function segmentHitsRect(x1, y1, x2, y2, rect) {
  // Slab test: does the segment cross the rectangle's interior?
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0;
  let tMax = 1;
  for (const [p, q] of [[-dx, x1 - rect.x], [dx, rect.x + rect.w - x1], [-dy, y1 - rect.y], [dy, rect.y + rect.h - y1]]) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const t = q / p;
      if (p < 0) {
        if (t > tMax) return false;
        if (t > tMin) tMin = t;
      } else {
        if (t < tMin) return false;
        if (t < tMax) tMax = t;
      }
    }
  }
  return true;
}

/** True when no wall or case stands between the two points. */
export function hasLineOfSight(x1, y1, x2, y2, blockers) {
  for (const rect of blockers) {
    if (segmentHitsRect(x1, y1, x2, y2, rect)) return false;
  }
  return true;
}

/**
 * True when the segment P1->P2 touches or passes through the circle
 * (cx, cy, r). Analytic quadratic — no sampling, no randomness, so the
 * same segment and cloud always give the same answer. A segment that
 * starts inside the circle counts as blocked: an observer standing in
 * smoke cannot see out of it.
 */
export function segmentHitsCircle(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const fx = x1 - cx;
  const fy = y1 - cy;
  const a = dx * dx + dy * dy;
  const c = fx * fx + fy * fy - r * r;
  if (c <= 0) return true; // start point inside the circle
  if (a === 0) return false; // degenerate segment, outside the circle
  const b = 2 * (fx * dx + fy * dy);
  const disc = b * b - 4 * a * c;
  if (disc < 0) return false;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t >= 0 && t <= 1;
}

/**
 * True when any active smoke cloud stands between the two points. This is
 * the smoke half of line-of-sight: walls are tested by hasLineOfSight,
 * clouds by this function, and a sight line is clear only when both pass.
 */
export function cloudBlocksSight(x1, y1, x2, y2, clouds) {
  for (const cloud of clouds) {
    if (segmentHitsCircle(x1, y1, x2, y2, cloud.x, cloud.y, cloud.radius)) return true;
  }
  return false;
}

/** The cloud containing (x, y), or null when the point is in clear air. */
export function cloudAt(x, y, clouds) {
  for (const cloud of clouds) {
    const dx = x - cloud.x;
    const dy = y - cloud.y;
    if (dx * dx + dy * dy < cloud.radius * cloud.radius) return cloud;
  }
  return null;
}

/** True when both points sit inside the same smoke cloud. */
export function sameSmokeCloud(x1, y1, x2, y2, clouds) {
  const a = cloudAt(x1, y1, clouds);
  return a !== null && a === cloudAt(x2, y2, clouds);
}

/** True when the point sits inside one of the level's shadow pools. */
export function inShadow(x, y, shadows) {
  for (const pool of shadows) {
    if (x >= pool.x && x <= pool.x + pool.w && y >= pool.y && y <= pool.y + pool.h) return true;
  }
  return false;
}

/** Light factor at a point: bright under a lamp, dim in the dark. */
export function lightFactor(x, y, lamps, shadows) {
  if (inShadow(x, y, shadows)) return 0.4;
  for (const lamp of lamps) {
    if (Math.hypot(x - lamp.x, y - lamp.y) < lamp.r * 0.75) return 1.6;
  }
  return 1.0;
}

/** Circle-vs-rectangle collision test, used for movement and pickups. */
export function circleHitsRect(cx, cy, radius, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < radius * radius;
}

/** Push a circle out of a rectangle it overlaps; returns the fixed point. */
export function resolveCircleRect(cx, cy, radius, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  let dx = cx - nx;
  let dy = cy - ny;
  const distSq = dx * dx + dy * dy;
  if (distSq >= radius * radius) return { x: cx, y: cy, hit: false };
  if (distSq === 0) {
    // Centre inside the rectangle: push out along the smallest penetration.
    const left = cx - rect.x;
    const right = rect.x + rect.w - cx;
    const top = cy - rect.y;
    const bottom = rect.y + rect.h - cy;
    const min = Math.min(left, right, top, bottom);
    if (min === left) return { x: rect.x - radius, y: cy, hit: true };
    if (min === right) return { x: rect.x + rect.w + radius, y: cy, hit: true };
    if (min === top) return { x: cx, y: rect.y - radius, hit: true };
    return { x: cx, y: rect.y + rect.h + radius, hit: true };
  }
  const dist = Math.sqrt(distSq);
  dx /= dist;
  dy /= dist;
  return { x: nx + dx * radius, y: ny + dy * radius, hit: true };
}
