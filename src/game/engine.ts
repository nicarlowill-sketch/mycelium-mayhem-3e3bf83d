import { GameData, Player, Enemy, Projectile, Particle, SporeParticle, Vec2 } from './types';

const PLAYER_SPEED = 3;
const PLAYER_ACCEL = 0.15;
const PLAYER_DECEL = 0.85;
const PROJECTILE_SPEED = 7;
const FIRE_RATE = 250; // ms between shots
const INVINCIBLE_DURATION = 90; // frames (~1.5s)
const MAX_PARTICLES = 200;
const BORDER = 20;

export function createGame(w: number, h: number): GameData {
  return {
    state: 'start',
    player: createPlayer(w, h),
    enemies: [],
    projectiles: [],
    particles: [],
    spores: createSpores(w, h, 40),
    wave: 0,
    score: 0,
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
  };
}

function createSpores(w: number, h: number, count: number): SporeParticle[] {
  const spores: SporeParticle[] = [];
  for (let i = 0; i < count; i++) {
    spores.push({
      pos: { x: Math.random() * w, y: Math.random() * h },
      vel: { x: (Math.random() - 0.5) * 0.3, y: (Math.random() - 0.5) * 0.3 },
      opacity: Math.random() * 0.15 + 0.05,
      size: Math.random() * 2 + 1,
    });
  }
  return spores;
}

export function startGame(g: GameData) {
  g.state = 'playing';
  g.player = createPlayer(g.width, g.height);
  g.enemies = [];
  g.projectiles = [];
  g.particles = [];
  g.wave = 0;
  g.score = 0;
  g.screenShakeIntensity = 0;
  startNextWave(g);
}

function startNextWave(g: GameData) {
  g.wave++;
  const count = 3 + (g.wave - 1) * 2;
  const speed = 1.2 + (g.wave - 1) * 0.1;
  for (let i = 0; i < count; i++) {
    g.enemies.push(spawnEnemy(g, speed));
  }
}

function spawnEnemy(g: GameData, speed: number): Enemy {
  const side = Math.floor(Math.random() * 4);
  const b = g.borderSize;
  let x: number, y: number;
  switch (side) {
    case 0: x = b + Math.random() * (g.width - 2 * b); y = b; break;
    case 1: x = g.width - b; y = b + Math.random() * (g.height - 2 * b); break;
    case 2: x = b + Math.random() * (g.width - 2 * b); y = g.height - b; break;
    default: x = b; y = b + Math.random() * (g.height - 2 * b); break;
  }
  return {
    pos: { x, y },
    hp: 2,
    maxHp: 2,
    alive: true,
    flashTimer: 0,
    wobblePhase: Math.random() * Math.PI * 2,
    speed,
  };
}

export function update(g: GameData, now: number) {
  g.startPulse += 0.02;

  // Update spores always
  updateSpores(g);

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
      // spawn death particles
      for (let i = 0; i < 20; i++) {
        addParticle(g, p.pos.x, p.pos.y, '#9b30ff', 3);
      }
    }
    if (p.deathTimer > 90) {
      g.state = 'gameOver';
    }
    return;
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

  // Clamp to arena
  const b = g.borderSize + 10;
  p.pos.x = Math.max(b, Math.min(g.width - b, p.pos.x));
  p.pos.y = Math.max(b, Math.min(g.height - b, p.pos.y));

  // Aim at mouse
  p.angle = Math.atan2(g.mousePos.y - p.pos.y, g.mousePos.x - p.pos.x);

  // Shooting
  if (g.mouseDown && now - g.lastShotTime > FIRE_RATE) {
    g.lastShotTime = now;
    const cos = Math.cos(p.angle);
    const sin = Math.sin(p.angle);
    g.projectiles.push({
      pos: { x: p.pos.x + cos * 12, y: p.pos.y + sin * 12 },
      vel: { x: cos * PROJECTILE_SPEED, y: sin * PROJECTILE_SPEED },
      alive: true,
    });
  }

  // Invincibility
  if (p.invincibleTimer > 0) p.invincibleTimer--;
  if (p.flashTimer > 0) p.flashTimer--;

  // Update projectiles
  for (const proj of g.projectiles) {
    if (!proj.alive) continue;
    proj.pos.x += proj.vel.x;
    proj.pos.y += proj.vel.y;

    // Trail particle
    if (Math.random() < 0.5) {
      addParticle(g, proj.pos.x, proj.pos.y, '#7722cc', 1.5, 0.3, 0.3);
    }

    // Out of bounds
    if (proj.pos.x < g.borderSize || proj.pos.x > g.width - g.borderSize ||
        proj.pos.y < g.borderSize || proj.pos.y > g.height - g.borderSize) {
      proj.alive = false;
    }
  }

  // Update enemies
  for (const e of g.enemies) {
    if (!e.alive) continue;
    if (e.flashTimer > 0) e.flashTimer--;
    e.wobblePhase += 0.15;

    // Chase player
    const edx = p.pos.x - e.pos.x;
    const edy = p.pos.y - e.pos.y;
    const elen = Math.sqrt(edx * edx + edy * edy);
    if (elen > 0) {
      e.pos.x += (edx / elen) * e.speed;
      e.pos.y += (edy / elen) * e.speed;
    }

    // Hit player
    if (elen < 16 && p.invincibleTimer <= 0) {
      p.hp--;
      p.invincibleTimer = INVINCIBLE_DURATION;
      p.flashTimer = 10;
      g.screenShakeIntensity = 8;

      // Knockback
      if (elen > 0) {
        p.vel.x = -(edx / elen) * 5;
        p.vel.y = -(edy / elen) * 5;
      }

      if (p.hp <= 0) {
        p.alive = false;
        p.deathTimer = 0;
      }
    }

    // Check projectile hits
    for (const proj of g.projectiles) {
      if (!proj.alive) continue;
      const pdx = proj.pos.x - e.pos.x;
      const pdy = proj.pos.y - e.pos.y;
      if (Math.sqrt(pdx * pdx + pdy * pdy) < 14) {
        proj.alive = false;
        e.hp--;
        e.flashTimer = 6;

        // Impact particles
        for (let i = 0; i < 4; i++) {
          addParticle(g, proj.pos.x, proj.pos.y, '#9b30ff', 2);
        }

        if (e.hp <= 0) {
          e.alive = false;
          g.score++;
          g.screenShakeIntensity = 4;
          // Death burst
          const colors = ['#8b2500', '#aa3300', '#ff3333', '#cc4400'];
          for (let i = 0; i < 10; i++) {
            addParticle(g, e.pos.x, e.pos.y, colors[Math.floor(Math.random() * colors.length)], 2.5);
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
    g.waveClearTimer = 180; // 3 seconds
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
