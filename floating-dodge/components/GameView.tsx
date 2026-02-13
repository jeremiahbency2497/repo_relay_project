
import React, { useRef, useEffect, useState } from 'react';
import { Vector, Player, Asteroid, Monster, Bullet, Particle, Star, TrailParticle } from '../types';
import { GAME_CONSTANTS } from '../constants';

interface GameViewProps {
  isActive: boolean;
  onGameOver: (score: number, time: number) => void;
}

const GameView: React.FC<GameViewProps> = ({ isActive, onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  const playerRef = useRef<Player | null>(null);
  const asteroidsRef = useRef<Asteroid[]>([]);
  const monstersRef = useRef<Monster[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const trailsRef = useRef<TrailParticle[]>([]);
  const starsRef = useRef<Star[]>([]);
  
  const scoreRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const monstersKilledRef = useRef<number>(0);
  const lastSpawnTimeRef = useRef<number>(0);
  const lastMonsterSpawnTimeRef = useRef<number>(0);
  const spawnIntervalRef = useRef<number>(GAME_CONSTANTS.INITIAL_SPAWN_INTERVAL_MS);
  const startTimeRef = useRef<number>(0);
  const keysRef = useRef<Record<string, boolean>>({});
  const lastDashTimeRef = useRef<number>(0);
  const lastShootTimeRef = useRef<number>(0);
  const shakeFramesRef = useRef<number>(0);

  // HUD state for real-time UI updates
  const [hud, setHud] = useState({ score: 0, time: 0, dash: 100 });

  useEffect(() => {
    const stars: Star[] = [];
    for (let i = 0; i < GAME_CONSTANTS.STAR_COUNT; i++) {
      stars.push({
        pos: { x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight },
        size: Math.random() * 2,
        speed: Math.random() * 0.4 + 0.1,
      });
    }
    starsRef.current = stars;
  }, []);

  const createAsteroid = (width: number, height: number): Asteroid => {
    const radius = Math.random() * (GAME_CONSTANTS.ASTEROID_MAX_RADIUS - GAME_CONSTANTS.ASTEROID_MIN_RADIUS) + GAME_CONSTANTS.ASTEROID_MIN_RADIUS;
    const side = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    if (side === 0) { x = Math.random() * width; y = -radius; }
    else if (side === 1) { x = width + radius; y = Math.random() * height; }
    else if (side === 2) { x = Math.random() * width; y = height + radius; }
    else { x = -radius; y = Math.random() * height; }

    const targetX = width / 2 + (Math.random() - 0.5) * (width * 0.5);
    const targetY = height / 2 + (Math.random() - 0.5) * (height * 0.5);
    const angle = Math.atan2(targetY - y, targetX - x);
    const speed = Math.random() * (GAME_CONSTANTS.ASTEROID_MAX_SPEED - GAME_CONSTANTS.ASTEROID_MIN_SPEED) + GAME_CONSTANTS.ASTEROID_MIN_SPEED;

    const vertices: Vector[] = [];
    const numPoints = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < numPoints; i++) {
      const vAngle = (i / numPoints) * Math.PI * 2;
      const dist = radius * (0.8 + Math.random() * 0.4);
      vertices.push({ x: Math.cos(vAngle) * dist, y: Math.sin(vAngle) * dist });
    }

    return {
      id: Math.random().toString(36).substr(2, 9),
      pos: { x, y },
      vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      radius,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.05,
      vertices,
    };
  };

  const createMonster = (width: number, height: number): Monster => {
    const radius = GAME_CONSTANTS.MONSTER_RADIUS;
    const side = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    if (side === 0) { x = Math.random() * width; y = -radius; }
    else if (side === 1) { x = width + radius; y = Math.random() * height; }
    else if (side === 2) { x = Math.random() * width; y = height + radius; }
    else { x = -radius; y = Math.random() * height; }

    return {
      id: Math.random().toString(36).substr(2, 9),
      pos: { x, y },
      vel: { x: 0, y: 0 },
      radius,
      angle: Math.random() * Math.PI * 2,
      speed: GAME_CONSTANTS.MONSTER_INITIAL_SPEED,
      pulse: 0,
    };
  };

  const createBullet = (p: Player): Bullet => {
    return {
      id: Math.random().toString(36).substr(2, 9),
      pos: { ...p.pos },
      vel: {
        x: Math.cos(p.angle) * GAME_CONSTANTS.BULLET_SPEED,
        y: Math.sin(p.angle) * GAME_CONSTANTS.BULLET_SPEED
      },
      radius: GAME_CONSTANTS.BULLET_RADIUS,
      life: GAME_CONSTANTS.BULLET_LIFE,
    };
  };

  const spawnExplosion = (pos: Vector, colorSet: 'blue' | 'red' | 'yellow' = 'blue') => {
    let colors = ['#22d3ee', '#0891b2', '#ffffff', '#67e8f9'];
    if (colorSet === 'red') colors = ['#ef4444', '#b91c1c', '#fecaca', '#dc2626'];
    if (colorSet === 'yellow') colors = ['#f59e0b', '#d97706', '#fef3c7', '#fbbf24'];
    
    for (let i = 0; i < GAME_CONSTANTS.PARTICLE_COUNT; i++) {
      particlesRef.current.push({
        pos: { ...pos },
        vel: { x: (Math.random() - 0.5) * 12, y: (Math.random() - 0.5) * 12 },
        radius: Math.random() * 3 + 1,
        life: GAME_CONSTANTS.PARTICLE_LIFE,
        maxLife: GAME_CONSTANTS.PARTICLE_LIFE,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  };

  const update = (time: number) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const width = canvasRef.current.width;
    const height = canvasRef.current.height;

    if (isActive && !playerRef.current) {
      playerRef.current = {
        pos: { x: width / 2, y: height / 2 },
        vel: { x: 0, y: 0 },
        accel: { x: 0, y: 0 },
        angle: -Math.PI / 2,
        radius: GAME_CONSTANTS.PLAYER_RADIUS,
        dashCooldown: 0,
        dashActive: 0,
      };
      asteroidsRef.current = [];
      monstersRef.current = [];
      bulletsRef.current = [];
      particlesRef.current = [];
      trailsRef.current = [];
      scoreRef.current = 0;
      timeRef.current = 0;
      monstersKilledRef.current = 0;
      spawnIntervalRef.current = GAME_CONSTANTS.INITIAL_SPAWN_INTERVAL_MS;
      startTimeRef.current = time;
      lastSpawnTimeRef.current = time;
      lastMonsterSpawnTimeRef.current = time;
      lastShootTimeRef.current = 0;
    }

    if (isActive && playerRef.current) {
      timeRef.current = (time - startTimeRef.current) / 1000;
      const elapsed = time - startTimeRef.current;

      // Spawn Rate
      const level = Math.floor(elapsed / GAME_CONSTANTS.SPAWN_DECREMENT_INTERVAL_MS);
      spawnIntervalRef.current = Math.max(
        GAME_CONSTANTS.MIN_SPAWN_INTERVAL_MS,
        GAME_CONSTANTS.INITIAL_SPAWN_INTERVAL_MS - (level * GAME_CONSTANTS.SPAWN_DECREMENT_AMOUNT_MS)
      );

      if (time - lastSpawnTimeRef.current > spawnIntervalRef.current) {
        asteroidsRef.current.push(createAsteroid(width, height));
        lastSpawnTimeRef.current = time;
      }

      // Monster Spawning
      const monsterInterval = elapsed > 30000 ? GAME_CONSTANTS.MONSTER_SPAWN_FAST_MS : GAME_CONSTANTS.MONSTER_SPAWN_START_MS;
      if (time - lastMonsterSpawnTimeRef.current > monsterInterval && monstersRef.current.length < GAME_CONSTANTS.MONSTER_MAX_COUNT) {
        monstersRef.current.push(createMonster(width, height));
        lastMonsterSpawnTimeRef.current = time;
      }

      // Player Movement
      const p = playerRef.current;
      p.accel = { x: 0, y: 0 };
      if (keysRef.current['ArrowUp'] || keysRef.current['KeyW']) p.accel.y -= GAME_CONSTANTS.PLAYER_ACCEL;
      if (keysRef.current['ArrowDown'] || keysRef.current['KeyS']) p.accel.y += GAME_CONSTANTS.PLAYER_ACCEL;
      if (keysRef.current['ArrowLeft'] || keysRef.current['KeyA']) p.accel.x -= GAME_CONSTANTS.PLAYER_ACCEL;
      if (keysRef.current['ArrowRight'] || keysRef.current['KeyD']) p.accel.x += GAME_CONSTANTS.PLAYER_ACCEL;

      // Dash
      const now = Date.now();
      if ((keysRef.current['ShiftLeft'] || keysRef.current['ShiftRight']) && (now - lastDashTimeRef.current > GAME_CONSTANTS.DASH_COOLDOWN_MS)) {
        const hasInput = p.accel.x !== 0 || p.accel.y !== 0;
        const dashAngle = hasInput ? Math.atan2(p.accel.y, p.accel.x) : p.angle;
        p.vel.x += Math.cos(dashAngle) * GAME_CONSTANTS.DASH_IMPULSE;
        p.vel.y += Math.sin(dashAngle) * GAME_CONSTANTS.DASH_IMPULSE;
        lastDashTimeRef.current = now;
        p.dashActive = GAME_CONSTANTS.DASH_DURATION_FRAMES;
        shakeFramesRef.current = 5;
      }

      // Shooting
      if (keysRef.current['Space'] && (now - lastShootTimeRef.current > GAME_CONSTANTS.BULLET_COOLDOWN_MS)) {
        bulletsRef.current.push(createBullet(p));
        lastShootTimeRef.current = now;
        p.vel.x -= Math.cos(p.angle) * 0.5;
        p.vel.y -= Math.sin(p.angle) * 0.5;
      }

      p.vel.x = (p.vel.x + p.accel.x) * GAME_CONSTANTS.PLAYER_FRICTION;
      p.vel.y = (p.vel.y + p.accel.y) * GAME_CONSTANTS.PLAYER_FRICTION;
      p.pos.x += p.vel.x;
      p.pos.y += p.vel.y;

      if (Math.abs(p.vel.x) > 0.1 || Math.abs(p.vel.y) > 0.1) {
        const targetAngle = Math.atan2(p.vel.y, p.vel.x);
        let diff = targetAngle - p.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        p.angle += diff * GAME_CONSTANTS.PLAYER_ROT_SPEED;
      }

      if (p.dashActive > 0) p.dashActive--;

      // Boundary
      p.pos.x = Math.max(p.radius, Math.min(width - p.radius, p.pos.x));
      p.pos.y = Math.max(p.radius, Math.min(height - p.radius, p.pos.y));

      // Engine Trail
      if (Math.random() > 0.3 || p.dashActive > 0) {
        trailsRef.current.push({
          pos: { 
            x: p.pos.x - Math.cos(p.angle) * p.radius, 
            y: p.pos.y - Math.sin(p.angle) * p.radius 
          },
          life: GAME_CONSTANTS.TRAIL_LIFE,
          maxLife: GAME_CONSTANTS.TRAIL_LIFE,
          size: Math.random() * 4 + 2
        });
      }

      // Bullets Update
      bulletsRef.current = bulletsRef.current.filter(b => {
        b.pos.x += b.vel.x;
        b.pos.y += b.vel.y;
        b.life--;

        // Check bullet vs Asteroid
        for (let i = 0; i < asteroidsRef.current.length; i++) {
          const a = asteroidsRef.current[i];
          const dist = Math.sqrt((b.pos.x - a.pos.x) ** 2 + (b.pos.y - a.pos.y) ** 2);
          if (dist < a.radius + b.radius) {
            spawnExplosion(a.pos, 'yellow');
            asteroidsRef.current.splice(i, 1);
            scoreRef.current += GAME_CONSTANTS.POINTS_ASTEROID;
            return false;
          }
        }

        // Check bullet vs Monster
        for (let i = 0; i < monstersRef.current.length; i++) {
          const m = monstersRef.current[i];
          const dist = Math.sqrt((b.pos.x - m.pos.x) ** 2 + (b.pos.y - m.pos.y) ** 2);
          if (dist < m.radius + b.radius) {
            spawnExplosion(m.pos, 'red');
            monstersRef.current.splice(i, 1);
            scoreRef.current += GAME_CONSTANTS.POINTS_MONSTER;
            monstersKilledRef.current += 1;
            return false;
          }
        }

        return b.life > 0 && b.pos.x > 0 && b.pos.x < width && b.pos.y > 0 && b.pos.y < height;
      });

      // Monsters Update
      monstersRef.current.forEach(m => {
        const targetAngle = Math.atan2(p.pos.y - m.pos.y, p.pos.x - m.pos.x);
        let diff = targetAngle - m.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        m.angle += diff * GAME_CONSTANTS.MONSTER_ROT_SPEED;
        
        const currentSpeed = m.speed + 
                            (level * GAME_CONSTANTS.MONSTER_SPEED_INC) + 
                            (monstersKilledRef.current * GAME_CONSTANTS.MONSTER_KILL_SPEED_INC);
        
        m.vel.x = Math.cos(m.angle) * currentSpeed;
        m.vel.y = Math.sin(m.angle) * currentSpeed;
        m.pos.x += m.vel.x;
        m.pos.y += m.vel.y;
        m.pulse += 0.05;

        // Collision Monster with Player
        const dist = Math.sqrt((m.pos.x - p.pos.x) ** 2 + (m.pos.y - p.pos.y) ** 2);
        if (dist < m.radius + p.radius - 4) {
          spawnExplosion(p.pos, 'blue');
          spawnExplosion(m.pos, 'red');
          shakeFramesRef.current = GAME_CONSTANTS.SCREEN_SHAKE_DURATION;
          const finalScore = scoreRef.current;
          const finalTime = timeRef.current;
          playerRef.current = null;
          onGameOver(finalScore, finalTime);
        }
      });

      // Asteroid collisions with Player
      asteroidsRef.current = asteroidsRef.current.filter(a => {
        a.pos.x += a.vel.x;
        a.pos.y += a.vel.y;
        a.rotation += a.rotationSpeed;
        const dist = Math.sqrt((a.pos.x - p.pos.x) ** 2 + (a.pos.y - p.pos.y) ** 2);
        if (dist < a.radius + p.radius - 4) {
          spawnExplosion(p.pos, 'blue');
          shakeFramesRef.current = GAME_CONSTANTS.SCREEN_SHAKE_DURATION;
          const finalScore = scoreRef.current;
          const finalTime = timeRef.current;
          playerRef.current = null;
          onGameOver(finalScore, finalTime);
          return false;
        }
        return a.pos.x > -150 && a.pos.x < width + 150 && a.pos.y > -150 && a.pos.y < height + 150;
      });
    }

    starsRef.current.forEach(s => { s.pos.y += s.speed; if (s.pos.y > height) s.pos.y = 0; });
    particlesRef.current = particlesRef.current.filter(part => {
      part.pos.x += part.vel.x; part.pos.y += part.vel.y; part.life--; return part.life > 0;
    });
    trailsRef.current = trailsRef.current.filter(t => { t.life--; return t.life > 0; });

    ctx.save();
    if (shakeFramesRef.current > 0) {
      const amt = shakeFramesRef.current * 0.8;
      ctx.translate((Math.random() - 0.5) * amt, (Math.random() - 0.5) * amt);
      shakeFramesRef.current--;
    }

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    starsRef.current.forEach(s => {
      ctx.beginPath(); ctx.arc(s.pos.x, s.pos.y, s.size, 0, Math.PI * 2); ctx.fill();
    });

    trailsRef.current.forEach(t => {
      const opacity = t.life / t.maxLife;
      ctx.fillStyle = `rgba(34, 211, 238, ${opacity * 0.5})`;
      ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, t.size * opacity, 0, Math.PI * 2); ctx.fill();
    });

    asteroidsRef.current.forEach(a => {
      ctx.save(); ctx.translate(a.pos.x, a.pos.y); ctx.rotate(a.rotation);
      ctx.beginPath(); ctx.moveTo(a.vertices[0].x, a.vertices[0].y);
      for (let i = 1; i < a.vertices.length; i++) ctx.lineTo(a.vertices[i].x, a.vertices[i].y);
      ctx.closePath();
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, a.radius);
      grad.addColorStop(0, '#475569'); grad.addColorStop(1, '#1e293b');
      ctx.fillStyle = grad; ctx.fill();
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    });

    bulletsRef.current.forEach(b => {
      ctx.save();
      ctx.translate(b.pos.x, b.pos.y);
      const bGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, b.radius * 3);
      bGlow.addColorStop(0, 'rgba(239, 68, 68, 0.6)');
      bGlow.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = bGlow;
      ctx.beginPath(); ctx.arc(0, 0, b.radius * 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(0, 0, b.radius, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });

    monstersRef.current.forEach(m => {
      ctx.save();
      ctx.translate(m.pos.x, m.pos.y);
      ctx.rotate(m.angle);
      const pulseAmt = Math.sin(m.pulse) * 4;
      const mGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, m.radius * 2);
      mGlow.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
      mGlow.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = mGlow;
      ctx.beginPath(); ctx.arc(0, 0, m.radius * 2 + pulseAmt, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(m.radius, 0);
      ctx.lineTo(-m.radius, m.radius * 0.8);
      ctx.lineTo(-m.radius * 0.5, 0);
      ctx.lineTo(-m.radius, -m.radius * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#fecaca'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
    });

    particlesRef.current.forEach(part => {
      ctx.globalAlpha = part.life / part.maxLife; ctx.fillStyle = part.color;
      ctx.beginPath(); ctx.arc(part.pos.x, part.pos.y, part.radius, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    if (playerRef.current) {
      const p = playerRef.current;
      ctx.save();
      ctx.translate(p.pos.x, p.pos.y);
      ctx.rotate(p.angle);
      const pGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, p.radius * 2.5);
      pGlow.addColorStop(0, p.dashActive > 0 ? 'rgba(255, 255, 255, 0.6)' : 'rgba(34, 211, 238, 0.4)');
      pGlow.addColorStop(1, 'rgba(34, 211, 238, 0)');
      ctx.fillStyle = pGlow;
      ctx.beginPath(); ctx.arc(0, 0, p.radius * 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = p.dashActive > 0 ? '#ffffff' : '#22d3ee';
      ctx.beginPath();
      ctx.moveTo(p.radius, 0); 
      ctx.lineTo(-p.radius, p.radius * 0.7); 
      ctx.lineTo(-p.radius * 0.4, 0); 
      ctx.lineTo(-p.radius, -p.radius * 0.7); 
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#083344';
      ctx.beginPath(); ctx.arc(p.radius * 0.2, 0, p.radius * 0.25, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    ctx.restore();
    requestRef.current = requestAnimationFrame(update);
  };

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    const kd = (e: KeyboardEvent) => { keysRef.current[e.code] = true; };
    const ku = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    requestRef.current = requestAnimationFrame(update);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isActive]);

  // Dedicated HUD synchronization loop for high-performance real-time UI
  useEffect(() => {
    if (!isActive) return;
    const hudInterval = setInterval(() => {
      const now = Date.now();
      const diff = now - lastDashTimeRef.current;
      setHud({
        score: scoreRef.current,
        time: timeRef.current,
        dash: Math.min(100, (diff / GAME_CONSTANTS.DASH_COOLDOWN_MS) * 100)
      });
    }, 50); // 20 updates per second for smooth HUD
    return () => clearInterval(hudInterval);
  }, [isActive]);

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0 z-10" />
      {isActive && (
        <div className="absolute top-8 left-8 z-20 pointer-events-none flex gap-12">
          <div className="flex flex-col gap-1">
            <span className="text-slate-500 font-bold text-xs uppercase tracking-widest">Score</span>
            <span className="text-4xl font-mono text-cyan-400 drop-shadow-md">
              {hud.score}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-slate-500 font-bold text-xs uppercase tracking-widest">Flight Time</span>
            <span className="text-3xl font-mono text-white/70 drop-shadow-md">
              {hud.time.toFixed(1)}s
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-slate-500 font-bold text-xs uppercase tracking-widest">Thruster Capacitor</span>
            <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-100 ${hud.dash >= 100 ? 'bg-cyan-400 shadow-[0_0_10px_#22d3ee]' : 'bg-slate-600'}`}
                style={{ width: `${hud.dash}%` }}
              />
            </div>
            {hud.dash >= 100 && (
              <span className="text-[10px] text-cyan-500 font-black animate-pulse tracking-tighter uppercase">Boost Ready</span>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default GameView;
