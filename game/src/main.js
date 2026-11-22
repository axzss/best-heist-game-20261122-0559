// Boot and the fixed-step loop for The Halcyon Heist. Owns the screens
// (title → brief → play → paused → level-complete → win / game-over), the
// ?shot= screenshot scenes, persistence of best times, and the audio hooks.
// The simulation itself lives in world.js; the drawing in render.js.

import { STEP, VIEW } from './config.js';
import { bindInput } from './input.js';
import { ensureAudio, playAlarmSting, playCaught, playCoinPing, playDiamond, playEmpZap, playLockdown, playPickup, playSmoke, playStep, playSuspicious, playWin, startDrone } from './audio.js';
import { createWorld, nextLevel, restartLevel, updateWorld, EVENT_CAUGHT, EVENT_GAME, EVENT_LEVEL, SCREEN_BRIEF, SCREEN_CAUGHT, SCREEN_LEVEL, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './world.js';
import { render } from './render.js';
import { stageShot } from './shots.js';

const BEST_KEY = 'halcyon-heist-best-times';

function loadBestTimes() {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function saveBestTimes(bestTimes) {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(bestTimes));
  } catch {
    // Private mode or no storage: best times are a nicety, not the game.
  }
}

function handleEvents(world, screen) {
  for (const event of world.events) {
    if (event.type === 'suspicious') playSuspicious();
    if (event.type === 'alerted' || event.type === 'camera-spot') playAlarmSting();
    if (event.type === 'lockdown') playLockdown();
    if (event.type === 'coin-ping') playCoinPing();
    if (event.type === 'smoke') playSmoke();
    if (event.type === 'emp') playEmpZap();
    if (event.type === 'pickup') playPickup();
    if (event.type === 'diamond') playDiamond();
  }
  return screen;
}

function main() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const input = bindInput(canvas);
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');

  // --- screenshot scenes: stage the frame, render it once, stop -------
  if (shot) {
    const staged = stageShot(shot);
    const shotWorld = staged.world;
    shotWorld.bestTimes = loadBestTimes();
    render(ctx, shotWorld, staged.screen);
    window.__heistShot = { shot, won: staged.won ?? null, screen: staged.screen };
    document.title = `The Halcyon Heist — shot ${shot}`;
    return;
  }

  // --- the playable game ----------------------------------------------
  let world = createWorld(0);
  world.bestTimes = loadBestTimes();
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  let stepSoundTimer = 0;

  function advanceToLevelComplete(completedWorld) {
    const best = { ...completedWorld.bestTimes };
    const idx = completedWorld.levelIndex;
    if (!best[idx] || completedWorld.levelTime < best[idx]) {
      best[idx] = Math.round(completedWorld.levelTime * 10) / 10;
    }
    saveBestTimes(best);
    return { best, screen: SCREEN_LEVEL };
  }

  function tick(now) {
    requestAnimationFrame(tick);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;

    if (input.pauseQueued) {
      input.pauseQueued = false;
      if (screen === SCREEN_PLAY) screen = SCREEN_PAUSED;
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
    }

    if (screen === SCREEN_TITLE) {
      world.time += dt;
      if (input.confirmQueued) {
        input.confirmQueued = false;
        ensureAudio();
        startDrone();
        screen = SCREEN_BRIEF;
      }
    } else if (screen === SCREEN_BRIEF) {
      if (input.confirmQueued) {
        input.confirmQueued = false;
        screen = SCREEN_PLAY;
      }
    } else if (screen === SCREEN_PLAY) {
      accumulator += dt;
      while (accumulator >= STEP) {
        accumulator -= STEP;
        const event = updateWorld(world, input, STEP);
        handleEvents(world, screen);
        if (world.player.moving) {
          stepSoundTimer -= STEP;
          if (stepSoundTimer <= 0) {
            playStep(world.player.sneaking);
            stepSoundTimer = world.player.sneaking ? 0.55 : 0.34;
          }
        }
        if (event === EVENT_LEVEL) {
          playWin();
          const done = advanceToLevelComplete(world);
          world.bestTimes = done.best;
          screen = SCREEN_LEVEL;
          break;
        }
        if (event === EVENT_GAME) {
          playWin();
          const done = advanceToLevelComplete(world);
          world.bestTimes = done.best;
          screen = SCREEN_WIN;
          break;
        }
        if (event === 'nerve-lost') {
          playCaught();
          world = restartLevel(world);
          world.bestTimes = loadBestTimes();
          screen = SCREEN_CAUGHT;
          break;
        }
        if (event === EVENT_CAUGHT) {
          playCaught();
          screen = SCREEN_OVER;
          break;
        }
      }
    } else if (screen === SCREEN_LEVEL || screen === SCREEN_CAUGHT) {
      if (input.confirmQueued) {
        input.confirmQueued = false;
        if (screen === SCREEN_LEVEL) {
          // Advance from the completed level to the next floor's brief.
          world = nextLevel(world);
          world.bestTimes = loadBestTimes();
          screen = SCREEN_BRIEF;
        } else {
          // After a caught nerve the world was already restarted; just play.
          screen = SCREEN_PLAY;
        }
      }
    } else if (screen === SCREEN_WIN || screen === SCREEN_OVER) {
      if (input.confirmQueued) {
        input.confirmQueued = false;
        world = createWorld(0);
        world.bestTimes = loadBestTimes();
        screen = SCREEN_TITLE;
      }
    }
    input.confirmQueued = false;
    render(ctx, world, screen);
  }

  requestAnimationFrame(tick);
  // Expose the live state for play-testing and debugging.
  window.__heist = {
    get world() { return world; },
    get screen() { return screen; },
  };
}

main();
