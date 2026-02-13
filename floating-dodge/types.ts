
export interface Vector {
  x: number;
  y: number;
}

export interface Entity {
  pos: Vector;
  vel: Vector;
  radius: number;
}

export interface Player extends Entity {
  accel: Vector;
  angle: number;
  dashCooldown: number;
  dashActive: number;
}

export interface Asteroid extends Entity {
  id: string;
  rotation: number;
  rotationSpeed: number;
  vertices: Vector[];
}

export interface Monster extends Entity {
  id: string;
  angle: number;
  speed: number;
  pulse: number;
}

export interface Bullet extends Entity {
  id: string;
  life: number;
}

export interface TrailParticle {
  pos: Vector;
  life: number;
  maxLife: number;
  size: number;
}

export interface Particle {
  pos: Vector;
  vel: Vector;
  life: number;
  maxLife: number;
  color: string;
  radius: number;
}

export interface Star {
  pos: Vector;
  size: number;
  speed: number;
}

export enum GameStatus {
  START = 'START',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER'
}
