// Rook, the cat-burglar: movement with wall collision, sneaking, the coin
// throw and the EMP. The player file owns motion only — the world owns the
// rules (pickups, alarm, nerves) that motion triggers.

import { COIN, EMP, PLAYER, SMOKE } from './config.js';
import { moveVector } from './input.js';
import { circleHitsRect, resolveCircleRect } from './vision.js';

/** Build the player's runtime state at a level's spawn point. */
export function createPlayer(spawn) {
  return {
    x: spawn.x,
    y: spawn.y,
    angle: Math.PI / 2,
    sneaking: false,
    moving: false,
    stepTimer: 0,
    coins: COIN.start,
    emp: EMP.start,
    smoke: SMOKE.start, // smoke pellets in inventory (1 per level)
    smokePellet: null, // a pellet in flight: {x, y, dx, dy, traveled}
    coin: null, // a coin in flight: {sx, sy, tx, ty, t}
    coinPing: null, // a landed coin still pinging: {x, y, timer}
    hasDiamond: false,
    keys: new Set(),
    loot: 0,
  };
}

/** Move the player one tick from the held keys, sliding along walls. */
export function updatePlayer(player, input, blockers, dt) {
  const vec = moveVector(input);
  player.sneaking = input.sneak;
  player.moving = vec !== null;
  if (!vec) return;
  const speed = player.sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
  player.angle = Math.atan2(vec.y, vec.x);
  let nx = player.x + vec.x * speed * dt;
  let ny = player.y + vec.y * speed * dt;
  for (const rect of blockers) {
    const fixed = resolveCircleRect(nx, ny, PLAYER.radius, rect);
    nx = fixed.x;
    ny = fixed.y;
  }
  player.x = nx;
  player.y = ny;
  player.stepTimer -= dt;
  if (player.stepTimer <= 0) {
    player.stepTimer = player.sneaking ? 0.55 : 0.34;
  }
}

/** Start a coin throw toward (tx, ty) if the player has coins left. */
export function throwCoin(player, tx, ty) {
  if (player.coins <= 0 || player.coin) return false;
  player.coins -= 1;
  player.coin = { sx: player.x, sy: player.y, tx, ty, t: 0 };
  return true;
}

/** Advance a thrown coin; returns the landing point when it lands. */
export function updateCoin(player, dt) {
  if (!player.coin) return null;
  player.coin.t += dt / COIN.flightSeconds;
  if (player.coin.t < 1) return null;
  const landed = { x: player.coin.tx, y: player.coin.ty };
  player.coin = null;
  player.coinPing = { x: landed.x, y: landed.y, timer: 1.6 };
  return landed;
}

/**
 * Throw a smoke pellet SMOKE.rangePx ahead in the facing direction
 * (player.angle: the last movement direction, or the spawn facing when
 * idle). Direction-only on purpose — Q is a panic button, no aim needed,
 * and the throw is fully determined by the sim state. Returns false when
 * there is no pellet left or one is already in flight.
 */
export function throwSmoke(player) {
  if (player.smoke <= 0 || player.smokePellet) return false;
  player.smoke -= 1;
  player.smokePellet = {
    x: player.x,
    y: player.y,
    dx: Math.cos(player.angle),
    dy: Math.sin(player.angle),
    traveled: 0,
  };
  return true;
}

/**
 * Advance a thrown pellet one tick at a fixed speed. It stops at the first
 * wall (probed with a small circle, like movement collision) or at max
 * range, and returns the impact point where the cloud spawns — or null
 * while still in flight. No randomness anywhere in the flight.
 */
export function updateSmokePellet(player, blockers, dt) {
  const p = player.smokePellet;
  if (!p) return null;
  const step = SMOKE.flightSpeed * dt;
  const nx = p.x + p.dx * step;
  const ny = p.y + p.dy * step;
  p.traveled += step;
  let blocked = false;
  for (const rect of blockers) {
    if (circleHitsRect(nx, ny, 4, rect)) { blocked = true; break; }
  }
  if (blocked || p.traveled >= SMOKE.rangePx) {
    // A wall stops the pellet short: the cloud blooms where it stopped,
    // not inside the wall.
    const impact = blocked ? { x: p.x, y: p.y } : { x: nx, y: ny };
    player.smokePellet = null;
    return impact;
  }
  p.x = nx;
  p.y = ny;
  return null;
}

/** Tick the landed coin's ping ring down. */
export function updateCoinPing(player, dt) {
  if (!player.coinPing) return;
  player.coinPing.timer -= dt;
  if (player.coinPing.timer <= 0) player.coinPing = null;
}
