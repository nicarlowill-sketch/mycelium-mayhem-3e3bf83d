import { GameData, Player, Enemy, Projectile, Particle, SporeParticle, FogPatch, Vec2, Obstacle, WeaponType, UpgradeId, Upgrade, UpgradeCard, SolusPlayer } from './types';

const PLAYER_SPEED = 3;
const PLAYER_ACCEL = 0.15;
const PLAYER_DECEL = 0.85;
const PROJECTILE_SPEED = 7;
const FIRE_RATES: Record<WeaponType, number> = {
  shadow: 250, fire: 400, frost: 286, storm: 500, venom: 250,
  void: 300, terra: 600, gale: 200, flux: 400,
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
const DASH_DURATION = 9;
const DASH_COOLDOWN = 108;
const DASH_DISTANCE = 120;
const DASH_SPEED = DASH_DISTANCE / DASH_DURATION;
const UMBRA_DURATION = 480;
const UMBRA_COOLDOWN_AFTER = 300;

const EVOLUTION_TIMERS: Record<string, number> = {
  rusher: 720, sniper: 1080, fogWeaver: 1200,
};

const GEM_DROP_MAP: Record<number, WeaponType> = {
  5: 'fire', 10: 'frost', 15: 'storm', 20: 'venom',
  25: 'void', 30: 'terra', 35: 'gale', 40: 'flux',
};

const HERALD_NAMES: Record<number, string> = {
  1: 'THE CINDER HERALD', 2: 'THE GLACIAL HERALD', 3: 'THE STORM HERALD',
  4: 'THE VENOM HERALD', 5: 'THE VOID HERALD', 6: 'THE TERRA HERALD',
  7: 'THE GALE HERALD', 8: 'THE FLUX HERALD',
};

const ALL_GEMS: WeaponType[] = ['shadow', 'fire', 'frost', 'storm', 'venom', 'void', 'terra', 'gale', 'flux'];

// ---- UPGRADE DEFINITIONS ----
const ALL_UPGRADES: Upgrade[] = [
  { id: 'swiftShadow', name: 'Swift Shadow', description: 'Dash cooldown reduced to 1.3s', rarity: 'common', color: '#9b30ff' },
  { id: 'phaseStep', name: 'Phase Step', description: 'Dash distance +40%, 6 afterimages', rarity: 'rare', color: '#9b30ff' },
  { id: 'momentum', name: 'Momentum', description: 'Movement speed +15%', rarity: 'common', color: '#88ddff' },
  { id: 'ghostStep', name: 'Ghost Step', description: 'Dash deals 2 dmg + applies gem effect', rarity: 'epic', color: '#ffd700' },
  { id: 'sharpEdge', name: 'Sharp Edge', description: 'All projectile damage +1', rarity: 'common', color: '#ff5500' },
  { id: 'rapidFire', name: 'Rapid Fire', description: 'Fire rate +20% for all gems', rarity: 'common', color: '#ffdd00' },
  { id: 'piercing', name: 'Piercing', description: 'Projectiles pierce one extra enemy', rarity: 'rare', color: '#88ddff' },
  { id: 'overcharge', name: 'Overcharge', description: 'Every 8th shot triggers combo effect', rarity: 'epic', color: '#ffd700' },
  { id: 'volatile', name: 'Volatile', description: 'Projectiles explode for 1 AoE in 40px', rarity: 'rare', color: '#ff5500' },
  { id: 'twinShot', name: 'Twin Shot', description: '25% chance to fire double projectile', rarity: 'epic', color: '#ffdd00' },
  { id: 'bloodlust', name: 'Bloodlust', description: 'Kill conviction +12% instead of 8%', rarity: 'common', color: '#ff3333' },
  { id: 'battleHardened', name: 'Battle Hardened', description: 'Damage conviction +10% instead of 5%', rarity: 'rare', color: '#ff3333' },
  { id: 'umbrasWill', name: "Umbra's Will", description: 'Umbra Mode lasts 12s instead of 8s', rarity: 'epic', color: '#9b30ff' },
  { id: 'darkHunger', name: 'Dark Hunger', description: 'Dash through enemy in Umbra = +5% conviction', rarity: 'rare', color: '#9b30ff' },
  { id: 'ironWill', name: 'Iron Will', description: 'Max HP +1 orb', rarity: 'common', color: '#aaaaff' },
  { id: 'resilience', name: 'Resilience', description: 'Invincibility frames +50%', rarity: 'rare', color: '#aaaaff' },
  { id: 'shadowCloak', name: 'Shadow Cloak', description: 'Dash makes you invisible 0.5s', rarity: 'epic', color: '#333366' },
  { id: 'thornAura', name: 'Thorn Aura', description: 'Enemies that hit you take 1 damage', rarity: 'rare', color: '#ff5500' },
  { id: 'emberMastery', name: 'Ember Mastery', description: 'Burn duration 6s, bigger wobble', rarity: 'common', color: '#ff5500' },
  { id: 'frostMastery', name: 'Frost Mastery', description: 'Freeze lasts 3.5s instead of 2.5s', rarity: 'common', color: '#88ddff' },
  { id: 'stormMastery', name: 'Storm Mastery', description: 'Chain range 120px instead of 80px', rarity: 'common', color: '#ffdd00' },
  { id: 'venomMastery', name: 'Venom Mastery', description: 'Puddle size 2x, lasts 3.5s', rarity: 'common', color: '#44ff44' },
  { id: 'gemEfficiency', name: 'Gem Efficiency', description: 'Instant gem switching', rarity: 'rare', color: '#ffd700' },
  { id: 'resonance', name: 'Resonance', description: 'Combo effects +50% damage & AoE', rarity: 'epic', color: '#ffd700' },
];

function hasUpgrade(p: Player, id: UpgradeId): boolean {
  return p.upgrades.includes(id);
}

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
    floorHazards: [],
    controlsFlipped: false,
    controlsFlipTimer: 0,
    frameTick: 0,
    hitStopFrames: 0,
    stains: [],
    damagePopups: [],
    upgradeCards: [],
    upgradeSelectTimer: 0,
    selectedUpgrade: -1,
    parryFlashTimer: 0,
    parryText: '',
    // Co-op
    coopState: 'none',
    solus: null,
    solusScore: 0,
    umbraRevivesRemaining: 2,
    umbraCollapsed: false,
    umbraCollapseTimer: 0,
    umbraReviveProgress: 0,
    eclipseActive: false,
    eclipseTimer: 0,
    solusLastShotTime: 0,
  };
}

function createPlayer(): Player {
  const gemsCollected: Record<WeaponType, boolean> = {
    shadow: true, fire: false, frost: false, storm: false, venom: false,
    void: false, terra: false, gale: false, flux: false,
  };
  for (const gem of ALL_GEMS) {
    if (gem === 'shadow') continue;
    if (localStorage.getItem('mm_gem_' + gem)) {
      gemsCollected[gem] = true;
    }
  }
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
    gemsCollected,
    speedMultiplier: 1,
    dashTimer: 0,
    dashCooldown: 0,
    isDashing: false,
    dashDir: { x: 0, y: 0 },
    afterimages: [],
    conviction: 0,
    umbraMode: false,
    umbraModeTimer: 0,
    umbraModeCooldown: 0,
    umbraAuraTick: 0,
    lastCombatTick: 0,
    upgrades: [],
    shotCounter: 0,
    scoreMultiplier: 1,
    scoreMultiplierKills: 0,
    parryCount: 0,
    parryChainTimer: 0,
    parryTutorialShown: false,
  };
}

function createSolus(): SolusPlayer {
  return {
    pos: { x: ARENA_W / 2 + 30, y: ARENA_H / 2 },
    vel: { x: 0, y: 0 },
    angle: 0,
    hp: 6,
    maxHp: 6,
    invincibleTimer: 0,
    alive: true,
    deathTimer: 0,
    flashTimer: 0,
    goldFlashTimer: 0,
    animState: 'idle',
    animFrame: 0,
    animTick: 0,
    attackTimer: 0,
    speedMultiplier: 1,
    dashTimer: 0,
    dashCooldown: 0,
    isDashing: false,
    dashDir: { x: 0, y: 0 },
    afterimages: [],
    radiantBurstCooldown: 0,
    radiantBurstChanneling: 0,
    martyrShieldActive: false,
    martyrShieldTimer: 0,
    martyrShieldCooldown: 0,
    martyrShieldDamageAbsorbed: 0,
    conviction: 0,
    divineReckoningActive: false,
    divineReckoningTimer: 0,
    divineReckoningCooldown: 0,
    lastCombatTick: 0,
    collapsed: false,
    collapseTimer: 0,
    reviveProgress: 0,
    revivesRemaining: 2,
    guardianTimer: 0,
    upgrades: [],
    shotCounter: 0,
    parryCount: 0,
    parryChainTimer: 0,
  };
}

export function enableCoop(g: GameData) {
  g.coopState = 'playing';
  g.solus = createSolus();
}

export function updateSolus(g: GameData, input: { keys: Record<string, boolean>; mousePos: Vec2; mouseDown: boolean; abilityQ: boolean; abilityE: boolean; ultimatePressed: boolean }) {
  const s = g.solus;
  if (!s || !s.alive) return;

  // Movement
  let dx = 0, dy = 0;
  if (input.keys['w']) dy -= 1;
  if (input.keys['s']) dy += 1;
  if (input.keys['a']) dx -= 1;
  if (input.keys['d']) dx += 1;

  const effectiveSpeed = PLAYER_SPEED * s.speedMultiplier;
  if (dx !== 0 || dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len; dy /= len;
    s.vel.x += (dx * effectiveSpeed - s.vel.x) * PLAYER_ACCEL;
    s.vel.y += (dy * effectiveSpeed - s.vel.y) * PLAYER_ACCEL;
  } else {
    s.vel.x *= PLAYER_DECEL;
    s.vel.y *= PLAYER_DECEL;
  }
  s.pos.x += s.vel.x;
  s.pos.y += s.vel.y;

  // Bounds
  const brd = g.borderSize + 10;
  s.pos.x = Math.max(brd, Math.min(g.arenaWidth - brd, s.pos.x));
  s.pos.y = Math.max(brd, Math.min(g.arenaHeight - brd, s.pos.y));

  // Aim
  const worldMouseX = input.mousePos.x + g.camera.x;
  const worldMouseY = input.mousePos.y + g.camera.y;
  s.angle = Math.atan2(worldMouseY - s.pos.y, worldMouseX - s.pos.x);

  // Animation
  s.animTick++;
  if (s.attackTimer > 0) { s.attackTimer--; s.animState = 'attack'; }
  else {
    const moving = Math.abs(s.vel.x) > 0.3 || Math.abs(s.vel.y) > 0.3;
    s.animState = moving ? 'walk' : 'idle';
  }
  const frameRate = s.animState === 'idle' ? 15 : 8;
  if (s.animTick >= frameRate) {
    s.animTick = 0;
    s.animFrame = (s.animFrame + 1) % 4;
  }

  // Timers
  if (s.invincibleTimer > 0) s.invincibleTimer--;
  if (s.flashTimer > 0) s.flashTimer--;
  if (s.goldFlashTimer > 0) s.goldFlashTimer--;
  if (s.dashCooldown > 0) s.dashCooldown--;
  if (s.radiantBurstCooldown > 0) s.radiantBurstCooldown--;
  if (s.martyrShieldCooldown > 0) s.martyrShieldCooldown--;
  if (s.divineReckoningCooldown > 0) s.divineReckoningCooldown--;

  // Martyr Shield timer
  if (s.martyrShieldActive) {
    s.martyrShieldTimer--;
    if (s.martyrShieldTimer <= 0) {
      s.martyrShieldActive = false;
      s.martyrShieldCooldown = 600;
    }
  }

  // Divine Reckoning
  if (s.divineReckoningActive) {
    s.divineReckoningTimer--;
    // Auto-fire holy bolts in 8 directions
    if (g.frameTick % 6 === 0) {
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i;
        g.projectiles.push(createProjectile(
          { x: s.pos.x + Math.cos(angle) * 12, y: s.pos.y + Math.sin(angle) * 12 },
          { x: Math.cos(angle) * 8, y: Math.sin(angle) * 8 },
          'holy', 1.5, { piercing: true }
        ));
      }
    }
    // Holy aura damage
    if (g.frameTick % 30 === 0) {
      for (const e of g.enemies) {
        if (!e.alive) continue;
        if (dist(s.pos, e.pos) < 60) {
          e.hp -= 0.5;
          e.flashTimer = 2;
          if (e.hp <= 0) killEnemy(g, e);
        }
      }
    }
    if (s.divineReckoningTimer <= 0) {
      s.divineReckoningActive = false;
      s.conviction = 0;
      s.divineReckoningCooldown = 300;
    }
  }

  // Shooting - Holy Bolt
  if (input.mouseDown && !s.isDashing && !s.divineReckoningActive) {
    const now = performance.now();
    if (now - g.solusLastShotTime > 286) { // 3.5 shots/sec
      g.solusLastShotTime = now;
      const cos = Math.cos(s.angle);
      const sin = Math.sin(s.angle);
      g.projectiles.push(createProjectile(
        { x: s.pos.x + cos * 12, y: s.pos.y + sin * 12 },
        { x: cos * 8, y: sin * 8 },
        'holy', 1.5, { piercing: true }
      ));
      s.attackTimer = 8;
      s.lastCombatTick = g.frameTick;
    }
  }

  // Radiant Burst (Q)
  if (input.abilityQ && s.radiantBurstCooldown <= 0 && !s.divineReckoningActive) {
    s.radiantBurstCooldown = 480; // 8 seconds
    // AoE blast
    for (const e of g.enemies) {
      if (!e.alive) continue;
      if (dist(s.pos, e.pos) < 150) {
        e.hp -= 3;
        e.stun = { remaining: 150 }; // 2.5 second blind/stun
        e.flashTimer = 8;
        if (e.hp <= 0) killEnemy(g, e);
      }
    }
    g.screenFlashTimer = 6;
    g.screenFlashColor = '#ffffff';
    g.screenShakeIntensity = Math.max(g.screenShakeIntensity, 12);
    for (let i = 0; i < 20; i++) addParticle(g, s.pos.x, s.pos.y, Math.random() > 0.5 ? '#ffffff' : '#ffd700', 3, 1.5, 1);
    // Conviction gain
    s.conviction = Math.min(100, s.conviction + 10);
  }

  // Martyr Shield (E)
  if (input.abilityE && s.martyrShieldCooldown <= 0 && !s.martyrShieldActive) {
    s.martyrShieldActive = true;
    s.martyrShieldTimer = 240; // 4 seconds
    s.martyrShieldDamageAbsorbed = 0;
  }

  // Divine Reckoning (F)
  if (input.ultimatePressed && s.conviction >= 100 && !s.divineReckoningActive && s.divineReckoningCooldown <= 0) {
    s.divineReckoningActive = true;
    s.divineReckoningTimer = 360; // 6 seconds
    g.screenFlashTimer = 8;
    g.screenFlashColor = '#ffd700';
    g.waveAnnounceText = 'DIVINE RECKONING';
    g.waveAnnounceTimer = 60;
  }

  // Guardian synergy - Solus near Umbra
  if (dist(s.pos, g.player.pos) < 60) {
    s.guardianTimer++;
  } else {
    s.guardianTimer = 0;
  }

  // Revive Umbra
  if (g.umbraCollapsed && dist(s.pos, g.player.pos) < 40 && s.alive) {
    g.umbraReviveProgress += 1 / 180; // 3 seconds
    if (g.umbraReviveProgress >= 1) {
      g.umbraCollapsed = false;
      g.umbraReviveProgress = 0;
      g.player.alive = true;
      g.player.hp = 2;
      g.player.invincibleTimer = 120;
      g.player.flashTimer = 20;
      g.umbraRevivesRemaining--;
      s.conviction = Math.min(100, s.conviction + 15);
      for (let i = 0; i < 12; i++) addParticle(g, g.player.pos.x, g.player.pos.y, '#ffd700', 2, 1, 1);
    }
  }

  // Eclipse check
  if (g.player.umbraMode && s.divineReckoningActive && !g.eclipseActive) {
    g.eclipseActive = true;
    g.eclipseTimer = Math.min(g.player.umbraModeTimer, s.divineReckoningTimer);
    g.waveAnnounceText = 'ECLIPSE';
    g.waveAnnounceTimer = 90;
    g.screenFlashTimer = 10;
    g.screenFlashColor = '#ffd700';
    for (const e of g.enemies) {
      if (e.alive) {
        e.stun = { remaining: 120 };
        e.slow = { remaining: 120 };
      }
    }
  }
  if (g.eclipseActive) {
    g.eclipseTimer--;
    if (g.eclipseTimer <= 0 || (!g.player.umbraMode && !s.divineReckoningActive)) {
      g.eclipseActive = false;
    }
  }

  // Afterimage decay
  for (const ai of s.afterimages) ai.life--;
  s.afterimages = s.afterimages.filter(ai => ai.life > 0);

  // Enemy contact damage to Solus
  for (const e of g.enemies) {
    if (!e.alive) continue;
    const edist = dist(s.pos, e.pos);
    if (edist < 16 && s.invincibleTimer <= 0) {
      if (s.martyrShieldActive) {
        // Shield absorbs
        s.martyrShieldActive = false;
        s.martyrShieldDamageAbsorbed = e.type === 'titan' || e.type === 'brute' ? 2 : 1;
        const aoeRadius = 80;
        const aoeDmg = Math.min(5, 2 + s.martyrShieldDamageAbsorbed);
        for (const other of g.enemies) {
          if (!other.alive) continue;
          if (dist(s.pos, other.pos) < aoeRadius) {
            other.hp -= aoeDmg;
            other.flashTimer = 6;
            if (other.hp <= 0) killEnemy(g, other);
          }
        }
        g.screenFlashTimer = 4;
        g.screenFlashColor = '#ffd700';
        for (let i = 0; i < 12; i++) addParticle(g, s.pos.x, s.pos.y, '#ffd700', 2, 1.5, 0.5);
        s.martyrShieldCooldown = 600;
      } else {
        s.hp -= (e.type === 'titan' || e.type === 'brute' || e.type === 'boss') ? 2 : 1;
        s.invincibleTimer = INVINCIBLE_DURATION;
        s.flashTimer = 8;
        s.goldFlashTimer = 16;
        g.screenShakeIntensity = Math.max(g.screenShakeIntensity, 8);
        s.conviction = Math.min(100, s.conviction + 8);
        if (s.hp <= 0) {
          if (s.revivesRemaining > 0) {
            s.collapsed = true;
            s.collapseTimer = 0;
            s.reviveProgress = 0;
            s.alive = false;
          } else {
            s.alive = false;
            s.deathTimer = 0;
          }
        }
      }
      break;
    }
  }

  // Enemy projectile damage to Solus
  for (const proj of g.projectiles) {
    if (!proj.alive || proj.type !== 'enemy' || proj.isParried) continue;
    if (dist(proj.pos, s.pos) < 12 && s.invincibleTimer <= 0) {
      proj.alive = false;
      if (s.martyrShieldActive) {
        s.martyrShieldActive = false;
        s.martyrShieldDamageAbsorbed = proj.damage;
        const aoeDmg = Math.min(5, 2 + proj.damage);
        for (const e of g.enemies) {
          if (!e.alive) continue;
          if (dist(s.pos, e.pos) < 80) {
            e.hp -= aoeDmg;
            e.flashTimer = 6;
            if (e.hp <= 0) killEnemy(g, e);
          }
        }
        g.screenFlashTimer = 4;
        g.screenFlashColor = '#ffd700';
        s.martyrShieldCooldown = 600;
      } else {
        s.hp -= proj.damage;
        s.invincibleTimer = INVINCIBLE_DURATION;
        s.flashTimer = 8;
        s.conviction = Math.min(100, s.conviction + 8);
        if (s.hp <= 0) {
          if (s.revivesRemaining > 0) {
            s.collapsed = true;
            s.alive = false;
          } else {
            s.alive = false;
            s.deathTimer = 0;
          }
        }
      }
    }
  }

  // Revive Solus by Umbra
  if (s.collapsed && !s.alive && g.player.alive && dist(g.player.pos, s.pos) < 40) {
    s.reviveProgress += 1 / 180;
    if (s.reviveProgress >= 1) {
      s.collapsed = false;
      s.alive = true;
      s.hp = 2;
      s.invincibleTimer = 120;
      s.flashTimer = 20;
      s.revivesRemaining--;
      s.reviveProgress = 0;
      for (let i = 0; i < 12; i++) addParticle(g, s.pos.x, s.pos.y, '#9b30ff', 2, 1, 1);
    }
  }

  // Holy projectile hits
  for (const proj of g.projectiles) {
    if (!proj.alive || proj.type !== 'holy') continue;
    for (const e of g.enemies) {
      if (!e.alive) continue;
      const hitR = e.type === 'boss' ? 18 : 14;
      if (dist(proj.pos, e.pos) < hitR) {
        const dmg = g.eclipseActive ? proj.damage * 3 : proj.damage;
        e.hp -= dmg;
        e.flashTimer = 6;
        e.flinchTimer = 2;
        s.lastCombatTick = g.frameTick;
        s.conviction = Math.min(100, s.conviction + 2);
        addDamagePopup(g, proj.pos.x, proj.pos.y, dmg, '#ffd700');
        g.hitStopFrames = Math.max(g.hitStopFrames, e.type === 'boss' ? 5 : 3);
        for (let i = 0; i < 3; i++) addParticle(g, proj.pos.x, proj.pos.y, '#ffd700', 1.5, 0.8, 0.2);

        // Shadow Light combo check
        if (e.shadowMark) {
          // Shadow + Holy = RESONANCE
          e.hp -= 2;
          g.comboPopups.push({ pos: { x: e.pos.x, y: e.pos.y - 20 }, text: 'RESONANCE', color: '#ffd700', life: 72, maxLife: 72 });
          for (let i = 0; i < 8; i++) addParticle(g, e.pos.x, e.pos.y, Math.random() > 0.5 ? '#9b30ff' : '#ffd700', 2, 1, 1);
        }

        if (!proj.piercing) proj.alive = false;
        else proj.hasChained = true;
        if (proj.piercing && proj.hasChained) proj.alive = false;

        if (e.hp <= 0) {
          killEnemy(g, e);
          g.solusScore++;
        }
        break;
      }
    }
  }

  // Co-op game over check
  if (!s.alive && !s.collapsed && !g.player.alive && !g.umbraCollapsed) {
    g.state = 'gameOver';
  }
  if (s.collapsed && g.umbraCollapsed) {
    g.state = 'gameOver';
  }
}

// Co-op enemy scaling
export function getCoopHpMultiplier(g: GameData): number {
  return g.coopState === 'playing' ? 1.5 : 1;
}

export function getCoopBossHpMultiplier(g: GameData): number {
  return g.coopState === 'playing' ? 1.8 : 1;
}

export function getCoopEnemyCountMultiplier(g: GameData): number {
  return g.coopState === 'playing' ? 1.4 : 1;
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
  g.floorHazards = [];
  g.stains = [];
  g.damagePopups = [];
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
  g.controlsFlipped = false;
  g.controlsFlipTimer = 0;
  g.frameTick = 0;
  g.hitStopFrames = 0;
  g.upgradeCards = [];
  g.upgradeSelectTimer = 0;
  g.selectedUpgrade = -1;
  g.parryFlashTimer = 0;
  g.soundEvents = [];
  g.eclipseActive = false;
  g.eclipseTimer = 0;
  g.solusLastShotTime = 0;
  g.umbraCollapsed = false;
  g.umbraCollapseTimer = 0;
  g.umbraReviveProgress = 0;
  g.umbraRevivesRemaining = 2;
  if (g.coopState === 'playing') {
    g.solus = createSolus();
  }
  startNextWave(g);
}

function isBossWave(wave: number): boolean {
  return wave > 0 && wave % 5 === 0;
}

function startNextWave(g: GameData) {
  g.wave++;
  g.waveAnnounceText = `WAVE ${g.wave}`;
  g.waveAnnounceTimer = 120;
  // Clear stains between waves
  g.stains = [];

  // Gem unlock at wave START
  const gemType = GEM_DROP_MAP[g.wave];
  if (gemType && !localStorage.getItem('mm_gem_' + gemType)) {
    localStorage.setItem('mm_gem_' + gemType, '1');
    g.player.gemsCollected[gemType] = true;
    g.state = 'gemUnlock';
    g.gemUnlockTimer = 120;
    g.gemUnlockType = gemType;
    const nameMap: Record<string, string> = {
      fire: 'EMBER', frost: 'FROST', storm: 'STORM', venom: 'VENOM',
      void: 'VOID', terra: 'TERRA', gale: 'GALE', flux: 'FLUX',
    };
    g.gemNotifyText = `${nameMap[gemType] || 'NEW'} GEM ACQUIRED`;
    g.gemNotifyTimer = 180;
    g.soundEvents.push('gemPickup');
    const colorMap: Record<string, string> = {
      fire: '#ff5500', frost: '#88ddff', storm: '#ffdd00', venom: '#44ff44',
      void: '#9b30ff', terra: '#cc8844', gale: '#aaddff', flux: '#ffaa00',
    };
    for (let i = 0; i < 30; i++) {
      addParticle(g, g.player.pos.x, g.player.pos.y, colorMap[gemType] || '#ffffff', 3, 2, 2);
    }
    return;
  } else if (gemType) {
    g.player.gemsCollected[gemType] = true;
  }

  if (isBossWave(g.wave)) {
    g.state = 'bossIntro';
    g.bossIntroTimer = 120;
    const heraldType = getHeraldType(g.wave);
    g.waveAnnounceText = HERALD_NAMES[heraldType] || 'A HERALD APPROACHES';
    g.waveAnnounceTimer = 120;
    g.soundEvents.push('bossSpawn');
    return;
  }

  spawnWaveEnemies(g);
}

function getHeraldType(wave: number): number {
  return ((Math.floor(wave / 5) - 1) % 8) + 1;
}

function spawnBoss(g: GameData) {
  const heraldType = getHeraldType(g.wave);
  const cycleNum = Math.floor((g.wave / 5 - 1) / 8);
  const baseHp = 30 + (heraldType - 1) * 5;
  const bossHp = Math.floor(baseHp * (1 + cycleNum * 0.5) * getCoopBossHpMultiplier(g));
  const boss = createEnemy(g, heraldType === 6 ? 0.5 : heraldType === 7 ? 1.4 : 0.8, 'boss');
  boss.hp = bossHp;
  boss.maxHp = bossHp;
  boss.bossPhase = 1;
  boss.shootTimer = 2000;
  boss.chargeTimer = 0;
  boss.chargeCooldown = 300;
  boss.spawnCooldown = 480;
  boss.heraldType = heraldType;
  boss.teleportCooldown = 240;
  g.enemies.push(boss);
  g.enemiesRemainingInWave = 1;
}

function spawnWaveEnemies(g: GameData) {
  const countMult = getCoopEnemyCountMultiplier(g);
  const rusherCount = Math.ceil((3 + (g.wave - 1) * 2) * countMult);
  const rusherSpeed = 1.4 + (g.wave - 1) * 0.1;
  for (let i = 0; i < rusherCount; i++) {
    const e = createEnemy(g, rusherSpeed, 'rusher');
    maybeElite(e, g.wave);
    g.enemies.push(e);
  }
  if (g.wave >= 3) {
    const sniperCount = Math.ceil(Math.min(g.wave - 2, 5) * countMult);
    for (let i = 0; i < sniperCount; i++) {
      const e = createEnemy(g, 0.8, 'sniper');
      maybeElite(e, g.wave);
      g.enemies.push(e);
    }
  }
  // Shield Rushers from wave 4+
  if (g.wave >= 4 && !isBossWave(g.wave)) {
    const shieldCount = Math.ceil(Math.min(Math.floor((g.wave - 3) / 2), 3) * countMult);
    for (let i = 0; i < shieldCount; i++) {
      const e = createEnemy(g, rusherSpeed * 0.9, 'shieldRusher');
      g.enemies.push(e);
    }
  }
  if (g.wave >= 5 && !isBossWave(g.wave)) {
    const fwCount = Math.ceil(Math.min(Math.floor((g.wave - 4) / 2), 3) * countMult);
    for (let i = 0; i < fwCount; i++) {
      const e = createEnemy(g, 0.5, 'fogWeaver');
      maybeElite(e, g.wave);
      g.enemies.push(e);
    }
  }
  if (g.wave >= 6 && !isBossWave(g.wave)) {
    const titanCount = Math.ceil(Math.min(Math.floor((g.wave - 5) / 2), 3) * countMult);
    for (let i = 0; i < titanCount; i++) {
      const e = createEnemy(g, 0.6, 'titan');
      maybeElite(e, g.wave >= 10 ? g.wave : 0);
      g.enemies.push(e);
    }
  }
  // Brutes from wave 8+
  if (g.wave >= 8 && !isBossWave(g.wave)) {
    const bruteCount = Math.ceil(Math.min(Math.floor((g.wave - 7) / 3), 2) * countMult);
    for (let i = 0; i < bruteCount; i++) {
      g.enemies.push(createEnemy(g, 0.8, 'brute'));
    }
  }
  g.enemiesRemainingInWave = g.enemies.filter(e => e.alive).length;
}

function maybeElite(e: Enemy, wave: number) {
  if (wave < 3) return;
  if (e.type === 'boss' || e.type === 'shieldRusher' || e.type === 'brute') return;
  if (e.type === 'titan' && wave < 10) return;
  if (Math.random() < 0.06) {
    e.isElite = true;
    e.hp *= 2;
    e.maxHp *= 2;
    e.baseSpeed *= 1.2;
    e.speed = e.baseSpeed;
  }
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
  const hpMap: Record<string, number> = { rusher: 2, sniper: 3, titan: 12, fogWeaver: 4, boss: 30, shieldRusher: 3, brute: 6 };
  const baseHp = hpMap[type] || 2;
  const hpMult = type === 'boss' ? getCoopBossHpMultiplier(g) : getCoopHpMultiplier(g);
  const hp = Math.ceil(baseHp * hpMult);
  const evoTimer = EVOLUTION_TIMERS[type] || 0;
  return {
    pos: { x, y }, hp, maxHp: hp, alive: true, flashTimer: 0, flinchTimer: 0,
    wobblePhase: Math.random() * Math.PI * 2, speed, baseSpeed: speed, type,
    shootTimer: type === 'sniper' ? Math.random() * SNIPER_FIRE_INTERVAL : type === 'boss' ? 2000 : 0,
    spawnFlash: 20, animFrame: 0, animTick: 0,
    poison: null, slow: null, burning: null, shadowMark: null, darkFlame: null, frozenToxin: null, stun: null,
    fogZone: null, repositionTimer: type === 'fogWeaver' ? 180 : 0,
    bossPhase: 1, chargeTimer: 0, chargeCooldown: 300, chargeVel: { x: 0, y: 0 },
    isCharging: false, spawnCooldown: 480,
    evolutionTimer: evoTimer, evolved: false, evolving: false, evolvingTimer: 0, evolutionWarning: false,
    heraldType: 0, camoTimer: 0, isCamouflaged: false, teleportCooldown: 240,
    isBerserk: false, shieldAngle: 0, isElite: false,
  };
}

function createProjectile(pos: Vec2, vel: Vec2, type: WeaponType | 'enemy' | 'holy', damage: number, opts: Partial<Projectile> = {}): Projectile {
  return {
    pos: { ...pos }, vel: { ...vel }, alive: true, type, damage,
    piercing: false, chainRadius: 0, hasChained: false, travelDist: 0,
    wobblePhase: 0, growSize: 6, zigzagDir: Math.random() > 0.5 ? 1 : -1,
    baseAngle: Math.atan2(vel.y, vel.x), homing: false, isParried: false,
    ...opts,
  };
}

export function setWeapon(g: GameData, weapon: WeaponType) {
  if (g.player.gemsCollected[weapon]) {
    g.player.activeWeapon = weapon;
  }
}

export function activateDash(g: GameData) {
  const p = g.player;
  if (!p.alive || p.isDashing || p.dashCooldown > 0 || g.state !== 'playing') return;

  const dashCd = hasUpgrade(p, 'swiftShadow') ? 78 : (p.umbraMode ? 36 : DASH_COOLDOWN);
  p.isDashing = true;
  p.dashTimer = DASH_DURATION;
  p.dashCooldown = dashCd;

  const moving = Math.abs(p.vel.x) > 0.3 || Math.abs(p.vel.y) > 0.3;
  if (moving) {
    const len = Math.sqrt(p.vel.x * p.vel.x + p.vel.y * p.vel.y);
    p.dashDir = { x: p.vel.x / len, y: p.vel.y / len };
  } else {
    p.dashDir = { x: Math.cos(p.angle), y: Math.sin(p.angle) };
  }

  const dashDurationFrames = hasUpgrade(p, 'phaseStep') ? Math.ceil(DASH_DURATION * 1.4) : DASH_DURATION;
  p.dashTimer = dashDurationFrames;
  p.invincibleTimer = Math.max(p.invincibleTimer, dashDurationFrames);
  g.soundEvents.push('dash');

  for (let i = 0; i < 6; i++) {
    addParticle(g, p.pos.x, p.pos.y, '#9b30ff', 2, 1, 0.5);
  }
}

export function activateUmbraMode(g: GameData) {
  const p = g.player;
  if (!p.alive || p.conviction < 100 || p.umbraMode || p.umbraModeCooldown > 0 || g.state !== 'playing') return;

  const duration = hasUpgrade(p, 'umbrasWill') ? 720 : UMBRA_DURATION;
  p.umbraMode = true;
  p.umbraModeTimer = duration;
  g.soundEvents.push('umbraMode');
  g.screenFlashTimer = 8;
  g.screenFlashColor = '#9b30ff';
  g.screenShakeIntensity = Math.max(g.screenShakeIntensity, 10);

  for (let i = 0; i < 20; i++) {
    addParticle(g, p.pos.x, p.pos.y, Math.random() > 0.5 ? '#9b30ff' : '#ffd700', 3, 2, 1);
  }

  g.waveAnnounceText = 'UMBRA MODE';
  g.waveAnnounceTimer = 60;
}

export function selectUpgrade(g: GameData, index: number) {
  if (g.state !== 'upgradeSelect' || index < 0 || index >= g.upgradeCards.length) return;
  const upgrade = g.upgradeCards[index].upgrade;
  g.player.upgrades.push(upgrade.id);
  applyUpgrade(g.player, upgrade.id);
  g.selectedUpgrade = index;
  g.upgradeSelectTimer = 60; // Brief display then resume
  g.screenFlashTimer = 6;
  g.screenFlashColor = upgrade.color;
  g.waveAnnounceText = upgrade.name.toUpperCase();
  g.waveAnnounceTimer = 60;
}

function applyUpgrade(p: Player, id: UpgradeId) {
  switch (id) {
    case 'ironWill': p.maxHp += 1; p.hp = Math.min(p.hp + 1, p.maxHp); break;
    default: break; // Most upgrades are checked dynamically via hasUpgrade
  }
}

function generateUpgradeCards(p: Player): UpgradeCard[] {
  const available = ALL_UPGRADES.filter(u => !p.upgrades.includes(u.id));
  if (available.length === 0) return [];

  // Weighted random selection
  const weighted: Upgrade[] = [];
  for (const u of available) {
    const weight = u.rarity === 'common' ? 60 : u.rarity === 'rare' ? 30 : 10;
    for (let i = 0; i < weight; i++) weighted.push(u);
  }

  const selected: Upgrade[] = [];
  const usedIds = new Set<UpgradeId>();
  while (selected.length < 3 && weighted.length > 0) {
    const idx = Math.floor(Math.random() * weighted.length);
    const u = weighted[idx];
    if (!usedIds.has(u.id)) {
      usedIds.add(u.id);
      selected.push(u);
    }
    weighted.splice(idx, 1);
  }

  return selected.map((u, i) => ({ upgrade: u, slideProgress: -i * 12 }));
}

export function update(g: GameData, now: number) {
  g.startPulse += 0.02;
  g.soundEvents = [];
  g.frameTick++;

  // Hit stop: freeze everything except player input
  if (g.hitStopFrames > 0) {
    g.hitStopFrames--;
    // Still update damage popups during hit stop for visual feedback
    for (const dp of g.damagePopups) { dp.pos.y -= 0.5; dp.life--; }
    g.damagePopups = g.damagePopups.filter(dp => dp.life > 0);
    return;
  }

  updateSpores(g);
  updateFog(g);

  if (g.gemPickup && !g.gemPickup.collected) {
    g.gemPickup.pulse += 0.05;
  }
  if (g.gemNotifyTimer > 0) g.gemNotifyTimer--;
  if (g.waveAnnounceTimer > 0) g.waveAnnounceTimer--;
  if (g.screenFlashTimer > 0) g.screenFlashTimer--;
  if (g.parryFlashTimer > 0) g.parryFlashTimer--;

  // Combo popups
  for (const cp of g.comboPopups) { cp.pos.y -= 0.8; cp.life--; }
  g.comboPopups = g.comboPopups.filter(cp => cp.life > 0);

  // Damage popups
  for (const dp of g.damagePopups) { dp.pos.y -= 0.8; dp.life--; }
  g.damagePopups = g.damagePopups.filter(dp => dp.life > 0);

  if (g.player.hp <= 2 && g.player.alive) g.lowHpPulse += 0.05;

  if (g.state === 'start' || g.state === 'gameOver') return;

  // Gem unlock state
  if (g.state === 'gemUnlock') {
    g.gemUnlockTimer--;
    if (g.gemUnlockTimer <= 0) {
      g.gemUnlockType = null;
      if (isBossWave(g.wave)) {
        g.state = 'bossIntro';
        g.bossIntroTimer = 120;
        const ht = getHeraldType(g.wave);
        g.waveAnnounceText = HERALD_NAMES[ht] || 'A HERALD APPROACHES';
        g.waveAnnounceTimer = 120;
        g.soundEvents.push('bossSpawn');
      } else {
        g.state = 'playing';
        spawnWaveEnemies(g);
      }
    }
    return;
  }

  // Upgrade selection
  if (g.state === 'upgradeSelect') {
    // Animate cards sliding in
    for (const card of g.upgradeCards) {
      if (card.slideProgress < 60) card.slideProgress += 4;
    }
    if (g.selectedUpgrade >= 0) {
      g.upgradeSelectTimer--;
      if (g.upgradeSelectTimer <= 0) {
        g.state = 'playing';
        g.selectedUpgrade = -1;
        startNextWave(g);
      }
    }
    return;
  }

  if (g.state === 'bossIntro') {
    g.bossIntroTimer--;
    if (g.bossIntroTimer <= 0) { g.state = 'playing'; spawnBoss(g); }
    return;
  }

  if (g.state === 'waveClear') {
    g.waveClearTimer--;
    if (g.waveClearTimer <= 0) {
      // Check if previous wave was a boss wave -> show upgrade screen
      if (isBossWave(g.wave)) {
        const cards = generateUpgradeCards(g.player);
        if (cards.length > 0) {
          g.upgradeCards = cards;
          g.state = 'upgradeSelect';
          g.selectedUpgrade = -1;
          return;
        }
      }
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
      for (let i = 0; i < 25; i++) addParticle(g, p.pos.x, p.pos.y, '#9b30ff', 3);
      g.soundEvents.push('playerDeath');
    }
    // Co-op: collapse instead of instant death
    if (g.coopState === 'playing' && g.umbraRevivesRemaining > 0 && !g.umbraCollapsed) {
      g.umbraCollapsed = true;
      g.umbraCollapseTimer = 0;
      g.umbraReviveProgress = 0;
    } else if (p.deathTimer > 90) {
      if (g.coopState === 'playing') {
        // Only game over if Solus also dead
        if (!g.solus || !g.solus.alive) {
          g.state = 'gameOver';
          if (g.wavesCleared > g.bestWave) {
            g.bestWave = g.wavesCleared;
            localStorage.setItem('mm_bestWave', String(g.bestWave));
          }
        }
      } else {
        g.state = 'gameOver';
        if (g.wavesCleared > g.bestWave) {
          g.bestWave = g.wavesCleared;
          localStorage.setItem('mm_bestWave', String(g.bestWave));
        }
      }
    }
    if (g.coopState !== 'playing' || (g.umbraCollapsed && (!g.solus || !g.solus.alive))) return;
    if (!p.alive && !g.umbraCollapsed) return;
  }

  // Controls flip timer
  if (g.controlsFlipTimer > 0) {
    g.controlsFlipTimer--;
    if (g.controlsFlipTimer <= 0) g.controlsFlipped = false;
  }

  // Parry chain timer
  if (p.parryChainTimer > 0) p.parryChainTimer--;
  else p.parryCount = 0;

  // Score multiplier decay
  if (p.scoreMultiplierKills > 0) {
    // multiplier lasts for N kills
  } else {
    p.scoreMultiplier = 1;
  }

  // Player speed - fog zones
  p.speedMultiplier = 1;
  if (hasUpgrade(p, 'momentum')) p.speedMultiplier *= 1.15;
  for (const fz of g.fogZones) {
    const dx = p.pos.x - fz.pos.x, dy = p.pos.y - fz.pos.y;
    if (Math.sqrt(dx * dx + dy * dy) < fz.radius) { p.speedMultiplier *= 0.6; break; }
  }

  // Floor hazard damage to player
  for (const h of g.floorHazards) {
    const dx = p.pos.x - h.pos.x, dy = p.pos.y - h.pos.y;
    if (Math.sqrt(dx * dx + dy * dy) < h.radius) {
      if (h.type === 'fire' && g.frameTick % 30 === 0 && p.invincibleTimer <= 0) {
        damagePlayer(g, 1);
      }
      if (h.type === 'ice') p.speedMultiplier = Math.min(p.speedMultiplier, 0.4);
      if (h.type === 'wind') {
        p.pos.x += h.dirX * 0.5;
        p.pos.y += h.dirY * 0.5;
      }
    }
  }
  for (const h of g.floorHazards) h.life--;
  g.floorHazards = g.floorHazards.filter(h => h.life > 0);

  // Umbra Mode speed boost
  if (p.umbraMode) p.speedMultiplier *= 1.4;

  // Player animation
  p.animTick++;
  if (p.attackTimer > 0) { p.attackTimer--; p.animState = 'attack'; }
  else if (p.flashTimer > 0 || p.purpleFlashTimer > 0) p.animState = 'damage';
  else {
    const moving = Math.abs(p.vel.x) > 0.3 || Math.abs(p.vel.y) > 0.3;
    p.animState = moving ? 'walk' : 'idle';
  }
  const frameRate = p.animState === 'idle' ? 15 : 8;
  if (p.animTick >= frameRate) {
    p.animTick = 0;
    const maxFrames = p.animState === 'idle' ? 3 : 4;
    p.animFrame = (p.animFrame + 1) % maxFrames;
  }

  // Dash update
  if (p.isDashing) {
    p.dashTimer--;
    const dashSpd = hasUpgrade(p, 'phaseStep') ? DASH_SPEED * 1.4 : DASH_SPEED;
    p.pos.x += p.dashDir.x * dashSpd;
    p.pos.y += p.dashDir.y * dashSpd;
    const afterimageInterval = hasUpgrade(p, 'phaseStep') ? 1 : 2;
    if (p.dashTimer % afterimageInterval === 0) {
      p.afterimages.push({ pos: { x: p.pos.x, y: p.pos.y }, angle: p.angle, life: 18, maxLife: 18 });
    }
    // Dash through enemy damage
    const dashDmg = hasUpgrade(p, 'ghostStep') ? 2 : 1;
    for (const e of g.enemies) {
      if (!e.alive) continue;
      if (dist(p.pos, e.pos) < 16) {
        e.hp -= dashDmg;
        e.flashTimer = 4;
        e.flinchTimer = 2;
        addConviction(p, 6);
        if (p.umbraMode && hasUpgrade(p, 'darkHunger')) addConviction(p, 5);
        addParticle(g, e.pos.x, e.pos.y, '#9b30ff', 2);
        addDamagePopup(g, e.pos.x, e.pos.y, dashDmg, '#9b30ff');
        if (hasUpgrade(p, 'ghostStep')) applyGemStatusOnDash(e, p.activeWeapon);
        if (e.hp <= 0) killEnemy(g, e);
      }
    }
    // Parry check during dash
    for (const proj of g.projectiles) {
      if (!proj.alive || proj.type !== 'enemy' || proj.isParried) continue;
      if (dist(p.pos, proj.pos) < 16 && p.dashTimer >= (hasUpgrade(p, 'phaseStep') ? DASH_DURATION * 1.4 - 5 : DASH_DURATION - 5)) {
        // Parry window: first ~5 frames of dash
        parryProjectile(g, proj);
      }
    }
    if (p.dashTimer <= 0) {
      p.isDashing = false;
      for (let i = 0; i < 6; i++) addParticle(g, p.pos.x, p.pos.y, '#9b30ff', 2, 1, 0.5);
    }
  } else {
    if (p.dashCooldown > 0) p.dashCooldown--;

    let dx = 0, dy = 0;
    const flip = g.controlsFlipped;
    if (g.keys[flip ? 's' : 'w'] || g.keys[flip ? 'arrowdown' : 'arrowup']) dy -= 1;
    if (g.keys[flip ? 'w' : 's'] || g.keys[flip ? 'arrowup' : 'arrowdown']) dy += 1;
    if (g.keys[flip ? 'd' : 'a'] || g.keys[flip ? 'arrowright' : 'arrowleft']) dx -= 1;
    if (g.keys[flip ? 'a' : 'd'] || g.keys[flip ? 'arrowleft' : 'arrowright']) dx += 1;

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
  }

  // Afterimage decay
  for (const ai of p.afterimages) ai.life--;
  p.afterimages = p.afterimages.filter(ai => ai.life > 0);

  // Obstacle collision
  for (const obs of g.obstacles) resolveObstacleCollision(p.pos, 8, obs);
  const brd = g.borderSize + 10;
  p.pos.x = Math.max(brd, Math.min(g.arenaWidth - brd, p.pos.x));
  p.pos.y = Math.max(brd, Math.min(g.arenaHeight - brd, p.pos.y));

  // Aim
  const worldMouseX = g.mousePos.x + g.camera.x;
  const worldMouseY = g.mousePos.y + g.camera.y;
  p.angle = Math.atan2(worldMouseY - p.pos.y, worldMouseX - p.pos.x);

  // Conviction decay
  if (g.frameTick - p.lastCombatTick > 180 && !p.umbraMode && p.conviction > 0) {
    p.conviction = Math.max(0, p.conviction - 0.33);
  }

  // Umbra Mode update
  if (p.umbraMode) {
    p.umbraModeTimer--;
    p.umbraAuraTick++;
    if (p.umbraAuraTick % 30 === 0) {
      for (const e of g.enemies) {
        if (!e.alive) continue;
        if (dist(p.pos, e.pos) < 40) {
          e.hp -= 0.5;
          e.flashTimer = 2;
          addParticle(g, e.pos.x, e.pos.y, '#9b30ff', 1.5);
          if (e.hp <= 0) killEnemy(g, e);
        }
      }
    }
    if (g.frameTick % 3 === 0) {
      const a = g.frameTick * 0.2;
      addParticle(g, p.pos.x + Math.cos(a) * 15, p.pos.y + Math.sin(a) * 15, '#9b30ff', 1.5, 0.1, 0.5);
    }
    if (p.umbraModeTimer <= 0) {
      p.umbraMode = false;
      p.conviction = 0;
      p.umbraModeCooldown = UMBRA_COOLDOWN_AFTER;
      p.umbraAuraTick = 0;
    }
  }
  if (p.umbraModeCooldown > 0) p.umbraModeCooldown--;

  // Gem pickup (legacy)
  if (g.gemPickup && !g.gemPickup.collected) {
    const gdx = p.pos.x - g.gemPickup.pos.x, gdy = p.pos.y - g.gemPickup.pos.y;
    if (Math.sqrt(gdx * gdx + gdy * gdy) < 20) {
      g.gemPickup.collected = true;
      const gt = g.gemPickup.gemType;
      p.gemsCollected[gt] = true;
      p.activeWeapon = gt;
      g.soundEvents.push('gemPickup');
    }
  }

  // Toxic puddle damage on enemies
  for (const puddle of g.toxicPuddles) {
    puddle.life--;
    for (const e of g.enemies) {
      if (!e.alive) continue;
      const pdx = e.pos.x - puddle.pos.x, pdy = e.pos.y - puddle.pos.y;
      const puddleRadius = hasUpgrade(p, 'venomMastery') ? puddle.radius * 2 : puddle.radius;
      if (Math.sqrt(pdx * pdx + pdy * pdy) < puddleRadius && !e.poison) {
        e.poison = { remaining: 240, tickTimer: 60 };
      }
    }
  }
  g.toxicPuddles = g.toxicPuddles.filter(tp => tp.life > 0);

  // Shooting
  const fireRateMult = hasUpgrade(p, 'rapidFire') ? 0.8 : 1;
  const fireRate = FIRE_RATES[p.activeWeapon] * fireRateMult;
  const umbraFireMult = p.umbraMode ? 0.8 : 1;
  if (g.mouseDown && !p.isDashing && now - g.lastShotTime > fireRate * umbraFireMult) {
    g.lastShotTime = now;
    const cos = Math.cos(p.angle);
    const sin = Math.sin(p.angle);
    const dmgMap: Record<WeaponType, number> = {
      shadow: 1, fire: 2, frost: 2, storm: 2, venom: 1,
      void: 1.5, terra: 3, gale: 1, flux: 1.5,
    };
    const speedMap: Record<WeaponType, number> = {
      shadow: 7, fire: 7, frost: 6, storm: 8, venom: 4.5,
      void: 7, terra: 4, gale: 10, flux: 5,
    };
    const dmgMult = p.umbraMode ? 1.5 : 1;
    const extraDmg = hasUpgrade(p, 'sharpEdge') ? 1 : 0;

    const createProj = (weapon: WeaponType) => {
      const spd = speedMap[weapon];
      const proj = createProjectile(
        { x: p.pos.x + cos * 12, y: p.pos.y + sin * 12 },
        { x: cos * spd, y: sin * spd },
        weapon,
        dmgMap[weapon] * dmgMult + extraDmg,
        {
          piercing: weapon === 'storm' || hasUpgrade(p, 'piercing'),
          chainRadius: weapon === 'storm' ? (hasUpgrade(p, 'stormMastery') ? 120 : 80) : 0,
          baseAngle: p.angle,
          homing: weapon === 'flux',
        }
      );
      g.projectiles.push(proj);
    };

    createProj(p.activeWeapon);
    // Twin Shot
    if (hasUpgrade(p, 'twinShot') && Math.random() < 0.25) {
      createProj(p.activeWeapon);
    }
    // Umbra Mode: also fire shadow orb
    if (p.umbraMode && p.activeWeapon !== 'shadow') {
      createProj('shadow');
    }
    p.attackTimer = 8;
    p.lastCombatTick = g.frameTick;
    p.shotCounter++;
    g.soundEvents.push('shoot_' + p.activeWeapon);
  }

  if (p.invincibleTimer > 0) p.invincibleTimer--;
  if (p.flashTimer > 0) p.flashTimer--;
  if (p.purpleFlashTimer > 0) p.purpleFlashTimer--;

  // Update fog zones
  for (const fz of g.fogZones) {
    fz.life--;
    if (fz.radius < fz.maxRadius) fz.radius += (fz.maxRadius - 80) / (4 * 60);
  }
  g.fogZones = g.fogZones.filter(fz => fz.life > 0);

  // Update projectiles
  for (const proj of g.projectiles) {
    if (!proj.alive) continue;

    if (proj.type === 'fire') {
      proj.wobblePhase += 0.5;
      const perpX = -Math.sin(proj.baseAngle), perpY = Math.cos(proj.baseAngle);
      const wobbleAmp = hasUpgrade(p, 'emberMastery') ? 3 : 2;
      const wobble = Math.sin(proj.wobblePhase) * wobbleAmp;
      proj.pos.x += proj.vel.x + perpX * wobble * 0.15;
      proj.pos.y += proj.vel.y + perpY * wobble * 0.15;
    } else if (proj.type === 'storm') {
      proj.travelDist += Math.sqrt(proj.vel.x * proj.vel.x + proj.vel.y * proj.vel.y);
      if (proj.travelDist > 8) { proj.travelDist = 0; proj.zigzagDir *= -1; }
      const perpX = -Math.sin(proj.baseAngle), perpY = Math.cos(proj.baseAngle);
      proj.pos.x += proj.vel.x + perpX * proj.zigzagDir * 0.6;
      proj.pos.y += proj.vel.y + perpY * proj.zigzagDir * 0.6;
    } else if (proj.type === 'venom') {
      proj.growSize = Math.min(10, proj.growSize + 0.03);
      proj.pos.x += proj.vel.x;
      proj.pos.y += proj.vel.y;
    } else if (proj.type === 'flux' && proj.homing) {
      let nearest: Enemy | null = null;
      let nearDist = 200;
      for (const e of g.enemies) {
        if (!e.alive) continue;
        const d = dist(proj.pos, e.pos);
        if (d < nearDist) { nearDist = d; nearest = e; }
      }
      if (nearest) {
        const tdx = nearest.pos.x - proj.pos.x, tdy = nearest.pos.y - proj.pos.y;
        const tlen = Math.sqrt(tdx * tdx + tdy * tdy);
        if (tlen > 0) {
          proj.vel.x += (tdx / tlen) * 0.3;
          proj.vel.y += (tdy / tlen) * 0.3;
          const spd = Math.sqrt(proj.vel.x * proj.vel.x + proj.vel.y * proj.vel.y);
          const maxSpd = 5;
          if (spd > maxSpd) { proj.vel.x = (proj.vel.x / spd) * maxSpd; proj.vel.y = (proj.vel.y / spd) * maxSpd; }
        }
      }
      proj.pos.x += proj.vel.x;
      proj.pos.y += proj.vel.y;
    } else {
      proj.pos.x += proj.vel.x;
      proj.pos.y += proj.vel.y;
    }

    // Trails
    if (proj.type === 'shadow') {
      proj.wobblePhase += 0.3;
      if (Math.random() < 0.5) addParticle(g, proj.pos.x + Math.cos(proj.wobblePhase) * 4, proj.pos.y + Math.sin(proj.wobblePhase) * 4, '#7722cc', 1, 0.2, 0.3);
      if (Math.random() < 0.4) addParticle(g, proj.pos.x, proj.pos.y, '#9b30ff', 1.5, 0.1, 0.4);
    } else if (proj.type === 'fire') {
      if (Math.random() < 0.7) addParticle(g, proj.pos.x, proj.pos.y, Math.random() > 0.5 ? '#ffaa00' : '#ff5500', 1.5 + Math.random(), 0.3, 0.4);
    } else if (proj.type === 'frost') {
      if (Math.random() < 0.4) addParticle(g, proj.pos.x + (Math.random() - 0.5) * 4, proj.pos.y + (Math.random() - 0.5) * 4, '#aaeeff', 1, 0.2, 0.3);
    } else if (proj.type === 'storm') {
      if (Math.random() < 0.6) addParticle(g, proj.pos.x + (Math.random() - 0.5) * 6, proj.pos.y + (Math.random() - 0.5) * 6, '#ffffff', 1, 0.3, 0.15);
    } else if (proj.type === 'venom') {
      if (Math.random() < 0.5) {
        const pt = addParticleReturn(g, proj.pos.x + (Math.random() - 0.5) * 4, proj.pos.y, '#44ff44', 1.5, 0.1, 0.5);
        if (pt) { pt.vel.x = 0; pt.vel.y = 1.5; }
      }
    } else if (proj.type === 'void') {
      if (Math.random() < 0.5) addParticle(g, proj.pos.x, proj.pos.y, '#6600bb', 1.5, 0.2, 0.3);
    } else if (proj.type === 'terra') {
      if (Math.random() < 0.4) addParticle(g, proj.pos.x, proj.pos.y, '#cc8844', 2, 0.3, 0.3);
    } else if (proj.type === 'gale') {
      if (Math.random() < 0.3) addParticle(g, proj.pos.x, proj.pos.y, '#aaddff', 1, 0.4, 0.2);
    } else if (proj.type === 'flux') {
      if (Math.random() < 0.5) {
        const colors = ['#ff5500', '#88ddff', '#ffdd00', '#44ff44', '#9b30ff'];
        addParticle(g, proj.pos.x, proj.pos.y, colors[Math.floor(Math.random() * colors.length)], 1.5, 0.2, 0.3);
      }
    } else if (proj.type === 'enemy' && Math.random() < 0.3) {
      addParticle(g, proj.pos.x, proj.pos.y, proj.isParried ? '#ffd700' : '#00ff44', 1, 0.2, 0.3);
    }

    // Obstacle collision
    for (const obs of g.obstacles) {
      if (pointInRect(proj.pos, obs)) { proj.alive = false; break; }
    }
    if (proj.pos.x < 0 || proj.pos.x > g.arenaWidth || proj.pos.y < 0 || proj.pos.y > g.arenaHeight) {
      proj.alive = false;
    }
  }

  // Enemy projectiles hit player (non-parried)
  for (const proj of g.projectiles) {
    if (!proj.alive || proj.type !== 'enemy' || proj.isParried) continue;
    const pdx = proj.pos.x - p.pos.x, pdy = proj.pos.y - p.pos.y;
    if (Math.sqrt(pdx * pdx + pdy * pdy) < 12 && p.invincibleTimer <= 0) {
      proj.alive = false;
      damagePlayer(g, 1);
      // Parry tutorial
      if (!p.parryTutorialShown) {
        p.parryTutorialShown = true;
        g.comboPopups.push({ pos: { x: p.pos.x, y: p.pos.y - 30 }, text: 'DASH INTO PROJECTILES TO PARRY', color: '#ffd700', life: 240, maxLife: 240 });
      }
    }
  }

  // Parried projectiles hit enemies
  for (const proj of g.projectiles) {
    if (!proj.alive || !proj.isParried) continue;
    for (const e of g.enemies) {
      if (!e.alive) continue;
      const pdx = proj.pos.x - e.pos.x, pdy = proj.pos.y - e.pos.y;
      if (Math.sqrt(pdx * pdx + pdy * pdy) < 14) {
        proj.alive = false;
        e.hp -= proj.damage;
        e.flashTimer = 6;
        e.flinchTimer = 2;
        addDamagePopup(g, e.pos.x, e.pos.y, proj.damage, '#ffd700');
        g.hitStopFrames = Math.max(g.hitStopFrames, 4);
        addConviction(p, 3);
        if (e.hp <= 0) {
          killEnemy(g, e);
          // Perfect parry kill
          addConviction(p, 10);
          g.comboPopups.push({ pos: { x: e.pos.x, y: e.pos.y - 15 }, text: 'PERFECT', color: '#ffd700', life: 72, maxLife: 72 });
        }
        for (let i = 0; i < 4; i++) addParticle(g, proj.pos.x, proj.pos.y, '#ffd700', 2);
        break;
      }
    }
  }

  // Update enemies
  for (const e of g.enemies) {
    if (!e.alive) continue;
    if (e.flashTimer > 0) e.flashTimer--;
    if (e.flinchTimer > 0) { e.flinchTimer--; continue; } // Flinch: skip movement
    if (e.spawnFlash > 0) e.spawnFlash--;
    e.wobblePhase += 0.15;
    e.animTick++;
    if (e.animTick >= (e.type === 'titan' || e.type === 'brute' ? 14 : 10)) {
      e.animTick = 0;
      e.animFrame = (e.animFrame + 1) % 4;
    }

    // Stun check
    if (e.stun) {
      e.stun.remaining--;
      if (e.stun.remaining <= 0) e.stun = null;
      continue; // Skip all AI while stunned
    }

    // Evolution timer
    if (e.evolutionTimer > 0 && !e.evolved && !e.evolving && e.type !== 'titan' && e.type !== 'boss' && e.type !== 'shieldRusher' && e.type !== 'brute') {
      e.evolutionTimer--;
      if (e.evolutionTimer <= 240 && !e.evolutionWarning) e.evolutionWarning = true;
      if (e.evolutionTimer <= 0) { e.evolving = true; e.evolvingTimer = 60; }
    }
    if (e.evolving) {
      e.evolvingTimer--;
      e.flashTimer = 2;
      if (e.evolvingTimer <= 0) { e.evolving = false; e.evolved = true; evolveEnemy(e); }
    }

    // Status effect ticks
    if (e.poison) {
      e.poison.remaining--;
      e.poison.tickTimer--;
      if (e.poison.tickTimer <= 0) {
        e.poison.tickTimer = 60; e.hp -= 0.5; e.flashTimer = 3;
        addParticle(g, e.pos.x, e.pos.y, '#44ff44', 1.5, 0.2, 0.3);
        if (e.hp <= 0) killEnemy(g, e);
      }
      if (e.poison.remaining <= 0) e.poison = null;
    }
    if (e.burning) {
      e.burning.remaining--;
      e.burning.tickTimer--;
      if (e.burning.tickTimer <= 0) {
        e.burning.tickTimer = 30;
        addParticle(g, e.pos.x + (Math.random() - 0.5) * 8, e.pos.y - 5, '#ff5500', 1.5, 0.3, 0.3);
      }
      if (e.burning.remaining <= 0) e.burning = null;
    }
    if (e.shadowMark) { e.shadowMark.remaining--; if (e.shadowMark.remaining <= 0) e.shadowMark = null; }
    if (e.darkFlame) {
      e.darkFlame.remaining--;
      e.darkFlame.tickTimer--;
      if (e.darkFlame.tickTimer <= 0) {
        e.darkFlame.tickTimer = 60; e.hp -= 1; e.flashTimer = 3;
        addParticle(g, e.pos.x, e.pos.y, '#331100', 2, 0.4, 0.4);
        addParticle(g, e.pos.x, e.pos.y, '#ff5500', 1.5, 0.3, 0.3);
        if (e.hp <= 0) {
          for (const other of g.enemies) {
            if (other === e || !other.alive) continue;
            if (dist(e.pos, other.pos) < 60) other.darkFlame = { remaining: 360, tickTimer: 60 };
          }
          killEnemy(g, e);
        }
      }
      if (e.darkFlame.remaining <= 0) e.darkFlame = null;
    }
    if (e.frozenToxin) {
      e.frozenToxin.remaining--;
      e.frozenToxin.tickTimer--;
      e.speed = 0;
      if (e.frozenToxin.tickTimer <= 0) {
        e.frozenToxin.tickTimer = 60; e.hp -= 1; e.flashTimer = 3;
        if (e.hp <= 0) killEnemy(g, e);
      }
      if (e.frozenToxin.remaining <= 0) { e.frozenToxin = null; e.speed = e.baseSpeed; }
    }
    if (e.slow && !e.frozenToxin) {
      e.slow.remaining--; e.speed = e.baseSpeed * 0.5;
      if (e.slow.remaining <= 0) { e.slow = null; e.speed = e.baseSpeed; }
    } else if (!e.frozenToxin) {
      e.speed = e.baseSpeed;
    }

    if (!e.alive) continue;

    const edx = p.pos.x - e.pos.x, edy = p.pos.y - e.pos.y;
    const elen = Math.sqrt(edx * edx + edy * edy);

    // Shield enemies face player
    if (e.type === 'shieldRusher' || e.type === 'brute') {
      e.shieldAngle = Math.atan2(edy, edx);
    }

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
    } else if (e.type === 'shieldRusher') {
      updateShieldRusher(g, e, p, edx, edy, elen);
    } else if (e.type === 'brute') {
      updateBrute(g, e, p, edx, edy, elen);
    } else if (e.type === 'boss') {
      updateBoss(g, e, p, edx, edy, elen);
    }

    // Obstacle avoidance
    for (const obs of g.obstacles) {
      resolveObstacleCollision(e.pos, e.type === 'titan' || e.type === 'brute' ? 14 : e.type === 'boss' ? 18 : 8, obs);
    }
    const eb = g.borderSize + 10;
    e.pos.x = Math.max(eb, Math.min(g.arenaWidth - eb, e.pos.x));
    e.pos.y = Math.max(eb, Math.min(g.arenaHeight - eb, e.pos.y));

    // Projectile hits on enemies
    for (const proj of g.projectiles) {
      if (!proj.alive || proj.type === 'enemy') continue;
      const pdx = proj.pos.x - e.pos.x, pdy = proj.pos.y - e.pos.y;
      const hitRadius = e.type === 'boss' ? 18 : e.type === 'titan' || e.type === 'brute' ? 14 : 14;
      if (Math.sqrt(pdx * pdx + pdy * pdy) < hitRadius) {
        // Shield check
        if ((e.type === 'shieldRusher' || e.type === 'brute') && isShieldBlocking(e, proj)) {
          proj.alive = false;
          addParticle(g, proj.pos.x, proj.pos.y, '#886633', 2, 0.5, 0.3);
          g.soundEvents.push('enemyHit');
          continue; // Shield blocked
        }

        if (e.isCamouflaged) { e.isCamouflaged = false; e.camoTimer = 480; }

        if (proj.type === 'frost') {
          if (!proj.hasChained) proj.hasChained = true;
          else if (!proj.piercing) proj.alive = false;
        } else if (!proj.piercing) {
          proj.alive = false;
        }

        e.hp -= proj.damage;
        e.flashTimer = 6;
        e.flinchTimer = 2; // Flinch on every hit
        g.soundEvents.push('enemyHit');
        p.lastCombatTick = g.frameTick;
        addConviction(p, e.type === 'boss' && e.isBerserk ? 8 : 3);

        // Damage popup
        addDamagePopup(g, proj.pos.x, proj.pos.y, proj.damage, getWeaponColor(proj.type as WeaponType));

        // Hit stop
        const isBoss = e.type === 'boss';
        const isKill = e.hp <= 0;
        if (isKill && isBoss) g.hitStopFrames = Math.max(g.hitStopFrames, 8);
        else if (isKill) g.hitStopFrames = Math.max(g.hitStopFrames, 4);
        else if (isBoss) g.hitStopFrames = Math.max(g.hitStopFrames, 5);
        else g.hitStopFrames = Math.max(g.hitStopFrames, 3);

        // Impact spark
        for (let i = 0; i < 3; i++) addParticle(g, proj.pos.x, proj.pos.y, getWeaponColor(proj.type as WeaponType), 1.5, 0.8, 0.2);

        const burnDur = hasUpgrade(p, 'emberMastery') ? 360 : 150;
        if (proj.type === 'fire') e.burning = { remaining: burnDur, tickTimer: 30 };
        if (proj.type === 'shadow') e.shadowMark = { remaining: 150 };
        if (proj.type === 'terra') e.stun = { remaining: 60 };

        checkCombos(g, e, proj.type as WeaponType);

        // Knockback
        if (proj.type === 'fire' && elen > 0) {
          const kb = e.type === 'titan' ? 4 : 8;
          e.pos.x += (-edx / elen) * kb;
          e.pos.y += (-edy / elen) * kb;
        }
        if (proj.type === 'gale' && elen > 0) {
          e.pos.x += (-edx / elen) * 12;
          e.pos.y += (-edy / elen) * 12;
        }
        if (proj.type === 'terra') {
          for (const other of g.enemies) {
            if (other === e || !other.alive) continue;
            if (dist(e.pos, other.pos) < 50) {
              other.hp -= proj.damage * 0.5;
              other.flashTimer = 4;
              if (other.hp <= 0) killEnemy(g, other);
            }
          }
          g.screenShakeIntensity = Math.max(g.screenShakeIntensity, 5);
        }
        const freezeDur = hasUpgrade(p, 'frostMastery') ? 210 : 120;
        if (proj.type === 'frost') {
          e.slow = { remaining: freezeDur };
          for (let i = 0; i < 6; i++) addParticle(g, proj.pos.x, proj.pos.y, '#88ddff', 2);
        }
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
        const puddleLife = hasUpgrade(p, 'venomMastery') ? 210 : 120;
        if (proj.type === 'venom') {
          e.poison = { remaining: 240, tickTimer: 60 };
          g.toxicPuddles.push({ pos: { x: proj.pos.x, y: proj.pos.y }, life: puddleLife, radius: 40 });
          for (let i = 0; i < 4; i++) addParticle(g, proj.pos.x, proj.pos.y, '#44ff44', 2);
        }
        if (proj.type === 'void') {
          e.shadowMark = { remaining: 180 };
          e.slow = { remaining: 60 };
        }

        // Volatile upgrade - AoE on impact
        if (hasUpgrade(p, 'volatile')) {
          for (const other of g.enemies) {
            if (other === e || !other.alive) continue;
            if (dist(proj.pos, other.pos) < 40) {
              other.hp -= 1;
              other.flashTimer = 3;
              if (other.hp <= 0) killEnemy(g, other);
            }
          }
        }

        // Impact particles
        const colorMap: Record<string, string[]> = {
          shadow: ['#9b30ff', '#6600bb'], fire: ['#ff5500', '#ffaa00', '#ff8800'],
          frost: ['#88ddff', '#aaeeff', '#ffffff'], storm: ['#ffdd00', '#ffffff'],
          venom: ['#44ff44', '#00cc33'], void: ['#9b30ff', '#330066'],
          terra: ['#cc8844', '#886633'], gale: ['#aaddff', '#ffffff'],
          flux: ['#ffaa00', '#ff5500', '#88ddff'],
        };
        const colors = colorMap[proj.type] || ['#ffffff'];
        const count = proj.type === 'fire' ? 5 : proj.type === 'frost' ? 6 : proj.type === 'terra' ? 8 : 4;
        for (let i = 0; i < count; i++) {
          addParticle(g, proj.pos.x, proj.pos.y, colors[Math.floor(Math.random() * colors.length)], 2);
        }

        if (e.hp <= 0) {
          const wasEvolving = e.evolving;
          killEnemy(g, e, wasEvolving);
        }
      }
    }
  }

  // Update Solus in co-op
  if (g.coopState === 'playing' && g.solus) {
    // Solus is updated externally via updateSolus() called from GameCanvas
  }

  // Holy projectile movement
  for (const proj of g.projectiles) {
    if (!proj.alive || proj.type !== 'holy') continue;
    proj.pos.x += proj.vel.x;
    proj.pos.y += proj.vel.y;
    if (Math.random() < 0.4) addParticle(g, proj.pos.x, proj.pos.y, '#ffd700', 1, 0.2, 0.3);
  }

  // Clean up
  g.projectiles = g.projectiles.filter(p => p.alive);
  g.enemies = g.enemies.filter(e => e.alive);
  g.enemiesRemainingInWave = g.enemies.length;

  // Update particles
  for (const pt of g.particles) {
    pt.pos.x += pt.vel.x; pt.pos.y += pt.vel.y;
    pt.vel.x *= 0.96; pt.vel.y *= 0.96;
    pt.life--;
  }
  g.particles = g.particles.filter(pt => pt.life > 0);

  // Screen shake
  if (g.screenShakeIntensity > 0) {
    g.screenShake.x = (Math.random() - 0.5) * g.screenShakeIntensity;
    g.screenShake.y = (Math.random() - 0.5) * g.screenShakeIntensity;
    g.screenShakeIntensity *= 0.85;
    if (g.screenShakeIntensity < 0.5) { g.screenShakeIntensity = 0; g.screenShake.x = 0; g.screenShake.y = 0; }
  }

  // Camera
  const targetCamX = p.pos.x - g.width / 2, targetCamY = p.pos.y - g.height / 2;
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
  }
}

// ---- Shield logic ----
function isShieldBlocking(e: Enemy, proj: Projectile): boolean {
  const projAngle = Math.atan2(proj.pos.y - e.pos.y, proj.pos.x - e.pos.x);
  const angleDiff = Math.abs(normalizeAngle(projAngle - e.shieldAngle + Math.PI));
  if (e.type === 'shieldRusher') return angleDiff < Math.PI / 2; // Front 180°
  if (e.type === 'brute') return angleDiff < Math.PI * 0.75; // Front + sides (270°)
  return false;
}

function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// ---- Parry ----
function parryProjectile(g: GameData, proj: Projectile) {
  const p = g.player;
  proj.isParried = true;
  proj.damage *= 2;
  // Reverse toward nearest enemy
  let nearest: Enemy | null = null;
  let nearDist = 400;
  for (const e of g.enemies) {
    if (!e.alive) continue;
    const d = dist(p.pos, e.pos);
    if (d < nearDist) { nearDist = d; nearest = e; }
  }
  if (nearest) {
    const angle = Math.atan2(nearest.pos.y - proj.pos.y, nearest.pos.x - proj.pos.x);
    const spd = Math.sqrt(proj.vel.x * proj.vel.x + proj.vel.y * proj.vel.y) * 1.5;
    proj.vel = { x: Math.cos(angle) * spd, y: Math.sin(angle) * spd };
  } else {
    proj.vel.x *= -1.5;
    proj.vel.y *= -1.5;
  }

  g.hitStopFrames = Math.max(g.hitStopFrames, 6);
  g.parryFlashTimer = 8;
  g.screenFlashTimer = 4;
  g.screenFlashColor = '#ffffff';
  addConviction(p, proj.type === 'enemy' ? 20 : 30);
  g.soundEvents.push('dash'); // parry sound

  p.parryCount++;
  p.parryChainTimer = 300; // 5 seconds
  if (p.parryCount >= 3) {
    g.comboPopups.push({ pos: { x: p.pos.x, y: p.pos.y - 30 }, text: 'UNTOUCHABLE', color: '#ffd700', life: 90, maxLife: 90 });
    addConviction(p, 50);
    p.parryCount = 0;
  } else {
    g.comboPopups.push({ pos: { x: p.pos.x, y: p.pos.y - 20 }, text: 'PARRY', color: '#ffd700', life: 60, maxLife: 60 });
  }

  for (let i = 0; i < 8; i++) addParticle(g, p.pos.x, p.pos.y, '#ffd700', 2, 1.5, 0.5);
}

function applyGemStatusOnDash(e: Enemy, weapon: WeaponType) {
  if (weapon === 'fire') e.burning = { remaining: 150, tickTimer: 30 };
  else if (weapon === 'frost') e.slow = { remaining: 120 };
  else if (weapon === 'venom') e.poison = { remaining: 240, tickTimer: 60 };
  else if (weapon === 'shadow') e.shadowMark = { remaining: 150 };
  else if (weapon === 'storm') e.stun = { remaining: 30 };
  else if (weapon === 'terra') e.stun = { remaining: 60 };
}

// ---- Combo system ----
function checkCombos(g: GameData, e: Enemy, hitType: WeaponType) {
  const resonanceMult = hasUpgrade(g.player, 'resonance') ? 1.5 : 1;
  if (hitType === 'frost' && e.burning) triggerShatter(g, e, resonanceMult);
  else if (hitType === 'fire' && e.slow) triggerShatter(g, e, resonanceMult);
  if (hitType === 'storm' && e.poison) triggerElectrotoxin(g, e, resonanceMult);
  if (hitType === 'fire' && e.shadowMark) triggerDarkFlame(g, e);
  if (hitType === 'frost' && e.poison) triggerFrozenToxin(g, e);
}

function triggerShatter(g: GameData, e: Enemy, mult: number) {
  const dmg = 6 * mult;
  const aoeRange = 80 * mult;
  e.hp -= dmg;
  for (const other of g.enemies) {
    if (other === e || !other.alive) continue;
    if (dist(e.pos, other.pos) < aoeRange) { other.hp -= 3 * mult; other.flashTimer = 6; if (other.hp <= 0) killEnemy(g, other); }
  }
  for (let i = 0; i < 16; i++) addParticle(g, e.pos.x, e.pos.y, Math.random() > 0.5 ? '#ffffff' : '#88ddff', 3, 1.5, 1.5);
  g.screenFlashTimer = 4; g.screenFlashColor = '#ffffff';
  g.screenShakeIntensity = Math.max(g.screenShakeIntensity, 15);
  g.comboPopups.push({ pos: { x: e.pos.x, y: e.pos.y - 20 }, text: 'SHATTER', color: '#88ddff', life: 72, maxLife: 72 });
  if (e.hp <= 0) killEnemy(g, e);
}

function triggerElectrotoxin(g: GameData, e: Enemy, mult: number) {
  const range = 120 * mult;
  for (const other of g.enemies) {
    if (other === e || !other.alive) continue;
    if (dist(e.pos, other.pos) < range) {
      other.hp -= 1 * mult; other.flashTimer = 6;
      for (let i = 0; i < 3; i++) addParticle(g, other.pos.x, other.pos.y, '#ffdd00', 2);
      if (other.hp <= 0) killEnemy(g, other);
    }
  }
  g.comboPopups.push({ pos: { x: e.pos.x, y: e.pos.y - 20 }, text: 'ELECTROTOXIN', color: '#aaff00', life: 72, maxLife: 72 });
  g.screenShakeIntensity = Math.max(g.screenShakeIntensity, 8);
}

function triggerDarkFlame(g: GameData, e: Enemy) {
  e.darkFlame = { remaining: 360, tickTimer: 60 };
  for (let i = 0; i < 8; i++) addParticle(g, e.pos.x, e.pos.y, Math.random() > 0.5 ? '#331100' : '#ff5500', 2, 0.5, 0.6);
  g.comboPopups.push({ pos: { x: e.pos.x, y: e.pos.y - 20 }, text: 'DARK FLAME', color: '#cc4400', life: 72, maxLife: 72 });
}

function triggerFrozenToxin(g: GameData, e: Enemy) {
  e.frozenToxin = { remaining: 240, tickTimer: 60 };
  e.speed = 0;
  for (let i = 0; i < 8; i++) addParticle(g, e.pos.x, e.pos.y, Math.random() > 0.5 ? '#226666' : '#88ddff', 2, 0.3, 0.8);
  g.comboPopups.push({ pos: { x: e.pos.x, y: e.pos.y - 20 }, text: 'FROZEN TOXIN', color: '#44aaaa', life: 72, maxLife: 72 });
}

// ---- Evolution ----
function evolveEnemy(e: Enemy) {
  if (e.type === 'rusher') { e.hp = Math.max(e.hp, 4); e.maxHp = 4; e.baseSpeed *= 1.4; e.speed = e.baseSpeed; }
  else if (e.type === 'sniper') { e.hp = Math.max(e.hp, 5); e.maxHp = 5; }
  else if (e.type === 'fogWeaver') { e.hp = Math.max(e.hp, 7); e.maxHp = 7; e.repositionTimer = 90; }
}

// ---- Enemy AI ----
function updateRusher(g: GameData, e: Enemy, p: Player, edx: number, edy: number, elen: number) {
  if (elen > 0) { e.pos.x += (edx / elen) * e.speed; e.pos.y += (edy / elen) * e.speed; }
  const contactDmg = e.isElite ? 2 : 1;
  if (elen < 16 && p.invincibleTimer <= 0) {
    damagePlayer(g, contactDmg);
    if (elen > 0) { p.vel.x = -(edx / elen) * 5; p.vel.y = -(edy / elen) * 5; }
  }
}

function updateEvolvedRusher(g: GameData, e: Enemy, p: Player, edx: number, edy: number, elen: number) {
  if (e.chargeTimer > 0) {
    e.chargeTimer--; e.pos.x += e.chargeVel.x; e.pos.y += e.chargeVel.y;
  } else {
    if (elen > 0) { e.pos.x += (edx / elen) * e.speed; e.pos.y += (edy / elen) * e.speed; }
    e.chargeCooldown--;
    if (e.chargeCooldown <= 0 && elen > 40 && elen < 200) {
      e.chargeCooldown = 180; e.chargeTimer = 30;
      e.chargeVel = { x: (edx / elen) * 8, y: (edy / elen) * 8 };
    }
  }
  if (elen < 16 && p.invincibleTimer <= 0) {
    damagePlayer(g, 2);
    if (elen > 0) { p.vel.x = -(edx / elen) * 6; p.vel.y = -(edy / elen) * 6; }
  }
}

function updateShieldRusher(g: GameData, e: Enemy, p: Player, edx: number, edy: number, elen: number) {
  if (elen > 0) { e.pos.x += (edx / elen) * e.speed; e.pos.y += (edy / elen) * e.speed; }
  if (elen < 16 && p.invincibleTimer <= 0) {
    damagePlayer(g, 1);
    if (elen > 0) { p.vel.x = -(edx / elen) * 5; p.vel.y = -(edy / elen) * 5; }
  }
}

function updateBrute(g: GameData, e: Enemy, p: Player, edx: number, edy: number, elen: number) {
  if (e.chargeTimer > 0) {
    e.chargeTimer--; e.pos.x += e.chargeVel.x; e.pos.y += e.chargeVel.y;
  } else {
    if (elen > 0) { e.pos.x += (edx / elen) * e.speed; e.pos.y += (edy / elen) * e.speed; }
    e.chargeCooldown--;
    if (e.chargeCooldown <= 0 && elen > 30 && elen < 120) {
      e.chargeCooldown = 240; e.chargeTimer = 20;
      e.chargeVel = { x: (edx / elen) * 6, y: (edy / elen) * 6 };
    }
  }
  if (elen < 20 && p.invincibleTimer <= 0) {
    damagePlayer(g, 2);
    g.screenShakeIntensity = Math.max(g.screenShakeIntensity, 10);
    if (elen > 0) { p.vel.x = -(edx / elen) * 8; p.vel.y = -(edy / elen) * 8; }
  }
}

function updateSniper(g: GameData, e: Enemy, p: Player, edx: number, edy: number, elen: number) {
  if (elen < SNIPER_KEEP_DIST_MIN && elen > 0) { e.pos.x -= (edx / elen) * e.speed * 1.5; e.pos.y -= (edy / elen) * e.speed * 1.5; }
  else if (elen > SNIPER_KEEP_DIST_MAX && elen > 0) { e.pos.x += (edx / elen) * e.speed; e.pos.y += (edy / elen) * e.speed; }
  e.shootTimer -= 16.67;
  if (e.shootTimer <= 0) {
    e.shootTimer = SNIPER_FIRE_INTERVAL;
    if (elen > 0) {
      g.projectiles.push(createProjectile({ x: e.pos.x, y: e.pos.y }, { x: (edx / elen) * ENEMY_PROJ_SPEED, y: (edy / elen) * ENEMY_PROJ_SPEED }, 'enemy', 1));
    }
  }
}

function updateEvolvedSniper(g: GameData, e: Enemy, p: Player, edx: number, edy: number, elen: number) {
  if (elen < SNIPER_KEEP_DIST_MIN && elen > 0) { e.pos.x -= (edx / elen) * e.speed * 1.5; e.pos.y -= (edy / elen) * e.speed * 1.5; }
  else if (elen > SNIPER_KEEP_DIST_MAX && elen > 0) { e.pos.x += (edx / elen) * e.speed; e.pos.y += (edy / elen) * e.speed; }
  e.shootTimer -= 16.67;
  if (e.shootTimer <= 0) {
    e.shootTimer = SNIPER_FIRE_INTERVAL;
    if (elen > 0) {
      const predTime = elen / 6;
      const predX = p.pos.x + p.vel.x * predTime * 0.5, predY = p.pos.y + p.vel.y * predTime * 0.5;
      const pdx = predX - e.pos.x, pdy = predY - e.pos.y;
      const baseAngle = Math.atan2(pdy, pdx);
      for (const offset of [-0.1, 0.1]) {
        const a = baseAngle + offset;
        g.projectiles.push(createProjectile({ x: e.pos.x, y: e.pos.y }, { x: Math.cos(a) * 6, y: Math.sin(a) * 6 }, 'enemy', 1, { baseAngle: a }));
      }
    }
  }
}

function updateTitan(g: GameData, e: Enemy, p: Player, edx: number, edy: number, elen: number) {
  if (elen > 0) { e.pos.x += (edx / elen) * e.speed; e.pos.y += (edy / elen) * e.speed; }
  const contactDmg = e.isElite ? 3 : 2;
  if (elen < 20 && p.invincibleTimer <= 0) {
    damagePlayer(g, contactDmg); g.screenShakeIntensity = Math.max(g.screenShakeIntensity, 15);
    if (elen > 0) { p.vel.x = -(edx / elen) * 8; p.vel.y = -(edy / elen) * 8; }
  }
}

function updateFogWeaver(g: GameData, e: Enemy, p: Player, edx: number, edy: number, elen: number) {
  e.repositionTimer--;
  if (e.repositionTimer <= 0) {
    e.repositionTimer = 180;
    g.fogZones.push({ pos: { x: e.pos.x, y: e.pos.y }, radius: 80, maxRadius: 120, life: 300, maxLife: 300 });
    const targetX = g.borderSize + 50 + Math.random() * (g.arenaWidth - g.borderSize * 2 - 100);
    const targetY = g.borderSize + 50 + Math.random() * (g.arenaHeight - g.borderSize * 2 - 100);
    const tdx = targetX - e.pos.x, tdy = targetY - e.pos.y;
    const tlen = Math.sqrt(tdx * tdx + tdy * tdy);
    if (tlen > 0) { e.pos.x += (tdx / tlen) * Math.min(tlen, e.speed * 60); e.pos.y += (tdy / tlen) * Math.min(tlen, e.speed * 60); }
  }
  if (elen > 100 && elen > 0) { e.pos.x += (edx / elen) * e.speed * 0.3; e.pos.y += (edy / elen) * e.speed * 0.3; }
  if (elen < 16 && p.invincibleTimer <= 0) damagePlayer(g, 1);
}

function updateEvolvedFogWeaver(g: GameData, e: Enemy, p: Player, edx: number, edy: number, elen: number) {
  e.repositionTimer--;
  if (e.repositionTimer <= 0) {
    e.repositionTimer = 90;
    g.fogZones.push({ pos: { x: e.pos.x, y: e.pos.y }, radius: 80, maxRadius: 160, life: 360, maxLife: 360 });
    const targetX = g.borderSize + 50 + Math.random() * (g.arenaWidth - g.borderSize * 2 - 100);
    const targetY = g.borderSize + 50 + Math.random() * (g.arenaHeight - g.borderSize * 2 - 100);
    const tdx = targetX - e.pos.x, tdy = targetY - e.pos.y;
    const tlen = Math.sqrt(tdx * tdx + tdy * tdy);
    if (tlen > 0) { e.pos.x += (tdx / tlen) * Math.min(tlen, e.speed * 80); e.pos.y += (tdy / tlen) * Math.min(tlen, e.speed * 80); }
  }
  if (elen > 100 && elen > 0) { e.pos.x += (edx / elen) * e.speed * 0.3; e.pos.y += (edy / elen) * e.speed * 0.3; }
  if (elen < 16 && p.invincibleTimer <= 0) damagePlayer(g, 1);
}

// ---- Boss / Herald AI ----
function updateBoss(g: GameData, e: Enemy, p: Player, edx: number, edy: number, elen: number) {
  const hpPct = e.hp / e.maxHp;
  const oldPhase = e.bossPhase;

  // Berserk check
  const berserkThreshold = g.coopState === 'playing' ? 0.20 : 0.15;
  if (hpPct <= berserkThreshold && !e.isBerserk) {
    e.isBerserk = true;
    g.waveAnnounceText = 'BERSERK';
    g.waveAnnounceTimer = 90;
    g.screenShakeIntensity = Math.max(g.screenShakeIntensity, 20);
    g.screenFlashTimer = 6;
    g.screenFlashColor = '#ff0000';
    g.soundEvents.push('bossPhaseChange');
  }

  if (hpPct > 0.66) e.bossPhase = 1;
  else if (hpPct > 0.33) e.bossPhase = 2;
  else e.bossPhase = 3;
  if (e.bossPhase !== oldPhase && !e.isBerserk) g.soundEvents.push('bossPhaseChange');

  // Berserk modifiers
  const berserkSpeedMult = e.isBerserk ? 1.6 : 1;
  const berserkFireMult = e.isBerserk ? 0.5 : 1; // halved cooldowns

  switch (e.heraldType) {
    case 1: updateCinderHerald(g, e, p, edx, edy, elen, berserkSpeedMult, berserkFireMult); break;
    case 2: updateGlacialHerald(g, e, p, edx, edy, elen, berserkSpeedMult, berserkFireMult); break;
    case 3: updateStormHerald(g, e, p, edx, edy, elen, berserkSpeedMult, berserkFireMult); break;
    case 4: updateVenomHerald(g, e, p, edx, edy, elen, berserkSpeedMult, berserkFireMult); break;
    case 5: updateVoidHerald(g, e, p, edx, edy, elen, berserkSpeedMult, berserkFireMult); break;
    case 6: updateTerraHerald(g, e, p, edx, edy, elen, berserkSpeedMult, berserkFireMult); break;
    case 7: updateGaleHerald(g, e, p, edx, edy, elen, berserkSpeedMult, berserkFireMult); break;
    case 8: updateFluxHerald(g, e, p, edx, edy, elen, berserkSpeedMult, berserkFireMult); break;
    default: updateCinderHerald(g, e, p, edx, edy, elen, berserkSpeedMult, berserkFireMult); break;
  }
}

function fireEnemyProj(g: GameData, x: number, y: number, angle: number, speed: number, damage = 1, homing = false) {
  g.projectiles.push(createProjectile({ x, y }, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed }, 'enemy', damage, { baseAngle: angle, homing }));
}

function bossContactDamage(g: GameData, e: Enemy, p: Player, elen: number, damage = 2) {
  if (elen < 20 && p.invincibleTimer <= 0) {
    damagePlayer(g, damage);
    g.screenShakeIntensity = Math.max(g.screenShakeIntensity, 15);
  }
}

function bossMove(e: Enemy, edx: number, edy: number, elen: number, speedMult = 1) {
  if (elen > 50 && elen > 0) {
    e.pos.x += (edx / elen) * e.speed * speedMult;
    e.pos.y += (edy / elen) * e.speed * speedMult;
  }
}

function updateCinderHerald(g: GameData, e: Enemy, p: Player, edx: number, edy: number, elen: number, bsm: number, bfm: number) {
  const speedMult = (e.bossPhase >= 2 ? 1.3 : 1) * bsm;
  if (e.isCharging) {
    e.pos.x += e.chargeVel.x; e.pos.y += e.chargeVel.y; e.chargeTimer--;
    if (e.chargeTimer <= 0) { e.isCharging = false; e.chargeCooldown = Math.floor(360 * bfm); }
    if (e.isBerserk) {
      // Leave fire trail
      g.floorHazards.push({ pos: { x: e.pos.x, y: e.pos.y }, radius: 20, life: 180, maxLife: 180, type: 'fire', dirX: 0, dirY: 0 });
    }
    bossContactDamage(g, e, p, elen);
    return;
  }
  bossMove(e, edx, edy, elen, speedMult);
  bossContactDamage(g, e, p, elen);

  e.shootTimer -= 16.67;
  if (e.shootTimer <= 0) {
    let count = e.bossPhase === 1 ? 3 : e.bossPhase === 2 ? 5 : 8;
    if (e.isBerserk) count = 12;
    const interval = (e.bossPhase === 3 ? 2500 : 2000) * bfm;
    e.shootTimer = interval;
    const baseAngle = Math.atan2(edy, edx);
    const isRing = e.bossPhase === 3 || e.isBerserk;
    for (let i = 0; i < count; i++) {
      const angle = isRing ? (Math.PI * 2 / count) * i : baseAngle + (i - (count - 1) / 2) * 0.3;
      fireEnemyProj(g, e.pos.x, e.pos.y, angle, 3.5);
    }
    g.soundEvents.push('bossShoot');
  }

  if (e.bossPhase >= 2 || e.isBerserk) {
    e.spawnCooldown--;
    if (e.spawnCooldown <= 0) {
      e.spawnCooldown = Math.floor(240 * bfm);
      const tileCount = e.isBerserk ? 8 : e.bossPhase === 3 ? 5 : 3;
      for (let i = 0; i < tileCount; i++) {
        g.floorHazards.push({
          pos: { x: 100 + Math.random() * (g.arenaWidth - 200), y: 100 + Math.random() * (g.arenaHeight - 200) },
          radius: 30, life: 240, maxLife: 240, type: 'fire', dirX: 0, dirY: 0,
        });
      }
    }
  }

  if (e.bossPhase === 3 || e.isBerserk) {
    e.chargeCooldown--;
    const chargeInterval = e.isBerserk ? 180 : 360;
    if (e.chargeCooldown <= 0 && elen > 0) {
      e.isCharging = true; e.chargeTimer = 30;
      e.chargeVel = { x: (edx / elen) * e.speed * 3 * bsm, y: (edy / elen) * e.speed * 3 * bsm };
      e.chargeCooldown = chargeInterval;
      g.soundEvents.push('bossCharge');
    }
  }
}

function updateGlacialHerald(g: GameData, e: Enemy, p: Player, edx: number, edy: number, elen: number, bsm: number, bfm: number) {
  bossMove(e, edx, edy, elen, bsm);
  bossContactDamage(g, e, p, elen);

  e.shootTimer -= 16.67;
  if (e.shootTimer <= 0) {
    let count = e.bossPhase === 3 ? 3 : 1;
    if (e.isBerserk) count = 5;
    e.shootTimer = (e.bossPhase === 2 ? 2000 : 3000) * bfm;
    const baseAngle = Math.atan2(edy, edx);
    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (i - (count - 1) / 2) * 0.3;
      fireEnemyProj(g, e.pos.x, e.pos.y, angle, 2.5);
    }
    g.soundEvents.push('bossShoot');
  }

  if (e.bossPhase >= 2 || e.isBerserk) {
    e.spawnCooldown--;
    if (e.spawnCooldown <= 0) {
      e.spawnCooldown = Math.floor(300 * bfm);
      const patchCount = e.isBerserk ? 6 : 2;
      for (let i = 0; i < patchCount; i++) {
        g.floorHazards.push({
          pos: { x: 100 + Math.random() * (g.arenaWidth - 200), y: 100 + Math.random() * (g.arenaHeight - 200) },
          radius: 40, life: 300, maxLife: 300, type: 'ice', dirX: 0, dirY: 0,
        });
      }
    }
  }
}

function updateStormHerald(g: GameData, e: Enemy, p: Player, edx: number, edy: number, elen: number, bsm: number, bfm: number) {
  bossMove(e, edx, edy, elen, bsm);
  bossContactDamage(g, e, p, elen);

  e.shootTimer -= 16.67;
  if (e.shootTimer <= 0) {
    let count = e.bossPhase === 3 ? 8 : 8;
    if (e.isBerserk) count = 12;
    e.shootTimer = (e.bossPhase === 3 ? 2000 : 3000) * bfm;
    for (let i = 0; i < count; i++) {
      fireEnemyProj(g, e.pos.x, e.pos.y, (Math.PI * 2 / count) * i, 3);
    }
    g.soundEvents.push('bossShoot');
  }

  if (e.bossPhase === 3 || e.isBerserk) {
    e.teleportCooldown--;
    const tpInterval = e.isBerserk ? 90 : 240;
    if (e.teleportCooldown <= 0) {
      e.teleportCooldown = tpInterval;
      e.pos.x = 100 + Math.random() * (g.arenaWidth - 200);
      e.pos.y = 100 + Math.random() * (g.arenaHeight - 200);
      for (let i = 0; i < 10; i++) addParticle(g, e.pos.x, e.pos.y, '#ffdd00', 2, 1, 0.5);
      if (e.isBerserk) {
        // Fire on arrival
        const burstCount = 12;
        for (let i = 0; i < burstCount; i++) {
          fireEnemyProj(g, e.pos.x, e.pos.y, (Math.PI * 2 / burstCount) * i, 3);
        }
      }
    }
  }
}

function updateVenomHerald(g: GameData, e: Enemy, p: Player, edx: number, edy: number, elen: number, bsm: number, bfm: number) {
  bossMove(e, edx, edy, elen, bsm);
  bossContactDamage(g, e, p, elen);

  if (g.frameTick % 10 === 0) {
    g.toxicPuddles.push({ pos: { x: e.pos.x, y: e.pos.y }, life: 180, radius: 20 });
  }

  if (!e.isCamouflaged) {
    e.camoTimer--;
    if (e.camoTimer <= 0) {
      e.isCamouflaged = true;
      e.camoTimer = e.isBerserk ? 60 : e.bossPhase >= 2 ? 300 : 120;
    }
  } else {
    e.camoTimer--;
    if (e.camoTimer <= 0 && !e.isBerserk) { e.isCamouflaged = false; e.camoTimer = e.bossPhase >= 2 ? 240 : 480; }
    // Berserk: stays permanently camouflaged
  }

  e.shootTimer -= 16.67;
  if (e.shootTimer <= 0) {
    e.shootTimer = 2000 * bfm;
    const baseAngle = Math.atan2(edy, edx);
    const count = e.isBerserk ? 8 : 3;
    for (let i = 0; i < count; i++) {
      const angle = e.isBerserk ? (Math.PI * 2 / count) * i : baseAngle + (i - 1) * 0.3;
      fireEnemyProj(g, e.pos.x, e.pos.y, angle, 3);
    }
    if (e.bossPhase >= 2) {
      for (let i = 0; i < 3; i++) {
        g.toxicPuddles.push({
          pos: { x: 100 + Math.random() * (g.arenaWidth - 200), y: 100 + Math.random() * (g.arenaHeight - 200) },
          life: 240, radius: e.bossPhase === 3 ? 50 : 30,
        });
      }
    }
    g.soundEvents.push('bossShoot');
  }

  if (e.bossPhase === 3 || e.isBerserk) {
    e.spawnCooldown--;
    if (e.spawnCooldown <= 0) {
      e.spawnCooldown = Math.floor(480 * bfm);
      for (let i = 0; i < 3; i++) {
        const r = createEnemy(g, 1.6, 'rusher');
        if (e.isBerserk) { r.isElite = true; r.hp *= 2; r.maxHp *= 2; }
        g.enemies.push(r);
      }
    }
  }
}

function updateVoidHerald(g: GameData, e: Enemy, p: Player, edx: number, edy: number, elen: number, bsm: number, bfm: number) {
  bossMove(e, edx, edy, elen, bsm);
  bossContactDamage(g, e, p, elen);

  e.shootTimer -= 16.67;
  if (e.shootTimer <= 0) {
    let count = e.bossPhase === 1 ? 3 : e.bossPhase === 2 ? 5 : 8;
    if (e.isBerserk) count = 12;
    e.shootTimer = (e.bossPhase === 3 ? 2500 : 2000) * bfm;
    const baseAngle = Math.atan2(edy, edx);
    for (let i = 0; i < count; i++) {
      const angle = e.bossPhase === 3 || e.isBerserk ? (Math.PI * 2 / count) * i : baseAngle + (i - (count - 1) / 2) * 0.25;
      fireEnemyProj(g, e.pos.x, e.pos.y, angle, 3.5);
    }
    g.soundEvents.push('bossShoot');
  }

  e.spawnCooldown--;
  if (e.spawnCooldown <= 0) {
    e.spawnCooldown = Math.floor(480 * bfm);
    const copyCount = e.isBerserk ? 4 : e.bossPhase === 1 ? 2 : 3;
    for (let i = 0; i < copyCount; i++) {
      const copy = createEnemy(g, 1, 'rusher');
      copy.hp = 1; copy.maxHp = 1;
      copy.pos = { x: e.pos.x + (Math.random() - 0.5) * 60, y: e.pos.y + (Math.random() - 0.5) * 60 };
      g.enemies.push(copy);
    }
  }

  if (e.bossPhase >= 2 || e.isBerserk) {
    e.teleportCooldown--;
    const tpInterval = e.isBerserk ? 120 : 180;
    if (e.teleportCooldown <= 0) {
      e.teleportCooldown = tpInterval;
      e.pos.x = 100 + Math.random() * (g.arenaWidth - 200);
      e.pos.y = 100 + Math.random() * (g.arenaHeight - 200);
      for (let i = 0; i < 8; i++) addParticle(g, e.pos.x, e.pos.y, '#9b30ff', 2, 1, 0.5);
    }
  }
}

function updateTerraHerald(g: GameData, e: Enemy, p: Player, edx: number, edy: number, elen: number, bsm: number, bfm: number) {
  bossMove(e, edx, edy, elen, bsm * 0.7);
  bossContactDamage(g, e, p, elen, 3);

  e.shootTimer -= 16.67;
  if (e.shootTimer <= 0) {
    e.shootTimer = (e.bossPhase === 3 ? 3000 : 4000) * bfm;
    g.screenShakeIntensity = Math.max(g.screenShakeIntensity, 20);
    const shockwaveCount = e.isBerserk ? 3 : e.bossPhase === 3 ? 3 : 1;
    for (let s = 0; s < shockwaveCount; s++) {
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 / 12) * i + s * 0.3;
        fireEnemyProj(g, e.pos.x, e.pos.y, angle, 2.5 + s);
      }
    }
    g.soundEvents.push('bossShoot');
  }

  if (e.bossPhase >= 2 || e.isBerserk) {
    e.spawnCooldown--;
    if (e.spawnCooldown <= 0) {
      e.spawnCooldown = Math.floor(360 * bfm);
      const pillarCount = e.isBerserk ? 6 : 4;
      for (let i = 0; i < pillarCount; i++) {
        g.floorHazards.push({
          pos: { x: 100 + Math.random() * (g.arenaWidth - 200), y: 100 + Math.random() * (g.arenaHeight - 200) },
          radius: 20, life: 360, maxLife: 360, type: 'void', dirX: 0, dirY: 0,
        });
      }
    }
  }

  if (e.bossPhase === 3 || e.isBerserk) {
    e.chargeCooldown--;
    if (e.chargeCooldown <= 0 && elen > 0) {
      e.isCharging = true; e.chargeTimer = 40;
      e.chargeVel = { x: (edx / elen) * e.speed * 2.5 * bsm, y: (edy / elen) * e.speed * 2.5 * bsm };
      e.chargeCooldown = e.isBerserk ? 120 : 300;
      g.soundEvents.push('bossCharge');
    }
    if (e.isCharging) {
      e.pos.x += e.chargeVel.x; e.pos.y += e.chargeVel.y; e.chargeTimer--;
      if (e.chargeTimer <= 0) e.isCharging = false;
      bossContactDamage(g, e, p, elen, 3);
    }
    if (e.isBerserk) {
      // Spawn titans
      if (g.frameTick % 600 === 0) {
        for (let i = 0; i < 2; i++) g.enemies.push(createEnemy(g, 0.6, 'titan'));
      }
    }
  }
}

function updateGaleHerald(g: GameData, e: Enemy, p: Player, edx: number, edy: number, elen: number, bsm: number, bfm: number) {
  bossMove(e, edx, edy, elen, bsm * 1.5);
  bossContactDamage(g, e, p, elen);

  e.shootTimer -= 16.67;
  if (e.shootTimer <= 0) {
    let count = e.bossPhase === 3 ? 8 : e.bossPhase === 2 ? 5 : 3;
    if (e.isBerserk) count = 16;
    e.shootTimer = (e.bossPhase === 3 ? 1500 : 2000) * bfm;
    const baseAngle = Math.atan2(edy, edx);
    for (let i = 0; i < count; i++) {
      const angle = count >= 8 ? (Math.PI * 2 / count) * i : baseAngle + (i - (count - 1) / 2) * 0.3;
      fireEnemyProj(g, e.pos.x, e.pos.y, angle, 5);
    }
    g.soundEvents.push('bossShoot');
  }

  if (e.bossPhase >= 2 || e.isBerserk) {
    e.spawnCooldown--;
    if (e.spawnCooldown <= 0) {
      e.spawnCooldown = Math.floor(300 * bfm);
      const angle = Math.random() * Math.PI * 2;
      g.floorHazards.push({
        pos: { x: g.arenaWidth / 2, y: g.arenaHeight / 2 },
        radius: e.isBerserk ? 400 : 200, life: 300, maxLife: 300, type: 'wind',
        dirX: Math.cos(angle) * 2, dirY: Math.sin(angle) * 2,
      });
    }
  }

  if (e.bossPhase === 3 || e.isBerserk) {
    e.teleportCooldown--;
    const tpInterval = e.isBerserk ? 90 : 120;
    if (e.teleportCooldown <= 0) {
      e.teleportCooldown = tpInterval;
      e.pos.x = 100 + Math.random() * (g.arenaWidth - 200);
      e.pos.y = 100 + Math.random() * (g.arenaHeight - 200);
      for (let i = 0; i < 8; i++) addParticle(g, e.pos.x, e.pos.y, '#aaddff', 2, 1, 0.5);
    }
  }
}

function updateFluxHerald(g: GameData, e: Enemy, p: Player, edx: number, edy: number, elen: number, bsm: number, bfm: number) {
  bossMove(e, edx, edy, elen, bsm);
  bossContactDamage(g, e, p, elen);

  e.shootTimer -= 16.67;
  if (e.shootTimer <= 0) {
    e.shootTimer = 2500 * bfm;
    let count = e.bossPhase === 3 ? 8 : e.bossPhase === 2 ? 5 : 3;
    if (e.isBerserk) count = 12;
    const baseAngle = Math.atan2(edy, edx);
    for (let i = 0; i < count; i++) {
      const angle = e.bossPhase === 3 || e.isBerserk ? (Math.PI * 2 / count) * i : baseAngle + (i - (count - 1) / 2) * 0.3;
      fireEnemyProj(g, e.pos.x, e.pos.y, angle, 3, 1, true);
    }
    g.soundEvents.push('bossShoot');
  }

  // Homing enemy projectiles toward player
  for (const proj of g.projectiles) {
    if (!proj.alive || proj.type !== 'enemy' || !proj.homing) continue;
    const tdx = p.pos.x - proj.pos.x, tdy = p.pos.y - proj.pos.y;
    const tlen = Math.sqrt(tdx * tdx + tdy * tdy);
    if (tlen > 0) {
      proj.vel.x += (tdx / tlen) * 0.15;
      proj.vel.y += (tdy / tlen) * 0.15;
      const spd = Math.sqrt(proj.vel.x * proj.vel.x + proj.vel.y * proj.vel.y);
      if (spd > 4) { proj.vel.x = (proj.vel.x / spd) * 4; proj.vel.y = (proj.vel.y / spd) * 4; }
    }
  }

  // Flip controls
  if (e.bossPhase === 3 || e.isBerserk) {
    e.chargeCooldown--;
    if (e.chargeCooldown <= 0) {
      e.chargeCooldown = e.isBerserk ? 300 : 600;
      g.controlsFlipped = true;
      g.controlsFlipTimer = e.isBerserk ? 480 : 240; // Permanent in berserk (8s)
      g.waveAnnounceText = 'CONTROLS FLIPPED!';
      g.waveAnnounceTimer = 60;
    }
  }

  if (e.bossPhase >= 2 || e.isBerserk) {
    e.spawnCooldown--;
    if (e.spawnCooldown <= 0) {
      e.spawnCooldown = Math.floor(480 * bfm);
      const cloneCount = e.isBerserk ? 5 : 2;
      for (let i = 0; i < cloneCount; i++) {
        const copy = createEnemy(g, 1.2, 'rusher');
        copy.hp = 2; copy.maxHp = 2;
        copy.pos = { x: e.pos.x + (Math.random() - 0.5) * 80, y: e.pos.y + (Math.random() - 0.5) * 80 };
        g.enemies.push(copy);
      }
    }
  }
}

function addConviction(p: Player, amount: number) {
  if (p.umbraMode) return;
  p.conviction = Math.min(100, p.conviction + amount);
}

function damagePlayer(g: GameData, amount: number) {
  const p = g.player;
  if (p.invincibleTimer > 0 || !p.alive) return;
  p.hp -= amount;
  const invDuration = hasUpgrade(p, 'resilience') ? Math.floor(INVINCIBLE_DURATION * 1.5) : INVINCIBLE_DURATION;
  p.invincibleTimer = invDuration;
  p.flashTimer = 8;
  p.purpleFlashTimer = 16;
  g.screenShakeIntensity = Math.max(g.screenShakeIntensity, 12);
  g.soundEvents.push('playerDamage');
  const convGain = hasUpgrade(p, 'battleHardened') ? 10 : 5;
  addConviction(p, convGain);

  // Thorn Aura
  if (hasUpgrade(p, 'thornAura')) {
    for (const e of g.enemies) {
      if (!e.alive) continue;
      if (dist(p.pos, e.pos) < 30) {
        e.hp -= 1;
        e.flashTimer = 4;
        addParticle(g, e.pos.x, e.pos.y, '#ff5500', 2);
        if (e.hp <= 0) killEnemy(g, e);
      }
    }
  }

  if (p.hp <= 0) { p.alive = false; p.deathTimer = 0; }
}

function killEnemy(g: GameData, e: Enemy, wasEvolving = false) {
  if (!e.alive) return;
  e.alive = false;

  let scoreVal = 1;
  if (wasEvolving) {
    scoreVal = 3;
    g.comboPopups.push({ pos: { x: e.pos.x, y: e.pos.y - 15 }, text: 'INTERCEPTED', color: '#ffd700', life: 72, maxLife: 72 });
  } else if (e.evolved) {
    scoreVal = 2.5;
  }
  if (e.isElite) scoreVal *= 2;
  scoreVal *= g.player.scoreMultiplier;
  g.score += Math.ceil(scoreVal);

  // Score multiplier from elite kills
  if (e.isElite) {
    g.player.scoreMultiplier = Math.min(3, g.player.scoreMultiplier + 1);
    g.player.scoreMultiplierKills = 8;
  }
  if (g.player.scoreMultiplierKills > 0) {
    g.player.scoreMultiplierKills--;
  }

  // Conviction gain
  const convGain = hasUpgrade(g.player, 'bloodlust') ? (e.evolved ? 15 : 12) : (e.evolved ? 15 : 8);
  addConviction(g.player, convGain);
  g.player.lastCombatTick = g.frameTick;

  // Spore stain
  const stainColors: Record<string, string> = {
    rusher: '#3a0800', sniper: '#220044', fogWeaver: '#334444',
    titan: '#1a0800', boss: getHeraldColor(e.heraldType), shieldRusher: '#3a0800', brute: '#1a0800',
  };
  const stainRadii: Record<string, number> = {
    rusher: 20, sniper: 18, fogWeaver: 25, titan: 50, boss: 80, shieldRusher: 22, brute: 30,
  };
  const stainColor = stainColors[e.type] || '#3a0800';
  const stainRadius = (stainRadii[e.type] || 20) * (e.evolved ? 1.3 : 1) * (e.isElite ? 1.2 : 1);
  g.stains.push({
    pos: { x: e.pos.x, y: e.pos.y },
    radius: stainRadius,
    color: stainColor,
    opacity: e.type === 'fogWeaver' ? 0.2 : 0.3,
    seed: Math.random() * 1000,
  });

  if (e.type === 'rusher' || e.type === 'shieldRusher') {
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
    if (e.evolved) g.toxicPuddles.push({ pos: { x: e.pos.x, y: e.pos.y }, life: 120, radius: 40 });
    g.soundEvents.push('enemyDeathRusher');
  } else if (e.type === 'titan' || e.type === 'brute') {
    g.screenShakeIntensity = Math.max(g.screenShakeIntensity, 20);
    for (let i = 0; i < 20; i++) {
      addParticle(g, e.pos.x, e.pos.y, ['#553300', '#884400', '#ff6600', '#ffaa00'][Math.floor(Math.random() * 4)], 3, 1, 1.5);
    }
    g.soundEvents.push('enemyDeathTitan');
  } else if (e.type === 'fogWeaver') {
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

    if (e.darkFlame) {
      for (const other of g.enemies) {
        if (other === e || !other.alive) continue;
        if (dist(e.pos, other.pos) < 60) other.darkFlame = { remaining: 360, tickTimer: 60 };
      }
    }
  }
}

function getHeraldColor(heraldType: number): string {
  const colors: Record<number, string> = {
    1: '#ff5500', 2: '#88ddff', 3: '#ffdd00', 4: '#44ff44',
    5: '#9b30ff', 6: '#cc8844', 7: '#aaddff', 8: '#ffaa00',
  };
  return colors[heraldType] || '#9b30ff';
}

function getWeaponColor(type: WeaponType): string {
  const colors: Record<WeaponType, string> = {
    shadow: '#9b30ff', fire: '#ff5500', frost: '#88ddff', storm: '#ffdd00', venom: '#44ff44',
    void: '#9b30ff', terra: '#cc8844', gale: '#aaddff', flux: '#ffaa00',
  };
  return colors[type] || '#ffffff';
}

function addDamagePopup(g: GameData, x: number, y: number, damage: number, color: string) {
  const text = damage >= 1 ? String(Math.ceil(damage)) : String(damage.toFixed(1));
  g.damagePopups.push({
    pos: { x: x + (Math.random() - 0.5) * 10, y: y - 10 },
    text, color, life: 48, maxLife: 48,
  });
}

function addParticle(g: GameData, x: number, y: number, color: string, size: number, speedMult = 1, lifeMult = 1) {
  if (g.particles.length >= MAX_PARTICLES) return;
  const angle = Math.random() * Math.PI * 2;
  const speed = (Math.random() * 2 + 1) * speedMult;
  g.particles.push({
    pos: { x, y }, vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
    life: Math.floor((Math.random() * 20 + 15) * lifeMult),
    maxLife: Math.floor((Math.random() * 20 + 15) * lifeMult),
    color, size,
  });
}

function addParticleReturn(g: GameData, x: number, y: number, color: string, size: number, speedMult = 1, lifeMult = 1): Particle | null {
  if (g.particles.length >= MAX_PARTICLES) return null;
  const angle = Math.random() * Math.PI * 2;
  const speed = (Math.random() * 2 + 1) * speedMult;
  const pt: Particle = {
    pos: { x, y }, vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
    life: Math.floor((Math.random() * 20 + 15) * lifeMult),
    maxLife: Math.floor((Math.random() * 20 + 15) * lifeMult),
    color, size,
  };
  g.particles.push(pt);
  return pt;
}

function updateSpores(g: GameData) {
  for (const s of g.spores) {
    s.pos.x += s.vel.x; s.pos.y += s.vel.y;
    if (s.pos.x < 0) s.pos.x = g.arenaWidth;
    if (s.pos.x > g.arenaWidth) s.pos.x = 0;
    if (s.pos.y < 0) s.pos.y = g.arenaHeight;
    if (s.pos.y > g.arenaHeight) s.pos.y = 0;
  }
}

function updateFog(g: GameData) {
  for (const f of g.fogPatches) {
    f.pos.x += f.vel.x; f.pos.y += f.vel.y;
    if (f.pos.x < -f.radius) f.pos.x = g.arenaWidth + f.radius;
    if (f.pos.x > g.arenaWidth + f.radius) f.pos.x = -f.radius;
    if (f.pos.y < -f.radius) f.pos.y = g.arenaHeight + f.radius;
    if (f.pos.y > g.arenaHeight + f.radius) f.pos.y = -f.radius;
  }
}

function resolveObstacleCollision(pos: Vec2, radius: number, obs: Obstacle) {
  const halfW = obs.width / 2, halfH = obs.height / 2;
  const cx = obs.pos.x + halfW, cy = obs.pos.y + halfH;
  const dx = pos.x - cx, dy = pos.y - cy;
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
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
