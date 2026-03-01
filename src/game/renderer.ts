import { GameData } from './types';

export function render(ctx: CanvasRenderingContext2D, g: GameData) {
  ctx.save();
  ctx.translate(g.screenShake.x, g.screenShake.y);

  // Background
  ctx.fillStyle = '#111118';
  ctx.fillRect(0, 0, g.width, g.height);

  // Grid pattern
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  const gridSize = 32;
  for (let x = 0; x < g.width; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, g.height); ctx.stroke();
  }
  for (let y = 0; y < g.height; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(g.width, y); ctx.stroke();
  }

  // Spore particles (background)
  for (const s of g.spores) {
    ctx.globalAlpha = s.opacity;
    ctx.fillStyle = '#ffffff';
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

  // Projectiles
  for (const proj of g.projectiles) {
    ctx.fillStyle = '#9b30ff';
    ctx.shadowColor = '#9b30ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(Math.floor(proj.pos.x), Math.floor(proj.pos.y), 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Enemies
  for (const e of g.enemies) {
    drawEnemy(ctx, e.pos.x, e.pos.y, e.flashTimer > 0, e.wobblePhase);
  }

  // Player
  const p = g.player;
  if (p.alive) {
    const visible = p.invincibleTimer <= 0 || Math.floor(p.invincibleTimer / 3) % 2 === 0;
    if (visible) {
      drawPlayer(ctx, p.pos.x, p.pos.y, p.angle, p.flashTimer > 0);
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
    ctx.shadowBlur = 20;
    ctx.fillText(`WAVE ${g.wave} CLEARED`, g.width / 2, g.height / 2);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  // HUD
  renderHUD(ctx, g);

  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, flashing: boolean) {
  ctx.save();
  ctx.translate(Math.floor(x), Math.floor(y));
  ctx.rotate(angle);

  if (flashing) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-10, -10, 20, 20);
    ctx.restore();
    return;
  }

  // Body - dark armor
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(-8, -8, 16, 16);

  // Hood
  ctx.fillStyle = '#0d0d1a';
  ctx.fillRect(-6, -10, 12, 8);

  // Purple eyes
  ctx.fillStyle = '#9b30ff';
  ctx.shadowColor = '#9b30ff';
  ctx.shadowBlur = 6;
  ctx.fillRect(2, -6, 3, 3);
  ctx.fillRect(2, -1, 3, 3);
  ctx.shadowBlur = 0;

  // Bracer glow (attack arm)
  ctx.fillStyle = '#7722cc';
  ctx.shadowColor = '#9b30ff';
  ctx.shadowBlur = 4;
  ctx.fillRect(6, -3, 5, 6);
  ctx.shadowBlur = 0;

  // Armor detail
  ctx.fillStyle = '#2a2a4e';
  ctx.fillRect(-6, 2, 12, 2);

  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, x: number, y: number, flashing: boolean, wobble: number) {
  const wobbleOffset = Math.sin(wobble) * 2;
  const px = Math.floor(x);
  const py = Math.floor(y + wobbleOffset);

  if (flashing) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px - 7, py - 7, 14, 14);
    return;
  }

  // Stem
  ctx.fillStyle = '#5c3d2e';
  ctx.fillRect(px - 3, py, 6, 7);

  // Cap
  ctx.fillStyle = '#8b2500';
  ctx.fillRect(px - 7, py - 7, 14, 9);

  // Cap top highlight
  ctx.fillStyle = '#aa3300';
  ctx.fillRect(px - 5, py - 7, 10, 3);

  // Spots
  ctx.fillStyle = '#cc5533';
  ctx.fillRect(px - 4, py - 5, 2, 2);
  ctx.fillRect(px + 2, py - 4, 2, 2);

  // Eyes
  ctx.fillStyle = '#ff3333';
  ctx.shadowColor = '#ff3333';
  ctx.shadowBlur = 4;
  ctx.fillRect(px - 4, py - 1, 3, 3);
  ctx.fillRect(px + 1, py - 1, 3, 3);
  ctx.shadowBlur = 0;
}

function renderHUD(ctx: CanvasRenderingContext2D, g: GameData) {
  // Wave label - top left
  ctx.fillStyle = '#ffd700';
  ctx.font = '700 20px Cinzel, serif';
  ctx.textAlign = 'left';
  ctx.fillText(`WAVE ${g.wave}`, 30, 40);

  // HP orbs - top right
  const orbSize = 8;
  const orbSpacing = 22;
  const orbStartX = g.width - 30 - (g.player.maxHp - 1) * orbSpacing;
  for (let i = 0; i < g.player.maxHp; i++) {
    const ox = orbStartX + i * orbSpacing;
    const oy = 36;
    ctx.beginPath();
    ctx.arc(ox, oy, orbSize, 0, Math.PI * 2);
    if (i < g.player.hp) {
      ctx.fillStyle = '#9b30ff';
      ctx.shadowColor = '#9b30ff';
      ctx.shadowBlur = 8;
    } else {
      ctx.fillStyle = '#333340';
      ctx.shadowBlur = 0;
    }
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Score - center top
  ctx.fillStyle = 'rgba(255,215,0,0.6)';
  ctx.font = '16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${g.score}`, g.width / 2, 35);

  // Controls hint - bottom center
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('WASD · Move  |  Mouse · Aim  |  Click · Shoot', g.width / 2, g.height - 20);
}

function renderStartScreen(ctx: CanvasRenderingContext2D, g: GameData) {
  // Darken
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, g.width, g.height);

  // Title
  ctx.fillStyle = '#9b30ff';
  ctx.font = '900 64px Cinzel, serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#9b30ff';
  ctx.shadowBlur = 30;
  ctx.fillText('MYCELIUM MAYHEM', g.width / 2, g.height / 2 - 60);
  ctx.shadowBlur = 0;

  // Subtitle
  ctx.fillStyle = '#aa88cc';
  ctx.font = '400 22px Cinzel, serif';
  ctx.fillText('Survive the fungal horde', g.width / 2, g.height / 2 - 15);

  // Umbra silhouette
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(g.width / 2 - 12, g.height / 2 + 20, 24, 30);
  ctx.fillStyle = '#0d0d1a';
  ctx.fillRect(g.width / 2 - 9, g.height / 2 + 12, 18, 14);
  ctx.fillStyle = '#9b30ff';
  ctx.shadowColor = '#9b30ff';
  ctx.shadowBlur = 6;
  ctx.fillRect(g.width / 2 + 2, g.height / 2 + 18, 4, 4);
  ctx.fillRect(g.width / 2 + 2, g.height / 2 + 25, 4, 4);
  ctx.shadowBlur = 0;

  // Click to begin
  const pulse = Math.sin(g.startPulse) * 0.3 + 0.7;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffd700';
  ctx.font = '700 24px Cinzel, serif';
  ctx.fillText('Click to Begin', g.width / 2, g.height / 2 + 100);
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
  ctx.fillText(`Waves Survived: ${g.wave}  ·  Enemies Slain: ${g.score}`, g.width / 2, g.height / 2 + 20);

  const pulse = Math.sin(g.startPulse) * 0.3 + 0.7;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#9b30ff';
  ctx.font = '700 28px Cinzel, serif';
  ctx.fillText('Click to Play Again', g.width / 2, g.height / 2 + 80);
  ctx.globalAlpha = 1;
}
