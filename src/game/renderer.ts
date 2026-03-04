import { GameData, Enemy, Player, WeaponType, Projectile, UpgradeRarity, SolusPlayer, DyingProjectile } from './types';
/* eslint-disable @typescript-eslint/no-unused-vars */

const HERALD_NAMES: Record<number, string> = {
  1: 'THE CINDER HERALD', 2: 'THE GLACIAL HERALD', 3: 'THE STORM HERALD',
  4: 'THE VENOM HERALD', 5: 'THE VOID HERALD', 6: 'THE TERRA HERALD',
  7: 'THE GALE HERALD', 8: 'THE FLUX HERALD',
};

const HERALD_COLORS: Record<number, string> = {
  1: '#ff5500', 2: '#88ddff', 3: '#ffdd00', 4: '#44ff44',
  5: '#9b30ff', 6: '#cc8844', 7: '#aaddff', 8: '#ffaa00',
};

export function render(ctx: CanvasRenderingContext2D, g: GameData) {
  ctx.save();
  ctx.translate(g.screenShake.x, g.screenShake.y);
  ctx.fillStyle = '#0d0d14';
  ctx.fillRect(0, 0, g.width, g.height);

  if (g.state === 'start') { renderStartScreen(ctx, g); ctx.restore(); return; }
  if (g.state === 'gameOver') { renderGameOver(ctx, g); ctx.restore(); return; }

  ctx.save();
  ctx.translate(-g.camera.x, -g.camera.y);

  renderArena(ctx, g);

  // Stains
  for (const s of g.stains) {
    ctx.globalAlpha = s.opacity;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    const segments = 8;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const r = s.radius * (0.7 + Math.sin(s.seed + i * 1.3) * 0.3);
      const x = s.pos.x + Math.cos(a) * r, y = s.pos.y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Fog patches
  for (const f of g.fogPatches) {
    const grad = ctx.createRadialGradient(f.pos.x, f.pos.y, 0, f.pos.x, f.pos.y, f.radius);
    grad.addColorStop(0, 'rgba(40,0,80,0.06)'); grad.addColorStop(1, 'rgba(40,0,80,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(f.pos.x - f.radius, f.pos.y - f.radius, f.radius * 2, f.radius * 2);
  }

  for (const s of g.spores) {
    ctx.globalAlpha = s.opacity; ctx.fillStyle = '#ffffee';
    ctx.fillRect(Math.floor(s.pos.x), Math.floor(s.pos.y), s.size, s.size);
  }
  ctx.globalAlpha = 1;

  for (const fz of g.fogZones) {
    const alpha = Math.min(0.3, (fz.life / fz.maxLife) * 0.3);
    const grad = ctx.createRadialGradient(fz.pos.x, fz.pos.y, 0, fz.pos.x, fz.pos.y, fz.radius);
    grad.addColorStop(0, `rgba(10,10,30,${alpha})`); grad.addColorStop(0.7, `rgba(10,10,30,${alpha * 0.5})`); grad.addColorStop(1, 'rgba(10,10,30,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(fz.pos.x - fz.radius, fz.pos.y - fz.radius, fz.radius * 2, fz.radius * 2);
  }

  for (const tp of g.toxicPuddles) {
    const alpha = tp.life / 120;
    ctx.globalAlpha = alpha * 0.4; ctx.fillStyle = '#44ff44';
    ctx.beginPath(); ctx.arc(tp.pos.x, tp.pos.y, tp.radius, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  for (const h of g.floorHazards) {
    const alpha = h.life / h.maxLife;
    ctx.globalAlpha = alpha * 0.5;
    if (h.type === 'fire') {
      ctx.fillStyle = '#ff4400'; ctx.beginPath(); ctx.arc(h.pos.x, h.pos.y, h.radius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffaa00'; ctx.globalAlpha = alpha * 0.3;
      ctx.beginPath(); ctx.arc(h.pos.x, h.pos.y, h.radius * 0.6, 0, Math.PI * 2); ctx.fill();
    } else if (h.type === 'ice') {
      ctx.fillStyle = '#88ddff'; ctx.beginPath(); ctx.arc(h.pos.x, h.pos.y, h.radius, 0, Math.PI * 2); ctx.fill();
    } else if (h.type === 'wind') {
      ctx.strokeStyle = '#aaddff'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.arc(h.pos.x, h.pos.y, h.radius, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(h.pos.x, h.pos.y);
      ctx.lineTo(h.pos.x + h.dirX * 30, h.pos.y + h.dirY * 30); ctx.stroke();
    } else if (h.type === 'void') {
      ctx.fillStyle = '#331133'; ctx.fillRect(h.pos.x - h.radius, h.pos.y - h.radius, h.radius * 2, h.radius * 2);
    }
    ctx.globalAlpha = 1;
  }

  for (const obs of g.obstacles) drawObstacle(ctx, obs);

  for (const pt of g.particles) {
    const alpha = pt.life / pt.maxLife; ctx.globalAlpha = alpha; ctx.fillStyle = pt.color;
    ctx.fillRect(Math.floor(pt.pos.x - pt.size / 2), Math.floor(pt.pos.y - pt.size / 2), pt.size, pt.size);
  }
  ctx.globalAlpha = 1;

  if (g.gemPickup && !g.gemPickup.collected) drawGemPickup(ctx, g.gemPickup.pos.x, g.gemPickup.pos.y, g.gemPickup.pulse, g.gemPickup.gemType);

  // Heart pickup
  if (g.heartPickup && !g.heartPickup.collected) {
    const hp = g.heartPickup;
    const hx = Math.floor(hp.pos.x), hy = Math.floor(hp.pos.y);
    const pulse = 1 + Math.sin(hp.pulse) * 0.15;
    const warningPulse = hp.life <= 120 ? (Math.sin(Date.now() * 0.02) > 0 ? 0.5 : 1) : 1;
    ctx.save(); ctx.translate(hx, hy - 2); ctx.scale(pulse, pulse); ctx.globalAlpha = warningPulse;
    // Heart shape
    ctx.fillStyle = '#ff2244'; ctx.shadowColor = '#ff2244'; ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.bezierCurveTo(-5, -2, -7, -5, -4, -7);
    ctx.bezierCurveTo(-1, -9, 0, -6, 0, -4);
    ctx.bezierCurveTo(0, -6, 1, -9, 4, -7);
    ctx.bezierCurveTo(7, -5, 5, -2, 0, 2);
    ctx.fill();
    // Inner glow
    ctx.fillStyle = '#ff6688'; ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-2, -2, -3, -4, -2, -5);
    ctx.bezierCurveTo(-1, -6, 0, -4, 0, -3);
    ctx.bezierCurveTo(0, -4, 1, -6, 2, -5);
    ctx.bezierCurveTo(3, -4, 2, -2, 0, 0);
    ctx.fill();
    ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.restore();
  }

  // Dying projectiles (flash + dissolve)
  for (const dp of g.dyingProjectiles) {
    const alpha = dp.life / dp.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(Math.floor(dp.pos.x), Math.floor(dp.pos.y), 3 * alpha, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;

  for (const proj of g.projectiles) drawProjectile(ctx, proj);

  for (const e of g.enemies) {
    if (e.isCamouflaged && e.type === 'boss') ctx.globalAlpha = 0.1;
    if (e.spawnFlash > 0) {
      ctx.globalAlpha = (e.spawnFlash / 20) * 0.8; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(Math.floor(e.pos.x), Math.floor(e.pos.y), 12, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Elite glow
    if (e.isElite) {
      ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 8;
    }
    drawEnemy(ctx, e);
    if (e.isElite) ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // Elite indicator
    if (e.isElite && e.spawnFlash > 10) {
      ctx.fillStyle = '#ffd700'; ctx.font = '700 10px monospace'; ctx.textAlign = 'center';
      ctx.fillText('ELITE', Math.floor(e.pos.x), Math.floor(e.pos.y) - 20);
    }

    // Status effect visuals
    drawStatusEffectsDetailed(ctx, e);

    if (e.evolutionWarning && !e.evolved && !e.evolving) {
      const blink = Math.sin(Date.now() * 0.01) > 0;
      if (blink) { ctx.fillStyle = '#ffaa00'; ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.fillText('▲', Math.floor(e.pos.x), Math.floor(e.pos.y) - 18); }
    }
    if (e.evolving) {
      ctx.globalAlpha = 0.5; ctx.fillStyle = '#ffaa00';
      ctx.beginPath(); ctx.arc(Math.floor(e.pos.x), Math.floor(e.pos.y), 16, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Berserk indicator
    if (e.isBerserk) {
      ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.01) * 0.2; ctx.fillStyle = '#ff0000';
      ctx.beginPath(); ctx.arc(Math.floor(e.pos.x), Math.floor(e.pos.y), 22, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // Player afterimages
  for (const ai of g.player.afterimages) {
    ctx.globalAlpha = (ai.life / ai.maxLife) * 0.2;
    drawPlayer(ctx, g.player, ai.pos.x, ai.pos.y, ai.angle);
    ctx.globalAlpha = 1;
  }

  const p = g.player;
  if (p.alive) {
    const visible = p.invincibleTimer <= 0 || Math.floor(p.invincibleTimer / 3) % 2 === 0;
    if (visible) drawPlayer(ctx, p);
    // Name tag in co-op
    if (g.coopState === 'playing') {
      ctx.fillStyle = '#9b30ff'; ctx.font = '700 8px monospace'; ctx.textAlign = 'center';
      ctx.fillText('UMBRA', Math.floor(p.pos.x), Math.floor(p.pos.y) - 16);
    }
  } else if (g.umbraCollapsed) {
    // Draw collapsed Umbra
    ctx.globalAlpha = 0.4 + Math.sin(Date.now() * 0.005) * 0.1;
    drawPlayer(ctx, p);
    ctx.globalAlpha = 1;
    // Revive progress circle
    if (g.umbraReviveProgress > 0) {
      ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(Math.floor(p.pos.x), Math.floor(p.pos.y), 20, -Math.PI / 2, -Math.PI / 2 + g.umbraReviveProgress * Math.PI * 2);
      ctx.stroke();
    }
  }

  // Draw Solus in co-op
  if (g.coopState === 'playing' && g.solus) {
    const s = g.solus;
    // Afterimages
    for (const ai of s.afterimages) {
      ctx.globalAlpha = (ai.life / ai.maxLife) * 0.2;
      drawSolus(ctx, s, ai.pos.x, ai.pos.y);
      ctx.globalAlpha = 1;
    }
    if (s.alive) {
      const visible = s.invincibleTimer <= 0 || Math.floor(s.invincibleTimer / 3) % 2 === 0;
      if (visible) drawSolus(ctx, s);
      // Martyr Shield visual
      if (s.martyrShieldActive) {
        ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2; ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 8;
        const pulse = 1 + Math.sin(Date.now() * 0.008) * 0.05;
        ctx.beginPath(); ctx.arc(Math.floor(s.pos.x), Math.floor(s.pos.y), 18 * pulse, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
      }
      // Divine Reckoning aura
      if (s.divineReckoningActive) {
        ctx.globalAlpha = 0.2; ctx.fillStyle = '#ffd700';
        ctx.beginPath(); ctx.arc(Math.floor(s.pos.x), Math.floor(s.pos.y), 60, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      // Name tag
      ctx.fillStyle = '#ffd700'; ctx.font = '700 8px monospace'; ctx.textAlign = 'center';
      ctx.fillText('SOLUS', Math.floor(s.pos.x), Math.floor(s.pos.y) - 16);
    } else if (s.collapsed) {
      ctx.globalAlpha = 0.4 + Math.sin(Date.now() * 0.005) * 0.1;
      drawSolus(ctx, s);
      ctx.globalAlpha = 1;
      if (s.reviveProgress > 0) {
        ctx.strokeStyle = '#9b30ff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(Math.floor(s.pos.x), Math.floor(s.pos.y), 20, -Math.PI / 2, -Math.PI / 2 + s.reviveProgress * Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  // Parry flash
  if (g.parryFlashTimer > 0) {
    ctx.globalAlpha = g.parryFlashTimer / 8;
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(Math.floor(p.pos.x), Math.floor(p.pos.y), 20 + (8 - g.parryFlashTimer) * 4, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Combo popups
  for (const cp of g.comboPopups) {
    const alpha = cp.life / cp.maxLife; ctx.globalAlpha = alpha;
    ctx.fillStyle = cp.color; ctx.font = '900 16px Cinzel, serif'; ctx.textAlign = 'center';
    ctx.shadowColor = cp.color; ctx.shadowBlur = 8;
    ctx.fillText(cp.text, Math.floor(cp.pos.x), Math.floor(cp.pos.y));
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }

  // Damage popups
  for (const dp of g.damagePopups) {
    const alpha = dp.life / dp.maxLife; ctx.globalAlpha = alpha;
    ctx.fillStyle = dp.color; ctx.font = '700 12px monospace'; ctx.textAlign = 'center';
    ctx.fillText(dp.text, Math.floor(dp.pos.x), Math.floor(dp.pos.y));
    ctx.globalAlpha = 1;
  }

  ctx.restore(); // End camera

  renderHUD(ctx, g);

  if (g.waveAnnounceTimer > 0) {
    const alpha = Math.min(1, g.waveAnnounceTimer / 30); ctx.globalAlpha = alpha;
    ctx.fillStyle = g.waveAnnounceText.includes('HERALD') || g.waveAnnounceText.includes('FLIPPED') || g.waveAnnounceText.includes('BERSERK') ? '#ff3333' :
                    g.waveAnnounceText.includes('UMBRA') ? '#9b30ff' : '#ffd700';
    ctx.font = '900 48px Cinzel, serif'; ctx.textAlign = 'center';
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 25;
    ctx.fillText(g.waveAnnounceText, g.width / 2, g.height / 2);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }

  if (g.state === 'waveClear') {
    const alpha = Math.min(1, g.waveClearTimer / 30); ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffd700'; ctx.font = '900 48px Cinzel, serif'; ctx.textAlign = 'center';
    ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 25;
    ctx.fillText(`WAVE ${g.wave} — SURVIVED`, g.width / 2, g.height / 2 - 30);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }

  if (g.state === 'bossIntro') { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, g.width, g.height); }
  if (g.state === 'gemUnlock' && g.gemUnlockType) renderGemUnlock(ctx, g);
  if (g.state === 'upgradeSelect') renderUpgradeSelect(ctx, g);

  if (g.gemNotifyTimer > 0 && g.state !== 'gemUnlock') {
    const alpha = Math.min(1, g.gemNotifyTimer / 30); ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffd700'; ctx.font = '900 36px Cinzel, serif'; ctx.textAlign = 'center';
    ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 20;
    ctx.fillText(g.gemNotifyText, g.width / 2, g.height / 2 + 60);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }

  if (g.screenFlashTimer > 0) {
    ctx.globalAlpha = g.screenFlashTimer / 8; ctx.fillStyle = g.screenFlashColor;
    ctx.fillRect(0, 0, g.width, g.height); ctx.globalAlpha = 1;
  }

  if (g.player.umbraMode) {
    const grad = ctx.createRadialGradient(g.width / 2, g.height / 2, g.width * 0.2, g.width / 2, g.height / 2, g.width * 0.6);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(100,0,200,0.2)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, g.width, g.height);
  }

  if (g.player.hp <= 2 && g.player.alive) {
    const pulse = Math.sin(g.lowHpPulse) * 0.15 + 0.15;
    const grad = ctx.createRadialGradient(g.width / 2, g.height / 2, g.width * 0.3, g.width / 2, g.height / 2, g.width * 0.7);
    grad.addColorStop(0, 'rgba(255,0,0,0)'); grad.addColorStop(1, `rgba(255,0,0,${pulse})`);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, g.width, g.height);
  }

  // Berserk red vignette
  const boss = g.enemies.find(e => e.type === 'boss' && e.isBerserk);
  if (boss) {
    const grad = ctx.createRadialGradient(g.width / 2, g.height / 2, g.width * 0.2, g.width / 2, g.height / 2, g.width * 0.65);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(200,0,0,0.25)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, g.width, g.height);
  }

  if (g.controlsFlipped) {
    ctx.fillStyle = 'rgba(255,0,0,0.1)'; ctx.fillRect(0, 0, g.width, g.height);
    ctx.fillStyle = '#ff3333'; ctx.font = '700 16px monospace'; ctx.textAlign = 'center';
    ctx.fillText('⚠ CONTROLS REVERSED ⚠', g.width / 2, 30);
  }

  const vigGrad = ctx.createRadialGradient(g.width / 2, g.height / 2, g.width * 0.35, g.width / 2, g.height / 2, g.width * 0.7);
  vigGrad.addColorStop(0, 'rgba(0,0,0,0)'); vigGrad.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = vigGrad; ctx.fillRect(0, 0, g.width, g.height);

  ctx.restore();
}

// ---- Detailed status effect visuals ----
function drawStatusEffectsDetailed(ctx: CanvasRenderingContext2D, e: Enemy) {
  const px = Math.floor(e.pos.x), py = Math.floor(e.pos.y);
  const t = Date.now() * 0.001;

  if (e.burning) {
    ctx.globalAlpha = 0.7;
    for (let i = 0; i < 3; i++) {
      const ox = Math.sin(t * 3 + i * 2) * 5, oy = -3 - Math.random() * 4;
      ctx.fillStyle = i % 2 === 0 ? '#ff5500' : '#ffaa00';
      ctx.fillRect(px + ox - 1, py + oy - 1, 3, 3);
    }
    if (Math.random() < 0.3) {
      ctx.fillStyle = '#ff8800'; ctx.fillRect(px + (Math.random() - 0.5) * 12, py - 8 - Math.random() * 4, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  if (e.slow && !e.frozenToxin) {
    ctx.globalAlpha = 0.5; ctx.fillStyle = '#aaeeff';
    // Ice crystal shell
    ctx.fillRect(px - 8, py - 8, 2, 16); ctx.fillRect(px + 6, py - 8, 2, 16);
    ctx.fillRect(px - 6, py - 8, 12, 2); ctx.fillRect(px - 6, py + 6, 12, 2);
    // Orbiting frost particles
    for (let i = 0; i < 3; i++) {
      const a = t * 2 + i * (Math.PI * 2 / 3);
      ctx.fillRect(px + Math.cos(a) * 10, py + Math.sin(a) * 10, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  if (e.stun) {
    ctx.globalAlpha = 0.6;
    // Electric sparks
    for (let i = 0; i < 4; i++) {
      const ox = (Math.random() - 0.5) * 14, oy = (Math.random() - 0.5) * 14;
      ctx.fillStyle = Math.random() > 0.5 ? '#ffee00' : '#ffffff';
      ctx.fillRect(px + ox, py + oy, 2, 1);
      ctx.fillRect(px + ox, py + oy, 1, 2);
    }
    // Pixel jitter effect by drawing a slight offset indicator
    if (Math.sin(t * 20) > 0) {
      ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.2;
      ctx.fillRect(px - 7, py - 7, 14, 14);
    }
    ctx.globalAlpha = 1;
  }

  if (e.poison && !e.frozenToxin) {
    ctx.globalAlpha = 0.5;
    // Green tint overlay
    ctx.fillStyle = '#44ff44'; ctx.fillRect(px - 6, py - 6, 12, 12);
    ctx.globalAlpha = 0.7;
    // Rising green bubbles
    for (let i = 0; i < 2; i++) {
      const ox = (Math.random() - 0.5) * 10, oy = -8 - Math.sin(t * 2 + i) * 4;
      ctx.fillStyle = '#44ff44'; ctx.beginPath(); ctx.arc(px + ox, py + oy, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  if (e.shadowMark) {
    ctx.globalAlpha = 0.4; ctx.fillStyle = '#330066';
    ctx.fillRect(px - 7, py - 7, 14, 14);
    // Dark wisps
    for (let i = 0; i < 2; i++) {
      const ox = Math.sin(t * 1.5 + i * 3) * 8;
      ctx.fillStyle = '#6600bb'; ctx.fillRect(px + ox, py - 5 - i * 3, 2, 4);
    }
    ctx.globalAlpha = 1;
  }

  if (e.darkFlame) {
    ctx.globalAlpha = 0.7;
    for (let i = 0; i < 4; i++) {
      const ox = Math.sin(t * 4 + i * 1.5) * 6, oy = -3 - Math.random() * 5;
      ctx.fillStyle = i % 2 === 0 ? '#331100' : '#ff5500';
      ctx.fillRect(px + ox - 1, py + oy - 1, 3, 3);
    }
    ctx.globalAlpha = 1;
  }

  if (e.frozenToxin) {
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#226666'; ctx.lineWidth = 2;
    ctx.strokeRect(px - 10, py - 10, 20, 20);
    ctx.fillStyle = '#44aaaa';
    ctx.fillRect(px - 8, py - 8, 16, 16);
    ctx.globalAlpha = 0.3;
    // Crystal toxic shell
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + t;
      ctx.fillStyle = '#88ddff';
      ctx.fillRect(px + Math.cos(a) * 11, py + Math.sin(a) * 11, 3, 3);
    }
    ctx.globalAlpha = 1;
  }
}

function renderUpgradeSelect(ctx: CanvasRenderingContext2D, g: GameData) {
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, g.width, g.height);

  ctx.fillStyle = '#ffd700'; ctx.font = '900 42px Cinzel, serif'; ctx.textAlign = 'center';
  ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 20;
  ctx.fillText('POWER GROWS', g.width / 2, 80);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '16px monospace';
  ctx.fillText('Choose one enhancement', g.width / 2, 110);

  const cardW = 160, cardH = 200, spacing = 30;
  const totalW = g.upgradeCards.length * cardW + (g.upgradeCards.length - 1) * spacing;
  const startX = g.width / 2 - totalW / 2;

  for (let i = 0; i < g.upgradeCards.length; i++) {
    const card = g.upgradeCards[i];
    const progress = Math.min(1, Math.max(0, card.slideProgress / 60));
    const cy = 160 + (1 - progress) * 50;
    const cx = startX + i * (cardW + spacing);
    const isSelected = g.selectedUpgrade === i;
    const isFaded = g.selectedUpgrade >= 0 && !isSelected;

    ctx.globalAlpha = isFaded ? 0.3 : progress;

    // Card background
    const rarityColors: Record<UpgradeRarity, string> = { common: '#666666', rare: '#4488ff', epic: '#9b30ff' };
    const borderColor = isSelected ? '#ffd700' : rarityColors[card.upgrade.rarity];
    ctx.fillStyle = '#0d0d18'; ctx.fillRect(cx, cy, cardW, cardH);
    ctx.strokeStyle = borderColor; ctx.lineWidth = isSelected ? 3 : 2;
    ctx.strokeRect(cx, cy, cardW, cardH);

    if (isSelected) {
      ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 15;
      ctx.strokeRect(cx, cy, cardW, cardH);
      ctx.shadowBlur = 0;
    }

    // Rarity label
    ctx.fillStyle = borderColor; ctx.font = '700 10px monospace'; ctx.textAlign = 'center';
    ctx.fillText(card.upgrade.rarity.toUpperCase(), cx + cardW / 2, cy + 20);

    // Icon (simple colored diamond)
    ctx.fillStyle = card.upgrade.color; ctx.shadowColor = card.upgrade.color; ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(cx + cardW / 2, cy + 40); ctx.lineTo(cx + cardW / 2 + 12, cy + 55);
    ctx.lineTo(cx + cardW / 2, cy + 70); ctx.lineTo(cx + cardW / 2 - 12, cy + 55);
    ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;

    // Name
    ctx.fillStyle = '#ffffff'; ctx.font = '700 14px Orbitron, monospace';
    ctx.fillText(card.upgrade.name, cx + cardW / 2, cy + 100);

    // Description (word wrap)
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '11px monospace';
    const words = card.upgrade.description.split(' ');
    let line = '', lineY = cy + 120;
    for (const word of words) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > cardW - 20) {
        ctx.fillText(line, cx + cardW / 2, lineY);
        line = word + ' '; lineY += 14;
      } else line = test;
    }
    ctx.fillText(line, cx + cardW / 2, lineY);

    // Click hint
    if (g.selectedUpgrade < 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '10px monospace';
      ctx.fillText('CLICK', cx + cardW / 2, cy + cardH - 10);
    }

    ctx.globalAlpha = 1;
  }
}

function renderGemUnlock(ctx: CanvasRenderingContext2D, g: GameData) {
  const gt = g.gemUnlockType!;
  const colorMap: Record<WeaponType, string> = {
    shadow: '#9b30ff', fire: '#ff5500', frost: '#88ddff', storm: '#ffdd00', venom: '#44ff44',
    void: '#9b30ff', terra: '#cc8844', gale: '#aaddff', flux: '#ffaa00',
  };
  const nameMap: Record<WeaponType, string> = {
    shadow: 'SHADOW', fire: 'EMBER', frost: 'FROST', storm: 'STORM', venom: 'VENOM',
    void: 'VOID', terra: 'TERRA', gale: 'GALE', flux: 'FLUX',
  };
  const keyMap: Record<WeaponType, string> = {
    shadow: '1', fire: '2', frost: '3', storm: '4', venom: '5',
    void: '6', terra: '7', gale: '8', flux: '9',
  };
  const color = colorMap[gt];
  const progress = 1 - g.gemUnlockTimer / 120;

  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, g.width, g.height);

  const gemY = g.height / 2 - 20 + (1 - progress) * 40;
  const scale = 2 + progress;
  ctx.save(); ctx.translate(g.width / 2, gemY); ctx.scale(scale, scale);
  ctx.shadowColor = color; ctx.shadowBlur = 30; ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(5, 0); ctx.lineTo(0, 6); ctx.lineTo(-5, 0);
  ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; ctx.restore();

  ctx.fillStyle = color; ctx.font = '900 42px Cinzel, serif'; ctx.textAlign = 'center';
  ctx.shadowColor = color; ctx.shadowBlur = 20;
  ctx.fillText(`${nameMap[gt]} GEM ACQUIRED`, g.width / 2, g.height / 2 + 50);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '18px monospace';
  ctx.fillText(`Press ${keyMap[gt]} to equip`, g.width / 2, g.height / 2 + 80);
}

function renderArena(ctx: CanvasRenderingContext2D, g: GameData) {
  ctx.fillStyle = '#141420'; ctx.fillRect(0, 0, g.arenaWidth, g.arenaHeight);
  ctx.fillStyle = '#0d0d18';
  ctx.fillRect(0, 0, g.arenaWidth, 150); ctx.fillRect(0, g.arenaHeight - 150, g.arenaWidth, 150);

  ctx.strokeStyle = '#111120'; ctx.lineWidth = 1;
  for (let x = 0; x < g.arenaWidth; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, g.arenaHeight); ctx.stroke(); }
  for (let y = 0; y < g.arenaHeight; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(g.arenaWidth, y); ctx.stroke(); }

  ctx.strokeStyle = 'rgba(30,30,50,0.3)'; ctx.lineWidth = 1;
  const crackPositions = [[150, 300], [500, 500], [900, 250], [700, 650], [300, 600]];
  for (const [cx, cy] of crackPositions) {
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 15, cy + 8); ctx.lineTo(cx + 25, cy + 3); ctx.stroke();
  }

  const bw = g.borderSize;
  ctx.strokeStyle = '#3a0066'; ctx.lineWidth = bw;
  ctx.shadowColor = '#9b30ff'; ctx.shadowBlur = 15;
  ctx.strokeRect(bw / 2, bw / 2, g.arenaWidth - bw, g.arenaHeight - bw);
  ctx.shadowBlur = 0;
}

function drawObstacle(ctx: CanvasRenderingContext2D, obs: import('./types').Obstacle) {
  const { pos, width, height, type } = obs;
  if (type === 'pillar') {
    ctx.fillStyle = '#1a1a28'; ctx.fillRect(pos.x, pos.y, width, height);
    ctx.fillStyle = '#252540'; ctx.fillRect(pos.x + 2, pos.y + 2, width - 4, 4); ctx.fillRect(pos.x + 2, pos.y + height - 6, width - 4, 4);
    ctx.fillStyle = 'rgba(100,0,200,0.15)'; ctx.fillRect(pos.x - 2, pos.y + height - 2, width + 4, 4);
    ctx.shadowColor = '#6600bb'; ctx.shadowBlur = 6; ctx.fillRect(pos.x, pos.y + height - 1, width, 2); ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = '#1a1a28'; ctx.fillRect(pos.x, pos.y, width, height);
    ctx.fillStyle = '#252540'; ctx.fillRect(pos.x + 2, pos.y + 2, width - 4, Math.max(height - 4, 2));
  }
}

function drawProjectile(ctx: CanvasRenderingContext2D, proj: Projectile) {
  const px = Math.floor(proj.pos.x), py = Math.floor(proj.pos.y);

  // Parried projectile glow
  if (proj.isParried) {
    ctx.fillStyle = '#ffd700'; ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; return;
  }

  if (proj.type === 'holy') {
    ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd700'; ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
    return;
  }

  if (proj.type === 'shadow') {
    ctx.fillStyle = '#6600bb'; ctx.shadowColor = '#aa44ff'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#aa44ff'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0;
  } else if (proj.type === 'fire') {
    ctx.save();
    const angle = Math.atan2(proj.vel.y, proj.vel.x);
    ctx.translate(px, py); ctx.rotate(angle);
    const f1 = (Math.random() - 0.5) * 2, f2 = (Math.random() - 0.5) * 2;
    ctx.fillStyle = '#ffaa00'; ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(5, 0);
    ctx.quadraticCurveTo(0, -4 + f1, -5, -2 + f2);
    ctx.quadraticCurveTo(-6, 0, -5, 2 - f2);
    ctx.quadraticCurveTo(0, 4 - f1, 5, 0); ctx.fill();
    ctx.fillStyle = '#ff4400';
    ctx.beginPath(); ctx.moveTo(3, 0);
    ctx.quadraticCurveTo(0, -2, -3, 0); ctx.quadraticCurveTo(0, 2, 3, 0); ctx.fill();
    ctx.shadowBlur = 0; ctx.restore();
  } else if (proj.type === 'frost') {
    ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#aaeeff'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.moveTo(px, py - 4); ctx.lineTo(px + 6, py); ctx.lineTo(px, py + 4); ctx.lineTo(px - 6, py);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#aaeeff';
    ctx.beginPath(); ctx.moveTo(px, py - 2); ctx.lineTo(px + 3, py); ctx.lineTo(px, py + 2); ctx.lineTo(px - 3, py);
    ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
  } else if (proj.type === 'storm') {
    const angle = Math.atan2(proj.vel.y, proj.vel.x);
    ctx.save(); ctx.translate(px, py); ctx.rotate(angle);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.shadowColor = '#ffee00'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-3, -3); ctx.lineTo(1, 2); ctx.lineTo(5, -2); ctx.lineTo(7, 0); ctx.stroke();
    ctx.strokeStyle = '#ffee00'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-3, -3); ctx.lineTo(1, 2); ctx.lineTo(5, -2); ctx.lineTo(7, 0); ctx.stroke();
    ctx.shadowBlur = 0; ctx.restore();
  } else if (proj.type === 'venom') {
    const wobbleR = proj.growSize / 2;
    ctx.fillStyle = '#00aa00'; ctx.globalAlpha = 0.7; ctx.shadowColor = '#44ff44'; ctx.shadowBlur = 6;
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = wobbleR + (Math.random() - 0.5) * 2;
      const wx = px + Math.cos(a) * r, wy = py + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#44ff44'; ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.arc(px, py, wobbleR * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  } else if (proj.type === 'void') {
    ctx.fillStyle = '#330066'; ctx.shadowColor = '#9b30ff'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9b30ff'; ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  } else if (proj.type === 'terra') {
    ctx.fillStyle = '#886633'; ctx.shadowColor = '#cc8844'; ctx.shadowBlur = 6;
    ctx.fillRect(px - 5, py - 5, 10, 10);
    ctx.fillStyle = '#aa7744'; ctx.fillRect(px - 3, py - 3, 6, 6); ctx.shadowBlur = 0;
  } else if (proj.type === 'gale') {
    const angle = Math.atan2(proj.vel.y, proj.vel.x);
    ctx.save(); ctx.translate(px, py); ctx.rotate(angle);
    ctx.strokeStyle = '#aaddff'; ctx.lineWidth = 2; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 4;
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, -3); ctx.lineTo(8, 0); ctx.lineTo(4, 3); ctx.stroke();
    ctx.shadowBlur = 0; ctx.restore();
  } else if (proj.type === 'flux') {
    const t = Date.now() * 0.01;
    const colors = ['#ff5500', '#88ddff', '#ffdd00', '#44ff44', '#9b30ff'];
    ctx.fillStyle = colors[Math.floor(t) % colors.length];
    ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = '#00ff44'; ctx.shadowColor = '#00ff44'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  }
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy) {
  if (e.type === 'rusher') { if (e.evolved) drawEvolvedRusher(ctx, e); else drawRusher(ctx, e); }
  else if (e.type === 'sniper') { if (e.evolved) drawEvolvedSniper(ctx, e); else drawSniper(ctx, e); }
  else if (e.type === 'titan') drawTitan(ctx, e);
  else if (e.type === 'fogWeaver') { if (e.evolved) drawEvolvedFogWeaver(ctx, e); else drawFogWeaver(ctx, e); }
  else if (e.type === 'shieldRusher') drawShieldRusher(ctx, e);
  else if (e.type === 'brute') drawBrute(ctx, e);
  else if (e.type === 'boss') drawBoss(ctx, e);
}

function drawRusher(ctx: CanvasRenderingContext2D, e: Enemy) {
  const wobbleOffset = Math.sin(e.wobblePhase) * 2;
  const px = Math.floor(e.pos.x), py = Math.floor(e.pos.y + wobbleOffset);
  if (e.flashTimer > 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(px - 8, py - 8, 16, 16); return; }
  const legOffset = Math.sin(e.animFrame * Math.PI / 2) * 2;
  ctx.fillStyle = '#5c3d2e';
  ctx.fillRect(px - 4, py + 4, 3, 4 + legOffset); ctx.fillRect(px + 1, py + 4, 3, 4 - legOffset);
  ctx.fillStyle = '#5c3d2e'; ctx.fillRect(px - 3, py, 6, 6);
  ctx.fillStyle = e.poison ? '#558b25' : '#8b2500'; ctx.fillRect(px - 8, py - 8, 16, 10);
  ctx.fillStyle = e.poison ? '#66aa33' : '#aa3300'; ctx.fillRect(px - 6, py - 8, 12, 3);
  ctx.fillStyle = '#cc5533'; ctx.fillRect(px - 5, py - 6, 2, 2); ctx.fillRect(px + 3, py - 5, 2, 2);
  ctx.fillStyle = '#ff3333'; ctx.shadowColor = '#ff3333'; ctx.shadowBlur = 4;
  ctx.fillRect(px - 4, py - 1, 3, 3); ctx.fillRect(px + 1, py - 1, 3, 3);
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawEvolvedRusher(ctx: CanvasRenderingContext2D, e: Enemy) {
  const wobbleOffset = Math.sin(e.wobblePhase) * 2;
  const px = Math.floor(e.pos.x), py = Math.floor(e.pos.y + wobbleOffset);
  if (e.flashTimer > 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(px - 10, py - 10, 20, 20); return; }
  const legOffset = Math.sin(e.animFrame * Math.PI / 2) * 2;
  ctx.fillStyle = '#3a1a10';
  ctx.fillRect(px - 5, py + 5, 4, 5 + legOffset); ctx.fillRect(px + 1, py + 5, 4, 5 - legOffset);
  ctx.fillStyle = '#3a1a10'; ctx.fillRect(px - 4, py, 8, 7);
  ctx.fillStyle = '#330000'; ctx.fillRect(px - 10, py - 10, 20, 12);
  ctx.fillStyle = '#440000'; ctx.fillRect(px - 8, py - 10, 16, 4);
  ctx.fillStyle = '#220000';
  ctx.fillRect(px - 10, py - 14, 2, 4); ctx.fillRect(px - 4, py - 13, 2, 3);
  ctx.fillRect(px + 2, py - 14, 2, 4); ctx.fillRect(px + 8, py - 13, 2, 3);
  ctx.fillStyle = '#ff0000'; ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 6;
  ctx.fillRect(px - 5, py - 2, 4, 3); ctx.fillRect(px + 1, py - 2, 4, 3);
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawShieldRusher(ctx: CanvasRenderingContext2D, e: Enemy) {
  const px = Math.floor(e.pos.x), py = Math.floor(e.pos.y);
  if (e.flashTimer > 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(px - 10, py - 10, 20, 20); return; }
  // Body like rusher
  drawRusher(ctx, { ...e, type: 'rusher' } as Enemy);
  // Shield
  ctx.save(); ctx.translate(px, py); ctx.rotate(e.shieldAngle);
  ctx.fillStyle = '#5c3d2e'; ctx.fillRect(8, -8, 5, 16);
  ctx.fillStyle = '#886633'; ctx.fillRect(9, -6, 3, 12);
  ctx.strokeStyle = '#aa8844'; ctx.lineWidth = 1; ctx.strokeRect(8, -8, 5, 16);
  ctx.restore();
}

function drawBrute(ctx: CanvasRenderingContext2D, e: Enemy) {
  const px = Math.floor(e.pos.x), py = Math.floor(e.pos.y);
  const lurch = Math.sin(e.wobblePhase * 0.3) * 1;
  if (e.flashTimer > 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(px - 12, py - 12, 24, 24); return; }
  // Body
  ctx.fillStyle = '#1a0f05'; ctx.fillRect(px - 6, py + 2, 12, 10);
  const legOff = Math.sin(e.animFrame * Math.PI / 2) * 1.5;
  ctx.fillRect(px - 5, py + 10, 4, 4 + legOff); ctx.fillRect(px + 1, py + 10, 4, 4 - legOff);
  // Cap
  ctx.fillStyle = '#0a0a0a'; ctx.fillRect(px - 12, py - 12 + lurch, 24, 14);
  ctx.fillStyle = '#1a1a1a'; ctx.fillRect(px - 10, py - 12 + lurch, 20, 4);
  // Eyes
  ctx.fillStyle = '#ff6600'; ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 4;
  ctx.fillRect(px - 4, py - 2, 3, 3); ctx.fillRect(px + 1, py - 2, 3, 3);
  ctx.shadowBlur = 0;
  // Double shields
  ctx.save(); ctx.translate(px, py); ctx.rotate(e.shieldAngle);
  ctx.fillStyle = '#3a2a1a'; ctx.fillRect(10, -10, 5, 20); ctx.fillRect(-15, -10, 5, 20);
  ctx.strokeStyle = '#664422'; ctx.lineWidth = 1;
  ctx.strokeRect(10, -10, 5, 20); ctx.strokeRect(-15, -10, 5, 20);
  ctx.restore();
}

function drawSniper(ctx: CanvasRenderingContext2D, e: Enemy) {
  const px = Math.floor(e.pos.x), py = Math.floor(e.pos.y);
  const bob = Math.sin(e.wobblePhase * 0.7) * 1.5;
  if (e.flashTimer > 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(px - 9, py - 9, 18, 18); return; }
  ctx.fillStyle = '#3d2e5c'; ctx.fillRect(px - 3, py + 2, 6, 8);
  ctx.fillStyle = '#2a0055'; ctx.fillRect(px - 9, py - 10 + bob, 18, 14);
  ctx.fillStyle = '#3a0077'; ctx.fillRect(px - 7, py - 10 + bob, 14, 4);
  ctx.fillStyle = '#00ff44'; ctx.shadowColor = '#00ff44'; ctx.shadowBlur = 5;
  ctx.fillRect(px - 4, py - 1, 3, 3); ctx.fillRect(px + 1, py - 1, 3, 3);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#004400'; ctx.fillRect(px - 2, py + 6, 4, 3); ctx.globalAlpha = 1;
}

function drawEvolvedSniper(ctx: CanvasRenderingContext2D, e: Enemy) {
  const px = Math.floor(e.pos.x), py = Math.floor(e.pos.y);
  const bob = Math.sin(e.wobblePhase * 0.7) * 1.5;
  if (e.flashTimer > 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(px - 10, py - 12, 20, 24); return; }
  ctx.fillStyle = '#220044';
  ctx.fillRect(px - 6, py + 6, 1, 6); ctx.fillRect(px + 5, py + 6, 1, 6);
  ctx.fillRect(px - 8, py + 4, 1, 5); ctx.fillRect(px + 7, py + 4, 1, 5);
  ctx.fillStyle = '#1a0033'; ctx.fillRect(px - 4, py + 2, 8, 10);
  ctx.fillStyle = '#110022'; ctx.fillRect(px - 10, py - 12 + bob, 20, 16);
  ctx.fillStyle = '#220044'; ctx.fillRect(px - 8, py - 12 + bob, 16, 5);
  ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 6;
  ctx.fillRect(px - 4, py - 1, 3, 3); ctx.fillRect(px + 1, py - 1, 3, 3);
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawTitan(ctx: CanvasRenderingContext2D, e: Enemy) {
  const px = Math.floor(e.pos.x), py = Math.floor(e.pos.y);
  const lurch = Math.sin(e.wobblePhase * 0.3) * 1;
  if (e.flashTimer > 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(px - 14, py - 14, 28, 28); return; }
  ctx.fillStyle = '#2a1a0a'; ctx.fillRect(px - 8, py + 2, 16, 12);
  const legOff = Math.sin(e.animFrame * Math.PI / 2) * 1.5;
  ctx.fillStyle = '#1a0f05';
  ctx.fillRect(px - 7, py + 12, 5, 5 + legOff); ctx.fillRect(px + 2, py + 12, 5, 5 - legOff);
  ctx.fillStyle = '#1a0f05'; ctx.fillRect(px - 14, py - 14 + lurch, 28, 18);
  ctx.fillStyle = '#2a1a0a'; ctx.fillRect(px - 12, py - 14 + lurch, 24, 5);
  ctx.fillStyle = '#332200'; ctx.fillRect(px - 10, py - 10 + lurch, 20, 4);
  ctx.fillStyle = '#ff6600'; ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 6;
  ctx.fillRect(px - 5, py - 2, 4, 4); ctx.fillRect(px + 1, py - 2, 4, 4);
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawFogWeaver(ctx: CanvasRenderingContext2D, e: Enemy) {
  const px = Math.floor(e.pos.x), py = Math.floor(e.pos.y);
  const drift = Math.sin(e.wobblePhase * 0.5) * 2;
  if (e.flashTimer > 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(px - 8, py - 8, 16, 16); return; }
  ctx.globalAlpha = 0.7; ctx.fillStyle = '#334444';
  ctx.fillRect(px - 2, py + 6, 1, 6 + drift); ctx.fillRect(px + 1, py + 6, 1, 5 - drift);
  ctx.fillRect(px - 4, py + 5, 1, 4); ctx.fillRect(px + 3, py + 5, 1, 4);
  ctx.fillStyle = '#2a3a3a'; ctx.fillRect(px - 4, py - 2, 8, 8);
  ctx.fillStyle = '#1a3030'; ctx.fillRect(px - 8, py - 8 + drift, 16, 8);
  ctx.fillStyle = '#2a4040'; ctx.fillRect(px - 6, py - 8 + drift, 12, 3);
  ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#aaffff'; ctx.shadowBlur = 4;
  ctx.fillRect(px - 3, py - 1, 2, 2); ctx.fillRect(px + 1, py - 1, 2, 2);
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawEvolvedFogWeaver(ctx: CanvasRenderingContext2D, e: Enemy) {
  const px = Math.floor(e.pos.x), py = Math.floor(e.pos.y);
  const drift = Math.sin(e.wobblePhase * 0.5) * 2;
  if (e.flashTimer > 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(px - 8, py - 8, 16, 16); return; }
  ctx.globalAlpha = 0.5; ctx.fillStyle = '#220044';
  ctx.fillRect(px - 2, py + 6, 1, 6 + drift); ctx.fillRect(px + 1, py + 6, 1, 5 - drift);
  ctx.fillRect(px - 4, py + 5, 1, 4); ctx.fillRect(px + 3, py + 5, 1, 4);
  ctx.fillStyle = '#1a0033'; ctx.fillRect(px - 4, py - 2, 8, 8);
  ctx.fillStyle = '#110022'; ctx.fillRect(px - 8, py - 8 + drift, 16, 8);
  ctx.fillStyle = '#220044'; ctx.fillRect(px - 6, py - 8 + drift, 12, 3);
  ctx.fillStyle = '#cc88ff'; ctx.shadowColor = '#cc88ff'; ctx.shadowBlur = 6;
  ctx.fillRect(px - 3, py - 1, 2, 2); ctx.fillRect(px + 1, py - 1, 2, 2);
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawBoss(ctx: CanvasRenderingContext2D, e: Enemy) {
  const px = Math.floor(e.pos.x), py = Math.floor(e.pos.y);
  const lurch = Math.sin(e.wobblePhase * 0.4) * 2;
  if (e.flashTimer > 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(px - 18, py - 18, 36, 36); return; }
  const isEnraged = e.bossPhase === 3 || e.isBerserk;
  const color = HERALD_COLORS[e.heraldType] || '#9b30ff';

  ctx.fillStyle = '#0d0018'; ctx.fillRect(px - 10, py - 4, 20, 16);
  ctx.fillStyle = '#1a0033';
  ctx.fillRect(px - 12, py + 4, 4, 14 + lurch); ctx.fillRect(px + 8, py + 4, 4, 14 + lurch);
  ctx.fillStyle = '#1a0033';
  ctx.fillRect(px - 10, py - 4, 1, 16); ctx.fillRect(px + 9, py - 4, 1, 16);

  const capColors: Record<number, [string, string]> = {
    1: [e.isBerserk ? '#660000' : isEnraged ? '#880000' : '#442200', '#ff5500'],
    2: ['#aaddff', '#ffffff'], 3: [isEnraged ? '#553355' : '#334', '#ffdd00'],
    4: ['#003300', '#44ff44'], 5: [isEnraged ? '#220044' : '#110022', '#9b30ff'],
    6: ['#332200', '#cc8844'], 7: ['#aaccdd', '#ffffff'], 8: ['#443300', '#ffaa00'],
  };
  const [capColor, accentColor] = capColors[e.heraldType] || ['#2a0055', '#ffd700'];
  ctx.fillStyle = capColor; ctx.fillRect(px - 18, py - 18 + lurch, 36, 16);
  ctx.fillStyle = accentColor; ctx.fillRect(px - 16, py - 18 + lurch, 32, 3);
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(px - 8, py - 20 + lurch, 2, 4); ctx.fillRect(px - 2, py - 22 + lurch, 2, 6); ctx.fillRect(px + 4, py - 21 + lurch, 2, 5);

  const eyeColor = e.isBerserk ? '#ff0000' : isEnraged ? '#ff0000' : color;
  ctx.fillStyle = eyeColor; ctx.shadowColor = eyeColor;
  ctx.shadowBlur = e.isBerserk ? 15 : isEnraged ? 10 : 6;
  ctx.fillRect(px - 6, py - 2, 4, 4); ctx.fillRect(px + 2, py - 2, 4, 4);
  ctx.shadowBlur = 0;
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: Player, overrideX?: number, overrideY?: number, overrideAngle?: number) {
  const posX = overrideX ?? p.pos.x;
  const posY = overrideY ?? p.pos.y;
  const angle = overrideAngle ?? p.angle;

  ctx.save(); ctx.translate(Math.floor(posX), Math.floor(posY)); ctx.rotate(angle);

  if (p.flashTimer > 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(-10, -10, 20, 20); ctx.restore(); return; }
  if (p.purpleFlashTimer > 0 && p.purpleFlashTimer > 8) {
    ctx.fillStyle = '#9944ff'; ctx.shadowColor = '#9944ff'; ctx.shadowBlur = 8;
    ctx.fillRect(-10, -10, 20, 20); ctx.shadowBlur = 0; ctx.restore(); return;
  }

  const breathOffset = p.animState === 'idle' ? Math.sin(p.animFrame * (Math.PI * 2 / 3)) * 0.5 : 0;
  const capeShift = p.animState === 'walk' ? Math.sin(p.animFrame * Math.PI / 2) * 2 : Math.sin(p.animFrame * Math.PI * 2 / 3) * 0.5;
  const capeScale = p.umbraMode ? 1.5 : 1;

  if (p.umbraMode) {
    ctx.shadowColor = '#9b30ff'; ctx.shadowBlur = 20;
    ctx.fillStyle = 'rgba(153,68,255,0.2)';
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  }

  ctx.fillStyle = p.umbraMode ? '#1a0044' : '#0a0a28';
  ctx.fillRect(-9, -2, 4, (12 + capeShift) * capeScale);
  ctx.fillRect(-7, (8 + capeShift) * capeScale, 3, 3);

  ctx.fillStyle = '#0d0d18'; ctx.fillRect(-7, -7 + breathOffset, 14, 14);
  ctx.fillStyle = '#2e2e50';
  ctx.fillRect(-7, -7 + breathOffset, 1, 14); ctx.fillRect(6, -7 + breathOffset, 1, 14);
  ctx.fillRect(-7, -7 + breathOffset, 14, 1); ctx.fillRect(-7, 6 + breathOffset, 14, 1);

  ctx.fillStyle = '#1a1a2a'; ctx.fillRect(-5, -10 + breathOffset, 10, 6);
  ctx.fillStyle = '#252535';
  ctx.fillRect(-5, -12 + breathOffset, 2, 3); ctx.fillRect(-1, -13 + breathOffset, 2, 4); ctx.fillRect(3, -12 + breathOffset, 2, 3);

  const eyeColor = p.umbraMode ? '#ffd700' : '#9944ff';
  ctx.fillStyle = eyeColor; ctx.shadowColor = eyeColor;
  ctx.shadowBlur = p.umbraMode ? 10 : 6;
  ctx.fillRect(3, -7 + breathOffset, 3, 2); ctx.fillRect(3, -4 + breathOffset, 3, 2);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#880000'; ctx.fillRect(-6, 1 + breathOffset, 12, 2);

  const bracerExtend = p.animState === 'attack' ? 4 : 0;
  const bracerColors: Record<WeaponType, string> = {
    shadow: '#6600bb', fire: '#ff5500', frost: '#4499dd', storm: '#ddaa00', venom: '#33cc33',
    void: '#6600bb', terra: '#aa7744', gale: '#88bbdd', flux: '#ddaa00',
  };
  ctx.fillStyle = bracerColors[p.activeWeapon]; ctx.shadowColor = bracerColors[p.activeWeapon];
  ctx.shadowBlur = p.animState === 'attack' ? 8 : 4;
  ctx.fillRect(6 + bracerExtend, -3 + breathOffset, 5, 6); ctx.shadowBlur = 0;
  ctx.fillStyle = '#2e2e50'; ctx.fillRect(-5, 3 + breathOffset, 10, 1);
  ctx.restore();
}

function drawSolus(ctx: CanvasRenderingContext2D, s: SolusPlayer, overrideX?: number, overrideY?: number) {
  const posX = overrideX ?? s.pos.x;
  const posY = overrideY ?? s.pos.y;
  ctx.save(); ctx.translate(Math.floor(posX), Math.floor(posY)); ctx.rotate(s.angle);

  if (s.flashTimer > 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(-10, -10, 20, 20); ctx.restore(); return; }
  if (s.goldFlashTimer > 0 && s.goldFlashTimer > 8) {
    ctx.fillStyle = '#ffd700'; ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 8;
    ctx.fillRect(-10, -10, 20, 20); ctx.shadowBlur = 0; ctx.restore(); return;
  }

  const breathOffset = s.animState === 'idle' ? Math.sin(s.animFrame * (Math.PI * 2 / 3)) * 0.5 : 0;
  const capeShift = s.animState === 'walk' ? Math.sin(s.animFrame * Math.PI / 2) * 2 : Math.sin(s.animFrame * Math.PI * 2 / 3) * 0.5;

  // Divine Reckoning glow
  if (s.divineReckoningActive) {
    ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 20;
    ctx.fillStyle = 'rgba(255,221,68,0.2)';
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  }

  // Cape - white/silver, torn
  ctx.fillStyle = s.divineReckoningActive ? '#ffffdd' : '#e8e8ff';
  ctx.fillRect(-9, -2, 4, (10 + capeShift));
  ctx.fillRect(-7, (6 + capeShift), 3, 2);

  // Body - silver plate
  ctx.fillStyle = '#d0d0e0'; ctx.fillRect(-7, -7 + breathOffset, 14, 14);
  ctx.fillStyle = '#a0a0b8';
  ctx.fillRect(-7, -7 + breathOffset, 1, 14); ctx.fillRect(6, -7 + breathOffset, 1, 14);
  ctx.fillRect(-7, -7 + breathOffset, 14, 1); ctx.fillRect(-7, 6 + breathOffset, 14, 1);
  // Edge highlights
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-6, -6 + breathOffset, 1, 1); ctx.fillRect(5, -6 + breathOffset, 1, 1);

  // Helmet - silver crowned
  ctx.fillStyle = '#a0a0b8'; ctx.fillRect(-5, -10 + breathOffset, 10, 6);
  ctx.fillStyle = '#c0c0d0';
  ctx.fillRect(-5, -12 + breathOffset, 2, 3); ctx.fillRect(-1, -13 + breathOffset, 2, 4); ctx.fillRect(3, -12 + breathOffset, 2, 3);

  // Eyes - golden
  ctx.fillStyle = '#ffdd44'; ctx.shadowColor = '#ffdd44';
  ctx.shadowBlur = s.divineReckoningActive ? 12 : 6;
  ctx.fillRect(3, -7 + breathOffset, 3, 2); ctx.fillRect(3, -4 + breathOffset, 3, 2);
  ctx.shadowBlur = 0;

  // Belt
  ctx.fillStyle = '#8888aa'; ctx.fillRect(-6, 1 + breathOffset, 12, 2);

  // Radiant Gauntlet - LEFT arm (mirrored from Umbra)
  const bracerExtend = s.animState === 'attack' ? 4 : 0;
  ctx.fillStyle = s.divineReckoningActive ? '#ffffff' : '#fff5aa';
  ctx.shadowColor = '#ffd700'; ctx.shadowBlur = s.animState === 'attack' ? 10 : 5;
  ctx.fillRect(-11 - bracerExtend, -3 + breathOffset, 5, 6); ctx.shadowBlur = 0;

  // Legs detail
  ctx.fillStyle = '#a0a0b8'; ctx.fillRect(-5, 3 + breathOffset, 10, 1);

  // Light particles drifting upward
  if (Math.random() < 0.3) {
    ctx.fillStyle = '#ffd700'; ctx.globalAlpha = 0.4;
    ctx.fillRect((Math.random() - 0.5) * 12, -10 - Math.random() * 6, 1, 1);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function drawGemPickup(ctx: CanvasRenderingContext2D, x: number, y: number, pulse: number, gemType: WeaponType) {
  const scale = 1 + Math.sin(pulse) * 0.15;
  const px = Math.floor(x), py = Math.floor(y);
  const colors: Record<WeaponType, [string, string]> = {
    shadow: ['#9b30ff', '#cc88ff'], fire: ['#ff5500', '#ffaa00'], frost: ['#88ddff', '#aaeeff'],
    storm: ['#ffdd00', '#ffee66'], venom: ['#44ff44', '#88ff88'],
    void: ['#9b30ff', '#cc88ff'], terra: ['#cc8844', '#ddaa66'], gale: ['#aaddff', '#ddeeff'],
    flux: ['#ffaa00', '#ffdd66'],
  };
  const [outer, inner] = colors[gemType];
  ctx.save(); ctx.translate(px, py); ctx.scale(scale, scale);
  ctx.shadowColor = outer; ctx.shadowBlur = 15; ctx.fillStyle = outer;
  ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(5, 0); ctx.lineTo(0, 6); ctx.lineTo(-5, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = inner;
  ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(2, 0); ctx.lineTo(0, 3); ctx.lineTo(-2, 0); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0; ctx.restore();
}

function renderHUD(ctx: CanvasRenderingContext2D, g: GameData) {
  ctx.fillStyle = '#ffd700'; ctx.font = '12px monospace'; ctx.textAlign = 'left';
  ctx.fillText('WAVE', 30, 28);
  ctx.font = '900 28px Cinzel, serif'; ctx.fillText(`${g.wave}`, 30, 56);

  if (g.state === 'playing' && g.enemiesRemainingInWave > 0) {
    ctx.fillStyle = '#ff4444'; ctx.font = '12px monospace';
    ctx.fillText(`▸ ${g.enemiesRemainingInWave} REMAIN`, 30, 72);
  }

  // HP orbs
  const orbSize = 10, orbSpacing = 26;
  const orbStartX = g.width - 30 - (g.player.maxHp - 1) * orbSpacing;
  for (let i = 0; i < g.player.maxHp; i++) {
    const ox = orbStartX + i * orbSpacing, oy = 36;
    ctx.beginPath(); ctx.arc(ox, oy, orbSize, 0, Math.PI * 2);
    if (i < g.player.hp) { ctx.fillStyle = '#9b30ff'; ctx.shadowColor = '#9b30ff'; ctx.shadowBlur = 10; }
    else { ctx.fillStyle = '#333340'; ctx.shadowBlur = 0; }
    ctx.fill(); ctx.shadowBlur = 0;
  }

  // Boss health bar
  const bossEnemy = g.enemies.find(e => e.type === 'boss');
  if (bossEnemy) {
    const barW = g.width - 200, barH = 16, barX = 100, barY = 70;
    const color = bossEnemy.isBerserk ? '#ff0000' : HERALD_COLORS[bossEnemy.heraldType] || '#cc0000';
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2; ctx.strokeRect(barX, barY, barW, barH);
    const fill = Math.max(0, bossEnemy.hp / bossEnemy.maxHp);
    ctx.fillStyle = '#220000'; ctx.fillRect(barX + 1, barY + 1, barW - 2, barH - 2);
    ctx.fillStyle = color; ctx.fillRect(barX + 1, barY + 1, (barW - 2) * fill, barH - 2);
    ctx.fillStyle = '#ffd700'; ctx.font = '700 14px Cinzel, serif'; ctx.textAlign = 'center';
    const bossLabel = bossEnemy.isBerserk ? (HERALD_NAMES[bossEnemy.heraldType] || 'HERALD') + ' — BERSERK' : HERALD_NAMES[bossEnemy.heraldType] || 'THE MYCELIUM HERALD';
    ctx.fillText(bossLabel, g.width / 2, barY - 6);
  }

  // Score
  ctx.fillStyle = 'rgba(255,215,0,0.6)'; ctx.font = '12px monospace'; ctx.textAlign = 'left';
  ctx.fillText(`KILLS: ${g.score}`, 30, g.height - 40);
  ctx.fillText(`BEST WAVE: ${g.bestWave}`, 30, g.height - 24);
  if (g.player.scoreMultiplier > 1) {
    ctx.fillStyle = '#ffd700'; ctx.fillText(`${g.player.scoreMultiplier}x SCORE`, 130, g.height - 40);
  }

  // Upgrade icons
  if (g.player.upgrades.length > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '8px monospace'; ctx.textAlign = 'left';
    ctx.fillText(`UPGRADES: ${g.player.upgrades.length}`, g.width - 120, g.height - 24);
  }

  // Dash cooldown indicator
  const dashReady = g.player.dashCooldown <= 0 && !g.player.isDashing;
  const dashX = 30, dashY = g.height - 100;
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(dashX - 12, dashY - 12, 24, 24);
  if (dashReady) { ctx.fillStyle = '#9b30ff'; ctx.shadowColor = '#9b30ff'; ctx.shadowBlur = 6; }
  else { ctx.fillStyle = '#333340'; ctx.shadowBlur = 0;
    const maxCd = g.player.upgrades.includes('swiftShadow') ? 78 : 108;
    const pct = 1 - g.player.dashCooldown / maxCd;
    ctx.fillStyle = '#555560'; ctx.fillRect(dashX - 10, dashY + 10 - pct * 20, 20, pct * 20);
    ctx.fillStyle = '#333340';
  }
  ctx.font = '700 10px monospace'; ctx.textAlign = 'center';
  ctx.fillText('SPC', dashX, dashY + 4); ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '8px monospace';
  ctx.fillText('DASH', dashX, dashY + 18);

  // Conviction bar
  const convBarW = 200, convBarH = 8;
  const convBarX = g.width / 2 - convBarW / 2, convBarY = g.height - 100;
  const umbraReady = g.player.conviction >= 100 && !g.player.umbraMode && g.player.umbraModeCooldown <= 0;

  if (g.player.umbraMode) {
    const maxDur = g.player.upgrades.includes('umbrasWill') ? 720 : 480;
    const pct = g.player.umbraModeTimer / maxDur;
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2;
    ctx.strokeRect(convBarX, convBarY, convBarW, convBarH);
    ctx.fillStyle = '#9b30ff'; ctx.fillRect(convBarX + 1, convBarY + 1, (convBarW - 2) * pct, convBarH - 2);
    ctx.fillStyle = '#ffd700'; ctx.font = '700 10px Cinzel, serif'; ctx.textAlign = 'center';
    const secs = Math.ceil(g.player.umbraModeTimer / 60);
    ctx.fillText(`UMBRA MODE — ${secs}s`, g.width / 2, convBarY - 4);
  } else {
    ctx.strokeStyle = umbraReady ? '#ffd700' : '#444455'; ctx.lineWidth = 1;
    ctx.strokeRect(convBarX, convBarY, convBarW, convBarH);
    ctx.fillStyle = '#1a0033'; ctx.fillRect(convBarX + 1, convBarY + 1, convBarW - 2, convBarH - 2);
    const pct = g.player.conviction / 100;
    ctx.fillStyle = umbraReady ? '#ffd700' : '#6600bb';
    ctx.fillRect(convBarX + 1, convBarY + 1, (convBarW - 2) * pct, convBarH - 2);
    ctx.fillStyle = umbraReady ? '#ffd700' : 'rgba(255,255,255,0.3)';
    ctx.font = '700 9px Cinzel, serif'; ctx.textAlign = 'center';
    ctx.fillText(umbraReady ? 'PRESS F — UMBRA MODE READY' : 'CONVICTION', g.width / 2, convBarY - 4);
  }

  // Gem selector
  const gems: { type: WeaponType; key: string; name: string; color: string }[] = [
    { type: 'shadow', key: '1', name: 'Shadow', color: '#9b30ff' },
    { type: 'fire', key: '2', name: 'Ember', color: '#ff5500' },
    { type: 'frost', key: '3', name: 'Frost', color: '#88ddff' },
    { type: 'storm', key: '4', name: 'Storm', color: '#ffdd00' },
    { type: 'venom', key: '5', name: 'Venom', color: '#44ff44' },
    { type: 'void', key: '6', name: 'Void', color: '#9b30ff' },
    { type: 'terra', key: '7', name: 'Terra', color: '#cc8844' },
    { type: 'gale', key: '8', name: 'Gale', color: '#aaddff' },
    { type: 'flux', key: '9', name: 'Flux', color: '#ffaa00' },
  ];

  const gemBarWidth = gems.length * 38;
  const gemBarX = g.width / 2 - gemBarWidth / 2;
  const gemBarY = g.height - 60;

  for (let i = 0; i < gems.length; i++) {
    const gem = gems[i];
    const gx = gemBarX + i * 38 + 19, gy = gemBarY;
    const collected = g.player.gemsCollected[gem.type];
    const active = g.player.activeWeapon === gem.type;
    const size = active ? 8 : 6;

    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(gx - 11, gy - 11, 22, 22);
    if (g.player.umbraMode && active) { ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1; ctx.strokeRect(gx - 11, gy - 11, 22, 22); }

    if (collected) {
      ctx.fillStyle = active ? gem.color : '#444444';
      ctx.shadowColor = active ? gem.color : 'transparent'; ctx.shadowBlur = active ? 8 : 0;
      ctx.beginPath(); ctx.moveTo(gx, gy - size); ctx.lineTo(gx + size * 0.7, gy);
      ctx.lineTo(gx, gy + size); ctx.lineTo(gx - size * 0.7, gy);
      ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = '#222222'; ctx.fillRect(gx - 4, gy - 2, 8, 6);
      ctx.strokeStyle = '#333333'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(gx, gy - 4, 3, Math.PI, 0); ctx.stroke();
    }
    ctx.fillStyle = active ? '#ffffff' : 'rgba(255,255,255,0.3)';
    ctx.font = '8px monospace'; ctx.textAlign = 'center';
    ctx.fillText(gem.key, gx, gy + 18);
  }

  const activeGem = gems.find(g2 => g2.type === g.player.activeWeapon);
  if (activeGem) {
    ctx.fillStyle = activeGem.color; ctx.font = '700 12px Cinzel, serif'; ctx.textAlign = 'center';
    ctx.fillText(activeGem.name.toUpperCase(), g.width / 2, gemBarY - 18);
  }

  renderComboReadyIndicator(ctx, g);

  ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.font = '10px monospace'; ctx.textAlign = 'center';
  if (g.coopState === 'playing') {
    ctx.fillText('WASD Move · Mouse Aim · Click Shoot · SPACE Dash · 1-9 Gems · F Umbra Mode', g.width / 2, g.height - 6);
  } else {
    ctx.fillText('WASD Move · Mouse Aim · Click Shoot · SPACE Dash · 1-9 Switch Gem · F Umbra Mode', g.width / 2, g.height - 6);
  }

  // ---- Solus HUD (co-op) ----
  if (g.coopState === 'playing' && g.solus) {
    const s = g.solus;
    // Solus HP orbs below Umbra's
    const sOrbSize = 8, sOrbSpacing = 20;
    const sOrbStartX = g.width - 30 - (s.maxHp - 1) * sOrbSpacing;
    const sOrbY = 60;
    ctx.fillStyle = '#ffd700'; ctx.font = '700 9px monospace'; ctx.textAlign = 'right';
    ctx.fillText('SOLUS', sOrbStartX - 8, sOrbY + 4);
    for (let i = 0; i < s.maxHp; i++) {
      const ox = sOrbStartX + i * sOrbSpacing;
      ctx.beginPath(); ctx.arc(ox, sOrbY, sOrbSize, 0, Math.PI * 2);
      if (s.collapsed) { ctx.fillStyle = '#ff3333'; ctx.shadowColor = '#ff3333'; ctx.shadowBlur = 6; }
      else if (i < s.hp) { ctx.fillStyle = '#ffd700'; ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 8; }
      else { ctx.fillStyle = '#333340'; ctx.shadowBlur = 0; }
      ctx.fill(); ctx.shadowBlur = 0;
    }

    // Solus ability cooldowns - bottom right
    const abX = g.width - 80;
    const abY = g.height - 100;

    // Q - Radiant Burst
    const qReady = s.radiantBurstCooldown <= 0;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(abX - 12, abY - 12, 24, 24);
    if (!qReady) {
      const pct = 1 - s.radiantBurstCooldown / 480;
      ctx.fillStyle = '#555560'; ctx.fillRect(abX - 10, abY + 10 - pct * 20, 20, pct * 20);
    }
    ctx.fillStyle = qReady ? '#ffd700' : '#333340';
    if (qReady) { ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 6; }
    ctx.font = '700 12px monospace'; ctx.textAlign = 'center';
    ctx.fillText('Q', abX, abY + 4); ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '8px monospace';
    ctx.fillText('BURST', abX, abY + 18);

    // E - Martyr Shield
    const eX = abX + 34;
    const eReady = s.martyrShieldCooldown <= 0 && !s.martyrShieldActive;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(eX - 12, abY - 12, 24, 24);
    if (s.martyrShieldActive) {
      ctx.fillStyle = '#ffd700'; ctx.fillRect(eX - 10, abY - 10, 20, 20);
    } else if (!eReady) {
      const pct = 1 - s.martyrShieldCooldown / 600;
      ctx.fillStyle = '#555560'; ctx.fillRect(eX - 10, abY + 10 - pct * 20, 20, pct * 20);
    }
    ctx.fillStyle = s.martyrShieldActive ? '#ffffff' : eReady ? '#ffd700' : '#333340';
    if (eReady || s.martyrShieldActive) { ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 6; }
    ctx.font = '700 12px monospace'; ctx.textAlign = 'center';
    ctx.fillText('E', eX, abY + 4); ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '8px monospace';
    ctx.fillText('SHIELD', eX, abY + 18);

    // Solus conviction bar
    const sConvW = 120, sConvH = 6;
    const sConvX = abX - 20, sConvY = abY - 24;
    const drReady = s.conviction >= 100 && !s.divineReckoningActive;
    ctx.strokeStyle = drReady ? '#ffd700' : '#444455'; ctx.lineWidth = 1;
    ctx.strokeRect(sConvX, sConvY, sConvW, sConvH);
    ctx.fillStyle = '#1a1a00'; ctx.fillRect(sConvX + 1, sConvY + 1, sConvW - 2, sConvH - 2);
    ctx.fillStyle = drReady ? '#ffd700' : '#aa8800';
    ctx.fillRect(sConvX + 1, sConvY + 1, (sConvW - 2) * (s.conviction / 100), sConvH - 2);
    ctx.fillStyle = drReady ? '#ffd700' : 'rgba(255,255,255,0.3)';
    ctx.font = '700 8px Cinzel, serif'; ctx.textAlign = 'center';
    ctx.fillText(drReady ? 'F — DIVINE RECKONING' : s.divineReckoningActive ? `RECKONING — ${Math.ceil(s.divineReckoningTimer / 60)}s` : 'CONVICTION', sConvX + sConvW / 2, sConvY - 3);

  }
}

function renderComboReadyIndicator(ctx: CanvasRenderingContext2D, g: GameData) {
  const weapon = g.player.activeWeapon;
  let comboReady = false;
  for (const e of g.enemies) {
    if (!e.alive) continue;
    if (weapon === 'frost' && (e.burning || e.poison)) comboReady = true;
    if (weapon === 'fire' && (e.slow || e.shadowMark)) comboReady = true;
    if (weapon === 'storm' && e.poison) comboReady = true;
    if (comboReady) break;
  }
  if (comboReady) {
    const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
    ctx.globalAlpha = pulse; ctx.fillStyle = '#ffd700'; ctx.font = '10px monospace'; ctx.textAlign = 'right';
    ctx.fillText('COMBO READY', g.width - 20, g.height - 110); ctx.globalAlpha = 1;
  }
}

function renderStartScreen(ctx: CanvasRenderingContext2D, g: GameData) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, g.width, g.height);
  for (const s of g.spores) {
    ctx.globalAlpha = s.opacity; ctx.fillStyle = '#ffffee';
    ctx.fillRect(Math.floor(s.pos.x * g.width / g.arenaWidth), Math.floor(s.pos.y * g.height / g.arenaHeight), s.size, s.size);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#9b30ff'; ctx.font = '900 64px Cinzel, serif'; ctx.textAlign = 'center';
  ctx.shadowColor = '#9b30ff'; ctx.shadowBlur = 30;
  ctx.fillText('MYCELIUM MAYHEM', g.width / 2, g.height / 2 - 60); ctx.shadowBlur = 0;
  ctx.fillStyle = '#aa88cc'; ctx.font = '400 22px Cinzel, serif';
  ctx.fillText('Survive the fungal horde', g.width / 2, g.height / 2 - 15);

  const cx = g.width / 2, cy = g.height / 2 + 30;
  ctx.fillStyle = '#0d0d18'; ctx.fillRect(cx - 8, cy - 5, 16, 18);
  ctx.fillStyle = '#1a1a2a'; ctx.fillRect(cx - 6, cy - 12, 12, 9);
  ctx.fillStyle = '#252535';
  ctx.fillRect(cx - 5, cy - 14, 2, 3); ctx.fillRect(cx - 1, cy - 15, 2, 4); ctx.fillRect(cx + 3, cy - 14, 2, 3);
  ctx.fillStyle = '#0a0a28'; ctx.fillRect(cx - 10, cy - 2, 4, 14);
  ctx.fillStyle = '#9944ff'; ctx.shadowColor = '#9944ff'; ctx.shadowBlur = 6;
  ctx.fillRect(cx + 2, cy - 9, 3, 2); ctx.fillRect(cx + 2, cy - 6, 3, 2); ctx.shadowBlur = 0;
  ctx.fillStyle = '#880000'; ctx.fillRect(cx - 6, cy + 3, 12, 2);

  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '13px monospace';
  ctx.fillText('WASD Move · Mouse Aim · Click Shoot · SPACE Dash · 1-9 Gems · F Umbra Mode', g.width / 2, g.height / 2 + 70);
  if (g.bestWave > 0) { ctx.fillStyle = 'rgba(255,215,0,0.5)'; ctx.font = '14px monospace'; ctx.fillText(`Best Wave: ${g.bestWave}`, g.width / 2, g.height / 2 + 90); }

  const pulse = Math.sin(g.startPulse) * 0.3 + 0.7;
  ctx.globalAlpha = pulse; ctx.fillStyle = '#ffd700'; ctx.font = '700 24px Cinzel, serif';
  ctx.fillText('Click to Begin', g.width / 2, g.height / 2 + 120); ctx.globalAlpha = 1;
}

function renderGameOver(ctx: CanvasRenderingContext2D, g: GameData) {
  ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, g.width, g.height);

  if (g.coopState === 'playing') {
    // Co-op end screen
    ctx.fillStyle = '#ff3333'; ctx.font = '900 56px Cinzel, serif'; ctx.textAlign = 'center';
    ctx.shadowColor = '#ff3333'; ctx.shadowBlur = 20;
    ctx.fillText('YOU FELL', g.width / 2, 100); ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffd700'; ctx.font = '400 18px Cinzel, serif';
    ctx.fillText(`Waves Survived: ${g.wavesCleared}  ·  Combined Kills: ${g.score + g.solusScore}`, g.width / 2, 140);

    // Umbra stats - left
    const colW = 220, leftX = g.width / 2 - colW - 30, rightX = g.width / 2 + 30;
    const statY = 200;

    // Determine MVP
    const umbraKills = g.score, solusKills = g.solusScore;
    const umbraMVP = umbraKills >= solusKills;

    // Umbra column
    ctx.fillStyle = '#9b30ff'; ctx.font = '700 24px Cinzel, serif'; ctx.textAlign = 'center';
    ctx.shadowColor = '#9b30ff'; ctx.shadowBlur = 10;
    ctx.fillText('UMBRA', leftX + colW / 2, statY); ctx.shadowBlur = 0;
    if (umbraMVP) {
      ctx.fillStyle = '#ffd700'; ctx.font = '12px monospace';
      ctx.fillText('👑 MVP', leftX + colW / 2, statY + 18);
    }
    ctx.fillStyle = '#cccccc'; ctx.font = '14px monospace'; ctx.textAlign = 'left';
    const uStats = [
      `Kills: ${umbraKills}`,
      `Waves: ${g.wavesCleared}`,
      `Upgrades: ${g.player.upgrades.length}`,
      `Revives Left: ${g.umbraRevivesRemaining}`,
    ];
    for (let i = 0; i < uStats.length; i++) {
      ctx.fillText(uStats[i], leftX + 20, statY + 40 + i * 22);
    }

    // Solus column
    ctx.fillStyle = '#ffd700'; ctx.font = '700 24px Cinzel, serif'; ctx.textAlign = 'center';
    ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 10;
    ctx.fillText('SOLUS', rightX + colW / 2, statY); ctx.shadowBlur = 0;
    if (!umbraMVP) {
      ctx.fillStyle = '#ffd700'; ctx.font = '12px monospace';
      ctx.fillText('👑 MVP', rightX + colW / 2, statY + 18);
    }
    ctx.fillStyle = '#cccccc'; ctx.font = '14px monospace'; ctx.textAlign = 'left';
    const sStats = [
      `Kills: ${solusKills}`,
      `Waves: ${g.wavesCleared}`,
      `Upgrades: ${g.solus?.upgrades.length ?? 0}`,
      `Revives Left: ${g.solus?.revivesRemaining ?? 0}`,
    ];
    for (let i = 0; i < sStats.length; i++) {
      ctx.fillText(sStats[i], rightX + 20, statY + 40 + i * 22);
    }

    if (g.wavesCleared >= g.bestWave && g.wavesCleared > 0) {
      ctx.fillStyle = '#ffd700'; ctx.font = '700 18px Cinzel, serif'; ctx.textAlign = 'center';
      ctx.fillText('NEW BEST!', g.width / 2, statY + 140);
    }
    const pulse = Math.sin(g.startPulse) * 0.3 + 0.7;
    ctx.globalAlpha = pulse; ctx.fillStyle = '#9b30ff'; ctx.font = '700 24px Cinzel, serif'; ctx.textAlign = 'center';
    ctx.fillText('Click to Play Again', g.width / 2, statY + 180); ctx.globalAlpha = 1;
  } else {
    // Solo end screen
    ctx.fillStyle = '#ff3333'; ctx.font = '900 72px Cinzel, serif'; ctx.textAlign = 'center';
    ctx.shadowColor = '#ff3333'; ctx.shadowBlur = 20;
    ctx.fillText('YOU FELL', g.width / 2, g.height / 2 - 40); ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffd700'; ctx.font = '400 22px Cinzel, serif';
    ctx.fillText(`Waves Survived: ${g.wavesCleared}  ·  Enemies Slain: ${g.score}`, g.width / 2, g.height / 2 + 20);
    if (g.wavesCleared >= g.bestWave && g.wavesCleared > 0) {
      ctx.fillStyle = '#ffd700'; ctx.font = '700 18px Cinzel, serif'; ctx.fillText('NEW BEST!', g.width / 2, g.height / 2 + 50);
    }
    const pulse = Math.sin(g.startPulse) * 0.3 + 0.7;
    ctx.globalAlpha = pulse; ctx.fillStyle = '#9b30ff'; ctx.font = '700 28px Cinzel, serif';
    ctx.fillText('Click to Play Again', g.width / 2, g.height / 2 + 90); ctx.globalAlpha = 1;
  }
}
