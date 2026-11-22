// Drawing: the museum floor, lamps and moonlight, vision cones, the thief,
// the guards, the cameras, the loot and the diamond, the darkness overlay,
// the HUD (alarm meter, nerves, coins, EMP, timer, loot) and every screen
// panel. The renderer reads the world; it never changes it.

import { FLOOR_TOP, HUD_HEIGHT, PALETTE, VIEW } from './config.js';
import { SCREEN_BRIEF, SCREEN_CAUGHT, SCREEN_LEVEL, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, levelLootTotal } from './world.js';

export { SCREEN_TITLE, SCREEN_PLAY, SCREEN_LEVEL };

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFloor(ctx, world) {
  const level = world.level;
  ctx.fillStyle = PALETTE.floorA;
  ctx.fillRect(0, FLOOR_TOP, VIEW.width, VIEW.height - FLOOR_TOP);
  // Subtle checker tiles.
  ctx.fillStyle = PALETTE.floorB;
  const tile = 48;
  for (let ty = FLOOR_TOP; ty < VIEW.height; ty += tile) {
    for (let tx = 0; tx < VIEW.width; tx += tile) {
      const even = ((tx / tile) + (ty / tile)) % 2 === 0;
      if (even) ctx.fillRect(tx, ty, tile, tile);
    }
  }
  // Red carpet runners down the middle of each floor.
  ctx.fillStyle = PALETTE.carpet;
  ctx.fillRect(0, 268, VIEW.width, 64);
  ctx.strokeStyle = PALETTE.carpetEdge;
  ctx.lineWidth = 3;
  ctx.strokeRect(-4, 268, VIEW.width + 8, 64);
  // Moonlight shafts through the skylights.
  ctx.fillStyle = PALETTE.moon;
  ctx.save();
  ctx.translate(480, 120);
  ctx.rotate(0.35);
  ctx.fillRect(-160, -40, 320, 90);
  ctx.restore();
  ctx.save();
  ctx.translate(220, 480);
  ctx.rotate(-0.3);
  ctx.fillRect(-120, -30, 240, 70);
  ctx.restore();
  // Shadow pools: cool dark patches that hide the thief.
  for (const pool of level.shadows) {
    ctx.fillStyle = PALETTE.shadow;
    roundRect(ctx, pool.x, pool.y, pool.w, pool.h, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120, 160, 190, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // Warm lamp pools on the floor.
  for (const lamp of level.lamps) {
    const grad = ctx.createRadialGradient(lamp.x, lamp.y, 8, lamp.x, lamp.y, lamp.r);
    grad.addColorStop(0, PALETTE.lampGlow);
    grad.addColorStop(1, 'rgba(255, 190, 90, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, lamp.r, 0, Math.PI * 2);
    ctx.fill();
    // The lamp itself: a brass wall sconce.
    ctx.fillStyle = '#8a6d2f';
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWallsAndCases(ctx, world) {
  const level = world.level;
  for (const wall of level.walls) {
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(wall.x, wall.y, wall.w, 4);
  }
  for (const c of level.cases) {
    ctx.fillStyle = PALETTE.caseWood;
    roundRect(ctx, c.x, c.y, c.w, c.h, 6);
    ctx.fill();
    ctx.fillStyle = PALETTE.caseGlass;
    roundRect(ctx, c.x + 5, c.y + 5, c.w - 10, c.h - 10, 4);
    ctx.fill();
    ctx.strokeStyle = PALETTE.caseGold;
    ctx.lineWidth = 2;
    roundRect(ctx, c.x + 5, c.y + 5, c.w - 10, c.h - 10, 4);
    ctx.stroke();
    // Glass glint.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(c.x + 12, c.y + c.h - 10);
    ctx.lineTo(c.x + c.w - 22, c.y + 10);
    ctx.stroke();
  }
  // Doors: brass gates, open when their key was taken.
  for (const door of level.doors) {
    const open = world.doorsOpen.has(door.keyId);
    if (open) {
      ctx.fillStyle = 'rgba(201, 162, 39, 0.25)';
      ctx.fillRect(door.x - 3, door.y, door.w + 6, door.h);
      continue;
    }
    ctx.fillStyle = '#7a5c1e';
    ctx.fillRect(door.x, door.y, door.w, door.h);
    ctx.fillStyle = PALETTE.caseGold;
    ctx.fillRect(door.x + 2, door.y + 6, door.w - 4, 4);
    ctx.fillRect(door.x + 2, door.y + door.h - 10, door.w - 4, 4);
    ctx.fillStyle = '#fff2b0';
    ctx.font = 'bold 11px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔒', door.x + door.w / 2, door.y + door.h / 2 + 4);
  }
}

function drawLasers(ctx, world) {
  if (world.level.lasers.length === 0) return;
  for (const laser of world.level.lasers) {
    if (!world.lasersOn) {
      ctx.fillStyle = 'rgba(255, 60, 60, 0.18)';
      ctx.fillRect(laser.x, laser.y, laser.w, laser.h);
      continue;
    }
    const grad = ctx.createLinearGradient(laser.x, laser.y, laser.x, laser.y + laser.h);
    grad.addColorStop(0, 'rgba(255, 40, 40, 0)');
    grad.addColorStop(0.5, 'rgba(255, 40, 40, 0.9)');
    grad.addColorStop(1, 'rgba(255, 40, 40, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(laser.x - 6, laser.y, laser.w + 12, laser.h);
    ctx.fillStyle = '#ff2d2d';
    ctx.fillRect(laser.x, laser.y, laser.w, laser.h);
    ctx.fillStyle = '#fff';
    ctx.fillRect(laser.x + 4, laser.y, 2, laser.h);
  }
}

function drawCone(ctx, x, y, angle, range, halfAngle, fill, edge) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  const grad = ctx.createRadialGradient(x, y, 10, x, y, range);
  grad.addColorStop(0, fill);
  grad.addColorStop(0.65, fill);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle - halfAngle) * range, y + Math.sin(angle - halfAngle) * range);
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle + halfAngle) * range, y + Math.sin(angle + halfAngle) * range);
  ctx.stroke();
}

function drawLootAndDiamond(ctx, world) {
  const level = world.level;
  const pulse = 0.75 + 0.25 * Math.sin(world.time * 3);
  // Loot pieces.
  level.loot.forEach((item, i) => {
    if (world.lootTaken.has(i)) return;
    ctx.save();
    ctx.translate(item.x, item.y);
    if (item.kind === 'painting') {
      ctx.fillStyle = '#3a2a12';
      ctx.fillRect(-26, -18, 52, 36);
      ctx.strokeStyle = PALETTE.caseGold;
      ctx.lineWidth = 3;
      ctx.strokeRect(-26, -18, 52, 36);
      ctx.fillStyle = '#7fb069';
      ctx.fillRect(-20, -12, 40, 24);
      ctx.fillStyle = '#e9c46a';
      ctx.beginPath();
      ctx.arc(-6, -2, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.kind === 'gold') {
      ctx.fillStyle = PALETTE.lootGold;
      ctx.fillRect(-16, -8, 14, 10);
      ctx.fillRect(-2, -8, 14, 10);
      ctx.fillRect(-9, -16, 14, 10);
      ctx.strokeStyle = '#a67c00';
      ctx.lineWidth = 1;
      ctx.strokeRect(-16, -8, 14, 10);
      ctx.strokeRect(-2, -8, 14, 10);
      ctx.strokeRect(-9, -16, 14, 10);
    } else if (item.kind === 'vase') {
      ctx.fillStyle = '#3fae8a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2a7d63';
      ctx.fillRect(-4, -20, 8, 7);
    } else {
      ctx.fillStyle = PALETTE.lootGold;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a67c00';
      ctx.font = 'bold 11px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', 0, 4);
    }
    ctx.restore();
  });
  // Keys.
  level.keys.forEach((key, i) => {
    if (world.keysTaken.has(i)) return;
    ctx.save();
    ctx.translate(key.x, key.y);
    ctx.rotate(Math.sin(world.time * 2) * 0.2);
    ctx.strokeStyle = PALETTE.caseGold;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-6, 0, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(1, 0);
    ctx.lineTo(16, 0);
    ctx.moveTo(12, 0);
    ctx.lineTo(12, 6);
    ctx.moveTo(16, 0);
    ctx.lineTo(16, 6);
    ctx.stroke();
    ctx.restore();
  });
  // The diamond on its pedestal, glowing cyan with a light beam.
  if (!world.player.hasDiamond) {
    const d = level.diamond;
    const beam = ctx.createLinearGradient(d.x, d.y - 150, d.x, d.y);
    beam.addColorStop(0, 'rgba(95, 242, 255, 0)');
    beam.addColorStop(1, 'rgba(95, 242, 255, 0.35)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(d.x - 26, d.y - 150);
    ctx.lineTo(d.x + 26, d.y - 150);
    ctx.lineTo(d.x + 10, d.y);
    ctx.lineTo(d.x - 10, d.y);
    ctx.closePath();
    ctx.fill();
    const glow = ctx.createRadialGradient(d.x, d.y - 22, 4, d.x, d.y - 22, 46 * pulse);
    glow.addColorStop(0, 'rgba(95, 242, 255, 0.85)');
    glow.addColorStop(1, 'rgba(95, 242, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(d.x, d.y - 22, 46 * pulse, 0, Math.PI * 2);
    ctx.fill();
    // Pedestal.
    ctx.fillStyle = '#5a6b76';
    ctx.fillRect(d.x - 16, d.y - 8, 32, 22);
    ctx.fillStyle = '#8fa3ad';
    ctx.fillRect(d.x - 18, d.y - 12, 36, 6);
    // The diamond itself.
    ctx.fillStyle = PALETTE.diamond;
    ctx.beginPath();
    ctx.moveTo(d.x, d.y - 38);
    ctx.lineTo(d.x + 12, d.y - 26);
    ctx.lineTo(d.x, d.y - 12);
    ctx.lineTo(d.x - 12, d.y - 26);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.moveTo(d.x, d.y - 38);
    ctx.lineTo(d.x + 5, d.y - 26);
    ctx.lineTo(d.x, d.y - 22);
    ctx.lineTo(d.x - 5, d.y - 26);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.diamond;
    ctx.font = 'bold 12px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(level.diamond.label.toUpperCase(), d.x, d.y + 38);
  }
  // The exit door: green when the diamond is taken, grey before.
  const exit = level.exit;
  const open = world.player.hasDiamond;
  ctx.fillStyle = open ? PALETTE.exit : PALETTE.exitLocked;
  roundRect(ctx, exit.x, exit.y, exit.w, exit.h, 6);
  ctx.fill();
  if (open) {
    const glow = ctx.createRadialGradient(exit.x + exit.w / 2, exit.y + exit.h / 2, 4, exit.x + exit.w / 2, exit.y + exit.h / 2, 60);
    glow.addColorStop(0, 'rgba(57, 211, 83, 0.5)');
    glow.addColorStop(1, 'rgba(57, 211, 83, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(exit.x + exit.w / 2, exit.y + exit.h / 2, 60, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = open ? '#062b0e' : '#e8e8e8';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'EXIT →' : 'LOCKED', exit.x + exit.w / 2, exit.y + exit.h / 2 + 5);
}

function drawCameras(ctx, world) {
  for (const camera of world.cameras) {
    const disabled = camera.disabledTimer > 0;
    // Cameras read cyan-blue, never amber: a guard cone and a camera cone
    // must be tellable apart at thumbnail size, so the camera cone is a
    // vivid cyan with a hard edge instead of the old pale blue wash.
    const fill = disabled ? 'rgba(120, 130, 140, 0.14)' : camera.spotting ? 'rgba(255, 60, 50, 0.5)' : 'rgba(45, 215, 255, 0.5)';
    const edge = disabled ? 'rgba(120, 130, 140, 0.4)' : camera.spotting ? 'rgba(255, 60, 50, 0.9)' : 'rgba(45, 215, 255, 0.95)';
    drawCone(ctx, camera.x, camera.y, camera.angle, camera.range, 0.5, fill, edge);
    // Mount: a big dome with a bright lens and a barrel nub showing where
    // it looks, ringed in cyan so it never blends into the wall or floor.
    ctx.fillStyle = disabled ? '#5a636b' : '#16303c';
    ctx.beginPath();
    ctx.arc(camera.x, camera.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = disabled ? '#8a939b' : '#2dd7ff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.strokeStyle = disabled ? '#8a939b' : '#2dd7ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(camera.x + Math.cos(camera.angle) * 12, camera.y + Math.sin(camera.angle) * 12);
    ctx.lineTo(camera.x + Math.cos(camera.angle) * 20, camera.y + Math.sin(camera.angle) * 20);
    ctx.stroke();
    ctx.fillStyle = disabled ? '#8a939b' : camera.spotting ? '#ff3b30' : '#a5ecff';
    ctx.beginPath();
    ctx.arc(camera.x, camera.y, 7, 0, Math.PI * 2);
    ctx.fill();
    // "CAM" tag under the mount, on a dark pill so it reads over any cone.
    ctx.fillStyle = 'rgba(4, 12, 18, 0.85)';
    roundRect(ctx, camera.x - 19, camera.y + 22, 38, 16, 8);
    ctx.fill();
    ctx.strokeStyle = disabled ? 'rgba(140, 150, 160, 0.7)' : 'rgba(45, 215, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = disabled ? '#9aa5ad' : '#2dd7ff';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CAM', camera.x, camera.y + 34);
    if (disabled) {
      ctx.fillStyle = '#e8e8e8';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('EMP ' + Math.ceil(camera.disabledTimer) + 's', camera.x, camera.y - 16);
    }
  }
}

function drawGuards(ctx, world) {
  for (const guard of world.guards) {
    const alerted = guard.state === 'alerted';
    const suspicious = guard.state === 'suspicious' || guard.state === 'search';
    const fill = alerted ? 'rgba(255, 70, 60, 0.5)' : suspicious ? 'rgba(255, 220, 130, 0.3)' : 'rgba(255, 196, 90, 0.38)';
    const edge = alerted ? 'rgba(255, 70, 60, 0.8)' : 'rgba(255, 196, 90, 0.7)';
    drawCone(ctx, guard.x, guard.y, guard.angle, 235, 0.61, fill, edge);
    // Body: navy uniform with gold trim and a cap.
    ctx.fillStyle = PALETTE.guard;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.guardTrim;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#1a2440';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y - 4, 9, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#e8dcc0';
    ctx.beginPath();
    ctx.arc(guard.x + Math.cos(guard.angle) * 7, guard.y + Math.sin(guard.angle) * 7, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // Detection arc over the guard's head.
    if (guard.detection > 0.03) {
      ctx.strokeStyle = guard.detection > 0.8 ? '#ff3b30' : '#ffc45a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, 21, -Math.PI / 2, -Math.PI / 2 + guard.detection * Math.PI * 2);
      ctx.stroke();
    }
    // State mark: "?" when suspicious, "!" when alerted.
    if (alerted || suspicious) {
      ctx.fillStyle = alerted ? '#ff3b30' : '#ffd34d';
      ctx.font = 'bold 22px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(alerted ? '!' : '?', guard.x, guard.y - 28);
    }
  }
}

function drawPlayer(ctx, world) {
  const player = world.player;
  // Lantern glow around the thief.
  const glow = ctx.createRadialGradient(player.x, player.y, 6, player.x, player.y, 70);
  glow.addColorStop(0, 'rgba(255, 210, 120, 0.28)');
  glow.addColorStop(1, 'rgba(255, 210, 120, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 70, 0, Math.PI * 2);
  ctx.fill();
  // Body: dark teal with a cap, facing the movement direction.
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.playerDark;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#0d2b27';
  ctx.beginPath();
  ctx.arc(2, 0, 8, -Math.PI / 2 - 0.9, -Math.PI / 2 + 0.9);
  ctx.lineTo(12, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(9, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (player.sneaking) {
    ctx.fillStyle = '#bfe9ff';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('sneaking', player.x, player.y - 20);
  }
  // A coin in flight, with a dotted arc.
  if (player.coin) {
    const c = player.coin;
    const x = c.sx + (c.tx - c.sx) * c.t;
    const y = c.sy + (c.ty - c.sy) * c.t - Math.sin(c.t * Math.PI) * 26;
    ctx.strokeStyle = 'rgba(255, 211, 77, 0.6)';
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(c.sx, c.sy);
    ctx.quadraticCurveTo((c.sx + c.tx) / 2, (c.sy + c.ty) / 2 - 40, c.tx, c.ty);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = PALETTE.lootGold;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  // A landed coin's ping ring.
  if (player.coinPing) {
    const ping = player.coinPing;
    const progress = 1 - ping.timer / 1.6;
    ctx.strokeStyle = `rgba(255, 211, 77, ${0.9 * (1 - progress)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ping.x, ping.y, 12 + progress * 90, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.lootGold;
    ctx.beginPath();
    ctx.arc(ping.x, ping.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PING!', ping.x, ping.y - 16);
  }
}

function drawDarkness(ctx, world) {
  // A dark layer with light holes cut out around lamps and the player.
  const dark = document.createElement('canvas');
  dark.width = VIEW.width;
  dark.height = VIEW.height;
  const dctx = dark.getContext('2d');
  dctx.fillStyle = 'rgba(4, 8, 12, 0.42)';
  dctx.fillRect(0, FLOOR_TOP, VIEW.width, VIEW.height - FLOOR_TOP);
  dctx.globalCompositeOperation = 'destination-out';
  for (const lamp of world.level.lamps) {
    const grad = dctx.createRadialGradient(lamp.x, lamp.y, 10, lamp.x, lamp.y, lamp.r);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    dctx.fillStyle = grad;
    dctx.beginPath();
    dctx.arc(lamp.x, lamp.y, lamp.r, 0, Math.PI * 2);
    dctx.fill();
  }
  const p = world.player;
  const grad = dctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, 150);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  dctx.fillStyle = grad;
  dctx.beginPath();
  dctx.arc(p.x, p.y, 150, 0, Math.PI * 2);
  dctx.fill();
  ctx.drawImage(dark, 0, 0);
}

function drawHud(ctx, world) {
  ctx.fillStyle = PALETTE.hudBg;
  ctx.fillRect(0, 0, VIEW.width, HUD_HEIGHT);
  ctx.fillStyle = '#1c2f3a';
  ctx.fillRect(0, HUD_HEIGHT - 2, VIEW.width, 2);
  ctx.fillStyle = PALETTE.titleGold;
  ctx.font = 'bold 17px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('THE HALCYON HEIST', 14, 24);
  ctx.fillStyle = PALETTE.hudMuted;
  ctx.font = '13px Georgia, serif';
  ctx.fillText(`${world.levelIndex + 1}/3 · ${world.level.name}`, 14, 44);
  // Diamond + loot + coins + EMP.
  ctx.font = '15px Georgia, serif';
  ctx.fillStyle = world.player.hasDiamond ? PALETTE.diamond : '#5a6b76';
  ctx.fillText(world.player.hasDiamond ? '◆ DIAMOND' : '◇ DIAMOND', 268, 24);
  ctx.fillStyle = PALETTE.hudText;
  ctx.fillText(`Loot ${world.player.loot}/${levelLootTotal(world)}`, 268, 44);
  ctx.fillText(`🪙 ${world.player.coins} coins`, 400, 24);
  ctx.fillText(`⚡ EMP ${world.player.emp}`, 400, 44);
  // Nerve hearts.
  ctx.font = '17px Georgia, serif';
  let hearts = '';
  for (let i = 0; i < 3; i += 1) hearts += i < world.nerves ? '♥' : '♡';
  ctx.fillStyle = '#ff6b81';
  ctx.fillText(hearts, 520, 24);
  ctx.fillStyle = PALETTE.hudMuted;
  ctx.font = '13px Georgia, serif';
  ctx.fillText('nerves', 520, 44);
  // Timer + score.
  const mins = Math.floor(world.levelTime / 60);
  const secs = Math.floor(world.levelTime % 60).toString().padStart(2, '0');
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '15px Georgia, serif';
  ctx.fillText(`${mins}:${secs}`, 620, 24);
  ctx.fillText(`Score ${world.score}`, 620, 44);
  // The alarm meter: the most prominent HUD element.
  const alarmX = 720;
  const alarmW = 220;
  const pct = Math.round(world.alarm);
  ctx.fillStyle = PALETTE.hudMuted;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(world.lockdown ? '⚠ LOCKDOWN' : 'ALARM', alarmX, 20);
  ctx.fillStyle = '#1a2b34';
  roundRect(ctx, alarmX, 26, alarmW, 16, 8);
  ctx.fill();
  const alarmColor = world.lockdown ? '#ff2d2d' : world.alarm > 66 ? '#ff5346' : world.alarm > 33 ? '#ffb02e' : '#39d353';
  ctx.fillStyle = alarmColor;
  if (pct > 0) {
    roundRect(ctx, alarmX, 26, Math.max(10, (alarmW * pct) / 100), 16, 8);
    ctx.fill();
  }
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${pct}%`, alarmX + alarmW / 2, 38);
  ctx.textAlign = 'left';
  if (world.lockdown) {
    ctx.fillStyle = '#ff6b5e';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText(`doors sealed ${Math.ceil(world.lockdownTimer)}s`, alarmX, 56);
  } else {
    ctx.fillStyle = PALETTE.hudMuted;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('100% = lockdown', alarmX, 56);
  }
  // Detection eye: the highest guard detection right now.
  const maxDetect = world.guards.reduce((m, g) => Math.max(m, g.detection), 0);
  ctx.fillStyle = maxDetect > 0.8 ? '#ff5346' : PALETTE.hudText;
  ctx.font = '15px Georgia, serif';
  ctx.fillText(`👁 ${Math.round(maxDetect * 100)}%`, 620, 60);
}

function panel(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(4, 9, 13, 0.72)';
  ctx.fillRect(0, FLOOR_TOP, VIEW.width, VIEW.height - FLOOR_TOP);
  const w = 620;
  const h = 120 + lines.length * 30;
  const x = (VIEW.width - w) / 2;
  const y = 150;
  ctx.fillStyle = '#0e1a21';
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = accent || PALETTE.titleGold;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = accent || PALETTE.titleGold;
  ctx.font = 'bold 30px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, VIEW.width / 2, y + 52);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '16px Georgia, serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, VIEW.width / 2, y + 92 + i * 30);
  });
  ctx.fillStyle = PALETTE.hudMuted;
  ctx.font = '14px Georgia, serif';
  ctx.fillText('Press Enter to continue', VIEW.width / 2, y + h - 18);
}

/** Draw the whole game for the current screen. */
export function render(ctx, world, screen) {
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  if (screen === SCREEN_TITLE) {
    drawTitle(ctx, world);
    return;
  }
  drawFloor(ctx, world);
  drawDarkness(ctx, world);
  drawLasers(ctx, world);
  drawLootAndDiamond(ctx, world);
  drawWallsAndCases(ctx, world);
  drawCameras(ctx, world);
  drawGuards(ctx, world);
  drawPlayer(ctx, world);
  drawHud(ctx, world);
  if (screen === SCREEN_BRIEF) {
    panel(ctx, world.level.name, [world.level.brief, 'Grab the diamond, then reach the green EXIT door.'], PALETTE.titleGold);
  } else if (screen === SCREEN_PAUSED) {
    panel(ctx, 'PAUSED', ['The museum waits. The guards do not.', 'P / Esc to resume'], PALETTE.hudMuted);
  } else if (screen === SCREEN_LEVEL) {
    panel(ctx, 'CLEAN GETAWAY!', [
      `${world.level.name} cleared in ${Math.floor(world.levelTime / 60)}:${Math.floor(world.levelTime % 60).toString().padStart(2, '0')}`,
      `Loot ${world.player.loot} · Score ${world.score}`,
      'The next floor is darker. And louder.',
    ], PALETTE.exit);
  } else if (screen === SCREEN_CAUGHT) {
    panel(ctx, 'CAUGHT!', [
      'A guard got a hand on Rook.',
      `Nerves left: ${world.nerves}`,
      'The floor resets. The diamond is still waiting.',
    ], '#ff5346');
  } else if (screen === SCREEN_WIN) {
    panel(ctx, 'THE HALCYON HEIST', [
      'The diamond is yours. The van is waiting.',
      `Final score ${world.score} · Loot ${world.player.loot}`,
      'Rook vanishes into the night. Again.',
    ], PALETTE.diamond);
  } else if (screen === SCREEN_OVER) {
    panel(ctx, 'THE JOB IS BLOWN', [
      'Out of nerves. The museum keeps its diamond.',
      'Press Enter to case the joint again.',
    ], '#ff5346');
  }
}

function drawTitle(ctx, world) {
  // Night skyline over the museum: title screen.
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  grad.addColorStop(0, '#08131c');
  grad.addColorStop(0.6, '#0e2230');
  grad.addColorStop(1, '#12303a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // Stars.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  for (let i = 0; i < 60; i += 1) {
    const sx = (i * 137.5) % VIEW.width;
    const sy = (i * 89.3) % 220;
    ctx.fillRect(sx, sy, 2, 2);
  }
  // The moon.
  ctx.fillStyle = '#f4ecd0';
  ctx.beginPath();
  ctx.arc(800, 110, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e0d4ae';
  ctx.beginPath();
  ctx.arc(786, 100, 9, 0, Math.PI * 2);
  ctx.arc(812, 124, 7, 0, Math.PI * 2);
  ctx.fill();
  // The museum silhouette.
  ctx.fillStyle = '#0d1d27';
  ctx.fillRect(0, 420, VIEW.width, 180);
  ctx.fillStyle = '#1b3240';
  for (let i = 0; i < 8; i += 1) {
    ctx.fillRect(60 + i * 110, 340, 60, 120);
  }
  ctx.fillStyle = '#1d3542';
  ctx.beginPath();
  ctx.moveTo(380, 340);
  ctx.lineTo(480, 250);
  ctx.lineTo(580, 340);
  ctx.closePath();
  ctx.fill();
  // Lit windows.
  ctx.fillStyle = 'rgba(255, 190, 90, 0.85)';
  for (let i = 0; i < 8; i += 1) {
    if (i % 3 !== 0) ctx.fillRect(72 + i * 110, 380, 36, 44);
  }
  // The diamond, big and glowing, centre stage.
  const pulse = 0.8 + 0.2 * Math.sin(world.time * 2.5);
  const glow = ctx.createRadialGradient(480, 210, 6, 480, 210, 90 * pulse);
  glow.addColorStop(0, 'rgba(95, 242, 255, 0.9)');
  glow.addColorStop(1, 'rgba(95, 242, 255, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(480, 210, 90 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.diamond;
  ctx.beginPath();
  ctx.moveTo(480, 150);
  ctx.lineTo(522, 196);
  ctx.lineTo(480, 252);
  ctx.lineTo(438, 196);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.moveTo(480, 150);
  ctx.lineTo(498, 196);
  ctx.lineTo(480, 214);
  ctx.lineTo(462, 196);
  ctx.closePath();
  ctx.fill();
  // Title text.
  ctx.fillStyle = PALETTE.titleGold;
  ctx.font = 'bold 54px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('THE HALCYON HEIST', 480, 330);
  ctx.fillStyle = '#e8dcc0';
  ctx.font = 'italic 19px Georgia, serif';
  ctx.fillText('One thief. One diamond. Three floors of trouble.', 480, 366);
  ctx.fillStyle = PALETTE.hudMuted;
  ctx.font = '16px Georgia, serif';
  ctx.fillText('WASD / arrows — move      Shift — sneak      Click / F — toss a coin', 480, 470);
  ctx.fillText('E — EMP the nearest camera      P — pause', 480, 496);
  ctx.fillStyle = PALETTE.diamond;
  ctx.font = 'bold 18px Georgia, serif';
  ctx.fillText('Press Enter to case the museum', 480, 540);
  // Best time, if the player has one.
  if (world.bestTimes && world.bestTimes[0]) {
    ctx.fillStyle = PALETTE.hudMuted;
    ctx.font = '14px Georgia, serif';
    ctx.fillText(`Best Gallery Wing time: ${world.bestTimes[0]}s`, 480, 566);
  }
}
