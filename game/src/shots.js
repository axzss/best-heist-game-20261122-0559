// Staged screenshot scenes behind ?shot=cover|title|coin|win, plus the
// autopilot that genuinely plays level 1 to a win: it re-plans a grid path
// every half second, treats guard vision cones as expensive ground, sneaks
// when a cone is near, and waits out patrols instead of walking into them.
// The frames are what a careful game really looks like — the same seed
// always gives the same frame.

import { STEP, VIEW } from './config.js';
import { createWorld, EVENT_LEVEL, nextLevel, restartLevel, updateWorld } from './world.js';
import { pointInCone } from './vision.js';
import { createInput } from './input.js';
import { solidRects } from './levels.js';

const CELL = 32;
const COLS = Math.ceil(VIEW.width / CELL);
const ROWS = Math.ceil(VIEW.height / CELL);
const REPLAN_SECONDS = 0.5;
const MAX_WIN_SECONDS = 180;

function cellOf(x, y) {
  return {
    col: Math.max(0, Math.min(COLS - 1, Math.floor(x / CELL))),
    row: Math.max(0, Math.min(ROWS - 1, Math.floor(y / CELL))),
  };
}

function cellBlocked(world, col, row) {
  const x = col * CELL + CELL / 2;
  const y = row * CELL + CELL / 2;
  if (x < 26 || x > VIEW.width - 26 || y < 92 || y > VIEW.height - 26) return true;
  for (const rect of world.blockers) {
    if (x > rect.x - 12 && x < rect.x + rect.w + 12 && y > rect.y - 12 && y < rect.y + rect.h + 12) return true;
  }
  return false;
}

function cellCost(world, col, row) {
  const x = col * CELL + CELL / 2;
  const y = row * CELL + CELL / 2;
  let cost = 1;
  for (const guard of world.guards) {
    const dist = Math.hypot(guard.x - x, guard.y - y);
    if (pointInCone(x, y, guard.x, guard.y, guard.angle, 235, 0.61)) cost += 45;
    if (dist < 70) cost += 25;
    if (dist < 40) cost += 60;
  }
  for (const camera of world.cameras) {
    if (camera.disabledTimer > 0) continue;
    if (pointInCone(x, y, camera.x, camera.y, camera.angle, camera.range, 0.5)) cost += 30;
  }
  for (const laser of world.level.lasers) {
    if (x > laser.x - 20 && x < laser.x + laser.w + 20 && y > laser.y - 10 && y < laser.y + laser.h + 10) cost += 80;
  }
  return cost;
}

/** Cheapest grid path (Dijkstra) from the player to (tx, ty). */
function findPath(world, tx, ty) {
  const start = cellOf(world.player.x, world.player.y);
  const goal = cellOf(tx, ty);
  const key = (c, r) => r * COLS + c;
  const dist = new Map([[key(start.col, start.row), 0]]);
  const prev = new Map();
  const open = [key(start.col, start.row)];
  while (open.length > 0) {
    let bestIdx = 0;
    for (let i = 1; i < open.length; i += 1) {
      if ((dist.get(open[i]) ?? Infinity) < (dist.get(open[bestIdx]) ?? Infinity)) bestIdx = i;
    }
    const current = open.splice(bestIdx, 1)[0];
    if (current === key(goal.col, goal.row)) break;
    const col = current % COLS;
    const row = Math.floor(current / COLS);
    const here = dist.get(current) ?? Infinity;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nc = col + dc;
      const nr = row + dr;
      if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
      if (cellBlocked(world, nc, nr)) continue;
      const stepCost = (dc !== 0 && dr !== 0 ? 1.4 : 1) * cellCost(world, nc, nr);
      const nk = key(nc, nr);
      if (here + stepCost < (dist.get(nk) ?? Infinity)) {
        dist.set(nk, here + stepCost);
        prev.set(nk, current);
        if (!open.includes(nk)) open.push(nk);
      }
    }
  }
  // Walk back from the goal to the start.
  const path = [];
  let cursor = key(goal.col, goal.row);
  if (!prev.has(cursor) && cursor !== key(start.col, start.row)) return null;
  while (cursor !== undefined) {
    path.unshift(cursor);
    if (cursor === key(start.col, start.row)) break;
    cursor = prev.get(cursor);
  }
  return path.map((k) => ({
    x: (k % COLS) * CELL + CELL / 2,
    y: Math.floor(k / COLS) * CELL + CELL / 2,
  }));
}

/** An autopilot that plays the current level: diamond, then the exit. */
export function createAutopilot(world) {
  const input = createInput();
  let path = null;
  let pathIndex = 0;
  let replanTimer = 0;
  let targetKind = 'diamond';

  function currentTarget() {
    if (!world.player.hasDiamond) return { x: world.level.diamond.x, y: world.level.diamond.y, kind: 'diamond' };
    return {
      x: world.level.exit.x + world.level.exit.w / 2,
      y: world.level.exit.y + world.level.exit.h / 2,
      kind: 'exit',
    };
  }

  function dangerNear() {
    const p = world.player;
    for (const guard of world.guards) {
      const dist = Math.hypot(guard.x - p.x, guard.y - p.y);
      if (dist < 170) return true;
      if (pointInCone(p.x, p.y, guard.x, guard.y, guard.angle, 235, 0.61)) return true;
      if (guard.detection > 0.25) return true;
    }
    return false;
  }

  return {
    input,
    /** One autopilot tick: steer `input` from the live world. */
    step(dt) {
      replanTimer -= dt;
      const target = currentTarget();
      if (target.kind !== targetKind) {
        targetKind = target.kind;
        path = null;
      }
      if (!path || replanTimer <= 0) {
        path = findPath(world, target.x, target.y);
        pathIndex = 0;
        replanTimer = REPLAN_SECONDS;
      }
      input.up = input.down = input.left = input.right = false;
      input.sneak = dangerNear();
      if (!path || path.length === 0) return;
      while (pathIndex < path.length) {
        const node = path[pathIndex];
        if (Math.hypot(node.x - world.player.x, node.y - world.player.y) < 12) {
          pathIndex += 1;
        } else break;
      }
      if (pathIndex >= path.length) return;
      const node = path[pathIndex];
      const dx = node.x - world.player.x;
      const dy = node.y - world.player.y;
      if (dx > 6) input.right = true;
      if (dx < -6) input.left = true;
      if (dy > 6) input.down = true;
      if (dy < -6) input.up = true;
    },
  };
}

/**
 * Run the autopilot synchronously until level 1 is won (or the time cap).
 * Returns { world, won } with the world left on the level-complete screen.
 */
export function autopilotWinLevel1() {
  let world = createWorld(0);
  let pilot = createAutopilot(world);
  const maxSteps = Math.floor(MAX_WIN_SECONDS / STEP);
  for (let i = 0; i < maxSteps; i += 1) {
    pilot.step(STEP);
    const event = updateWorld(world, pilot.input, STEP);
    if (event === EVENT_LEVEL) return { world, won: true };
    if (event === 'nerve-lost') {
      world = restartLevel(world);
      pilot = createAutopilot(world);
    }
    if (event === 'caught') return { world, won: false };
  }
  return { world, won: false };
}

/** Stage a world into the exact frame a screenshot name asks for. */
export function stageShot(name) {
  if (name === 'title') {
    const world = createWorld(0);
    world.time = 5;
    return { world, screen: 'title' };
  }
  if (name === 'coin') {
    const world = createWorld(0);
    const player = world.player;
    player.x = 300;
    player.y = 350;
    player.coinPing = { x: 520, y: 300, timer: 1.3 };
    const guard = world.guards[0];
    guard.x = 452;
    guard.y = 282;
    guard.angle = Math.atan2(300 - 282, 520 - 452);
    guard.state = 'suspicious';
    guard.target = { x: 520, y: 300 };
    guard.detection = 0.55;
    const guard2 = world.guards[1];
    guard2.x = 800;
    guard2.y = 420;
    guard2.angle = -Math.PI / 2;
    world.time = 8;
    world.alarm = 18;
    world.levelTime = 42;
    return { world, screen: 'play' };
  }
  if (name === 'win') {
    const result = autopilotWinLevel1();
    result.world.player.sneaking = false;
    return { world: result.world, screen: 'level', won: result.won };
  }
  // Default: the cover — level 2 mid-play, all five required elements in
  // one frame: the vault room, guard cones, camera cones, the diamond and
  // the alarm meter, with Rook hiding in a shadow pool by a display case.
  // The four guards stand in the four corners of the floor and aim
  // outward, so no two cone tips land in the same place: each amber wedge
  // reads on its own at thumbnail size instead of merging into one blob.
  const world = createWorld(1);
  world.time = 24;
  world.alarm = 58;
  world.player.x = 786;
  world.player.y = 498;
  world.player.sneaking = true;
  world.player.coins = 2;
  world.player.emp = 1;
  world.player.loot = 1;
  world.lootTaken.add(2);
  const g0 = world.guards[0];
  g0.x = 170; g0.y = 180; g0.angle = 0.8; g0.detection = 0.2;
  const g1 = world.guards[1];
  g1.x = 700; g1.y = 140; g1.angle = 2.35; g1.detection = 0.1;
  const g2 = world.guards[2];
  g2.x = 640; g2.y = 470; g2.angle = 0.25; g2.detection = 0.62;
  g2.state = 'suspicious';
  g2.target = { x: 786, y: 498 };
  const g3 = world.guards[3];
  g3.x = 310; g3.y = 550; g3.angle = -0.9; g3.detection = 0.05;
  // Cameras aim apart too: the top one sweeps down-right across the upper
  // floor, the right-edge one looks left across the middle, so the two
  // cyan cones never stack on each other or on the diamond.
  world.cameras[0].angle = 0.6;
  world.cameras[1].angle = 2.9;
  world.score = 240;
  world.levelTime = 96;
  return { world, screen: 'play' };
}

export { nextLevel };
