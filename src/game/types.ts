export interface Vec2 {
  x: number;
  y: number;
}

export type AnimState = 'idle' | 'walk' | 'attack' | 'damage' | 'death';

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
  fireGemCollected: boolean;
  activeWeapon: 'shadow' | 'fire';
}

export type EnemyType = 'rusher' | 'sniper';

export interface Enemy {
  pos: Vec2;
  hp: number;
  maxHp: number;
  alive: boolean;
  flashTimer: number;
  wobblePhase: number;
  speed: number;
  type: EnemyType;
  shootTimer: number;
  spawnFlash: number;
  animFrame: number;
  animTick: number;
}

export interface Projectile {
  pos: Vec2;
  vel: Vec2;
  alive: boolean;
  type: 'shadow' | 'fire' | 'enemy';
  damage: number;
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

export interface GemPickup {
  pos: Vec2;
  pulse: number;
  collected: boolean;
}

export type GameState = 'start' | 'playing' | 'waveClear' | 'gameOver';

export interface GameData {
  state: GameState;
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  particles: Particle[];
  spores: SporeParticle[];
  fogPatches: FogPatch[];
  gemPickup: GemPickup | null;
  gemNotifyTimer: number;
  wave: number;
  score: number;
  wavesCleared: number;
  lastShotTime: number;
  waveClearTimer: number;
  screenShake: Vec2;
  screenShakeIntensity: number;
  mousePos: Vec2;
  keys: Record<string, boolean>;
  mouseDown: boolean;
  width: number;
  height: number;
  borderSize: number;
  startPulse: number;
}
