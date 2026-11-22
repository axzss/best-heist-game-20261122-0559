// The three floors of the Meridian Museum: walls, display cases, lamps,
// shadow pools, guard patrols, cameras, lasers, keys, doors, loot, the
// Halcyon Diamond and the green exit. Coordinates are canvas pixels;
// the playable floor runs from y=64 (under the HUD) to y=600.

const WALL = (x, y, w, h) => ({ x, y, w, h });
const CASE = (x, y, w, h) => ({ x, y, w, h });

function borderWalls() {
  return [
    WALL(0, 64, 960, 14), // north wall
    WALL(0, 586, 960, 14), // south wall
    WALL(0, 64, 14, 536), // west wall
    WALL(946, 64, 14, 536), // east wall
  ];
}

export const LEVELS = [
  {
    id: 1,
    name: 'The Gallery Wing',
    brief: 'A quiet first floor. Learn the ropes: stay out of the cones, grab the shard, slip out the green door.',
    seed: 101,
    alarmStart: 0,
    spawn: { x: 96, y: 130 },
    diamond: { x: 838, y: 492, label: 'Diamond Shard' },
    exit: { x: 868, y: 92, w: 62, h: 52 },
    walls: [
      ...borderWalls(),
      WALL(210, 210, 180, 16),
      WALL(560, 210, 190, 16),
      WALL(210, 400, 16, 120),
      WALL(700, 400, 16, 120),
    ],
    cases: [
      CASE(300, 300, 120, 46),
      CASE(560, 300, 120, 46),
      CASE(420, 470, 130, 44),
      CASE(120, 300, 60, 110),
    ],
    lamps: [
      { x: 300, y: 170, r: 130 },
      { x: 660, y: 430, r: 130 },
      { x: 840, y: 180, r: 110 },
    ],
    shadows: [
      { x: 130, y: 430, w: 150, h: 90 },
      { x: 620, y: 110, w: 130, h: 70 },
      { x: 430, y: 330, w: 110, h: 60 },
    ],
    guards: [
      { waypoints: [[330, 250], [640, 250], [640, 350], [330, 350]], pause: 1.2 },
      { waypoints: [[800, 220], [800, 470]], pause: 1.6 },
    ],
    cameras: [
      { x: 480, y: 82, baseAngle: Math.PI / 2, sweep: 0.9, range: 250 },
    ],
    loot: [
      { x: 210, y: 520, kind: 'purse', label: 'Coin Purse' },
    ],
    keys: [],
    doors: [],
    lasers: [],
  },
  {
    id: 2,
    name: 'The Vault Floor',
    brief: 'The Halcyon Diamond waits behind a locked vault door. Find the brass key, dodge two cameras and the laser corridor.',
    seed: 202,
    alarmStart: 0,
    spawn: { x: 96, y: 520 },
    diamond: { x: 850, y: 150, label: 'Halcyon Diamond' },
    exit: { x: 868, y: 500, w: 62, h: 52 },
    walls: [
      ...borderWalls(),
      WALL(430, 64, 16, 200),
      WALL(430, 330, 16, 256),
      WALL(446, 250, 120, 16),
      WALL(700, 250, 246, 16),
      WALL(180, 380, 170, 16),
      WALL(620, 420, 170, 16),
    ],
    cases: [
      CASE(120, 200, 130, 46),
      CASE(250, 480, 120, 44),
      CASE(700, 330, 120, 46),
      CASE(560, 480, 110, 44),
    ],
    lamps: [
      { x: 250, y: 150, r: 130 },
      { x: 620, y: 180, r: 120 },
      { x: 820, y: 420, r: 120 },
      { x: 480, y: 520, r: 110 },
    ],
    shadows: [
      { x: 90, y: 280, w: 140, h: 80 },
      { x: 500, y: 100, w: 120, h: 70 },
      { x: 740, y: 470, w: 120, h: 70 },
      { x: 330, y: 440, w: 110, h: 60 },
    ],
    guards: [
      { waypoints: [[220, 300], [380, 300], [380, 520], [220, 520]], pause: 1.0 },
      { waypoints: [[520, 150], [760, 150], [760, 210], [520, 210]], pause: 1.2 },
      { waypoints: [[620, 300], [620, 500], [880, 500], [880, 300]], pause: 0.9 },
      { waypoints: [[500, 330], [500, 540]], pause: 1.4 },
    ],
    cameras: [
      { x: 480, y: 82, baseAngle: Math.PI / 2, sweep: 1.0, range: 260 },
      { x: 930, y: 330, baseAngle: Math.PI, sweep: 0.8, range: 250 },
    ],
    loot: [
      { x: 300, y: 300, kind: 'painting', label: 'Gilt Painting' },
      { x: 700, y: 460, kind: 'gold', label: 'Gold Bars' },
      { x: 520, y: 130, kind: 'vase', label: 'Jade Vase' },
    ],
    keys: [
      { x: 150, y: 130, id: 'brass', label: 'Brass Key' },
    ],
    doors: [
      { x: 430, y: 264, w: 16, h: 66, keyId: 'brass', label: 'Vault Door' },
    ],
    lasers: [
      { x: 596, y: 300, w: 14, h: 190, phase: 0 },
    ],
  },
  {
    id: 3,
    name: 'The Rooftop Getaway',
    brief: 'The alarm is already half-full. Five guards, three cameras, two locked doors — and a van waiting past the green door.',
    seed: 303,
    alarmStart: 50,
    spawn: { x: 96, y: 130 },
    diamond: { x: 850, y: 150, label: 'Halcyon Diamond' },
    exit: { x: 868, y: 500, w: 62, h: 52 },
    walls: [
      ...borderWalls(),
      WALL(200, 200, 16, 220),
      WALL(200, 200, 220, 16),
      WALL(560, 200, 16, 220),
      WALL(560, 420, 220, 16),
      WALL(380, 300, 16, 160),
      WALL(760, 300, 16, 160),
    ],
    cases: [
      CASE(280, 300, 90, 44),
      CASE(620, 300, 90, 44),
      CASE(450, 480, 110, 44),
      CASE(120, 460, 90, 44),
    ],
    lamps: [
      { x: 300, y: 130, r: 120 },
      { x: 660, y: 130, r: 120 },
      { x: 480, y: 330, r: 110 },
      { x: 820, y: 420, r: 110 },
    ],
    shadows: [
      { x: 90, y: 430, w: 130, h: 80 },
      { x: 240, y: 110, w: 120, h: 60 },
      { x: 620, y: 460, w: 130, h: 60 },
      { x: 430, y: 220, w: 110, h: 60 },
    ],
    guards: [
      { waypoints: [[120, 250], [170, 250], [170, 500], [120, 500]], pause: 0.8 },
      { waypoints: [[300, 250], [520, 250], [520, 450], [300, 450]], pause: 1.0 },
      { waypoints: [[640, 250], [880, 250], [880, 450], [640, 450]], pause: 1.0 },
      { waypoints: [[480, 100], [480, 280]], pause: 1.2 },
      { waypoints: [[300, 540], [700, 540]], pause: 0.9 },
    ],
    cameras: [
      { x: 480, y: 82, baseAngle: Math.PI / 2, sweep: 1.1, range: 260 },
      { x: 30, y: 330, baseAngle: 0, sweep: 0.9, range: 250 },
      { x: 930, y: 330, baseAngle: Math.PI, sweep: 0.9, range: 250 },
    ],
    loot: [
      { x: 150, y: 300, kind: 'painting', label: 'Moonlit Portrait' },
      { x: 330, y: 360, kind: 'gold', label: 'Gold Bars' },
      { x: 660, y: 360, kind: 'vase', label: 'Jade Vase' },
      { x: 850, y: 300, kind: 'purse', label: 'Coin Purse' },
      { x: 480, y: 520, kind: 'painting', label: 'Silver Sketch' },
    ],
    keys: [
      { x: 130, y: 520, id: 'iron', label: 'Iron Key' },
      { x: 850, y: 470, id: 'silver', label: 'Silver Key' },
    ],
    doors: [
      { x: 396, y: 300, w: 16, h: 70, keyId: 'iron', label: 'Roof Door' },
      { x: 744, y: 300, w: 16, h: 70, keyId: 'silver', label: 'Stair Door' },
    ],
    lasers: [
      { x: 596, y: 470, w: 14, h: 100, phase: 1.5 },
    ],
  },
];

/** All solid rectangles on a level: walls, cases and still-locked doors. */
export function solidRects(level, openDoorIds) {
  const rects = [...level.walls, ...level.cases];
  for (const door of level.doors) {
    if (!openDoorIds.has(door.keyId)) rects.push(door);
  }
  return rects;
}
