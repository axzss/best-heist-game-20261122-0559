// Tuning numbers and the museum-at-night palette for The Halcyon Heist.
// Every magic number the simulation or the renderer needs lives here so a
// balance pass touches one file and nothing else.

// Canvas and heads-up display.
export const VIEW = { width: 960, height: 600 };
export const HUD_HEIGHT = 64;
export const FLOOR_TOP = HUD_HEIGHT;
export const STEP = 1 / 60;

// Player movement and stealth.
export const PLAYER = {
  radius: 13,
  walkSpeed: 168,
  sneakSpeed: 92,
  sneakDetectScale: 0.6,
  lanternRadius: 150,
};

// Guard senses and speeds.
export const GUARD = {
  radius: 14,
  coneRange: 235,
  coneHalfAngle: 0.61, // ~70 degrees of total vision
  patrolSpeed: 58,
  suspiciousSpeed: 86,
  chaseSpeed: 138,
  searchSpeed: 74,
  returnSpeed: 66,
  catchRadius: 26,
  adjacentSeeRadius: 42,
  // Detection fills 0..1; base fill at point-blank, scaled by distance.
  detectBase: 1.15,
  detectDecay: 0.55,
  lightBright: 1.6,
  lightDark: 0.6,
  shadowScale: 0.25,
};

// Cameras sweep and spot.
export const CAMERA = {
  range: 260,
  halfAngle: 0.5,
  sweepSpeed: 0.55,
  alarmPerSecond: 26,
  empSeconds: 8,
};

// The global alarm meter and lockdown.
export const ALARM = {
  alertedPerSecond: 9,
  decayPerSecond: 2.2,
  lockdownSeconds: 10,
  lockdownReset: 50,
  lockdownGuardBoost: 1.25,
};

// Coins and EMP charges.
export const COIN = { start: 3, pingRadius: 230, flightSeconds: 0.45 };
export const EMP = { start: 2, range: 280 };

// Smoke pellets: 1 per level, thrown 4 tiles ahead in the facing direction.
// The cloud (3-tile radius, 4.0 s = 240 fixed ticks) blocks guard and camera
// sight; the throw's hiss draws nearby guards to investigate the cloud.
export const SMOKE = {
  start: 1,
  rangePx: 128, // 4 tiles of 32 px
  radiusPx: 96, // 3 tiles
  durationTicks: 240, // 4.0 s at 60 Hz
  flightSpeed: 320, // px per second, fixed-step flight
  hearRadius: 192, // ~6 tiles: guards inside this hear the throw land
};

// Lasers on the vault floor and the rooftop.
export const LASER = { cycleSeconds: 4, onSeconds: 2.4, alarmHit: 22 };

// Colours: deep teal-charcoal museum, warm amber lamps, cyan loot.
export const PALETTE = {
  floorA: '#16242b',
  floorB: '#101c22',
  carpet: '#5e1f24',
  carpetEdge: '#8a6d2f',
  wall: '#2c3e46',
  wallTop: '#42586a',
  caseWood: '#6b4a2a',
  caseGlass: 'rgba(180, 220, 235, 0.20)',
  caseGold: '#c9a227',
  lampGlow: 'rgba(255, 190, 90, 0.55)',
  shadow: 'rgba(6, 12, 18, 0.55)',
  moon: 'rgba(150, 200, 255, 0.10)',
  player: '#2e8f83',
  playerDark: '#14524b',
  guard: '#26355e',
  guardTrim: '#c9a227',
  cone: 'rgba(255, 196, 90, 0.42)',
  coneEdge: 'rgba(255, 196, 90, 0.7)',
  coneAlert: 'rgba(255, 70, 60, 0.5)',
  coneSuspicious: 'rgba(255, 220, 130, 0.3)',
  cameraCone: 'rgba(140, 200, 255, 0.36)',
  cameraConeOff: 'rgba(120, 130, 140, 0.14)',
  diamond: '#5ff2ff',
  lootGold: '#ffd34d',
  exit: '#39d353',
  exitLocked: '#7a8a7a',
  alarm: '#ff5346',
  alarmCalm: '#39d353',
  hudBg: '#0a1218',
  hudText: '#e8dcc0',
  hudMuted: '#8fa8b5',
  titleGold: '#e8c15a',
};
