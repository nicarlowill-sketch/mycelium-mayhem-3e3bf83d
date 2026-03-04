export interface Vec2 {
  x: number;
  y: number;
}

export type AnimState = 'idle' | 'walk' | 'attack' | 'damage' | 'death';

export type WeaponType = 'shadow' | 'fire' | 'frost' | 'storm' | 'venom' | 'void' | 'terra' | 'gale' | 'flux';

export interface Afterimage {
  pos: Vec2;
  angle: number;
  life: number;
  maxLife: number;
}

export interface FloorHazard {
  pos: Vec2;
  radius: number;
  life: number;
  maxLife: number;
  type: 'fire' | 'ice' | 'void' | 'wind';
  dirX: number;
  dirY: number;
}

export interface SporeStain {
  pos: Vec2;
  radius: number;
  color: string;
  opacity: number;
  seed: number;
}

export interface DamagePopup {
  pos: Vec2;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export type UpgradeId =
  | 'swiftShadow' | 'phaseStep' | 'momentum' | 'ghostStep'
  | 'sharpEdge' | 'rapidFire' | 'piercing' | 'overcharge' | 'volatile' | 'twinShot'
  | 'bloodlust' | 'battleHardened' | 'umbrasWill' | 'darkHunger'
  | 'ironWill' | 'resilience' | 'shadowCloak' | 'thornAura'
  | 'emberMastery' | 'frostMastery' | 'stormMastery' | 'venomMastery' | 'gemEfficiency' | 'resonance';

export type UpgradeRarity = 'common' | 'rare' | 'epic';

export interface Upgrade {
  id: UpgradeId;
  name: string;
  description: string;
  rarity: UpgradeRarity;
  color: string;
}

export interface UpgradeCard {
  upgrade: Upgrade;
  slideProgress: number;
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
  purpleFlashTimer: number;
  animState: AnimState;
  animFrame: number;
  animTick: number;
  attackTimer: number;
  activeWeapon: WeaponType;
  gemsCollected: Record<WeaponType, boolean>;
  speedMultiplier: number;
  // Dash
  dashTimer: number;
  dashCooldown: number;
  isDashing: boolean;
  dashDir: Vec2;
  afterimages: Afterimage[];
  // Conviction / Umbra Mode
  conviction: number;
  umbraMode: boolean;
  umbraModeTimer: number;
  umbraModeCooldown: number;
  umbraAuraTick: number;
  lastCombatTick: number;
  // Upgrades
  upgrades: UpgradeId[];
  shotCounter: number;
  scoreMultiplier: number;
  scoreMultiplierKills: number;
  parryCount: number;
  parryChainTimer: number;
  parryTutorialShown: boolean;
}

export type EnemyType = 'rusher' | 'sniper' | 'titan' | 'fogWeaver' | 'boss' | 'shieldRusher' | 'brute';

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

export interface StunEffect {
  remaining: number;
}

export interface Enemy {
  pos: Vec2;
  hp: number;
  maxHp: number;
  alive: boolean;
  flashTimer: number;
  flinchTimer: number;
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
  stun: StunEffect | null;
  fogZone: FogZone | null;
  repositionTimer: number;
  bossPhase: number;
  chargeTimer: number;
  chargeCooldown: number;
  chargeVel: Vec2;
  isCharging: boolean;
  spawnCooldown: number;
  evolutionTimer: number;
  evolved: boolean;
  evolving: boolean;
  evolvingTimer: number;
  evolutionWarning: boolean;
  heraldType: number;
  camoTimer: number;
  isCamouflaged: boolean;
  teleportCooldown: number;
  isBerserk: boolean;
  shieldAngle: number;
  isElite: boolean;
}

export interface Projectile {
  pos: Vec2;
  vel: Vec2;
  alive: boolean;
  type: WeaponType | 'enemy' | 'holy';
  damage: number;
  piercing: boolean;
  chainRadius: number;
  hasChained: boolean;
  travelDist: number;
  wobblePhase: number;
  growSize: number;
  zigzagDir: number;
  baseAngle: number;
  homing: boolean;
  isParried: boolean;
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

// ---- Co-op / Solus types ----
export interface SolusPlayer {
  pos: Vec2;
  vel: Vec2;
  angle: number;
  hp: number;
  maxHp: number;
  invincibleTimer: number;
  alive: boolean;
  deathTimer: number;
  flashTimer: number;
  goldFlashTimer: number;
  animState: AnimState;
  animFrame: number;
  animTick: number;
  attackTimer: number;
  speedMultiplier: number;
  // Dash equivalent
  dashTimer: number;
  dashCooldown: number;
  isDashing: boolean;
  dashDir: Vec2;
  afterimages: Afterimage[];
  // Abilities
  radiantBurstCooldown: number;
  radiantBurstChanneling: number;
  martyrShieldActive: boolean;
  martyrShieldTimer: number;
  martyrShieldCooldown: number;
  martyrShieldDamageAbsorbed: number;
  // Divine Reckoning (ultimate)
  conviction: number;
  divineReckoningActive: boolean;
  divineReckoningTimer: number;
  divineReckoningCooldown: number;
  lastCombatTick: number;
  // Co-op
  collapsed: boolean;
  collapseTimer: number;
  reviveProgress: number;
  revivesRemaining: number;
  guardianTimer: number;
  // Upgrades
  upgrades: UpgradeId[];
  shotCounter: number;
  parryCount: number;
  parryChainTimer: number;
}

export type CoopState = 'none' | 'lobby' | 'playing';

export type GameState = 'start' | 'playing' | 'waveClear' | 'gameOver' | 'bossIntro' | 'gemUnlock' | 'upgradeSelect';

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
  floorHazards: FloorHazard[];
  controlsFlipped: boolean;
  controlsFlipTimer: number;
  frameTick: number;
  hitStopFrames: number;
  stains: SporeStain[];
  damagePopups: DamagePopup[];
  upgradeCards: UpgradeCard[];
  upgradeSelectTimer: number;
  selectedUpgrade: number;
  parryFlashTimer: number;
  parryText: string;
  // Co-op
  coopState: CoopState;
  solus: SolusPlayer | null;
  solusScore: number;
  umbraRevivesRemaining: number;
  umbraCollapsed: boolean;
  umbraCollapseTimer: number;
  umbraReviveProgress: number;
  eclipseActive: boolean;
  eclipseTimer: number;
  // Solus last shot time
  solusLastShotTime: number;
  // Heart pickup
  heartPickup: HeartPickup | null;
  // Dying projectiles (flash + dissolve)
  dyingProjectiles: DyingProjectile[];
  // Multiplayer client mode
  isClientMode: boolean;
}

export interface HeartPickup {
  pos: Vec2;
  pulse: number;
  life: number;
  collected: boolean;
}

export interface DyingProjectile {
  pos: Vec2;
  life: number;
  maxLife: number;
}
