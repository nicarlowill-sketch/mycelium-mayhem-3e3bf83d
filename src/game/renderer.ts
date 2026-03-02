import { GameData, Enemy, Player, WeaponType } from './types';

export function render(ctx: CanvasRenderingContext2D, g: GameData) {
  ctx.save();
  ctx.translate(g.screenShake.x, g.screenShake.y);

  // Clear
  ctx.fillStyle = '#0d0d14';
  ctx.fillRect(0, 0, g.width, g.height);

  if (g.state === 'start') {
    renderStartScreen(ctx, g);
    ctx.restore();
    return;
  }

  if (g.state === 'gameOver') {
    renderGameOver(ctx, g);
    ctx.restore();
    return;
  }

  // Camera transform
  ctx.save();
  ctx.translate(-g.camera.x, -g.camera.y);

  // Draw arena
  renderArena(ctx, g);

  // Fog patches (atmosphere)
  for (const f of g.fogPatches) {
    const grad = ctx.createRadialGradient(f.pos.x, f.pos.y, 0, f.pos.x, f.pos.y, f.radius);
    grad.addColorStop(0, 'rgba(40,0,80,0.06)');
    grad.addColorStop(1, 'rgba(40,0,80,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(f.pos.x - f.radius, f.pos.y - f.radius, f.radius * 2, f.radius * 2);
  }

  // Spores
  for (const s of g.spores) {
    ctx.globalAlpha = s.opacity;
    ctx.fillStyle = '#ffffee';
    ctx.fillRect(Math.floor(s.pos.x), Math.floor(s.pos.y), s.size, s.size);
  }
  ctx.globalAlpha = 1;

  // Fog zones (enemy-created)
  for (const fz of g.fogZones) {
    const alpha = Math.min(0.3, (fz.life / fz.maxLife) * 0.3);
    const grad = ctx.createRadialGradient(fz.pos.x, fz.pos.y, 0, fz.pos.x, fz.pos.y, fz.radius);
    grad.addColorStop(0, `rgba(10,10,30,${alpha})`);
    grad.addColorStop(0.7, `rgba(10,10,30,${alpha * 0.5})`);
    grad.addColorStop(1, 'rgba(10,10,30,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(fz.pos.x - fz.radius, fz.pos.y - fz.radius, fz.radius * 2, fz.radius * 2);
  }

  // Toxic puddles
  for (const tp of g.toxicPuddles) {
    const alpha = tp.life / 90;
    ctx.globalAlpha = alpha * 0.4;
    ctx.fillStyle = '#44ff44';
    ctx.beginPath();
    ctx.arc(tp.pos.x, tp.pos.y, tp.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Obstacles
  for (const obs of g.obstacles) {
    drawObstacle(ctx, obs);
  }

  // Particles (behind entities)
  for (const pt of g.particles) {
    const alpha = pt.life / pt.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = pt.color;
    ctx.fillRect(Math.floor(pt.pos.x - pt.size / 2), Math.floor(pt.pos.y - pt.size / 2), pt.size, pt.size);
  }
  ctx.globalAlpha = 1;

  // Gem pickup
  if (g.gemPickup && !g.gemPickup.collected) {
    drawGemPickup(ctx, g.gemPickup.pos.x, g.gemPickup.pos.y, g.gemPickup.pulse, g.gemPickup.gemType);
  }

  // Projectiles
  for (const proj of g.projectiles) {
    drawProjectile(ctx, proj);
  }

  // Enemies
  for (const e of g.enemies) {
    if (e.spawnFlash > 0) {
      ctx.globalAlpha = (e.spawnFlash / 20) * 0.8;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(Math.floor(e.pos.x), Math.floor(e.pos.y), 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    drawEnemy(ctx, e);
  }

  // Player
  const p = g.player;
  if (p.alive) {
    const visible = p.invincibleTimer <= 0 || Math.floor(p.invincibleTimer / 3) % 2 === 0;
    if (visible) {
      drawPlayer(ctx, p);
    }
  }

  ctx.restore(); // End camera transform

  // HUD (screen space)
  renderHUD(ctx, g);

  // Wave announce text
  if (g.waveAnnounceTimer > 0) {
    const alpha = Math.min(1, g.waveAnnounceTimer / 30);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g.waveAnnounceText.includes('HERALD') ? '#ff3333' : '#ffd700';
    ctx.font = '900 48px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 25;
    ctx.fillText(g.waveAnnounceText, g.width / 2, g.height / 2);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  // Wave clear
  if (g.state === 'waveClear') {
    const alpha = Math.min(1, g.waveClearTimer / 30);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffd700';
    ctx.font = '900 48px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 25;
    ctx.fillText(`WAVE ${g.wave} — SURVIVED`, g.width / 2, g.height / 2 - 30);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  // Boss intro
  if (g.state === 'bossIntro') {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, g.width, g.height);
  }

  // Gem notification
  if (g.gemNotifyTimer > 0) {
    const alpha = Math.min(1, g.gemNotifyTimer / 30);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffd700';
    ctx.font = '900 36px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 20;
    ctx.fillText(g.gemNotifyText, g.width / 2, g.height / 2 + 60);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  // Low HP vignette
  if (g.player.hp <= 2 && g.player.alive) {
    const pulse = Math.sin(g.lowHpPulse) * 0.15 + 0.15;
    const grad = ctx.createRadialGradient(g.width / 2, g.height / 2, g.width * 0.3, g.width / 2, g.height / 2, g.width * 0.7);
    grad.addColorStop(0, 'rgba(255,0,0,0)');
    grad.addColorStop(1, `rgba(255,0,0,${pulse})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, g.width, g.height);
  }

  // Screen edge vignette
  const vigGrad = ctx.createRadialGradient(g.width / 2, g.height / 2, g.width * 0.35, g.width / 2, g.height / 2, g.width * 0.7);
  vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
  vigGrad.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, g.width, g.height);

  ctx.restore();
}

function renderArena(ctx: CanvasRenderingContext2D, g: GameData) {
  // Floor tiles
  ctx.fillStyle = '#141420';
  ctx.fillRect(0, 0, g.arenaWidth, g.arenaHeight);

  // Corridors (darker areas)
  ctx.fillStyle = '#0d0d18';
  ctx.fillRect(0, 0, g.arenaWidth, 150); // North
  ctx.fillRect(0, g.arenaHeight - 150, g.arenaWidth, 150); // South

  // Grid lines
  ctx.strokeStyle = '#111120';
  ctx.lineWidth = 1;
  const gridSize = 32;
  for (let x = 0; x < g.arenaWidth; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, g.arenaHeight); ctx.stroke();
  }
  for (let y = 0; y < g.arenaHeight; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(g.arenaWidth, y); ctx.stroke();
  }

  // Floor details (decorative cracks)
  ctx.strokeStyle = 'rgba(30,30,50,0.3)';
  ctx.lineWidth = 1;
  const crackPositions = [[150, 300], [500, 500], [900, 250], [700, 650], [300, 600]];
  for (const [cx, cy] of crackPositions) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + 15, cy + 8);
    ctx.lineTo(cx + 25, cy + 3);
    ctx.stroke();
  }

  // Border
  const bw = g.borderSize;
  ctx.strokeStyle = '#3a0066';
  ctx.lineWidth = bw;
  ctx.shadowColor = '#9b30ff';
  ctx.shadowBlur = 15;
  ctx.strokeRect(bw / 2, bw / 2, g.arenaWidth - bw, g.arenaHeight - bw);
  ctx.shadowBlur = 0;

  // Corner pillars
  const corners: [number, number][] = [
    [bw, bw], [g.arenaWidth - bw - 8, bw],
    [bw, g.arenaHeight - bw - 8], [g.arenaWidth - bw - 8, g.arenaHeight - bw - 8],
  ];
  for (const [x, y] of corners) {
    ctx.fillStyle = '#1a1a28';
    ctx.fillRect(x, y, 8, 8);
    ctx.fillStyle = '#252540';
    ctx.fillRect(x + 1, y + 1, 6, 2);
    ctx.fillRect(x + 1, y + 5, 6, 2);
  }
}

function drawObstacle(ctx: CanvasRenderingContext2D, obs: import('./types').Obstacle) {
  const { pos, width, height, type } = obs;
  if (type === 'pillar') {
    ctx.fillStyle = '#1a1a28';
    ctx.fillRect(pos.x, pos.y, width, height);
    ctx.fillStyle = '#252540';
    ctx.fillRect(pos.x + 2, pos.y + 2, width - 4, 4);
    ctx.fillRect(pos.x + 2, pos.y + height - 6, width - 4, 4);
    // Purple moss glow at base
    ctx.fillStyle = 'rgba(100,0,200,0.15)';
    ctx.fillRect(pos.x - 2, pos.y + height - 2, width + 4, 4);
    ctx.shadowColor = '#6600bb';
    ctx.shadowBlur = 6;
    ctx.fillRect(pos.x, pos.y + height - 1, width, 2);
    ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = '#1a1a28';
    ctx.fillRect(pos.x, pos.y, width, height);
    ctx.fillStyle = '#252540';
    ctx.fillRect(pos.x + 2, pos.y + 2, width - 4, Math.max(height - 4, 2));
  }
}

function drawProjectile(ctx: CanvasRenderingContext2D, proj: import('./types').Projectile) {
  const px = Math.floor(proj.pos.x);
  const py = Math.floor(proj.pos.y);

  const config: Record<string, { color: string; glow: string; size: number }> = {
    shadow: { color: '#9b30ff', glow: '#9b30ff', size: 4 },
    fire: { color: '#ff5500', glow: '#ffaa00', size: 5 },
    frost: { color: '#88ddff', glow: '#88ddff', size: 4 },
    storm: { color: '#ffdd00', glow: '#ffdd00', size: 4 },
    venom: { color: '#44ff44', glow: '#44ff44', size: 4 },
    enemy: { color: '#00ff44', glow: '#00ff44', size: 3.5 },
  };

  const c = config[proj.type] || config.enemy;
  ctx.fillStyle = c.color;
  ctx.shadowColor = c.glow;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(px, py, c.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy) {
  if (e.type === 'rusher') drawRusher(ctx, e);
  else if (e.type === 'sniper') drawSniper(ctx, e);
  else if (e.type === 'titan') drawTitan(ctx, e);
  else if (e.type === 'fogWeaver') drawFogWeaver(ctx, e);
  else if (e.type === 'boss') drawBoss(ctx, e);
}

function drawRusher(ctx: CanvasRenderingContext2D, e: Enemy) {
  const wobbleOffset = Math.sin(e.wobblePhase) * 2;
  const px = Math.floor(e.pos.x);
  const py = Math.floor(e.pos.y + wobbleOffset);
  if (e.flashTimer > 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(px - 8, py - 8, 16, 16); return; }
  // Poison tint
  if (e.poison) { ctx.globalAlpha = 0.8; }
  // Slow ice crystal
  if (e.slow) {
    ctx.fillStyle = '#88ddff';
    ctx.globalAlpha = 0.4;
    ctx.fillRect(px - 3, py - 12, 6, 4);
    ctx.globalAlpha = 1;
  }
  const legOffset = Math.sin(e.animFrame * Math.PI / 2) * 2;
  ctx.fillStyle = '#5c3d2e';
  ctx.fillRect(px - 4, py + 4, 3, 4 + legOffset);
  ctx.fillRect(px + 1, py + 4, 3, 4 - legOffset);
  ctx.fillStyle = '#5c3d2e';
  ctx.fillRect(px - 3, py, 6, 6);
  ctx.fillStyle = e.poison ? '#558b25' : '#8b2500';
  ctx.fillRect(px - 8, py - 8, 16, 10);
  ctx.fillStyle = e.poison ? '#66aa33' : '#aa3300';
  ctx.fillRect(px - 6, py - 8, 12, 3);
  ctx.fillStyle = '#cc5533';
  ctx.fillRect(px - 5, py - 6, 2, 2);
  ctx.fillRect(px + 3, py - 5, 2, 2);
  ctx.fillStyle = '#ff3333';
  ctx.shadowColor = '#ff3333';
  ctx.shadowBlur = 4;
  ctx.fillRect(px - 4, py - 1, 3, 3);
  ctx.fillRect(px + 1, py - 1, 3, 3);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function drawSniper(ctx: CanvasRenderingContext2D, e: Enemy) {
  const px = Math.floor(e.pos.x);
  const py = Math.floor(e.pos.y);
  const bob = Math.sin(e.wobblePhase * 0.7) * 1.5;
  if (e.flashTimer > 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(px - 9, py - 9, 18, 18); return; }
  if (e.poison) ctx.globalAlpha = 0.8;
  if (e.slow) { ctx.fillStyle = '#88ddff'; ctx.globalAlpha = 0.4; ctx.fillRect(px - 3, py - 14, 6, 4); ctx.globalAlpha = 1; }
  ctx.fillStyle = '#3d2e5c';
  ctx.fillRect(px - 3, py + 2, 6, 8);
  ctx.fillStyle = '#2a0055';
  ctx.fillRect(px - 9, py - 10 + bob, 18, 14);
  ctx.fillStyle = '#3a0077';
  ctx.fillRect(px - 7, py - 10 + bob, 14, 4);
  ctx.fillStyle = '#00ff44';
  ctx.shadowColor = '#00ff44';
  ctx.shadowBlur = 5;
  ctx.fillRect(px - 4, py - 1, 3, 3);
  ctx.fillRect(px + 1, py - 1, 3, 3);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#004400';
  ctx.fillRect(px - 2, py + 6, 4, 3);
  ctx.globalAlpha = 1;
}

function drawTitan(ctx: CanvasRenderingContext2D, e: Enemy) {
  const px = Math.floor(e.pos.x);
  const py = Math.floor(e.pos.y);
  const lurch = Math.sin(e.wobblePhase * 0.3) * 1;
  if (e.flashTimer > 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(px - 14, py - 14, 28, 28); return; }
  if (e.poison) ctx.globalAlpha = 0.8;

  // Thick body
  ctx.fillStyle = '#2a1a0a';
  ctx.fillRect(px - 8, py + 2, 16, 12);
  // Legs
  const legOff = Math.sin(e.animFrame * Math.PI / 2) * 1.5;
  ctx.fillStyle = '#1a0f05';
  ctx.fillRect(px - 7, py + 12, 5, 5 + legOff);
  ctx.fillRect(px + 2, py + 12, 5, 5 - legOff);

  // Cap - layered segments
  ctx.fillStyle = '#1a0f05';
  ctx.fillRect(px - 14, py - 14 + lurch, 28, 18);
  ctx.fillStyle = '#2a1a0a';
  ctx.fillRect(px - 12, py - 14 + lurch, 24, 5);
  ctx.fillStyle = '#332200';
  ctx.fillRect(px - 10, py - 10 + lurch, 20, 4);

  // Orange eyes
  ctx.fillStyle = '#ff6600';
  ctx.shadowColor = '#ff6600';
  ctx.shadowBlur = 6;
  ctx.fillRect(px - 5, py - 2, 4, 4);
  ctx.fillRect(px + 1, py - 2, 4, 4);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function drawFogWeaver(ctx: CanvasRenderingContext2D, e: Enemy) {
  const px = Math.floor(e.pos.x);
  const py = Math.floor(e.pos.y);
  const drift = Math.sin(e.wobblePhase * 0.5) * 2;
  if (e.flashTimer > 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(px - 8, py - 8, 16, 16); return; }

  ctx.globalAlpha = 0.7;
  // Tendrils
  ctx.fillStyle = '#334444';
  ctx.fillRect(px - 2, py + 6, 1, 6 + drift);
  ctx.fillRect(px + 1, py + 6, 1, 5 - drift);
  ctx.fillRect(px - 4, py + 5, 1, 4);
  ctx.fillRect(px + 3, py + 5, 1, 4);

  // Body
  ctx.fillStyle = '#2a3a3a';
  ctx.fillRect(px - 4, py - 2, 8, 8);

  // Cap
  ctx.fillStyle = '#1a3030';
  ctx.fillRect(px - 8, py - 8 + drift, 16, 8);
  ctx.fillStyle = '#2a4040';
  ctx.fillRect(px - 6, py - 8 + drift, 12, 3);

  // White ghostly eyes
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#aaffff';
  ctx.shadowBlur = 4;
  ctx.fillRect(px - 3, py - 1, 2, 2);
  ctx.fillRect(px + 1, py - 1, 2, 2);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function drawBoss(ctx: CanvasRenderingContext2D, e: Enemy) {
  const px = Math.floor(e.pos.x);
  const py = Math.floor(e.pos.y);
  const lurch = Math.sin(e.wobblePhase * 0.4) * 2;
  if (e.flashTimer > 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(px - 18, py - 18, 36, 36); return; }

  const isEnraged = e.bossPhase === 3;

  // Spore cape
  ctx.fillStyle = '#1a0033';
  ctx.fillRect(px - 12, py + 4, 4, 14 + lurch);
  ctx.fillRect(px + 8, py + 4, 4, 14 + lurch);

  // Body
  ctx.fillStyle = '#0d0018';
  ctx.fillRect(px - 10, py - 4, 20, 16);
  ctx.fillStyle = '#1a0033';
  ctx.fillRect(px - 10, py - 4, 1, 16);
  ctx.fillRect(px + 9, py - 4, 1, 16);

  // Cap with gold accents
  const capColor = isEnraged ? '#550000' : '#2a0055';
  ctx.fillStyle = capColor;
  ctx.fillRect(px - 18, py - 18 + lurch, 36, 16);
  ctx.fillStyle = isEnraged ? '#880000' : '#3a0077';
  ctx.fillRect(px - 16, py - 18 + lurch, 32, 5);

  // Gold accents
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(px - 14, py - 14 + lurch, 2, 8);
  ctx.fillRect(px + 12, py - 14 + lurch, 2, 8);
  // Crown spores
  ctx.fillRect(px - 8, py - 20 + lurch, 2, 4);
  ctx.fillRect(px - 2, py - 22 + lurch, 2, 6);
  ctx.fillRect(px + 4, py - 21 + lurch, 2, 5);
  ctx.fillRect(px + 8, py - 20 + lurch, 2, 4);

  // Eyes
  const eyeColor = isEnraged ? '#ff0000' : '#ff3333';
  ctx.fillStyle = eyeColor;
  ctx.shadowColor = eyeColor;
  ctx.shadowBlur = isEnraged ? 10 : 6;
  ctx.fillRect(px - 6, py - 2, 4, 4);
  ctx.fillRect(px + 2, py - 2, 4, 4);
  ctx.shadowBlur = 0;
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: Player) {
  ctx.save();
  ctx.translate(Math.floor(p.pos.x), Math.floor(p.pos.y));
  ctx.rotate(p.angle);

  if (p.flashTimer > 0) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-10, -10, 20, 20);
    ctx.restore();
    return;
  }
  if (p.purpleFlashTimer > 0 && p.purpleFlashTimer > 8) {
    ctx.fillStyle = '#9944ff';
    ctx.shadowColor = '#9944ff';
    ctx.shadowBlur = 8;
    ctx.fillRect(-10, -10, 20, 20);
    ctx.shadowBlur = 0;
    ctx.restore();
    return;
  }

  const breathOffset = p.animState === 'idle' ? Math.sin(p.animFrame * (Math.PI * 2 / 3)) * 0.5 : 0;
  const capeShift = p.animState === 'walk' ? Math.sin(p.animFrame * Math.PI / 2) * 2 : Math.sin(p.animFrame * Math.PI * 2 / 3) * 0.5;

  // Cape
  ctx.fillStyle = '#0a0a28';
  ctx.fillRect(-9, -2, 4, 12 + capeShift);
  ctx.fillRect(-7, 8 + capeShift, 3, 3);

  // Body armor
  ctx.fillStyle = '#0d0d18';
  ctx.fillRect(-7, -7 + breathOffset, 14, 14);
  ctx.fillStyle = '#2e2e50';
  ctx.fillRect(-7, -7 + breathOffset, 1, 14);
  ctx.fillRect(6, -7 + breathOffset, 1, 14);
  ctx.fillRect(-7, -7 + breathOffset, 14, 1);
  ctx.fillRect(-7, 6 + breathOffset, 14, 1);

  // Helmet
  ctx.fillStyle = '#1a1a2a';
  ctx.fillRect(-5, -10 + breathOffset, 10, 6);
  ctx.fillStyle = '#252535';
  ctx.fillRect(-5, -12 + breathOffset, 2, 3);
  ctx.fillRect(-1, -13 + breathOffset, 2, 4);
  ctx.fillRect(3, -12 + breathOffset, 2, 3);

  // Eyes
  ctx.fillStyle = '#9944ff';
  ctx.shadowColor = '#9944ff';
  ctx.shadowBlur = 6;
  ctx.fillRect(3, -7 + breathOffset, 3, 2);
  ctx.fillRect(3, -4 + breathOffset, 3, 2);
  ctx.shadowBlur = 0;

  // Sash
  ctx.fillStyle = '#880000';
  ctx.fillRect(-6, 1 + breathOffset, 12, 2);

  // Bracer
  const bracerExtend = p.animState === 'attack' ? 4 : 0;
  const bracerColors: Record<WeaponType, string> = {
    shadow: '#6600bb', fire: '#ff5500', frost: '#4499dd', storm: '#ddaa00', venom: '#33cc33',
  };
  ctx.fillStyle = bracerColors[p.activeWeapon];
  ctx.shadowColor = bracerColors[p.activeWeapon];
  ctx.shadowBlur = p.animState === 'attack' ? 8 : 4;
  ctx.fillRect(6 + bracerExtend, -3 + breathOffset, 5, 6);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#2e2e50';
  ctx.fillRect(-5, 3 + breathOffset, 10, 1);

  ctx.restore();
}

function drawGemPickup(ctx: CanvasRenderingContext2D, x: number, y: number, pulse: number, gemType: WeaponType) {
  const scale = 1 + Math.sin(pulse) * 0.15;
  const px = Math.floor(x);
  const py = Math.floor(y);
  const colors: Record<WeaponType, [string, string]> = {
    shadow: ['#9b30ff', '#cc88ff'],
    fire: ['#ff5500', '#ffaa00'],
    frost: ['#88ddff', '#aaeeff'],
    storm: ['#ffdd00', '#ffee66'],
    venom: ['#44ff44', '#88ff88'],
  };
  const [outer, inner] = colors[gemType];

  ctx.save();
  ctx.translate(px, py);
  ctx.scale(scale, scale);
  ctx.shadowColor = outer;
  ctx.shadowBlur = 15;
  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.moveTo(0, -6); ctx.lineTo(5, 0); ctx.lineTo(0, 6); ctx.lineTo(-5, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = inner;
  ctx.beginPath();
  ctx.moveTo(0, -3); ctx.lineTo(2, 0); ctx.lineTo(0, 3); ctx.lineTo(-2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

function renderHUD(ctx: CanvasRenderingContext2D, g: GameData) {
  // Wave label - top left
  ctx.fillStyle = '#ffd700';
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('WAVE', 30, 28);
  ctx.font = '900 28px Cinzel, serif';
  ctx.fillText(`${g.wave}`, 30, 56);

  // Enemies remaining
  if (g.state === 'playing' && g.enemiesRemainingInWave > 0) {
    ctx.fillStyle = '#ff4444';
    ctx.font = '12px monospace';
    ctx.fillText(`▸ ${g.enemiesRemainingInWave} REMAIN`, 30, 72);
  }

  // HP orbs - top right
  const orbSize = 10;
  const orbSpacing = 26;
  const orbStartX = g.width - 30 - (g.player.maxHp - 1) * orbSpacing;
  for (let i = 0; i < g.player.maxHp; i++) {
    const ox = orbStartX + i * orbSpacing;
    const oy = 36;
    ctx.beginPath();
    ctx.arc(ox, oy, orbSize, 0, Math.PI * 2);
    if (i < g.player.hp) {
      ctx.fillStyle = '#9b30ff';
      ctx.shadowColor = '#9b30ff';
      ctx.shadowBlur = 10;
    } else {
      ctx.fillStyle = '#333340';
      ctx.shadowBlur = 0;
    }
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Boss health bar
  const boss = g.enemies.find(e => e.type === 'boss');
  if (boss) {
    const barW = g.width - 200;
    const barH = 16;
    const barX = 100;
    const barY = 70;
    // Gold border
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barW, barH);
    // Red fill
    const fill = Math.max(0, boss.hp / boss.maxHp);
    ctx.fillStyle = '#880000';
    ctx.fillRect(barX + 1, barY + 1, barW - 2, barH - 2);
    ctx.fillStyle = '#cc0000';
    ctx.fillRect(barX + 1, barY + 1, (barW - 2) * fill, barH - 2);
    // Name
    ctx.fillStyle = '#ffd700';
    ctx.font = '700 14px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.fillText('THE MYCELIUM HERALD', g.width / 2, barY - 6);
  }

  // Score + Best - bottom left
  ctx.fillStyle = 'rgba(255,215,0,0.6)';
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`KILLS: ${g.score}`, 30, g.height - 40);
  ctx.fillText(`BEST WAVE: ${g.bestWave}`, 30, g.height - 24);

  // Gem selector bar - bottom center
  const gems: { type: WeaponType; key: string; name: string; color: string }[] = [
    { type: 'shadow', key: 'Click', name: 'Shadow', color: '#9b30ff' },
    { type: 'fire', key: 'Q', name: 'Fire', color: '#ff5500' },
    { type: 'venom', key: 'T', name: 'Venom', color: '#44ff44' },
    { type: 'frost', key: 'E', name: 'Frost', color: '#88ddff' },
    { type: 'storm', key: 'R', name: 'Storm', color: '#ffdd00' },
  ];

  const gemBarWidth = gems.length * 50;
  const gemBarX = g.width / 2 - gemBarWidth / 2;
  const gemBarY = g.height - 70;

  for (let i = 0; i < gems.length; i++) {
    const gem = gems[i];
    const gx = gemBarX + i * 50 + 25;
    const gy = gemBarY;
    const collected = g.player.gemsCollected[gem.type];
    const active = g.player.activeWeapon === gem.type;
    const size = active ? 10 : 8;

    // Slot background
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(gx - 14, gy - 14, 28, 28);

    if (collected) {
      ctx.fillStyle = active ? gem.color : '#444444';
      ctx.shadowColor = active ? gem.color : 'transparent';
      ctx.shadowBlur = active ? 8 : 0;
      // Diamond shape
      ctx.beginPath();
      ctx.moveTo(gx, gy - size);
      ctx.lineTo(gx + size * 0.7, gy);
      ctx.lineTo(gx, gy + size);
      ctx.lineTo(gx - size * 0.7, gy);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      // Lock icon
      ctx.fillStyle = '#222222';
      ctx.fillRect(gx - 5, gy - 3, 10, 8);
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(gx, gy - 5, 4, Math.PI, 0);
      ctx.stroke();
    }

    // Key label
    ctx.fillStyle = active ? '#ffffff' : 'rgba(255,255,255,0.3)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(gem.key, gx, gy + 22);
  }

  // Active weapon name
  const activeGem = gems.find(g2 => g2.type === g.player.activeWeapon);
  if (activeGem) {
    ctx.fillStyle = activeGem.color;
    ctx.font = '700 14px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.fillText(activeGem.name.toUpperCase(), g.width / 2, gemBarY - 20);
  }

  // Controls hint
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('WASD Move · Mouse Aim · Click Shoot', g.width / 2, g.height - 8);
}

function renderStartScreen(ctx: CanvasRenderingContext2D, g: GameData) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, g.width, g.height);

  // Spores on start screen
  for (const s of g.spores) {
    ctx.globalAlpha = s.opacity;
    ctx.fillStyle = '#ffffee';
    ctx.fillRect(Math.floor(s.pos.x * g.width / g.arenaWidth), Math.floor(s.pos.y * g.height / g.arenaHeight), s.size, s.size);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#9b30ff';
  ctx.font = '900 64px Cinzel, serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#9b30ff';
  ctx.shadowBlur = 30;
  ctx.fillText('MYCELIUM MAYHEM', g.width / 2, g.height / 2 - 60);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#aa88cc';
  ctx.font = '400 22px Cinzel, serif';
  ctx.fillText('Survive the fungal horde', g.width / 2, g.height / 2 - 15);

  // Umbra silhouette
  const cx = g.width / 2;
  const cy = g.height / 2 + 30;
  ctx.fillStyle = '#0d0d18';
  ctx.fillRect(cx - 8, cy - 5, 16, 18);
  ctx.fillStyle = '#1a1a2a';
  ctx.fillRect(cx - 6, cy - 12, 12, 9);
  ctx.fillStyle = '#252535';
  ctx.fillRect(cx - 5, cy - 14, 2, 3);
  ctx.fillRect(cx - 1, cy - 15, 2, 4);
  ctx.fillRect(cx + 3, cy - 14, 2, 3);
  ctx.fillStyle = '#0a0a28';
  ctx.fillRect(cx - 10, cy - 2, 4, 14);
  ctx.fillStyle = '#9944ff';
  ctx.shadowColor = '#9944ff';
  ctx.shadowBlur = 6;
  ctx.fillRect(cx + 2, cy - 9, 3, 2);
  ctx.fillRect(cx + 2, cy - 6, 3, 2);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#880000';
  ctx.fillRect(cx - 6, cy + 3, 12, 2);

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '13px monospace';
  ctx.fillText('WASD Move · Mouse Aim · Click Shoot · Q/E/R/T Switch Gems', g.width / 2, g.height / 2 + 70);

  if (g.bestWave > 0) {
    ctx.fillStyle = 'rgba(255,215,0,0.5)';
    ctx.font = '14px monospace';
    ctx.fillText(`Best Wave: ${g.bestWave}`, g.width / 2, g.height / 2 + 90);
  }

  const pulse = Math.sin(g.startPulse) * 0.3 + 0.7;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffd700';
  ctx.font = '700 24px Cinzel, serif';
  ctx.fillText('Click to Begin', g.width / 2, g.height / 2 + 120);
  ctx.globalAlpha = 1;
}

function renderGameOver(ctx: CanvasRenderingContext2D, g: GameData) {
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, g.width, g.height);

  ctx.fillStyle = '#ff3333';
  ctx.font = '900 72px Cinzel, serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#ff3333';
  ctx.shadowBlur = 20;
  ctx.fillText('YOU FELL', g.width / 2, g.height / 2 - 40);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#ffd700';
  ctx.font = '400 22px Cinzel, serif';
  ctx.fillText(`Waves Survived: ${g.wavesCleared}  ·  Enemies Slain: ${g.score}`, g.width / 2, g.height / 2 + 20);

  if (g.wavesCleared >= g.bestWave && g.wavesCleared > 0) {
    ctx.fillStyle = '#ffd700';
    ctx.font = '700 18px Cinzel, serif';
    ctx.fillText('NEW BEST!', g.width / 2, g.height / 2 + 50);
  }

  const pulse = Math.sin(g.startPulse) * 0.3 + 0.7;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#9b30ff';
  ctx.font = '700 28px Cinzel, serif';
  ctx.fillText('Click to Play Again', g.width / 2, g.height / 2 + 90);
  ctx.globalAlpha = 1;
}
