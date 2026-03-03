import { GameData, Player, Enemy, Projectile, Particle, SporeParticle, FogPatch, FogZone, Vec2, Obstacle, WeaponType, ToxicPuddle } from './types';

const PLAYER_SPEED = 3;
const PLAYER_ACCEL = 0.15;
const PLAYER_DECEL = 0.85;
const PROJECTILE_SPEED = 7;
const FIRE_RATES: Record<WeaponType, number> = {
  shadow: 250,
  fire: 400,
  frost: 286,
  storm: 500,
  venom: 250,
};
const INVINCIBLE_DURATION = 90;
const MAX_PARTICLES = 300;
const BORDER = 20;
const SNIPER_FIRE_INTERVAL = 2500;
const SNIPER_KEEP_DIST_MIN = 200;
const SNIPER_KEEP_DIST_MAX = 300;
const ENEMY_PROJ_SPEED = 4;
const ARENA_W = 1200;
const ARENA_H = 800;
const CAMERA_LERP = 0.08;

// Evolution timers (in frames at ~60fps)
const EVOLUTION_TIMERS: Record<string, number> = {
  rusher: 720,   // 12 seconds
  sniper: 1080,  // 18 seconds
  fogWeaver: 1200, // 20 seconds
};

// Gem drops from bosses at wave 5, 10, 15, 20
const GEM_DROP_MAP: Record<number, WeaponType> = {
  5: 'fire',
  10: 'frost',
  15: 'storm',
  20: 'venom',
};

export function createGame(w: number, h: number): GameData {
  const bestWave = parseInt(localStorage.getItem('mm_bestWave') || '0', 10);
  return {
    state: 'start',
    player: createPlayer(),
    enemies: [],
    projectiles: [],
    particles: [],
    spores: createSpores(ARENA_W, ARENA_H, 80),
    fogPatches: createFog(ARENA_W, ARENA_H),
    fogZones: [],
    toxicPuddles: [],
    gemPickup: null,
    gemNotifyTimer: 0,
    gemNotifyText: '',
    wave: 0,
    score: 0,
    wavesCleared: 0,
    bestWave,
    lastShotTime: 0,
    waveClearTimer: 0,
    screenShake: { x: 0, y: 0 },
    screenShakeIntensity: 0,
    mousePos: { x: w / 2, y: h / 2 },
    keys: {},
    mouseDown: false,
    width: w,
    height: h,
    arenaWidth: ARENA_W,
    arenaHeight: ARENA_H,
    borderSize: BORDER,
    startPulse: 0,
    camera: { x: ARENA_W / 2 - w / 2, y: ARENA_H / 2 - h / 2 },
    obstacles: createObstacles(),
    bossIntroTimer: 0,
    waveAnnounceTimer: 0,
    waveAnnounceText: '',
    lowHpPulse: 0,
    enemiesRemainingInWave: 0,
    soundEvents: [],
    comboPopups: [],
    gemUnlockTimer: 0,
    gemUnlockType: null,
    screenFlashTimer: 0,
    screenFlashColor: '#ffffff',
  };
}

function createPlayer(): Player {
  return {
    pos: { x: ARENA_W / 2, y: ARENA_H / 2 },
    vel: { x: 0, y: 0 },
    angle: 0,
    hp: 6,
    maxHp: 6,
    invincibleTimer: 0,
    alive: true,
    deathTimer: 0,
    flashTimer: 0,
    purpleFlashTimer: 0,
    animState: 'idle',
    animFrame: 0,
    animTick: 0,
    attackTimer: 0,
    activeWeapon: 'shadow',
    gemsCollected: { shadow: true, fire: false, frost: false, storm: false, venom: false },
    speedMultiplier: 1,
  };
}

function createObstacles(): Obstacle[] {
  const obs: Obstacle[] = [];
  const pillarPositions: [number, number][] = [
    [200, 200], [1000, 200], [200, 600], [1000, 600],
    [400, 400], [800, 400], [600, 200], [600, 600],
  ];
  for (const [x, y] of pillarPositions) {
    obs.push({ pos: { x, y }, width: 32, height: 32, type: 'pillar' });
  }
  obs.push({ pos: { x: 300, y: 350 }, width: 64, height: 16, type: 'wall' });
  obs.push({ pos: { x: 850, y: 350 }, width: 64, height: 16, type: 'wall' });
  obs.push({ pos: { x: 500, y: 250 }, width: 16, height: 64, type: 'wall' });
  obs.push({ pos: { x: 700, y: 500 }, width: 16, height: 64, type: 'wall' });
  return obs;
}

function createSpores(w: number, h: number, count: number): SporeParticle[] {
  const spores: SporeParticle[] = [];
  for (let i = 0; i < count; i++) {
    spores.push({
      pos: { x: Math.random() * w, y: Math.random() * h },
      vel: { x: (Math.random() - 0.5) * 0.3, y: -(Math.random() * 0.2 + 0.05) },
      opacity: Math.random() * 0.2 + 0.1,
      size: Math.random() * 1.5 + 0.5,
    });
  }
  return spores;
}

function createFog(w: number, h: number): FogPatch[] {
  const patches: FogPatch[] = [];
  for (let i = 0; i < 3; i++) {
    patches.push({
      pos: { x: Math.random() * w, y: Math.random() * h },
      vel: { x: (Math.random() - 0.5) * 0.2, y: (Math.random() - 0.5) * 0.15 },
      radius: 150 + Math.random() * 100,
    });
  }
  return patches;
}

export function startGame(g: GameData) {
  g.state = 'playing';
  g.player = createPlayer();
  g.enemies = [];
  g.projectiles = [];
  g.particles = [];
  g.fogZones = [];
  g.toxicPuddles = [];
  g.comboPopups = [];
  g.wave = 0;
  g.score = 0;
  g.wavesCleared = 0;
  g.screenShakeIntensity = 0;
  g.gemPickup = null;
  g.gemNotifyTimer = 0;
  g.bossIntroTimer = 0;
  g.waveAnnounceTimer = 0;
  g.gemUnlockTimer = 0;
  g.gemUnlockType = null;
  g.screenFlashTimer = 0;
  g.soundEvents = [];
  startNextWave(g);
}

function isBossWave(wave: number): boolean {
  return wave > 0 && wave % 5 === 0;
}

function startNextWave(g: GameData) {
  g.wave++;
  g.waveAnnounceText = `WAVE ${g.wave}`;
  g.waveAnnounceTimer = 120;

  if (isBossWave(g.wave)) {
    g.state = 'bossIntro';
    g.bossIntroTimer = 120;
    g.waveAnnounceText = 'A HERALD APPROACHES';
    g.waveAnnounceTimer = 120;
    g.soundEvents.push('bossSpawn');
    return;
  }

  spawnWaveEnemies(g);
}

function spawnBoss(g: GameData) {
  const bossHp = 30 + Math.floor(g.wave / 5 - 1) * 15;
  const boss = createEnemy(g, 0.8, 'boss');
  boss.hp = bossHp;
  boss.maxHp = bossHp;
  boss.bossPhase = 1;
  boss.shootTimer = 2000;
  boss.chargeTimer = 0;
  boss.chargeCooldown = 300;
  boss.spawnCooldown = 480;
  g.enemies.push(boss);
  g.enemiesRemainingInWave = 1;
}

function spawnWaveEnemies(g: GameData) {
  const rusherCount = 3 + (g.wave - 1) * 2;
  const rusherSpeed = 1.4 + (g.wave - 1) * 0.1;
  for (let i = 0; i < rusherCount; i++) {
    g.enemies.push(createEnemy(g, rusherSpeed, 'rusher'));
  }
  if (g.wave >= 3) {
    const sniperCount = Math.min(g.wave - 2, 5);
    for (let i = 0; i < sniperCount; i++) {
      g.enemies.push(createEnemy(g, 0.8, 'sniper'));
    }
  }
  if (g.wave >= 5 && !isBossWave(g.wave)) {
    const fwCount = Math.min(Math.floor((g.wave - 4) / 2), 3);
    for (let i = 0; i < fwCount; i++) {
      g.enemies.push(createEnemy(g, 0.5, 'fogWeaver'));
    }
  }
  if (g.wave >= 6 && !isBossWave(g.wave)) {
    const titanCount = Math.min(Math.floor((g.wave - 5) / 2), 3);
    for (let i = 0; i < titanCount; i++) {
      g.enemies.push(createEnemy(g, 0.6, 'titan'));
    }
  }
  g.enemiesRemainingInWave = g.enemies.filter(e => e.alive).length;
}

function createEnemy(g: GameData, speed: number, type: Enemy['type']): Enemy {
  const side = Math.floor(Math.random() * 4);
  const b = g.borderSize;
  let x: number, y: number;
  switch (side) {
    case 0: x = b + Math.random() * (g.arenaWidth - 2 * b); y = b + 20; break;
    case 1: x = g.arenaWidth - b - 20; y = b + Math.random() * (g.arenaHeight - 2 * b); break;
    case 2: x = b + Math.random() * (g.arenaWidth - 2 * b); y = g.arenaHeight - b - 20; break;
    default: x = b + 20; y = b + Math.random() * (g.arenaHeight - 2 * b); break;
  }
  const hpMap: Record<string, number> = { rusher: 2, sniper: 3, titan: 12, fogWeaver: 4, boss: 30 };
  const hp = hpMap[type] || 2;
  const evoTimer = EVOLUTION_TIMERS[type] || 0;
  return {
    pos: { x, y },
    hp,
    maxHp: hp,
    alive: true,
    flashTimer: 0,
    wobblePhase: Math.random() * Math.PI * 2,
    speed,
    baseSpeed: speed,
    type,
    shootTimer: type === 'sniper' ? Math.random() * SNIPER_FIRE_INTERVAL : type === 'boss' ? 2000 : 0,
    spawnFlash: 20,
    animFrame: 0,
    animTick: 0,
    poison: null,
    slow: null,
    burning: null,
    shadowMark: null,
    darkFlame: null,
    frozenToxin: null,
    fogZone: null,
    repositionTimer: type === 'fogWeaver' ? 180 : 0,
    bossPhase: 1,
    chargeTimer: 0,
    chargeCooldown: 300,
    chargeVel: { x: 0, y: 0 },
    isCharging: false,
    spawnCooldown: 480,
    evolutionTimer: evoTimer,
    evolved: false,
    evolving: false,
    evolvingTimer: 0,
    evolutionWarning: false,
  };
}

export function setWeapon(g: GameData, weapon: WeaponType) {
  if (g.player.gemsCollected[weapon]) {
    g.player.activeWeapon = weapon;
  }
}

export function update(g: GameData, now: number) {
  g.startPulse += 0.02;
  g.soundEvents = [];

  updateSpores(g);
  updateFog(g);

  if (g.gemPickup && !g.gemPickup.collected) {
    g.gemPickup.pulse += 0.05;
  }
  if (g.gemNotifyTimer > 0) g.gemNotifyTimer--;
  if (g.waveAnnounceTimer > 0) g.waveAnnounceTimer--;
  if (g.screenFlashTimer > 0) g.screenFlashTimer--;

  // Combo popups
  for (const cp of g.comboPopups) {
    cp.pos.y -= 0.8;
    cp.life--;
  }
  g.comboPopups = g.comboPopups.filter(cp => cp.life > 0);

  if (g.player.hp <= 2 && g.player.alive) {
    g.lowHpPulse += 0.05;
  }

  if (g.state === 'start' || g.state === 'gameOver') return;

  // Gem unlock state
  if (g.state === 'gemUnlock') {
    g.gemUnlockTimer--;
    if (g.gemUnlockTimer <= 0) {
      g.state = 'playing';
      g.gemUnlockType = null;
    }
    return;
  }

  if (g.state === 'bossIntro') {
    g.bossIntroTimer--;
    if (g.bossIntroTimer <= 0) {
      g.state = 'playing';
      spawnBoss(g);
    }
    return;
  }

  if (g.state === 'waveClear') {
    g.waveClearTimer--;
    if (g.waveClearTimer <= 0) {
      g.state = 'playing';
      startNextWave(g);
    }
    return;
  }

  // Playing state
  const p = g.player;
  if (!p.alive) {
    p.deathTimer++;
    if (p.deathTimer === 1) {
      p.animState = 'death';
      for (let i = 0; i < 25; i++) {
        addParticle(g, p.pos.x, p.pos.y, '#9b30ff', 3);
      }
      g.soundEvents.push('playerDeath');
    }
    if (p.deathTimer > 90) {
      g.state = 'gameOver';
      if (g.wavesCleared > g.bestWave) {
        g.bestWave = g.wavesCleared;
        localStorage.setItem('mm_bestWave', String(g.bestWave));
      }
    }
    return;
  }

  // Player speed - check if in fog zone or toxic puddle void patches
  p.speedMultiplier = 1;
  for (const fz of g.fogZones) {
    const dx = p.pos.x - fz.pos.x;
    const dy = p.pos.y - fz.pos.y;
    if (Math.sqrt(dx * dx + dy * dy) < fz.radius) {
      p.speedMultiplier = 0.6;
      break;
    }
  }

  // Player animation
  p.animTick++;
  if (p.attackTimer > 0) {
    p.attackTimer--;
    p.animState = 'attack';
  } else if (p.flashTimer > 0 || p.purpleFlashTimer > 0) {
    p.animState = 'damage';
  } else {
    const moving = Math.abs(p.vel.x) > 0.3 || Math.abs(p.vel.y) > 0.3;
    p.animState = moving ? 'walk' : 'idle';
  }

  const frameRate = p.animState === 'idle' ? 15 : 8;
  if (p.animTick >= frameRate) {
    p.animTick = 0;
    const maxFrames = p.animState === 'idle' ? 3 : 4;
    p.animFrame = (p.animFrame + 1) % maxFrames;
  }

  // Player input
  let dx = 0, dy = 0;
  if (g.keys['w'] || g.keys['arrowup']) dy -= 1;
  if (g.keys['s'] || g.keys['arrowdown']) dy += 1;
  if (g.keys['a'] || g.keys['arrowleft']) dx -= 1;
  if (g.keys['d'] || g.keys['arrowright']) dx += 1;

  const effectiveSpeed = PLAYER_SPEED * p.speedMultiplier;
  if (dx !== 0 || dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len; dy /= len;
    p.vel.x += (dx * effectiveSpeed - p.vel.x) * PLAYER_ACCEL;
    p.vel.y += (dy * effectiveSpeed - p.vel.y) * PLAYER_ACCEL;
  } else {
    p.vel.x *= PLAYER_DECEL;
    p.vel.y *= PLAYER_DECEL;
  }

  p.pos.x += p.vel.x;
  p.pos.y += p.vel.y;

  for (const obs of g.obstacles) {
    resolveObstacleCollision(p.pos, 8, obs);
  }

  const b = g.borderSize + 10;
  p.pos.x = Math.max(b, Math.min(g.arenaWidth - b, p.pos.x));
  p.pos.y = Math.max(b, Math.min(g.arenaHeight - b, p.pos.y));

  // Aim
  const worldMouseX = g.mousePos.x + g.camera.x;
  const worldMouseY = g.mousePos.y + g.camera.y;
  p.angle = Math.atan2(worldMouseY - p.pos.y, worldMouseX - p.pos.x);

  // Gem pickup
  if (g.gemPickup && !g.gemPickup.collected) {
    const gdx = p.pos.x - g.gemPickup.pos.x;
    const gdy = p.pos.y - g.gemPickup.pos.y;
    if (Math.sqrt(gdx * gdx + gdy * gdy) < 20) {
      g.gemPickup.collected = true;
      const gt = g.gemPickup.gemType;
      p.gemsCollected[gt] = true;
      p.activeWeapon = gt;
      g.soundEvents.push('gemPickup');
      // Trigger gem unlock presentation
      g.state = 'gemUnlock';
      g.gemUnlockTimer = 120; // 2 seconds
      g.gemUnlockType = gt;
      const nameMap: Record<string, string> = {
        fire: 'EMBER GEM ACQUIRED',
        frost: 'FROST GEM ACQUIRED',
        storm: 'STORM GEM ACQUIRED',
        venom: 'VENOM GEM ACQUIRED',
      };
      g.gemNotifyText = nameMap[gt] || 'GEM ACQUIRED';
      g.gemNotifyTimer = 180;
      // Particle burst
      const colorMap: Record<string, string> = {
        fire: '#ff5500', frost: '#88ddff', storm: '#ffdd00', venom: '#44ff44',
      };
      for (let i = 0; i < 30; i++) {
        addParticle(g, p.pos.x, p.pos.y, colorMap[gt] || '#ffffff', 3, 2, 2);
      }
    }
  }

  // Toxic puddle damage on enemies
  for (const puddle of g.toxicPuddles) {
    puddle.life--;
    for (const e of g.enemies) {
      if (!e.alive) continue;
      const pdx = e.pos.x - puddle.pos.x;
      const pdy = e.pos.y - puddle.pos.y;
      if (Math.sqrt(pdx * pdx + pdy * pdy) < puddle.radius && !e.poison) {
        e.poison = { remaining: 240, tickTimer: 60 };
      }
    }
  }
  g.toxicPuddles = g.toxicPuddles.filter(p => p.life > 0);

  // Shooting
  const fireRate = FIRE_RATES[p.activeWeapon];
  if (g.mouseDown && now - g.lastShotTime > fireRate) {
    g.lastShotTime = now;
    const cos = Math.cos(p.angle);
    const sin = Math.sin(p.angle);
    const dmgMap: Record<WeaponType, number> = { shadow: 1, fire: 2, frost: 2, storm: 2, venom: 1 };
    const speedMap: Record<WeaponType, number> = { shadow: 7, fire: 7, frost: 6, storm: 8, venom: 4.5 };
    const speed = speedMap[p.activeWeapon];
    g.projectiles.push({
      pos: { x: p.pos.x + cos * 12, y: p.pos.y + sin * 12 },
      vel: { x: cos * speed, y: sin * speed },
      alive: true,
      type: p.activeWeapon,
      damage: dmgMap[p.activeWeapon],
      piercing: p.activeWeapon === 'storm',
      chainRadius: p.activeWeapon === 'storm' ? 80 : 0,
      hasChained: false,
      travelDist: 0,
      wobblePhase: 0,
      growSize: 6,
      zigzagDir: Math.random() > 0.5 ? 1 : -1,
      baseAngle: p.angle,
    });
    p.attackTimer = 8;
    g.soundEvents.push('shoot_' + p.activeWeapon);
  }

  if (p.invincibleTimer > 0) p.invincibleTimer--;
  if (p.flashTimer > 0) p.flashTimer--;
  if (p.purpleFlashTimer > 0) p.purpleFlashTimer--;

  // Update fog zones
  for (const fz of g.fogZones) {
    fz.life--;
    if (fz.radius < fz.maxRadius) {
      fz.radius += (fz.maxRadius - 80) / (4 * 60);
    }
  }
  g.fogZones = g.fogZones.filter(fz => fz.life > 0);

  // Update projectiles
  for (const proj of g.projectiles) {
    if (!proj.alive) continue;

    // Special movement per type
    if (proj.type === 'fire') {
      // Wobble
      proj.wobblePhase += 0.5;
      const perpX = -Math.sin(proj.baseAngle);
      const perpY = Math.cos(proj.baseAngle);
      const wobble = Math.sin(proj.wobblePhase) * 2;
      proj.pos.x += proj.vel.x + perpX * wobble * 0.15;
      proj.pos.y += proj.vel.y + perpY * wobble * 0.15;
    } else if (proj.type === 'storm') {
      // Zigzag
      proj.travelDist += Math.sqrt(proj.vel.x * proj.vel.x + proj.vel.y * proj.vel.y);
      if (proj.travelDist > 8) {
        proj.travelDist = 0;
        proj.zigzagDir *= -1;
      }
      const perpX = -Math.sin(proj.baseAngle);
      const perpY = Math.cos(proj.baseAngle);
      proj.pos.x += proj.vel.x + perpX * proj.zigzagDir * 0.6;
      proj.pos.y += proj.vel.y + perpY * proj.zigzagDir * 0.6;
    } else if (proj.type === 'venom') {
      // Grow as it travels
      proj.growSize = Math.min(10, proj.growSize + 0.03);
      proj.pos.x += proj.vel.x;
      proj.pos.y += proj.vel.y;
    } else {
      proj.pos.x += proj.vel.x;
      proj.pos.y += proj.vel.y;
    }

    // Trails per type
    if (proj.type === 'shadow') {
      // Orbiting particles
      proj.wobblePhase += 0.3;
      if (Math.random() < 0.5) {
        addParticle(g, proj.pos.x + Math.cos(proj.wobblePhase) * 4, proj.pos.y + Math.sin(proj.wobblePhase) * 4, '#7722cc', 1, 0.2, 0.3);
      }
      if (Math.random() < 0.4) {
        addParticle(g, proj.pos.x, proj.pos.y, '#9b30ff', 1.5, 0.1, 0.4);
      }
    } else if (proj.type === 'fire') {
      if (Math.random() < 0.7) {
        addParticle(g, proj.pos.x, proj.pos.y, Math.random() > 0.5 ? '#ffaa00' : '#ff5500', 1.5 + Math.random(), 0.3, 0.4);
      }
    } else if (proj.type === 'frost') {
      if (Math.random() < 0.4) {
        addParticle(g, proj.pos.x + (Math.random() - 0.5) * 4, proj.pos.y + (Math.random() - 0.5) * 4, '#aaeeff', 1, 0.2, 0.3);
      }
    } else if (proj.type === 'storm') {
      if (Math.random() < 0.6) {
        addParticle(g, proj.pos.x + (Math.random() - 0.5) * 6, proj.pos.y + (Math.random() - 0.5) * 6, '#ffffff', 1, 0.3, 0.15);
      }
    } else if (proj.type === 'venom') {
      // Drip particles fall downward
      if (Math.random() < 0.5) {
        const pt = addParticleReturn(g, proj.pos.x + (Math.random() - 0.5) * 4, proj.pos.y, '#44ff44', 1.5, 0.1, 0.5);
        if (pt) { pt.vel.x = 0; pt.vel.y = 1.5; }
      }
    } else if (proj.type === 'enemy' && Math.random() < 0.3) {
      addParticle(g, proj.pos.x, proj.pos.y, '#00ff44', 1, 0.2, 0.3);
    }

    // Obstacle collision
    for (const obs of g.obstacles) {
      if (pointInRect(proj.pos, obs)) {
        proj.alive = false;
        break;
      }
    }

    if (proj.pos.x < 0 || proj.pos.x > g.arenaWidth ||
        proj.pos.y < 0 || proj.pos.y > g.arenaHeight) {
      proj.alive = false;
    }
  }

  // Enemy projectiles hit player
  for (const proj of g.projectiles) {
    if (!proj.alive || proj.type !== 'enemy') continue;
    const pdx = proj.pos.x - p.pos.x;
    const pdy = proj.pos.y - p.pos.y;
    if (Math.sqrt(pdx * pdx + pdy * pdy) < 12 && p.invincibleTimer <= 0) {
      proj.alive = false;
      damagePlayer(g, 1);
    }
  }

  // Update enemies
  for (const e of g.enemies) {
    if (!e.alive) continue;
    if (e.flashTimer > 0) e.flashTimer--;
    if (e.spawnFlash > 0) e.spawnFlash--;
    e.wobblePhase += 0.15;
    e.animTick++;
    if (e.animTick >= (e.type === 'titan' ? 14 : 10)) {
      e.animTick = 0;
      e.animFrame = (e.animFrame + 1) % 4;
    }

    // Evolution timer
    if (e.evolutionTimer > 0 && !e.evolved && !e.evolving && e.type !== 'titan' && e.type !== 'boss') {
      e.evolutionTimer--;
      // Warning at 240 frames (4 seconds) before evolution
      if (e.evolutionTimer <= 240 && !e.evolutionWarning) {
        e.evolutionWarning = true;
      }
      if (e.evolutionTimer <= 0) {
        e.evolving = true;
        e.evolvingTimer = 60; // 1 second transform
      }
    }

    // Evolving animation
    if (e.evolving) {
      e.evolvingTimer--;
      e.flashTimer = 2; // constant flashing during evolution
      if (e.evolvingTimer <= 0) {
        e.evolving = false;
        e.evolved = true;
        evolveEnemy(e);
      }
    }

    // Poison tick
    if (e.poison) {
      e.poison.remaining--;
      e.poison.tickTimer--;
      if (e.poison.tickTimer <= 0) {
        e.poison.tickTimer = 60;
        e.hp -= 0.5;
        e.flashTimer = 3;
        if (e.hp <= 0) killEnemy(g, e);
      }
      if (e.poison.remaining <= 0) e.poison = null;
    }

    // Burning tick
    if (e.burning) {
      e.burning.remaining--;
      e.burning.tickTimer--;
      if (e.burning.tickTimer <= 0) {
        e.burning.tickTimer = 30;
        // Visual fire particles
        addParticle(g, e.pos.x + (Math.random() - 0.5) * 8, e.pos.y - 5, '#ff5500', 1.5, 0.3, 0.3);
      }
      if (e.burning.remaining <= 0) e.burning = null;
    }

    // Shadow mark tick
    if (e.shadowMark) {
      e.shadowMark.remaining--;
      if (e.shadowMark.remaining <= 0) e.shadowMark = null;
    }

    // Dark flame tick
    if (e.darkFlame) {
      e.darkFlame.remaining--;
      e.darkFlame.tickTimer--;
      if (e.darkFlame.tickTimer <= 0) {
        e.darkFlame.tickTimer = 60;
        e.hp -= 1;
        e.flashTimer = 3;
        addParticle(g, e.pos.x, e.pos.y, '#331100', 2, 0.4, 0.4);
        addParticle(g, e.pos.x, e.pos.y, '#ff5500', 1.5, 0.3, 0.3);
        if (e.hp <= 0) {
          // Dark flame spreads on death
          for (const other of g.enemies) {
            if (other === e || !other.alive) continue;
            if (dist(e.pos, other.pos) < 60) {
              other.darkFlame = { remaining: 360, tickTimer: 60 };
            }
          }
          killEnemy(g, e);
        }
      }
      if (e.darkFlame.remaining <= 0) e.darkFlame = null;
    }

    // Frozen toxin tick
    if (e.frozenToxin) {
      e.frozenToxin.remaining--;
      e.frozenToxin.tickTimer--;
      e.speed = 0; // completely immobile
      if (e.frozenToxin.tickTimer <= 0) {
        e.frozenToxin.tickTimer = 60;
        e.hp -= 1; // doubled poison damage
        e.flashTimer = 3;
        if (e.hp <= 0) killEnemy(g, e);
      }
      if (e.frozenToxin.remaining <= 0) {
        e.frozenToxin = null;
        e.speed = e.baseSpeed;
      }
    }

    // Slow effect
    if (e.slow && !e.frozenToxin) {
      e.slow.remaining--;
      e.speed = e.baseSpeed * 0.5;
      if (e.slow.remaining <= 0) {
        e.slow = null;
        e.speed = e.baseSpeed;
      }
    } else if (!e.frozenToxin) {
      e.speed = e.baseSpeed;
    }

    if (!e.alive) continue;

    const edx = p.pos.x - e.pos.x;
    const edy = p.pos.y - e.pos.y;
    const elen = Math.sqrt(edx * edx + edy * edy);

    if (e.type === 'rusher') {
      if (e.evolved) updateEvolvedRusher(g, e, p, edx, edy, elen);
      else updateRusher(g, e, p, edx, edy, elen);
    } else if (e.type === 'sniper') {
      if (e.evolved) updateEvolvedSniper(g, e, p, edx, edy, elen);
      else updateSniper(g, e, p, edx, edy, elen);
    } else if (e.type === 'titan') {
      updateTitan(g, e, p, edx, edy, elen);
    } else if (e.type === 'fogWeaver') {
      if (e.evolved) updateEvolvedFogWeaver(g, e, p, edx, edy, elen);
      else updateFogWeaver(g, e, p, edx, edy, elen);
    } else if (e.type === 'boss') {
      updateBoss(g, e, p, edx, edy, elen);
    }

    // Obstacle avoidance
    for (const obs of g.obstacles) {
      resolveObstacleCollision(e.pos, e.type === 'titan' ? 14 : e.type === 'boss' ? 18 : 8, obs);
    }

    const eb = g.borderSize + 10;
    e.pos.x = Math.max(eb, Math.min(g.arenaWidth - eb, e.pos.x));
    e.pos.y = Math.max(eb, Math.min(g.arenaHeight - eb, e.pos.y));

    // Check player projectile hits
    for (const proj of g.projectiles) {
      if (!proj.alive || proj.type === 'enemy') continue;
      const pdx = proj.pos.x - e.pos.x;
      const pdy = proj.pos.y - e.pos.y;
      const hitRadius = e.type === 'boss' ? 18 : e.type === 'titan' ? 14 : 14;
      if (Math.sqrt(pdx * pdx + pdy * pdy) < hitRadius) {
        // Frost pierces through first enemy
        if (proj.type === 'frost') {
          if (!proj.hasChained) {
            proj.hasChained = true; // use hasChained as "has pierced once" flag
          } else {
            proj.alive = false;
          }
        } else if (!proj.piercing) {
          proj.alive = false;
        }
        
        e.hp -= proj.damage;
        e.flashTimer = 6;
        g.soundEvents.push('enemyHit');

        // Apply status effects for combos
        if (proj.type === 'fire') {
          e.burning = { remaining: 150, tickTimer: 30 }; // 2.5 seconds
        }
        if (proj.type === 'shadow') {
          e.shadowMark = { remaining: 150 }; // 2.5 seconds
        }

        // Check combos BEFORE applying new effects
        checkCombos(g, e, proj.type as WeaponType);

        // Knockback for fire
        if (proj.type === 'fire' && elen > 0) {
          const kb = e.type === 'titan' ? 4 : 8;
          e.pos.x += (-edx / elen) * kb;
          e.pos.y += (-edy / elen) * kb;
        }

        // Frost slow
        if (proj.type === 'frost') {
          e.slow = { remaining: 120 };
          for (let i = 0; i < 6; i++) {
            addParticle(g, proj.pos.x, proj.pos.y, '#88ddff', 2);
          }
        }

        // Storm chain
        if (proj.type === 'storm' && !proj.hasChained && proj.chainRadius > 0) {
          proj.hasChained = true;
          let nearest: Enemy | null = null;
          let nearDist = proj.chainRadius;
          for (const other of g.enemies) {
            if (other === e || !other.alive) continue;
            const cd = dist(e.pos, other.pos);
            if (cd < nearDist) { nearDist = cd; nearest = other; }
          }
          if (nearest) {
            nearest.hp -= proj.damage * 0.5;
            nearest.flashTimer = 6;
            for (let i = 0; i < 4; i++) addParticle(g, nearest.pos.x, nearest.pos.y, '#ffdd00', 2);
            if (nearest.hp <= 0) killEnemy(g, nearest);
          }
          g.screenShakeIntensity = Math.max(g.screenShakeIntensity, 3);
        }

        // Venom poison + puddle
        if (proj.type === 'venom') {
          e.poison = { remaining: 240, tickTimer: 60 };
          g.toxicPuddles.push({ pos: { x: proj.pos.x, y: proj.pos.y }, life: 120, radius: 40 });
          for (let i = 0; i < 4; i++) addParticle(g, proj.pos.x, proj.pos.y, '#44ff44', 2);
        }

        // Impact particles
        const colorMap: Record<string, string[]> = {
          shadow: ['#9b30ff', '#6600bb'],
          fire: ['#ff5500', '#ffaa00', '#ff8800'],
          frost: ['#88ddff', '#aaeeff', '#ffffff'],
          storm: ['#ffdd00', '#ffffff'],
          venom: ['#44ff44', '#00cc33'],
        };
        const colors = colorMap[proj.type] || ['#ffffff'];
        const count = proj.type === 'fire' ? 5 : proj.type === 'frost' ? 6 : 4;
        for (let i = 0; i < count; i++) {
          addParticle(g, proj.pos.x, proj.pos.y, colors[Math.floor(Math.random() * colors.length)], 2);
        }

        if (e.hp <= 0) {
          // Score multiplier for evolved/evolving enemies
          const wasEvolving = e.evolving;
          killEnemy(g, e, wasEvolving);
        }
      }
    }
  }

  // Clean up
  g.projectiles = g.projectiles.filter(p => p.alive);
  g.enemies = g.enemies.filter(e => e.alive);
  g.enemiesRemainingInWave = g.enemies.length;

  // Update particles
  for (const pt of g.particles) {
    pt.pos.x += pt.vel.x;
    pt.pos.y += pt.vel.y;
    pt.vel.x *= 0.96;
    pt.vel.y *= 0.96;
    pt.life--;
  }
  g.particles = g.particles.filter(pt => pt.life > 0);

  // Screen shake
  if (g.screenShakeIntensity > 0) {
    g.screenShake.x = (Math.random() - 0.5) * g.screenShakeIntensity;
    g.screenShake.y = (Math.random() - 0.5) * g.screenShakeIntensity;
    g.screenShakeIntensity *= 0.85;
    if (g.screenShakeIntensity < 0.5) {
      g.screenShakeIntensity = 0;
      g.screenShake.x = 0;
      g.screenShake.y = 0;
    }
  }

  // Camera
  const targetCamX = p.pos.x - g.width / 2;
  const targetCamY = p.pos.y - g.height / 2;
  g.camera.x += (targetCamX - g.camera.x) * CAMERA_LERP;
  g.camera.y += (targetCamY - g.camera.y) * CAMERA_LERP;
  g.camera.x = Math.max(0, Math.min(g.arenaWidth - g.width, g.camera.x));
  g.camera.y = Math.max(0, Math.min(g.arenaHeight - g.height, g.camera.y));

  // Wave clear check
  if (g.enemies.length === 0 && p.alive && g.state === 'playing') {
    g.state = 'waveClear';
    g.waveClearTimer = 180;
    g.wavesCleared++;
    g.soundEvents.push('waveClear');

    // Gem drops from boss waves
    const gemType = GEM_DROP_MAP[g.wave];
    if (gemType && !p.gemsCollected[gemType] && !g.gemPickup) {
      g.gemPickup = {
        pos: { x: p.pos.x, y: p.pos.y },
        pulse: 0,
        collected: false,
        gemType,
      };
    }
  }
}

// ---- Combo system ----
function checkCombos(g: GameData, e: Enemy, hitType: WeaponType) {
  // SHATTER: Ice + Fire
  if (hitType === 'frost' && e.burning) {
    triggerShatter(g, e);
  } else if (hitType === 'fire' && e.slow) {
    triggerShatter(g, e);
  }

  // ELECTROTOXIN: Lightning + Poison
  if (hitType === 'storm' && e.poison) {
    triggerElectrotoxin(g, e);
  }

  // DARK FLAME: Fire + Shadow
  if (hitType === 'fire' && e.shadowMark) {
    triggerDarkFlame(g, e);
  }

  // FROZEN TOXIN: Ice + Poison
  if (hitType === 'frost' && e.poison) {
    triggerFrozenToxin(g, e);
  }
}

function triggerShatter(g: GameData, e: Enemy) {
  e.hp -= 6;
  // AoE damage
  for (const other of g.enemies) {
    if (other === e || !other.alive) continue;
    if (dist(e.pos, other.pos) < 80) {
      other.hp -= 3;
      other.flashTimer = 6;
      if (other.hp <= 0) killEnemy(g, other);
    }
  }
  for (let i = 0; i < 16; i++) {
    addParticle(g, e.pos.x, e.pos.y, Math.random() > 0.5 ? '#ffffff' : '#88ddff', 3, 1.5, 1.5);
  }
  g.screenFlashTimer = 4;
  g.screenFlashColor = '#ffffff';
  g.screenShakeIntensity = Math.max(g.screenShakeIntensity, 15);
  g.comboPopups.push({ pos: { x: e.pos.x, y: e.pos.y - 20 }, text: 'SHATTER', color: '#88ddff', life: 72, maxLife: 72 });
  if (e.hp <= 0) killEnemy(g, e);
}

function triggerElectrotoxin(g: GameData, e: Enemy) {
  // Chain to ALL enemies within 120px
  for (const other of g.enemies) {
    if (other === e || !other.alive) continue;
    if (dist(e.pos, other.pos) < 120) {
      other.hp -= 1;
      other.flashTimer = 6;
      for (let i = 0; i < 3; i++) addParticle(g, other.pos.x, other.pos.y, '#ffdd00', 2);
      if (other.hp <= 0) killEnemy(g, other);
    }
  }
  g.comboPopups.push({ pos: { x: e.pos.x, y: e.pos.y - 20 }, text: 'ELECTROTOXIN', color: '#aaff00', life: 72, maxLife: 72 });
  g.screenShakeIntensity = Math.max(g.screenShakeIntensity, 8);
}

function triggerDarkFlame(g: GameData, e: Enemy) {
  e.darkFlame = { remaining: 360, tickTimer: 60 }; // 6 seconds, 1 dmg/sec
  for (let i = 0; i < 8; i++) {
    addParticle(g, e.pos.x, e.pos.y, Math.random() > 0.5 ? '#331100' : '#ff5500', 2, 0.5, 0.6);
  }
  g.comboPopups.push({ pos: { x: e.pos.x, y: e.pos.y - 20 }, text: 'DARK FLAME', color: '#cc4400', life: 72, maxLife: 72 });
}

function triggerFrozenToxin(g: GameData, e: Enemy) {
  e.frozenToxin = { remaining: 240, tickTimer: 60 }; // 4 seconds, doubled poison
  e.speed = 0;
  for (let i = 0; i < 8; i++) {
    addParticle(g, e.pos.x, e.pos.y, Math.random() > 0.5 ? '#226666' : '#88ddff', 2, 0.3, 0.8);
  }
  g.comboPopups.push({ pos: { x: e.pos.x, y: e.pos.y - 20 }, text: 'FROZEN TOXIN', color: '#44aaaa', life: 72, maxLife: 72 });
}

// ---- Evolution ----
function evolveEnemy(e: Enemy) {
  if (e.type === 'rusher') {
    // Spine Rusher
    e.hp = Math.max(e.hp, 4);
    e.maxHp = 4;
    e.baseSpeed *= 1.4;
    e.speed = e.baseSpeed;
  } else if (e.type === 'sniper') {
    // Void Sniper
    e.hp = Math.max(e.hp, 5);
    e.maxHp = 5;
  } else if (e.type === 'fogWeaver') {
    // Miasma Weaver
    e.hp = Math.max(e.hp, 7);
    e.maxHp = 7;
    e.repositionTimer = 90; // 1.5 sec
  }
}

// ---- Enemy AI ----
function updateRusher(g: GameData, e: Enemy, p: Player, edx: number, edy: number, elen: number) {
  if (elen > 0) {
    e.pos.x += (edx / elen) * e.speed;
    e.pos.y += (edy / elen) * e.speed;
  }
  if (elen < 16 && p.invincibleTimer <= 0) {
    damagePlayer(g, 1);
    if (elen > 0) { p.vel.x = -(edx / elen) * 5; p.vel.y = -(edy / elen) * 5; }
  }
}

function updateEvolvedRusher(g: GameData, e: Enemy, p: Player, edx: number, edy: number, elen: number) {
  // Spine Rusher - occasional dash charge
  if (e.chargeTimer > 0) {
    e.chargeTimer--;
    e.pos.x += e.chargeVel.x;
    e.pos.y += e.chargeVel.y;
  } else {
    if (elen > 0) {
      e.pos.x += (edx / elen) * e.speed;
      e.pos.y += (edy / elen) * e.speed;
    }
    // Random dash (roughly every 3 seconds)
    e.chargeCooldown--;
    if (e.chargeCooldown <= 0 && elen > 40 && elen < 200) {
      e.chargeCooldown = 180;
      e.chargeTimer = 30; // 0.5 sec
      e.chargeVel = { x: (edx / elen) * 8, y: (edy / elen) * 8 };
    }
  }
  if (elen < 16 && p.invincibleTimer <= 0) {
    damagePlayer(g, 2);
    if (elen > 0) { p.vel.x = -(edx / elen) * 6; p.vel.y = -(edy / elen) * 6; }
  }
}

function updateSniper(g: GameData, e: Enemy, p: Player, edx: number, edy: number, elen: number) {
  if (elen < SNIPER_KEEP_DIST_MIN && elen > 0) {
    e.pos.x -= (edx / elen) * e.speed * 1.5;
    e.pos.y -= (edy / elen) * e.speed * 1.5;
  } else if (elen > SNIPER_KEEP_DIST_MAX && elen > 0) {
    e.pos.x += (edx / elen) * e.speed;
    e.pos.y += (edy / elen) * e.speed;
  }
  e.shootTimer -= 16.67;
  if (e.shootTimer <= 0) {
    e.shootTimer = SNIPER_FIRE_INTERVAL;
    if (elen > 0) {
      g.projectiles.push({
        pos: { x: e.pos.x, y: e.pos.y },
        vel: { x: (edx / elen) * ENEMY_PROJ_SPEED, y: (edy / elen) * ENEMY_PROJ_SPEED },
        alive: true, type: 'enemy', damage: 1, piercing: false, chainRadius: 0, hasChained: false,
        travelDist: 0, wobblePhase: 0, growSize: 6, zigzagDir: 1, baseAngle: 0,
      });
    }
  }
}

function updateEvolvedSniper(g: GameData, e: Enemy, p: Player, edx: number, edy: number, elen: number) {
  // Void Sniper - lead aims, fires 2 projectiles
  if (elen < SNIPER_KEEP_DIST_MIN && elen > 0) {
    e.pos.x -= (edx / elen) * e.speed * 1.5;
    e.pos.y -= (edy / elen) * e.speed * 1.5;
  } else if (elen > SNIPER_KEEP_DIST_MAX && elen > 0) {
    e.pos.x += (edx / elen) * e.speed;
    e.pos.y += (edy / elen) * e.speed;
  }
  e.shootTimer -= 16.67;
  if (e.shootTimer <= 0) {
    e.shootTimer = SNIPER_FIRE_INTERVAL;
    if (elen > 0) {
      // Lead aim: predict player position
      const predTime = elen / 6; // frames to reach
      const predX = p.pos.x + p.vel.x * predTime * 0.5;
      const predY = p.pos.y + p.vel.y * predTime * 0.5;
      const pdx = predX - e.pos.x;
      const pdy = predY - e.pos.y;
      const plen = Math.sqrt(pdx * pdx + pdy * pdy);
      const baseAngle = Math.atan2(pdy, pdx);
      const projSpeed = 6;
      // 2 projectiles in slight spread
      for (const offset of [-0.1, 0.1]) {
        const a = baseAngle + offset;
        g.projectiles.push({
          pos: { x: e.pos.x, y: e.pos.y },
          vel: { x: Math.cos(a) * projSpeed, y: Math.sin(a) * projSpeed },
          alive: true, type: 'enemy', damage: 1, piercing: false, chainRadius: 0, hasChained: false,
          travelDist: 0, wobblePhase: 0, growSize: 6, zigzagDir: 1, baseAngle: a,
        });
      }
    }
  }
}

function updateTitan(g: GameData, e: Enemy, p: Player, edx: number, edy: number, elen: number) {
  if (elen > 0) {
    e.pos.x += (edx / elen) * e.speed;
    e.pos.y += (edy / elen) * e.speed;
  }
  if (elen < 20 && p.invincibleTimer <= 0) {
    damagePlayer(g, 2);
    g.screenShakeIntensity = Math.max(g.screenShakeIntensity, 15);
    if (elen > 0) { p.vel.x = -(edx / elen) * 8; p.vel.y = -(edy / elen) * 8; }
  }
}

function updateFogWeaver(g: GameData, e: Enemy, p: Player, edx: number, edy: number, elen: number) {
  e.repositionTimer--;
  if (e.repositionTimer <= 0) {
    e.repositionTimer = 180;
    g.fogZones.push({
      pos: { x: e.pos.x, y: e.pos.y }, radius: 80, maxRadius: 120, life: 300, maxLife: 300,
    });
    const targetX = g.borderSize + 50 + Math.random() * (g.arenaWidth - g.borderSize * 2 - 100);
    const targetY = g.borderSize + 50 + Math.random() * (g.arenaHeight - g.borderSize * 2 - 100);
    const tdx = targetX - e.pos.x;
    const tdy = targetY - e.pos.y;
    const tlen = Math.sqrt(tdx * tdx + tdy * tdy);
    if (tlen > 0) {
      e.pos.x += (tdx / tlen) * Math.min(tlen, e.speed * 60);
      e.pos.y += (tdy / tlen) * Math.min(tlen, e.speed * 60);
    }
  }
  if (elen > 100 && elen > 0) {
    e.pos.x += (edx / elen) * e.speed * 0.3;
    e.pos.y += (edy / elen) * e.speed * 0.3;
  }
  if (elen < 16 && p.invincibleTimer <= 0) damagePlayer(g, 1);
}

function updateEvolvedFogWeaver(g: GameData, e: Enemy, p: Player, edx: number, edy: number, elen: number) {
  // Miasma Weaver - faster reposition, larger fog, stacks
  e.repositionTimer--;
  if (e.repositionTimer <= 0) {
    e.repositionTimer = 90; // 1.5 sec
    g.fogZones.push({
      pos: { x: e.pos.x, y: e.pos.y }, radius: 80, maxRadius: 160, life: 360, maxLife: 360,
    });
    const targetX = g.borderSize + 50 + Math.random() * (g.arenaWidth - g.borderSize * 2 - 100);
    const targetY = g.borderSize + 50 + Math.random() * (g.arenaHeight - g.borderSize * 2 - 100);
    const tdx = targetX - e.pos.x;
    const tdy = targetY - e.pos.y;
    const tlen = Math.sqrt(tdx * tdx + tdy * tdy);
    if (tlen > 0) {
      e.pos.x += (tdx / tlen) * Math.min(tlen, e.speed * 80);
      e.pos.y += (tdy / tlen) * Math.min(tlen, e.speed * 80);
    }
  }
  if (elen > 100 && elen > 0) {
    e.pos.x += (edx / elen) * e.speed * 0.3;
    e.pos.y += (edy / elen) * e.speed * 0.3;
  }
  if (elen < 16 && p.invincibleTimer <= 0) damagePlayer(g, 1);
}

function updateBoss(g: GameData, e: Enemy, p: Player, edx: number, edy: number, elen: number) {
  const hpPct = e.hp / e.maxHp;
  if (hpPct > 0.66) e.bossPhase = 1;
  else if (hpPct > 0.33) e.bossPhase = 2;
  else e.bossPhase = 3;

  const speedMult = e.bossPhase >= 2 ? 1.3 : 1;

  if (e.isCharging) {
    e.pos.x += e.chargeVel.x;
    e.pos.y += e.chargeVel.y;
    e.chargeTimer--;
    if (e.chargeTimer <= 0) { e.isCharging = false; e.chargeCooldown = 300; }
    if (elen < 20 && p.invincibleTimer <= 0) {
      damagePlayer(g, 2);
      g.screenShakeIntensity = 20;
    }
    return;
  }

  if (elen > 50 && elen > 0) {
    e.pos.x += (edx / elen) * e.speed * speedMult;
    e.pos.y += (edy / elen) * e.speed * speedMult;
  }

  if (elen < 20 && p.invincibleTimer <= 0) {
    damagePlayer(g, 2);
    g.screenShakeIntensity = 15;
  }

  e.shootTimer -= 16.67;
  if (e.shootTimer <= 0) {
    const spreadCount = e.bossPhase === 1 ? 3 : e.bossPhase === 2 ? 5 : 8;
    const interval = e.bossPhase === 3 ? 3000 : 2000;
    e.shootTimer = interval;
    const baseAngle = Math.atan2(edy, edx);
    const isRing = e.bossPhase === 3;
    for (let i = 0; i < spreadCount; i++) {
      let angle: number;
      if (isRing) { angle = (Math.PI * 2 / spreadCount) * i; }
      else { angle = baseAngle + (i - (spreadCount - 1) / 2) * 0.3; }
      g.projectiles.push({
        pos: { x: e.pos.x, y: e.pos.y },
        vel: { x: Math.cos(angle) * 3.5, y: Math.sin(angle) * 3.5 },
        alive: true, type: 'enemy', damage: 1, piercing: false, chainRadius: 0, hasChained: false,
        travelDist: 0, wobblePhase: 0, growSize: 6, zigzagDir: 1, baseAngle: angle,
      });
    }
    g.soundEvents.push('bossShoot');
  }

  if (e.bossPhase >= 2) {
    e.spawnCooldown -= 1;
    if (e.spawnCooldown <= 0) {
      e.spawnCooldown = 480;
      for (let i = 0; i < 2; i++) g.enemies.push(createEnemy(g, 1.6, 'rusher'));
    }
  }

  if (e.bossPhase === 3) {
    e.chargeCooldown--;
    if (e.chargeCooldown <= 0 && elen > 0) {
      e.isCharging = true;
      e.chargeTimer = 30;
      e.chargeVel = { x: (edx / elen) * e.speed * 3, y: (edy / elen) * e.speed * 3 };
      g.soundEvents.push('bossCharge');
    }
  }
}

function damagePlayer(g: GameData, amount: number) {
  const p = g.player;
  if (p.invincibleTimer > 0 || !p.alive) return;
  p.hp -= amount;
  p.invincibleTimer = INVINCIBLE_DURATION;
  p.flashTimer = 8;
  p.purpleFlashTimer = 16;
  g.screenShakeIntensity = Math.max(g.screenShakeIntensity, 12);
  g.soundEvents.push('playerDamage');
  if (p.hp <= 0) { p.alive = false; p.deathTimer = 0; }
}

function killEnemy(g: GameData, e: Enemy, wasEvolving = false) {
  if (!e.alive) return;
  e.alive = false;
  
  // Score: evolved = 2.5x, evolving (intercepted) = 3x
  let scoreVal = 1;
  if (wasEvolving) {
    scoreVal = 3;
    g.comboPopups.push({ pos: { x: e.pos.x, y: e.pos.y - 15 }, text: 'INTERCEPTED', color: '#ffd700', life: 72, maxLife: 72 });
  } else if (e.evolved) {
    scoreVal = 2.5;
  }
  g.score += Math.ceil(scoreVal);

  if (e.type === 'rusher') {
    g.screenShakeIntensity = Math.max(g.screenShakeIntensity, e.evolved ? 8 : 5);
    const count = e.evolved ? 12 : 8;
    for (let i = 0; i < count; i++) {
      addParticle(g, e.pos.x, e.pos.y, e.evolved ? ['#440000', '#880000', '#cc0000'][Math.floor(Math.random() * 3)] : ['#8b2500', '#aa3300', '#ff3333'][Math.floor(Math.random() * 3)], e.evolved ? 3 : 2.5);
    }
    g.soundEvents.push('enemyDeathRusher');
  } else if (e.type === 'sniper') {
    for (let i = 0; i < 12; i++) {
      addParticle(g, e.pos.x, e.pos.y, e.evolved ? ['#220044', '#440088', '#ffffff'][Math.floor(Math.random() * 3)] : ['#00ff44', '#00cc33', '#44ff88'][Math.floor(Math.random() * 3)], 2.5, 0.6, 1.5);
    }
    // Void Sniper death: void patch
    if (e.evolved) {
      g.toxicPuddles.push({ pos: { x: e.pos.x, y: e.pos.y }, life: 120, radius: 40 });
    }
    g.soundEvents.push('enemyDeathRusher');
  } else if (e.type === 'titan') {
    g.screenShakeIntensity = Math.max(g.screenShakeIntensity, 20);
    for (let i = 0; i < 20; i++) {
      addParticle(g, e.pos.x, e.pos.y, ['#553300', '#884400', '#ff6600', '#ffaa00'][Math.floor(Math.random() * 4)], 3, 1, 1.5);
    }
    g.soundEvents.push('enemyDeathTitan');
  } else if (e.type === 'fogWeaver') {
    // Evolved: massive fog burst
    if (e.evolved) {
      g.fogZones.push({ pos: { x: g.arenaWidth / 2, y: g.arenaHeight / 2 }, radius: 400, maxRadius: 400, life: 180, maxLife: 180 });
    } else {
      g.fogZones.push({ pos: { x: e.pos.x, y: e.pos.y }, radius: 60, maxRadius: 60, life: 120, maxLife: 120 });
    }
    for (let i = 0; i < 10; i++) {
      addParticle(g, e.pos.x, e.pos.y, e.evolved ? ['#220044', '#330066', '#aa88cc'][Math.floor(Math.random() * 3)] : ['#336666', '#448888', '#aacccc'][Math.floor(Math.random() * 3)], 2, 0.4, 2);
    }
    g.soundEvents.push('enemyDeathRusher');
  } else if (e.type === 'boss') {
    g.screenShakeIntensity = Math.max(g.screenShakeIntensity, 30);
    for (let i = 0; i < 30; i++) {
      addParticle(g, e.pos.x, e.pos.y, ['#9b30ff', '#ffd700', '#ff3333', '#ff5500'][Math.floor(Math.random() * 4)], 3.5, 1.5, 2);
    }
    g.waveAnnounceText = 'HERALD SLAIN';
    g.waveAnnounceTimer = 180;
    g.soundEvents.push('bossDeath');

    // Dark flame spreads on death
    if (e.darkFlame) {
      for (const other of g.enemies) {
        if (other === e || !other.alive) continue;
        if (dist(e.pos, other.pos) < 60) {
          other.darkFlame = { remaining: 360, tickTimer: 60 };
        }
      }
    }
  }
}

function addParticle(g: GameData, x: number, y: number, color: string, size: number, speedMult = 1, lifeMult = 1) {
  if (g.particles.length >= MAX_PARTICLES) return;
  const angle = Math.random() * Math.PI * 2;
  const speed = (Math.random() * 2 + 1) * speedMult;
  g.particles.push({
    pos: { x, y },
    vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
    life: Math.floor((Math.random() * 20 + 15) * lifeMult),
    maxLife: Math.floor((Math.random() * 20 + 15) * lifeMult),
    color,
    size,
  });
}

function addParticleReturn(g: GameData, x: number, y: number, color: string, size: number, speedMult = 1, lifeMult = 1): Particle | null {
  if (g.particles.length >= MAX_PARTICLES) return null;
  const angle = Math.random() * Math.PI * 2;
  const speed = (Math.random() * 2 + 1) * speedMult;
  const pt: Particle = {
    pos: { x, y },
    vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
    life: Math.floor((Math.random() * 20 + 15) * lifeMult),
    maxLife: Math.floor((Math.random() * 20 + 15) * lifeMult),
    color,
    size,
  };
  g.particles.push(pt);
  return pt;
}

function updateSpores(g: GameData) {
  for (const s of g.spores) {
    s.pos.x += s.vel.x;
    s.pos.y += s.vel.y;
    if (s.pos.x < 0) s.pos.x = g.arenaWidth;
    if (s.pos.x > g.arenaWidth) s.pos.x = 0;
    if (s.pos.y < 0) s.pos.y = g.arenaHeight;
    if (s.pos.y > g.arenaHeight) s.pos.y = 0;
  }
}

function updateFog(g: GameData) {
  for (const f of g.fogPatches) {
    f.pos.x += f.vel.x;
    f.pos.y += f.vel.y;
    if (f.pos.x < -f.radius) f.pos.x = g.arenaWidth + f.radius;
    if (f.pos.x > g.arenaWidth + f.radius) f.pos.x = -f.radius;
    if (f.pos.y < -f.radius) f.pos.y = g.arenaHeight + f.radius;
    if (f.pos.y > g.arenaHeight + f.radius) f.pos.y = -f.radius;
  }
}

function resolveObstacleCollision(pos: Vec2, radius: number, obs: Obstacle) {
  const halfW = obs.width / 2;
  const halfH = obs.height / 2;
  const cx = obs.pos.x + halfW;
  const cy = obs.pos.y + halfH;
  const dx = pos.x - cx;
  const dy = pos.y - cy;
  const overlapX = halfW + radius - Math.abs(dx);
  const overlapY = halfH + radius - Math.abs(dy);
  if (overlapX > 0 && overlapY > 0) {
    if (overlapX < overlapY) pos.x += dx > 0 ? overlapX : -overlapX;
    else pos.y += dy > 0 ? overlapY : -overlapY;
  }
}

function pointInRect(pos: Vec2, obs: Obstacle): boolean {
  return pos.x >= obs.pos.x && pos.x <= obs.pos.x + obs.width &&
         pos.y >= obs.pos.y && pos.y <= obs.pos.y + obs.height;
}

function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
