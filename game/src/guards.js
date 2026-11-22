// Guard AI: the patrol → suspicious → alerted → search → return state
// machine. A guard walks its waypoints, fills a per-guard detection meter
// when the thief is inside its vision cone with line of sight, investigates
// noises and coin pings, chases on full detection, sweeps the last-seen
// spot when the trail goes cold, then walks back to its patrol.

import { GUARD, STEP } from './config.js';
import { angleDelta, hasLineOfSight, inShadow, lightFactor, pointInCone } from './vision.js';

export const GUARD_PATROL = 'patrol';
export const GUARD_SUSPICIOUS = 'suspicious';
export const GUARD_ALERTED = 'alerted';
export const GUARD_SEARCH = 'search';
export const GUARD_RETURN = 'return';

/** Build a guard's runtime state from its level definition. */
export function createGuard(def) {
  const first = def.waypoints[0];
  return {
    x: first[0],
    y: first[1],
    angle: 0,
    state: GUARD_PATROL,
    waypointIndex: 1 % def.waypoints.length,
    waypoints: def.waypoints,
    pause: def.pause ?? 1,
    pauseTimer: 0,
    detection: 0,
    target: null, // {x, y} to walk toward while suspicious / searching
    lastSeen: null,
    searchTimer: 0,
    searchSweeps: 0,
    stuckTimer: 0,
  };
}

function turnToward(guard, targetAngle, rate, dt) {
  const diff = angleDelta(targetAngle, guard.angle);
  const step = Math.max(-rate * dt, Math.min(rate * dt, diff));
  guard.angle += step;
}

function walkToward(guard, tx, ty, speed, dt, blockers) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return true;
  const step = Math.min(dist, speed * dt);
  const nx = guard.x + (dx / dist) * step;
  const ny = guard.y + (dy / dist) * step;
  guard.angle = Math.atan2(dy, dx);
  // Guards slide along walls: try the full move, then each axis alone.
  if (!hitsAny(nx, ny, blockers)) {
    guard.x = nx;
    guard.y = ny;
  } else if (!hitsAny(nx, guard.y, blockers)) {
    guard.x = nx;
  } else if (!hitsAny(guard.x, ny, blockers)) {
    guard.y = ny;
  }
  return dist <= step + 2;
}

function hitsAny(x, y, blockers) {
  for (const rect of blockers) {
    const nx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
    const ny = Math.max(rect.y, Math.min(y, rect.y + rect.h));
    const dx = x - nx;
    const dy = y - ny;
    if (dx * dx + dy * dy < GUARD.radius * GUARD.radius) return true;
  }
  return false;
}

/** A guard hears a noise at (x, y): become suspicious and walk over. */
export function guardHear(guard, x, y, world) {
  if (guard.state === GUARD_ALERTED) return;
  const dist = Math.hypot(x - guard.x, y - guard.y);
  if (dist > world.hearRadius) return;
  if (guard.state !== GUARD_SUSPICIOUS || !guard.target) {
    guard.state = GUARD_SUSPICIOUS;
    guard.target = { x, y };
    guard.detection = Math.max(guard.detection, 0.45);
    world.events.push({ type: 'suspicious' });
  }
}

/**
 * One guard tick. Returns 'caught' when this guard touches the player
 * while alerted, otherwise null. `world` carries the shared alarm, the
 * player, the blockers and the event list.
 */
export function updateGuard(guard, world, dt) {
  const player = world.player;
  const blockers = world.blockers;
  const boost = world.lockdown ? 1.25 : 1;
  const inCone = pointInCone(player.x, player.y, guard.x, guard.y, guard.angle, GUARD.coneRange, GUARD.coneHalfAngle);
  const seen = inCone && hasLineOfSight(guard.x, guard.y, player.x, player.y, blockers);
  const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
  const hidden = inShadow(player.x, player.y, world.level.shadows) && dist > GUARD.adjacentSeeRadius;

  // --- detection meter -------------------------------------------------
  if (seen && !hidden) {
    const closeness = 1 - dist / GUARD.coneRange;
    let rate = GUARD.detectBase * (0.35 + 0.85 * closeness);
    rate *= lightFactor(player.x, player.y, world.level.lamps, world.level.shadows);
    if (player.sneaking) rate *= GUARD.sneakDetectScale;
    if (inShadow(player.x, player.y, world.level.shadows)) rate *= GUARD.shadowScale;
    guard.detection = Math.min(1, guard.detection + rate * dt);
    guard.lastSeen = { x: player.x, y: player.y };
  } else if (dist < GUARD.adjacentSeeRadius && hasLineOfSight(guard.x, guard.y, player.x, player.y, blockers)) {
    guard.detection = Math.min(1, guard.detection + 1.4 * dt);
    guard.lastSeen = { x: player.x, y: player.y };
  } else {
    guard.detection = Math.max(0, guard.detection - GUARD.detectDecay * dt);
  }

  // --- state transitions ----------------------------------------------
  if (guard.detection >= 1 && guard.state !== GUARD_ALERTED) {
    guard.state = GUARD_ALERTED;
    world.events.push({ type: 'alerted', guard });
  }
  if (guard.state === GUARD_PATROL && guard.detection > 0.35) {
    guard.state = GUARD_SUSPICIOUS;
    guard.target = guard.lastSeen ? { ...guard.lastSeen } : { x: player.x, y: player.y };
    world.events.push({ type: 'suspicious' });
  }

  // --- behaviour -------------------------------------------------------
  switch (guard.state) {
    case GUARD_PATROL: {
      if (guard.pauseTimer > 0) {
        guard.pauseTimer -= dt;
        break;
      }
      const wp = guard.waypoints[guard.waypointIndex];
      const arrived = walkToward(guard, wp[0], wp[1], GUARD.patrolSpeed * boost, dt, blockers);
      if (arrived) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
        guard.pauseTimer = guard.pause;
      }
      break;
    }
    case GUARD_SUSPICIOUS: {
      if (!guard.target) { guard.state = GUARD_PATROL; break; }
      const arrived = walkToward(guard, guard.target.x, guard.target.y, GUARD.suspiciousSpeed * boost, dt, blockers);
      if (arrived) {
        guard.state = GUARD_SEARCH;
        guard.searchTimer = 3.5;
        guard.searchSweeps = 0;
      }
      break;
    }
    case GUARD_ALERTED: {
      const chased = walkToward(guard, player.x, player.y, GUARD.chaseSpeed * boost, dt, blockers);
      if (!seen && guard.detection < 0.55) {
        guard.state = GUARD_SEARCH;
        guard.searchTimer = 4;
        guard.searchSweeps = 0;
      }
      if (chased || dist < GUARD.catchRadius) return 'caught';
      break;
    }
    case GUARD_SEARCH: {
      guard.searchTimer -= dt;
      // Sweep: turn in place, scanning the last-seen area.
      guard.angle += 1.1 * dt;
      if (guard.lastSeen && guard.searchTimer < 2 && guard.searchSweeps === 0) {
        guard.searchSweeps = 1;
        walkToward(guard, guard.lastSeen.x, guard.lastSeen.y, GUARD.searchSpeed * boost, dt, blockers);
      }
      if (guard.searchTimer <= 0) guard.state = GUARD_RETURN;
      break;
    }
    case GUARD_RETURN: {
      // Walk back to the nearest waypoint, then resume the patrol.
      let best = 0;
      let bestDist = Infinity;
      guard.waypoints.forEach((wp, i) => {
        const d = Math.hypot(wp[0] - guard.x, wp[1] - guard.y);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      const wp = guard.waypoints[best];
      const arrived = walkToward(guard, wp[0], wp[1], GUARD.returnSpeed * boost, dt, blockers);
      if (arrived) {
        guard.waypointIndex = (best + 1) % guard.waypoints.length;
        guard.state = GUARD_PATROL;
      }
      break;
    }
    default:
      break;
  }

  // A glimpse while searching or returning re-arouses the guard.
  if ((guard.state === GUARD_SEARCH || guard.state === GUARD_RETURN) && guard.detection > 0.6) {
    guard.state = GUARD_SUSPICIOUS;
    guard.target = guard.lastSeen ? { ...guard.lastSeen } : { x: player.x, y: player.y };
  }
  return null;
}

export { STEP };
