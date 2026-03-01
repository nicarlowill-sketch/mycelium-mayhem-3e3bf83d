export interface Vec2 {
  x: number;
  y: number;
}

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
}

export interface Enemy {
  pos: Vec2;
  hp: number;
  maxHp: number;
  alive: boolean;
  flashTimer: number;
  wobblePhase: number;
  speed: number;
}

export interface Projectile {
  pos: Vec2;
  vel: Vec2;
  alive: boolean;
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

export type GameState = 'start' | 'playing' | 'waveClear' | 'gameOver';

export interface GameData {
  state: GameState;
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  particles: Particle[];
  spores: SporeParticle[];
  wave: number;
  score: number;
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
