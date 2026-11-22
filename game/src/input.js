// Keyboard and mouse input for the heist: movement keys, sneak, the coin
// throw (click or F), the EMP key (E) and pause (P / Escape). The game reads
// a plain snapshot each tick; the DOM event wiring stays in this file.

const MOVE_KEYS = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
};

/** Fresh, empty input state. */
export function createInput() {
  return {
    up: false, down: false, left: false, right: false,
    sneak: false,
    // Edge-triggered actions, consumed by the world each tick.
    coinQueued: null, // {x, y} in canvas pixels, or null
    empQueued: false,
    pauseQueued: false,
    confirmQueued: false,
    mouse: { x: 0, y: 0 },
  };
}

/** Wire keyboard and mouse listeners onto the canvas. Returns the state. */
export function bindInput(canvas) {
  const input = createInput();

  window.addEventListener('keydown', (event) => {
    const dir = MOVE_KEYS[event.code];
    if (dir) {
      input[dir] = true;
      event.preventDefault();
    }
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') input.sneak = true;
    if (event.code === 'KeyF' && !event.repeat) {
      input.coinQueued = { x: input.mouse.x, y: input.mouse.y };
    }
    if (event.code === 'KeyE' && !event.repeat) input.empQueued = true;
    if ((event.code === 'KeyP' || event.code === 'Escape') && !event.repeat) {
      input.pauseQueued = true;
    }
    if ((event.code === 'Enter' || event.code === 'Space') && !event.repeat) {
      input.confirmQueued = true;
      event.preventDefault();
    }
  });

  window.addEventListener('keyup', (event) => {
    const dir = MOVE_KEYS[event.code];
    if (dir) input[dir] = false;
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') input.sneak = false;
  });

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouse.x = (event.clientX - rect.left) * (canvas.width / rect.width);
    input.mouse.y = (event.clientY - rect.top) * (canvas.height / rect.height);
  });

  canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);
    input.mouse.x = x;
    input.mouse.y = y;
    if (event.button === 0) input.coinQueued = { x, y };
  });

  // Keep focus on the page so arrow keys never scroll it.
  window.addEventListener('blur', () => {
    input.up = input.down = input.left = input.right = false;
    input.sneak = false;
  });

  return input;
}

/** Normalised movement vector from the held keys, or null when idle. */
export function moveVector(input) {
  let x = 0;
  let y = 0;
  if (input.left) x -= 1;
  if (input.right) x += 1;
  if (input.up) y -= 1;
  if (input.down) y += 1;
  if (x === 0 && y === 0) return null;
  const len = Math.hypot(x, y);
  return { x: x / len, y: y / len };
}
