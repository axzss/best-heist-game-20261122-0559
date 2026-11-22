// Museum security cameras: fixed mounts whose cones sweep back and forth.
// A camera that sees the thief fills the global alarm fast and flashes red.
// An EMP charge (E) knocks the nearest camera out for eight seconds — its
// cone goes dark grey and it cannot spot anyone while it is down.

import { CAMERA } from './config.js';
import { hasLineOfSight, pointInCone } from './vision.js';

/** Build a camera's runtime state from its level definition. */
export function createCamera(def) {
  return {
    x: def.x,
    y: def.y,
    baseAngle: def.baseAngle,
    sweep: def.sweep,
    range: def.range ?? CAMERA.range,
    angle: def.baseAngle,
    sweepPhase: Math.random() * Math.PI * 2,
    disabledTimer: 0,
    spotting: false,
  };
}

/** One camera tick: sweep, and spot the player if the cone catches them. */
export function updateCamera(camera, world, dt) {
  if (camera.disabledTimer > 0) {
    camera.disabledTimer -= dt;
    camera.spotting = false;
    return;
  }
  camera.sweepPhase += CAMERA.sweepSpeed * dt;
  camera.angle = camera.baseAngle + Math.sin(camera.sweepPhase) * camera.sweep;
  const player = world.player;
  const inCone = pointInCone(player.x, player.y, camera.x, camera.y, camera.angle, camera.range, CAMERA.halfAngle);
  const seen = inCone && hasLineOfSight(camera.x, camera.y, player.x, player.y, world.blockers);
  camera.spotting = seen;
  if (seen) {
    world.alarm = Math.min(100, world.alarm + CAMERA.alarmPerSecond * dt);
    if (!world.cameraAlarmSounded) {
      world.cameraAlarmSounded = true;
      world.events.push({ type: 'camera-spot' });
    }
  } else if (!world.anyCameraSpotting) {
    world.cameraAlarmSounded = false;
  }
}

/** Knock the nearest camera within EMP range out for CAMERA.empSeconds. */
export function empNearestCamera(cameras, player, world) {
  let best = null;
  let bestDist = Infinity;
  for (const camera of cameras) {
    if (camera.disabledTimer > 0) continue;
    const dist = Math.hypot(camera.x - player.x, camera.y - player.y);
    if (dist < bestDist) { bestDist = dist; best = camera; }
  }
  if (!best || bestDist > 280) return false;
  best.disabledTimer = CAMERA.empSeconds;
  best.spotting = false;
  world.events.push({ type: 'emp' });
  return true;
}
