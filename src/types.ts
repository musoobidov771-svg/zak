export type Team = 'RED' | 'BLUE';

export type TankType = 'BALANCED' | 'SCOUT' | 'HEAVY';

export type WeaponType = 'STANDARD' | 'TRIPLE' | 'HEAVY' | 'PLASMA';

export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'STORE' | 'OVER';

export interface Upgrades {
  maxHealthLevel: number;
  maxShieldLevel: number;
  engineSpeedLevel: number;
  reloadSpeedLevel: number;
  damageLevel: number;
}

export interface Tank {
  id: string; // "player" | "player2" | "ai_1" etc.
  name: string;
  type: TankType;
  team: Team;
  isPlayer: boolean;
  playerIndex?: 1 | 2; // Player 1 or Player 2

  // Position and Physics
  x: number; // 2D grid coordinates for physics, translated to 3D (X, Z)
  z: number;
  y: number; // For jump or float heights
  rotation: number; // Angle in radians
  turretRotation: number; // Angle relative to tank
  speed: number;
  targetSpeed: number;
  velocity: { x: number; z: number };
  
  // Stats & Cooldowns
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  fireCooldown: number;
  maxFireCooldown: number;
  activeWeapon: WeaponType;
  ammo: number; // Limited for special weapons

  // Game/AI AI Parameters
  aiState?: 'PATROL' | 'CHASE' | 'FLEE' | 'SEARCH_POWERUP';
  aiTargetId?: string | null;
  aiTargetX?: number;
  aiTargetZ?: number;
  aiNextDecisionTime?: number;
  patrolWaypoint?: { x: number; z: number };

  // Status effects
  speedBoostTime?: number;
  shieldBoostTime?: number;
  rapidFireTime?: number;
  score: number;
  kills: number;
  deaths: number;
}

export interface Bullet {
  id: string;
  ownerId: string;
  ownerTeam: Team;
  weaponType: WeaponType;
  
  // Position / physics
  x: number;
  z: number;
  y: number;
  vx: number;
  vz: number;
  vy: number;
  gravity?: number;

  radius: number;
  damage: number;
  life: number; // Time to live in ms
  maxLife: number;
}

export interface PowerUp {
  id: string;
  type: 'HEALTH' | 'SHIELD' | 'WEAPON_TRIPLE' | 'WEAPON_PLASMA' | 'SPEED_BOOST' | 'REPAIR';
  x: number;
  z: number;
  y: number;
  pulseTime: number;
  collected: boolean;
}

export interface Obstacle {
  id: string;
  type: 'ROCK' | 'BOX' | 'WALL' | 'TREE' | 'BASE';
  x: number;
  z: number;
  radius: number;
  width?: number; // for boxes/walls
  height?: number;
  hp?: number; // destructible objects
  maxHp?: number;
}

export interface Particle {
  id: string;
  type: 'EXPLOSION' | 'SPARK' | 'SMOKE' | 'DUST' | 'LASER_FLASH' | 'DAMAGE_TEXT';
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  text?: string; // For damage popups
}

export interface GameLog {
  id: string;
  text: string;
  type: 'KILL' | 'POWERUP' | 'SYSTEM' | 'BASE';
  timestamp: number;
}

export interface MatchStats {
  redScore: number;
  blueScore: number;
  redTanksCount: number;
  blueTanksCount: number;
  kills: { [tankId: string]: number };
  deaths: { [tankId: string]: number };
  damageDealt: { [tankId: string]: number };
}
