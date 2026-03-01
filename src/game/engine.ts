import { GameData, Player, Enemy, Projectile, Particle, SporeParticle, FogPatch, Vec2 } from './types';

const PLAYER_SPEED = 3;
const PLAYER_ACCEL = 0.15;
const PLAYER_DECEL = 0.85;
const PROJECTILE_SPEED = 7;
const FIRE_RATE_SHADOW = 250;
const FIRE_RATE_FIRE = 400;
const INVINCIBLE_DURATION = 90;
const MAX_PARTICLES = 200;
const BORDER = 20;
const SNIPER_FIRE_INTERVAL = 2500;
const SNIPER_KEEP_DIST_MIN = 200;
const SNIPER_KEEP_DIST_MAX = 300;
const ENEMY_PROJ_SPEED = 4;

export function createGame(w: number, h: number): GameData {
  return {
    state: 'start',
    player: createPlayer(w, h),
    enemies: [],
    projectiles: [],
    particles: [],
    spores: createSpores(w, h, 80),
    fogPatches: createFog(w, h),
    gemPickup: null,
    gemNotifyTimer: 0,
    wave: 0,
    score: 0,
    wavesCleared: 0,
    lastShotTime: 0,
    waveClearTimer: 0,
    screenShake: { x: 0, y: 0 },
    screenShakeIntensity: 0,
    mousePos: { x: w / 2, y: h / 2 },
    keys: {},
    mouseDown: false,
    width: w,
    height: h,
    borderSize: BORDER,
    startPulse: 0,
  };
}

function createPlayer(w: number, h: number): Player {
  return {
    pos: { x: w / 2, y: h / 2 },
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
    fireGemCollected: false,
    activeWeapon: 'shadow',
  };
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
  const hadGem = g.player.fireGemCollected;
  g.player = createPlayer(g.width, g.height);
  g.player.fireGemCollected = hadGem;
  g.enemies = [];
  g.projectiles = [];
  g.particles = [];
  g.wave = 0;
  g.score = 0;
  g.wavesCleared = 0;
  g.screenShakeIntensity = 0;
  g.gemPickup = null;
  g.gemNotifyTimer = 0;
  // Reset gem on full restart
  g.player.fireGemCollected = false;
  g.player.activeWeapon = 'shadow';
  startNextWave(g);
}

function startNextWave(g: GameData) {
  g.wave++;
  const rusherCount = 3 + (g.wave - 1) * 2;
  const rusherSpeed = 1.4 + (g.wave - 1) * 0.1;
  for (let i = 0; i < rusherCount; i++) {
    g.enemies.push(spawnEnemy(g, rusherSpeed, 'rusher'));
  }
  // Snipers from wave 3
  if (g.wave >= 3) {
    const sniperCount = Math.min(g.wave - 2, 5);
    for (let i = 0; i < sniperCount; i++) {
      g.enemies.push(spawnEnemy(g, 0.8, 'sniper'));
    }
  }
}

function spawnEnemy(g: GameData, speed: number, type: 'rusher' | 'sniper'): Enemy {
  const side = Math.floor(Math.random() * 4);
  const b = g.borderSize;
  let x: number, y: number;
  switch (side) {
    case 0: x = b + Math.random() * (g.width - 2 * b); y = b; break;
    case 1: x = g.width - b; y = b + Math.random() * (g.height - 2 * b); break;
    case 2: x = b + Math.random() * (g.width - 2 * b); y = g.height - b; break;
    default: x = b; y = b + Math.random() * (g.height - 2 * b); break;
  }
  const hp = type === 'sniper' ? 3 : 2;
  return {
    pos: { x, y },
    hp,
    maxHp: hp,
    alive: true,
    flashTimer: 0,
    wobblePhase: Math.random() * Math.PI * 2,
    speed,
    type,
    shootTimer: type === 'sniper' ? Math.random() * SNIPER_FIRE_INTERVAL : 0,
    spawnFlash: 20,
    animFrame: 0,
    animTick: 0,
  };
}

export function toggleWeapon(g: GameData) {
  if (!g.player.fireGemCollected) return;
  g.player.activeWeapon = g.player.activeWeapon === 'shadow' ? 'fire' : 'shadow';
}

export function update(g: GameData, now: number) {
  g.startPulse += 0.02;

  updateSpores(g);
  updateFog(g);

  if (g.gemPickup && !g.gemPickup.collected) {
    g.gemPickup.pulse += 0.05;
  }
  if (g.gemNotifyTimer > 0) g.gemNotifyTimer--;

  if (g.state === 'start' || g.state === 'gameOver') return;

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
    }
    if (p.deathTimer > 90) {
      g.state = 'gameOver';
    }
    return;
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

  if (dx !== 0 || dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len; dy /= len;
    p.vel.x += (dx * PLAYER_SPEED - p.vel.x) * PLAYER_ACCEL;
    p.vel.y += (dy * PLAYER_SPEED - p.vel.y) * PLAYER_ACCEL;
  } else {
    p.vel.x *= PLAYER_DECEL;
    p.vel.y *= PLAYER_DECEL;
  }

  p.pos.x += p.vel.x;
  p.pos.y += p.vel.y;

  const b = g.borderSize + 10;
  p.pos.x = Math.max(b, Math.min(g.width - b, p.pos.x));
  p.pos.y = Math.max(b, Math.min(g.height - b, p.pos.y));

  p.angle = Math.atan2(g.mousePos.y - p.pos.y, g.mousePos.x - p.pos.x);

  // Gem pickup
  if (g.gemPickup && !g.gemPickup.collected) {
    const gdx = p.pos.x - g.gemPickup.pos.x;
    const gdy = p.pos.y - g.gemPickup.pos.y;
    if (Math.sqrt(gdx * gdx + gdy * gdy) < 20) {
      g.gemPickup.collected = true;
      p.fireGemCollected = true;
      p.activeWeapon = 'fire';
      g.gemNotifyTimer = 180;
    }
  }

  // Shooting
  const fireRate = p.activeWeapon === 'fire' ? FIRE_RATE_FIRE : FIRE_RATE_SHADOW;
  if (g.mouseDown && now - g.lastShotTime > fireRate) {
    g.lastShotTime = now;
    const cos = Math.cos(p.angle);
    const sin = Math.sin(p.angle);
    const damage = p.activeWeapon === 'fire' ? 2 : 1;
    g.projectiles.push({
      pos: { x: p.pos.x + cos * 12, y: p.pos.y + sin * 12 },
      vel: { x: cos * PROJECTILE_SPEED, y: sin * PROJECTILE_SPEED },
      alive: true,
      type: p.activeWeapon,
      damage,
    });
    p.attackTimer = 8;
  }

  if (p.invincibleTimer > 0) p.invincibleTimer--;
  if (p.flashTimer > 0) p.flashTimer--;
  if (p.purpleFlashTimer > 0) p.purpleFlashTimer--;

  // Update projectiles
  for (const proj of g.projectiles) {
    if (!proj.alive) continue;
    proj.pos.x += proj.vel.x;
    proj.pos.y += proj.vel.y;

    if (proj.type === 'shadow' && Math.random() < 0.5) {
      addParticle(g, proj.pos.x, proj.pos.y, '#7722cc', 1.5, 0.3, 0.3);
    } else if (proj.type === 'fire' && Math.random() < 0.6) {
      const fc = Math.random() > 0.5 ? '#ffaa00' : '#ff5500';
      addParticle(g, proj.pos.x, proj.pos.y, fc, 1.5, 0.3, 0.4);
    } else if (proj.type === 'enemy' && Math.random() < 0.3) {
      addParticle(g, proj.pos.x, proj.pos.y, '#00ff44', 1, 0.2, 0.3);
    }

    if (proj.pos.x < g.borderSize || proj.pos.x > g.width - g.borderSize ||
        proj.pos.y < g.borderSize || proj.pos.y > g.height - g.borderSize) {
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
      p.hp--;
      p.invincibleTimer = INVINCIBLE_DURATION;
      p.flashTimer = 8;
      p.purpleFlashTimer = 16;
      g.screenShakeIntensity = 10;
      if (p.hp <= 0) {
        p.alive = false;
        p.deathTimer = 0;
      }
    }
  }

  // Update enemies
  for (const e of g.enemies) {
    if (!e.alive) continue;
    if (e.flashTimer > 0) e.flashTimer--;
    if (e.spawnFlash > 0) e.spawnFlash--;
    e.wobblePhase += 0.15;
    e.animTick++;
    if (e.animTick >= 10) {
      e.animTick = 0;
      e.animFrame = (e.animFrame + 1) % 4;
    }

    const edx = p.pos.x - e.pos.x;
    const edy = p.pos.y - e.pos.y;
    const elen = Math.sqrt(edx * edx + edy * edy);

    if (e.type === 'rusher') {
      // Chase player
      if (elen > 0) {
        e.pos.x += (edx / elen) * e.speed;
        e.pos.y += (edy / elen) * e.speed;
      }
      // Hit player
      if (elen < 16 && p.invincibleTimer <= 0) {
        p.hp--;
        p.invincibleTimer = INVINCIBLE_DURATION;
        p.flashTimer = 8;
        p.purpleFlashTimer = 16;
        g.screenShakeIntensity = 10;
        if (elen > 0) {
          p.vel.x = -(edx / elen) * 5;
          p.vel.y = -(edy / elen) * 5;
        }
        if (p.hp <= 0) {
          p.alive = false;
          p.deathTimer = 0;
        }
      }
    } else if (e.type === 'sniper') {
      // Keep distance
      if (elen < SNIPER_KEEP_DIST_MIN) {
        // Move away
        if (elen > 0) {
          e.pos.x -= (edx / elen) * e.speed * 1.5;
          e.pos.y -= (edy / elen) * e.speed * 1.5;
        }
      } else if (elen > SNIPER_KEEP_DIST_MAX) {
        // Move closer
        if (elen > 0) {
          e.pos.x += (edx / elen) * e.speed;
          e.pos.y += (edy / elen) * e.speed;
        }
      }
      // Clamp to arena
      const eb = g.borderSize + 10;
      e.pos.x = Math.max(eb, Math.min(g.width - eb, e.pos.x));
      e.pos.y = Math.max(eb, Math.min(g.height - eb, e.pos.y));

      // Shoot
      e.shootTimer -= 16.67; // approximate frame time
      if (e.shootTimer <= 0) {
        e.shootTimer = SNIPER_FIRE_INTERVAL;
        if (elen > 0) {
          g.projectiles.push({
            pos: { x: e.pos.x, y: e.pos.y },
            vel: { x: (edx / elen) * ENEMY_PROJ_SPEED, y: (edy / elen) * ENEMY_PROJ_SPEED },
            alive: true,
            type: 'enemy',
            damage: 1,
          });
        }
      }
    }

    // Check player projectile hits on enemies
    for (const proj of g.projectiles) {
      if (!proj.alive || proj.type === 'enemy') continue;
      const pdx = proj.pos.x - e.pos.x;
      const pdy = proj.pos.y - e.pos.y;
      if (Math.sqrt(pdx * pdx + pdy * pdy) < 14) {
        proj.alive = false;
        e.hp -= proj.damage;
        e.flashTimer = 6;

        // Knockback for fire
        if (proj.type === 'fire' && elen > 0) {
          const kbx = -edx / elen;
          const kby = -edy / elen;
          e.pos.x += kbx * 8;
          e.pos.y += kby * 8;
        }

        // Impact particles
        const impactColor = proj.type === 'fire' ? '#ff5500' : '#9b30ff';
        const count = proj.type === 'fire' ? 6 : 4;
        for (let i = 0; i < count; i++) {
          const c = proj.type === 'fire'
            ? ['#ff5500', '#ffaa00', '#ff8800'][Math.floor(Math.random() * 3)]
            : impactColor;
          addParticle(g, proj.pos.x, proj.pos.y, c, 2);
        }

        if (e.hp <= 0) {
          e.alive = false;
          g.score++;
          g.screenShakeIntensity = 5;
          if (e.type === 'rusher') {
            for (let i = 0; i < 8; i++) {
              const colors = ['#8b2500', '#aa3300', '#ff3333', '#cc4400'];
              addParticle(g, e.pos.x, e.pos.y, colors[Math.floor(Math.random() * colors.length)], 2.5);
            }
          } else {
            // Sniper death: green spore cloud
            for (let i = 0; i < 12; i++) {
              const colors = ['#00ff44', '#00cc33', '#44ff88', '#008822'];
              addParticle(g, e.pos.x, e.pos.y, colors[Math.floor(Math.random() * colors.length)], 2.5, 0.6, 1.5);
            }
          }
        }
      }
    }
  }

  // Clean up dead
  g.projectiles = g.projectiles.filter(p => p.alive);
  g.enemies = g.enemies.filter(e => e.alive);

  // Update particles
  for (const pt of g.particles) {
    pt.pos.x += pt.vel.x;
    pt.pos.y += pt.vel.y;
    pt.vel.x *= 0.96;
    pt.vel.y *= 0.96;
    pt.life--;
  }
  g.particles = g.particles.filter(pt => pt.life > 0);

  // Screen shake decay
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

  // Wave clear check
  if (g.enemies.length === 0 && p.alive) {
    g.state = 'waveClear';
    g.waveClearTimer = 180;
    g.wavesCleared++;

    // Drop fire gem after wave 3
    if (g.wave === 3 && !p.fireGemCollected && !g.gemPickup) {
      g.gemPickup = {
        pos: { x: g.width / 2, y: g.height / 2 },
        pulse: 0,
        collected: false,
      };
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

function updateSpores(g: GameData) {
  for (const s of g.spores) {
    s.pos.x += s.vel.x;
    s.pos.y += s.vel.y;
    if (s.pos.x < 0) s.pos.x = g.width;
    if (s.pos.x > g.width) s.pos.x = 0;
    if (s.pos.y < 0) s.pos.y = g.height;
    if (s.pos.y > g.height) s.pos.y = 0;
  }
}

function updateFog(g: GameData) {
  for (const f of g.fogPatches) {
    f.pos.x += f.vel.x;
    f.pos.y += f.vel.y;
    if (f.pos.x < -f.radius) f.pos.x = g.width + f.radius;
    if (f.pos.x > g.width + f.radius) f.pos.x = -f.radius;
    if (f.pos.y < -f.radius) f.pos.y = g.height + f.radius;
    if (f.pos.y > g.height + f.radius) f.pos.y = -f.radius;
  }
}
