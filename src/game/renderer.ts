import { GameData, Enemy } from './types';

export function render(ctx: CanvasRenderingContext2D, g: GameData) {
  ctx.save();
  ctx.translate(g.screenShake.x, g.screenShake.y);

  // Background tiles
  ctx.fillStyle = '#0d0d14';
  ctx.fillRect(0, 0, g.width, g.height);
  ctx.strokeStyle = '#111120';
  ctx.lineWidth = 1;
  const gridSize = 32;
  for (let x = 0; x < g.width; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, g.height); ctx.stroke();
  }
  for (let y = 0; y < g.height; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(g.width, y); ctx.stroke();
  }

  // Fog patches
  for (const f of g.fogPatches) {
    const grad = ctx.createRadialGradient(f.pos.x, f.pos.y, 0, f.pos.x, f.pos.y, f.radius);
    grad.addColorStop(0, 'rgba(40,0,80,0.06)');
    grad.addColorStop(1, 'rgba(40,0,80,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(f.pos.x - f.radius, f.pos.y - f.radius, f.radius * 2, f.radius * 2);
  }

  // Spore particles
  for (const s of g.spores) {
    ctx.globalAlpha = s.opacity;
    ctx.fillStyle = '#ffffee';
    ctx.fillRect(Math.floor(s.pos.x), Math.floor(s.pos.y), s.size, s.size);
  }
  ctx.globalAlpha = 1;

  // Border
  const b = g.borderSize;
  ctx.strokeStyle = '#3a0066';
  ctx.lineWidth = b;
  ctx.shadowColor = '#9b30ff';
  ctx.shadowBlur = 15;
  ctx.strokeRect(b / 2, b / 2, g.width - b, g.height - b);
  ctx.shadowBlur = 0;

  // Corner pillars
  drawCornerPillars(ctx, g);

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
    drawGemPickup(ctx, g.gemPickup.pos.x, g.gemPickup.pos.y, g.gemPickup.pulse);
  }

  // Projectiles
  for (const proj of g.projectiles) {
    if (proj.type === 'shadow') {
      ctx.fillStyle = '#9b30ff';
      ctx.shadowColor = '#9b30ff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(Math.floor(proj.pos.x), Math.floor(proj.pos.y), 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (proj.type === 'fire') {
      ctx.fillStyle = '#ff5500';
      ctx.shadowColor = '#ffaa00';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(Math.floor(proj.pos.x), Math.floor(proj.pos.y), 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (proj.type === 'enemy') {
      ctx.fillStyle = '#00ff44';
      ctx.shadowColor = '#00ff44';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(Math.floor(proj.pos.x), Math.floor(proj.pos.y), 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
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
    if (e.type === 'rusher') {
      drawRusher(ctx, e);
    } else {
      drawSniper(ctx, e);
    }
  }

  // Player
  const p = g.player;
  if (p.alive) {
    const visible = p.invincibleTimer <= 0 || Math.floor(p.invincibleTimer / 3) % 2 === 0;
    if (visible) {
      drawPlayer(ctx, p);
    }
  }

  // Wave clear text
  if (g.state === 'waveClear') {
    const alpha = Math.min(1, g.waveClearTimer / 30);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffd700';
    ctx.font = '900 48px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 25;
    ctx.fillText(`WAVE ${g.wave} — SURVIVED`, g.width / 2, g.height / 2);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
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
    ctx.fillText('EMBER GEM ACQUIRED', g.width / 2, g.height / 2 + 60);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  renderHUD(ctx, g);
  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: import('./types').Player) {
  ctx.save();
  ctx.translate(Math.floor(p.pos.x), Math.floor(p.pos.y));
  ctx.rotate(p.angle);

  // White flash
  if (p.flashTimer > 0) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-10, -10, 20, 20);
    ctx.restore();
    return;
  }
  // Purple flash
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

  // Cape
  const capeShift = p.animState === 'walk' ? Math.sin(p.animFrame * Math.PI / 2) * 2 : Math.sin(p.animFrame * Math.PI * 2 / 3) * 0.5;
  ctx.fillStyle = '#0a0a28';
  ctx.fillRect(-9, -2, 4, 12 + capeShift);
  ctx.fillRect(-7, 8 + capeShift, 3, 3);

  // Body armor
  ctx.fillStyle = '#0d0d18';
  ctx.fillRect(-7, -7 + breathOffset, 14, 14);

  // Armor edge highlights
  ctx.fillStyle = '#2e2e50';
  ctx.fillRect(-7, -7 + breathOffset, 1, 14);
  ctx.fillRect(6, -7 + breathOffset, 1, 14);
  ctx.fillRect(-7, -7 + breathOffset, 14, 1);
  ctx.fillRect(-7, 6 + breathOffset, 14, 1);

  // Helmet (spiked crown)
  ctx.fillStyle = '#1a1a2a';
  ctx.fillRect(-5, -10 + breathOffset, 10, 6);
  // Spikes
  ctx.fillStyle = '#252535';
  ctx.fillRect(-5, -12 + breathOffset, 2, 3);
  ctx.fillRect(-1, -13 + breathOffset, 2, 4);
  ctx.fillRect(3, -12 + breathOffset, 2, 3);

  // Visor eyes
  ctx.fillStyle = '#9944ff';
  ctx.shadowColor = '#9944ff';
  ctx.shadowBlur = 6;
  ctx.fillRect(3, -7 + breathOffset, 3, 2);
  ctx.fillRect(3, -4 + breathOffset, 3, 2);
  ctx.shadowBlur = 0;

  // Red sash at waist
  ctx.fillStyle = '#880000';
  ctx.fillRect(-6, 1 + breathOffset, 12, 2);

  // Bracer on attack arm
  const bracerExtend = p.animState === 'attack' ? 4 : 0;
  ctx.fillStyle = '#6600bb';
  ctx.shadowColor = '#9944ff';
  ctx.shadowBlur = p.animState === 'attack' ? 8 : 4;
  ctx.fillRect(6 + bracerExtend, -3 + breathOffset, 5, 6);
  ctx.shadowBlur = 0;

  // Armor detail lines
  ctx.fillStyle = '#2e2e50';
  ctx.fillRect(-5, 3 + breathOffset, 10, 1);

  ctx.restore();
}

function drawRusher(ctx: CanvasRenderingContext2D, e: Enemy) {
  const wobbleOffset = Math.sin(e.wobblePhase) * 2;
  const px = Math.floor(e.pos.x);
  const py = Math.floor(e.pos.y + wobbleOffset);

  if (e.flashTimer > 0) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px - 8, py - 8, 16, 16);
    return;
  }

  // Legs
  const legOffset = Math.sin(e.animFrame * Math.PI / 2) * 2;
  ctx.fillStyle = '#5c3d2e';
  ctx.fillRect(px - 4, py + 4, 3, 4 + legOffset);
  ctx.fillRect(px + 1, py + 4, 3, 4 - legOffset);

  // Stem
  ctx.fillStyle = '#5c3d2e';
  ctx.fillRect(px - 3, py, 6, 6);

  // Cap
  ctx.fillStyle = '#8b2500';
  ctx.fillRect(px - 8, py - 8, 16, 10);
  ctx.fillStyle = '#aa3300';
  ctx.fillRect(px - 6, py - 8, 12, 3);

  // Spots
  ctx.fillStyle = '#cc5533';
  ctx.fillRect(px - 5, py - 6, 2, 2);
  ctx.fillRect(px + 3, py - 5, 2, 2);

  // Eyes
  ctx.fillStyle = '#ff3333';
  ctx.shadowColor = '#ff3333';
  ctx.shadowBlur = 4;
  ctx.fillRect(px - 4, py - 1, 3, 3);
  ctx.fillRect(px + 1, py - 1, 3, 3);
  ctx.shadowBlur = 0;
}

function drawSniper(ctx: CanvasRenderingContext2D, e: Enemy) {
  const px = Math.floor(e.pos.x);
  const py = Math.floor(e.pos.y);
  const bob = Math.sin(e.wobblePhase * 0.7) * 1.5;

  if (e.flashTimer > 0) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px - 9, py - 9, 18, 18);
    return;
  }

  // Tall stem
  ctx.fillStyle = '#3d2e5c';
  ctx.fillRect(px - 3, py + 2, 6, 8);

  // Cap - dark purple, taller
  ctx.fillStyle = '#2a0055';
  ctx.fillRect(px - 9, py - 10 + bob, 18, 14);
  ctx.fillStyle = '#3a0077';
  ctx.fillRect(px - 7, py - 10 + bob, 14, 4);

  // Glowing green eyes
  ctx.fillStyle = '#00ff44';
  ctx.shadowColor = '#00ff44';
  ctx.shadowBlur = 5;
  ctx.fillRect(px - 4, py - 1, 3, 3);
  ctx.fillRect(px + 1, py - 1, 3, 3);
  ctx.shadowBlur = 0;

  // Spore sac detail
  ctx.fillStyle = '#004400';
  ctx.fillRect(px - 2, py + 6, 4, 3);
}

function drawGemPickup(ctx: CanvasRenderingContext2D, x: number, y: number, pulse: number) {
  const scale = 1 + Math.sin(pulse) * 0.15;
  const px = Math.floor(x);
  const py = Math.floor(y);

  ctx.save();
  ctx.translate(px, py);
  ctx.scale(scale, scale);

  // Gem glow
  ctx.shadowColor = '#ff5500';
  ctx.shadowBlur = 15;

  // Diamond shape
  ctx.fillStyle = '#ff5500';
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(5, 0);
  ctx.lineTo(0, 6);
  ctx.lineTo(-5, 0);
  ctx.closePath();
  ctx.fill();

  // Inner highlight
  ctx.fillStyle = '#ffaa00';
  ctx.beginPath();
  ctx.moveTo(0, -3);
  ctx.lineTo(2, 0);
  ctx.lineTo(0, 3);
  ctx.lineTo(-2, 0);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawCornerPillars(ctx: CanvasRenderingContext2D, g: GameData) {
  const b = g.borderSize;
  const positions = [
    [b, b],
    [g.width - b - 8, b],
    [b, g.height - b - 8],
    [g.width - b - 8, g.height - b - 8],
  ];
  for (const [x, y] of positions) {
    ctx.fillStyle = '#1a1a28';
    ctx.fillRect(x, y, 8, 8);
    ctx.fillStyle = '#252540';
    ctx.fillRect(x + 1, y + 1, 6, 2);
    ctx.fillRect(x + 1, y + 5, 6, 2);
  }
}

function renderHUD(ctx: CanvasRenderingContext2D, g: GameData) {
  // Wave label
  ctx.fillStyle = '#ffd700';
  ctx.font = '700 20px Cinzel, serif';
  ctx.textAlign = 'left';
  ctx.fillText(`WAVE ${g.wave}`, 30, 40);

  // HP orbs - larger
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

  // Score + Waves - center top
  ctx.fillStyle = 'rgba(255,215,0,0.6)';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`KILLS: ${g.score}  |  WAVES: ${g.wavesCleared}`, g.width / 2, 35);

  // Gem indicator
  if (g.player.fireGemCollected) {
    const gemX = g.width / 2;
    const gemY = g.height - 50;
    ctx.fillStyle = g.player.activeWeapon === 'fire' ? '#ff5500' : '#444444';
    ctx.shadowColor = g.player.activeWeapon === 'fire' ? '#ff5500' : 'transparent';
    ctx.shadowBlur = g.player.activeWeapon === 'fire' ? 8 : 0;
    ctx.beginPath();
    ctx.moveTo(gemX, gemY - 5);
    ctx.lineTo(gemX + 4, gemY);
    ctx.lineTo(gemX, gemY + 5);
    ctx.lineTo(gemX - 4, gemY);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px monospace';
    ctx.fillText('[Q] Switch', gemX, gemY + 16);
  }

  // Controls hint
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('WASD · Move  |  Mouse · Aim  |  Click · Shoot  |  Q · Switch Gem', g.width / 2, g.height - 20);
}

function renderStartScreen(ctx: CanvasRenderingContext2D, g: GameData) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, g.width, g.height);

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

  // Umbra silhouette - more detailed
  const cx = g.width / 2;
  const cy = g.height / 2 + 30;
  ctx.fillStyle = '#0d0d18';
  ctx.fillRect(cx - 8, cy - 5, 16, 18);
  ctx.fillStyle = '#1a1a2a';
  ctx.fillRect(cx - 6, cy - 12, 12, 9);
  // Spikes
  ctx.fillStyle = '#252535';
  ctx.fillRect(cx - 5, cy - 14, 2, 3);
  ctx.fillRect(cx - 1, cy - 15, 2, 4);
  ctx.fillRect(cx + 3, cy - 14, 2, 3);
  // Cape
  ctx.fillStyle = '#0a0a28';
  ctx.fillRect(cx - 10, cy - 2, 4, 14);
  // Eyes
  ctx.fillStyle = '#9944ff';
  ctx.shadowColor = '#9944ff';
  ctx.shadowBlur = 6;
  ctx.fillRect(cx + 2, cy - 9, 3, 2);
  ctx.fillRect(cx + 2, cy - 6, 3, 2);
  ctx.shadowBlur = 0;
  // Sash
  ctx.fillStyle = '#880000';
  ctx.fillRect(cx - 6, cy + 3, 12, 2);

  // Tutorial text
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '13px monospace';
  ctx.fillText('WASD Move · Mouse Aim · Click Shoot · Q Switch Gem', g.width / 2, g.height / 2 + 70);

  const pulse = Math.sin(g.startPulse) * 0.3 + 0.7;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffd700';
  ctx.font = '700 24px Cinzel, serif';
  ctx.fillText('Click to Begin', g.width / 2, g.height / 2 + 110);
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

  const pulse = Math.sin(g.startPulse) * 0.3 + 0.7;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#9b30ff';
  ctx.font = '700 28px Cinzel, serif';
  ctx.fillText('Click to Play Again', g.width / 2, g.height / 2 + 80);
  ctx.globalAlpha = 1;
}
