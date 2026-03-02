export interface Vec2 {
  x: number;
  y: number;
}

export type AnimState = 'idle' | 'walk' | 'attack' | 'damage' | 'death';

export type WeaponType = 'shadow' | 'fire' | 'frost' | 'storm' | 'venom';

export interface Player {
  pos: Vec2;
  vel: Vec2;
  angle: number;
  hp: number;
  maxHp: number;
  invincibleTimer: number;
  alive: boolean;
  deathTimer: number;
  flashTimer: number;
  purpleFlashTimer: number;
  animState: AnimState;
  animFrame: number;
  animTick: number;
  attackTimer: number;
  activeWeapon: WeaponType;
  gemsCollected: Record<WeaponType, boolean>;
  speedMultiplier: number;
}

export type EnemyType = 'rusher' | 'sniper' | 'titan' | 'fogWeaver' | 'boss';

export interface PoisonEffect {
  remaining: number; // frames remaining
  tickTimer: number; // frames until next damage tick
}

export interface SlowEffect {
  remaining: number; // frames remaining
}

export interface Enemy {
  pos: Vec2;
  hp: number;
  maxHp: number;
  alive: boolean;
  flashTimer: number;
  wobblePhase: number;
  speed: number;
  baseSpeed: number;
  type: EnemyType;
  shootTimer: number;
  spawnFlash: number;
  animFrame: number;
  animTick: number;
  poison: PoisonEffect | null;
  slow: SlowEffect | null;
  // Fog weaver specifics
  fogZone: FogZone | null;
  repositionTimer: number;
  // Boss specifics
  bossPhase: number;
  chargeTimer: number;
  chargeCooldown: number;
  chargeVel: Vec2;
  isCharging: boolean;
  spawnCooldown: number;
}

export interface Projectile {
  pos: Vec2;
  vel: Vec2;
  alive: boolean;
  type: WeaponType | 'enemy';
  damage: number;
  piercing: boolean;
  chainRadius: number;
  hasChained: boolean;
}

export interface Particle {
  pos: Vec2;
  vel: Vec2;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface SporeParticle {
  pos: Vec2;
  vel: Vec2;
  opacity: number;
  size: number;
}

export interface FogPatch {
  pos: Vec2;
  vel: Vec2;
  radius: number;
}

export interface FogZone {
  pos: Vec2;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
}

export interface GemPickup {
  pos: Vec2;
  pulse: number;
  collected: boolean;
  gemType: WeaponType;
}

export interface ToxicPuddle {
  pos: Vec2;
  life: number;
  radius: number;
}

export interface Obstacle {
  pos: Vec2;
  width: number;
  height: number;
  type: 'pillar' | 'wall';
}

export interface Camera {
  x: number;
  y: number;
}

export type GameState = 'start' | 'playing' | 'waveClear' | 'gameOver' | 'bossIntro';

export interface GameData {
  state: GameState;
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  particles: Particle[];
  spores: SporeParticle[];
  fogPatches: FogPatch[];
  fogZones: FogZone[];
  toxicPuddles: ToxicPuddle[];
  gemPickup: GemPickup | null;
  gemNotifyTimer: number;
  gemNotifyText: string;
  wave: number;
  score: number;
  wavesCleared: number;
  bestWave: number;
  lastShotTime: number;
  waveClearTimer: number;
  screenShake: Vec2;
  screenShakeIntensity: number;
  mousePos: Vec2;
  keys: Record<string, boolean>;
  mouseDown: boolean;
  width: number;
  height: number;
  // Arena logical size
  arenaWidth: number;
  arenaHeight: number;
  borderSize: number;
  startPulse: number;
  camera: Camera;
  obstacles: Obstacle[];
  bossIntroTimer: number;
  waveAnnounceTimer: number;
  waveAnnounceText: string;
  lowHpPulse: number;
  enemiesRemainingInWave: number;
  // Sound event queue
  soundEvents: string[];
}
