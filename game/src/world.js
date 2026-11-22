// The world: the fixed-step simulation and the rules, with no drawing.
// Owns the level state, the alarm meter and lockdown, pickups, doors and
// keys, lasers, nerves, scoring and the level / game-complete events. The
// renderer reads this state; it never writes it.

import { ALARM, LASER, STEP } from './config.js';
import { createGuard, guardHear, updateGuard } from './guards.js';
import { createCamera, empNearestCamera, updateCamera } from './cameras.js';
import { createPlayer, throwCoin, updateCoin, updateCoinPing, updatePlayer } from './player.js';
import { circleHitsRect, resolveCircleRect } from './vision.js';
import { LEVELS, solidRects } from './levels.js';
import { COIN, PLAYER } from './config.js';

export const EVENT_CAUGHT = 'caught';
export const EVENT_LEVEL = 'level-complete';
export const EVENT_GAME = 'game-complete';

export const SCREEN_TITLE = 'title';
export const SCREEN_BRIEF = 'brief';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_LEVEL = 'level';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_WIN = 'win';
export const SCREEN_OVER = 'over';

/** Build a fresh world for level `levelIndex` (0-based). */
export function createWorld(levelIndex, carry) {
  const level = LEVELS[levelIndex];
  const world = {
    levelIndex,
    level,
    time: 0,
    player: createPlayer(level.spawn),
    guards: level.guards.map(createGuard),
    cameras: level.cameras.map(createCamera),
    alarm: level.alarmStart ?? 0,
    lockdown: false,
    lockdownTimer: 0,
    nerves: carry?.nerves ?? 3,
    score: carry?.score ?? 0,
    lootTaken: new Set(),
    keysTaken: new Set(),
    doorsOpen: new Set(),
    lasersOn: false,
    laserTimer: 0,
    hearRadius: 260,
    events: [],
    blockers: [],
    screen: SCREEN_PLAY,
    levelTime: 0,
    bestTimes: carry?.bestTimes ?? {},
    finished: false,
    cameraAlarmSounded: false,
    anyCameraSpotting: false,
  };
  world.blockers = solidRects(level, world.doorsOpen);
  return world;
}

/** Swap the world to the next level, carrying nerves, score and best times. */
export function nextLevel(world) {
  const carry = {
    nerves: world.nerves,
    score: world.score,
    bestTimes: { ...world.bestTimes },
  };
  const levelTime = world.levelTime;
  const prev = world.levelIndex;
  if (levelTime > 0 && (!carry.bestTimes[prev] || levelTime < carry.bestTimes[prev])) {
    carry.bestTimes[prev] = Math.round(levelTime * 10) / 10;
  }
  return createWorld(world.levelIndex + 1, carry);
}

/** Restart the current level after being caught, keeping the nerve count. */
export function restartLevel(world) {
  const carry = { nerves: world.nerves, score: world.score, bestTimes: { ...world.bestTimes } };
  return createWorld(world.levelIndex, carry);
}

function pickupRadius() {
  return 30;
}

function checkPickups(world) {
  const player = world.player;
  const level = world.level;
  // The diamond.
  if (!player.hasDiamond && Math.hypot(player.x - level.diamond.x, player.y - level.diamond.y) < 34) {
    player.hasDiamond = true;
    world.score += 500;
    world.events.push({ type: 'diamond' });
  }
  // Optional loot: +100 score and +1 coin each.
  level.loot.forEach((item, i) => {
    if (world.lootTaken.has(i)) return;
    if (Math.hypot(player.x - item.x, player.y - item.y) < pickupRadius()) {
      world.lootTaken.add(i);
      player.loot += 1;
      player.coins += 1;
      world.score += 100;
      world.events.push({ type: 'pickup', item });
    }
  });
  // Keys open their doors.
  level.keys.forEach((key, i) => {
    if (world.keysTaken.has(i)) return;
    if (Math.hypot(player.x - key.x, player.y - key.y) < pickupRadius()) {
      world.keysTaken.add(i);
      player.keys.add(key.id);
      world.doorsOpen.add(key.id);
      world.blockers = solidRects(level, world.doorsOpen);
      world.score += 50;
      world.events.push({ type: 'key', key });
    }
  });
}

function checkExit(world) {
  const player = world.player;
  const exit = world.level.exit;
  if (!player.hasDiamond) return false;
  return player.x > exit.x - 6 && player.x < exit.x + exit.w + 6
    && player.y > exit.y - 6 && player.y < exit.y + exit.h + 6;
}

function updateLasers(world, dt) {
  if (world.level.lasers.length === 0) return;
  world.laserTimer += dt;
  const cycle = LASER.cycleSeconds;
  const phase = world.laserTimer % cycle;
  world.lasersOn = phase < LASER.onSeconds;
  if (!world.lasersOn) return;
  const player = world.player;
  for (const laser of world.level.lasers) {
    const local = (world.laserTimer + (laser.phase ?? 0)) % cycle;
    if (local >= LASER.onSeconds) continue;
    const inBeam = player.x > laser.x - PLAYER.radius && player.x < laser.x + laser.w + PLAYER.radius
      && player.y > laser.y && player.y < laser.y + laser.h;
    if (inBeam && !world.laserTripped) {
      world.laserTripped = true;
      world.alarm = Math.min(100, world.alarm + LASER.alarmHit);
      world.events.push({ type: 'laser' });
      for (const guard of world.guards) guardHear(guard, player.x, player.y, world);
    }
  }
  if (!world.lasersOn) world.laserTripped = false;
}

function updateAlarm(world, dt) {
  if (world.lockdown) {
    world.lockdownTimer -= dt;
    if (world.lockdownTimer <= 0) {
      world.lockdown = false;
      world.alarm = ALARM.lockdownReset;
    }
    return;
  }
  const anyAlerted = world.guards.some((g) => g.state === 'alerted');
  if (anyAlerted) {
    world.alarm = Math.min(100, world.alarm + ALARM.alertedPerSecond * dt);
  } else {
    world.alarm = Math.max(0, world.alarm - ALARM.decayPerSecond * dt);
  }
  if (world.alarm >= 100) {
    world.lockdown = true;
    world.lockdownTimer = ALARM.lockdownSeconds;
    world.events.push({ type: 'lockdown' });
  }
}

/**
 * Advance the simulation one fixed step. `input` is the live input state;
 * queued actions (coin, EMP, pause) are consumed here. Returns an event
 * string (EVENT_CAUGHT / EVENT_LEVEL / EVENT_GAME) or null.
 */
export function updateWorld(world, input, dt = STEP) {
  world.time += dt;
  world.levelTime += dt;
  world.events.length = 0;

  // Queued actions.
  if (input.coinQueued) {
    const target = input.coinQueued;
    input.coinQueued = null;
    if (throwCoin(world.player, target.x, target.y)) {
      world.events.push({ type: 'coin-throw' });
    }
  }
  if (input.empQueued) {
    input.empQueued = false;
    if (world.player.emp > 0) {
      if (empNearestCamera(world.cameras, world.player, world)) {
        world.player.emp -= 1;
      }
    }
  }

  updatePlayer(world.player, input, world.blockers, dt);
  updateCoinPing(world.player, dt);
  const landed = updateCoin(world.player, dt);
  if (landed) {
    world.events.push({ type: 'coin-ping', x: landed.x, y: landed.y });
    for (const guard of world.guards) {
      guardHear(guard, landed.x, landed.y, { ...world, hearRadius: COIN.pingRadius });
    }
  }

  // Footstep noise: walking (not sneaking) draws nearby guards.
  if (world.player.moving && !world.player.sneaking) {
    for (const guard of world.guards) {
      const dist = Math.hypot(guard.x - world.player.x, guard.y - world.player.y);
      if (dist < 90) guardHear(guard, world.player.x, world.player.y, { ...world, hearRadius: 90 });
    }
  }

  world.anyCameraSpotting = false;
  for (const camera of world.cameras) updateCamera(camera, world, dt);
  world.anyCameraSpotting = world.cameras.some((c) => c.spotting);
  if (!world.anyCameraSpotting) world.cameraAlarmSounded = false;

  let caught = false;
  for (const guard of world.guards) {
    if (updateGuard(guard, world, dt) === 'caught') caught = true;
  }

  updateLasers(world, dt);
  updateAlarm(world, dt);
  checkPickups(world);

  if (caught) {
    world.nerves -= 1;
    world.events.push({ type: 'caught' });
    return world.nerves <= 0 ? EVENT_CAUGHT : 'nerve-lost';
  }
  if (checkExit(world)) {
    world.score += Math.max(0, 300 - Math.floor(world.levelTime));
    if (world.levelIndex >= LEVELS.length - 1) {
      world.finished = true;
      return EVENT_GAME;
    }
    return EVENT_LEVEL;
  }
  return null;
}

/** Total loot pieces on the current level (for the HUD counter). */
export function levelLootTotal(world) {
  return world.level.loot.length;
}
