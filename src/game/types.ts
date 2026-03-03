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
  remaining: number;
  tickTimer: number;
}

export interface SlowEffect {
  remaining: number;
}

export interface BurningEffect {
  remaining: number;
  tickTimer: number;
}

export interface ShadowMarkEffect {
  remaining: number;
}

export interface DarkFlameEffect {
  remaining: number;
  tickTimer: number;
}

export interface FrozenToxinEffect {
  remaining: number;
  tickTimer: number;
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
  burning: BurningEffect | null;
  shadowMark: ShadowMarkEffect | null;
  darkFlame: DarkFlameEffect | null;
  frozenToxin: FrozenToxinEffect | null;
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
  // Evolution
  evolutionTimer: number;
  evolved: boolean;
  evolving: boolean;
  evolvingTimer: number;
  evolutionWarning: boolean;
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
  // New projectile fields
  travelDist: number;
  wobblePhase: number;
  growSize: number;
  zigzagDir: number;
  baseAngle: number;
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

export interface ComboPopup {
  pos: Vec2;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export type GameState = 'start' | 'playing' | 'waveClear' | 'gameOver' | 'bossIntro' | 'gemUnlock';

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
  soundEvents: string[];
  comboPopups: ComboPopup[];
  gemUnlockTimer: number;
  gemUnlockType: WeaponType | null;
  screenFlashTimer: number;
  screenFlashColor: string;
}
