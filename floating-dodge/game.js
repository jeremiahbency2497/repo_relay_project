/**
 * Floating Dodge - Game Logic
 */

// Canvas Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
let gameState = 'start'; // start, playing, gameover
let width, height;
let score = 0;
let startTime = 0;
let lastTime = 0;
let gameLoopId;

// Entities
let player;
let asteroids = [];
let particles = [];
let stars = [];

// Configuration
const SPAWN_RATE_INITIAL = 1000;
const SPAWN_RATE_MIN = 300;
const DIFFICULTY_RAMP = 15000; // Increase difficulty every 15s
let currentSpawnRate = SPAWN_RATE_INITIAL;
let lastSpawnTime = 0;

// Inputs
const keys = {
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    w: false, s: false, a: false, d: false,
    W: false, S: false, A: false, D: false,
    Shift: false,
    " ": false // Spacebar
};

// UI Elements
const uiScore = document.getElementById('score-display');
const uiStart = document.getElementById('start-screen');
const uiGameOver = document.getElementById('game-over-screen');
const uiFinalScore = document.getElementById('final-score');
const uiBoost = document.getElementById('boost-indicator');
const btnStart = document.getElementById('start-btn');
const btnRestart = document.getElementById('restart-btn');

// --- Classes ---

class Projectile {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.speed = 15;
        this.velocity = {
            x: Math.cos(angle) * this.speed,
            y: Math.sin(angle) * this.speed
        };
        this.color = '#ff0033'; // Red laser
        this.width = 4;
        this.length = 20;
        this.angle = angle;
    }

    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.beginPath();
        // Draw a glowing line
        ctx.moveTo(0, 0);
        ctx.lineTo(this.length, 0);

        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.width;
        ctx.lineCap = 'round';

        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;

        ctx.stroke();
        ctx.restore();
    }

    isOffScreen() {
        return (
            this.x < -50 ||
            this.x > width + 50 ||
            this.y < -50 ||
            this.y > height + 50
        );
    }
}

class Player {
    constructor() {
        this.x = width / 2;
        this.y = height / 2;
        this.radius = 15; // Slightly larger for ship
        this.color = '#00f3ff';
        this.velocity = { x: 0, y: 0 };
        this.acceleration = 0.8;
        this.friction = 0.94;
        this.maxSpeed = 6;
        this.boostSpeed = 12;
        this.boostActive = false;
        this.canBoost = true;
        this.boostDuration = 200;
        this.boostCooldown = 2000;
        this.lastBoostTime = 0;

        this.rotation = -Math.PI / 2; // Pointing up by default

        // Shooting
        this.lastShotTime = 0;
        this.shootCooldown = 150; // ms
        this.projectiles = [];
    }

    update(dt) {
        // Movement Input
        let ax = 0;
        let ay = 0;

        if (keys.ArrowUp || keys.w || keys.W) ay -= this.acceleration;
        if (keys.ArrowDown || keys.s || keys.S) ay += this.acceleration;
        if (keys.ArrowLeft || keys.a || keys.A) ax -= this.acceleration;
        if (keys.ArrowRight || keys.d || keys.D) ax += this.acceleration;

        // Calculate Rotation
        if (Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.y) > 0.1) {
            this.rotation = Math.atan2(this.velocity.y, this.velocity.x);
        }

        // Apply Acceleration
        this.velocity.x += ax;
        this.velocity.y += ay;

        // Apply Friction
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;

        // Speed Limiting & Boost
        let currentMax = this.maxSpeed;

        const now = Date.now();
        if (keys.Shift && this.canBoost && (ax !== 0 || ay !== 0)) {
            this.boostActive = true;
            this.canBoost = false;
            this.lastBoostTime = now;

            const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
            if (speed > 0) {
                this.velocity.x = (this.velocity.x / speed) * this.boostSpeed;
                this.velocity.y = (this.velocity.y / speed) * this.boostSpeed;
            }
        }

        if (this.boostActive && now - this.lastBoostTime > this.boostDuration) {
            this.boostActive = false;
        }

        if (!this.canBoost && now - this.lastBoostTime > this.boostCooldown) {
            this.canBoost = true;
        }

        if (this.canBoost) {
            uiBoost.classList.add('ready');
            uiBoost.textContent = "BOOST READY";
        } else {
            uiBoost.classList.remove('ready');
            const cooldownLeft = Math.ceil((this.boostCooldown - (now - this.lastBoostTime)) / 1000);
            if (cooldownLeft > 0) uiBoost.textContent = `BOOST: ${cooldownLeft}s`;
        }

        if (!this.boostActive) {
            const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
            if (speed > currentMax) {
                this.velocity.x = (this.velocity.x / speed) * currentMax;
                this.velocity.y = (this.velocity.y / speed) * currentMax;
            }
        }

        // Shooting
        if (keys[" "]) {
            this.shoot();
        }

        // Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update();
            if (p.isOffScreen()) {
                this.projectiles.splice(i, 1);
            }
        }

        // Apply Velocity
        this.x += this.velocity.x;
        this.y += this.velocity.y;

        // Boundary Constraints
        if (this.x < this.radius) { this.x = this.radius; this.velocity.x *= -0.5; }
        if (this.x > width - this.radius) { this.x = width - this.radius; this.velocity.x *= -0.5; }
        if (this.y < this.radius) { this.y = this.radius; this.velocity.y *= -0.5; }
        if (this.y > height - this.radius) { this.y = height - this.radius; this.velocity.y *= -0.5; }

        // Engine particles
        if (Math.abs(this.velocity.x) + Math.abs(this.velocity.y) > 1) {
            const angle = Math.atan2(this.velocity.y, this.velocity.x);
            const exhaustX = this.x - Math.cos(angle) * this.radius;
            const exhaustY = this.y - Math.sin(angle) * this.radius;

            if (Math.random() > 0.3) {
                createParticle(exhaustX, exhaustY, this.radius / 3, '#00ffff', 0.2);
            }
        }
    }

    shoot() {
        const now = Date.now();
        if (now - this.lastShotTime > this.shootCooldown) {
            const tipX = this.x + Math.cos(this.rotation) * this.radius;
            const tipY = this.y + Math.sin(this.rotation) * this.radius;

            this.projectiles.push(new Projectile(tipX, tipY, this.rotation));
            this.lastShotTime = now;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Draw Spacecraft (Triangle)
        ctx.beginPath();
        // Nose
        ctx.moveTo(this.radius, 0);
        // Back Left
        ctx.lineTo(-this.radius * 0.7, -this.radius * 0.7);
        // Center Indent (Engine)
        ctx.lineTo(-this.radius * 0.4, 0);
        // Back Right
        ctx.lineTo(-this.radius * 0.7, this.radius * 0.7);
        ctx.closePath();

        ctx.fillStyle = this.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fill();

        // Cockpit detail
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.restore();

        // Draw projectiles
        this.projectiles.forEach(p => p.draw());
    }
}

class Asteroid {
    constructor() {
        // Random spawn edge
        const edge = Math.floor(Math.random() * 4); // 0:top, 1:right, 2:bottom, 3:left

        if (edge === 0) { // Top
            this.x = Math.random() * width;
            this.y = -30;
        } else if (edge === 1) { // Right
            this.x = width + 30;
            this.y = Math.random() * height;
        } else if (edge === 2) { // Bottom
            this.x = Math.random() * width;
            this.y = height + 30;
        } else { // Left
            this.x = -30;
            this.y = Math.random() * height;
        }

        // Random size
        this.radius = 15 + Math.random() * 25;
        this.color = '#888899';

        // Target random point near center
        const targetX = width / 2 + (Math.random() - 0.5) * 200;
        const targetY = height / 2 + (Math.random() - 0.5) * 200;

        const angle = Math.atan2(targetY - this.y, targetX - this.x);
        const speed = 2 + Math.random() * 3 + (score / 15); // Speed increases slightly with score

        this.velocity = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        };

        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;

        // Determine vertices for polygon shape
        this.vertices = [];
        const sides = 5 + Math.floor(Math.random() * 4);
        for (let i = 0; i < sides; i++) {
            const vAngle = (i / sides) * Math.PI * 2;
            // Add some irregularity
            const r = this.radius * (0.8 + Math.random() * 0.4);
            this.vertices.push({
                x: Math.cos(vAngle) * r,
                y: Math.sin(vAngle) * r
            });
        }
    }

    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.rotation += this.rotationSpeed;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        ctx.beginPath();
        ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
        for (let i = 1; i < this.vertices.length; i++) {
            ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
        }
        ctx.closePath();

        ctx.fillStyle = '#222233';
        ctx.shadowBlur = 0; // No glow for asteroids
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }

    isOffScreen() {
        return (
            this.x < -100 ||
            this.x > width + 100 ||
            this.y < -100 ||
            this.y > height + 100
        );
    }
}

class Particle {
    constructor(x, y, size, color, speedMultiplier = 1) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.color = color;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 * speedMultiplier;
        this.velocity = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        };
        this.life = 1.0;
        this.decay = 0.02 + Math.random() * 0.03;
    }

    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.life -= this.decay;
    }

    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

class Star {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.z = Math.random() * 2 + 0.5; // Depth factor
        this.size = Math.random() * 1.5;
    }

    update() {
        // Simple parallax drift based on player movement
        if (player) {
            this.x -= player.velocity.x * 0.05 * this.z;
            this.y -= player.velocity.y * 0.05 * this.z;
        }

        // Wrap around
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;
    }

    draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.z * 0.3})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * this.z, 0, Math.PI * 2);
        ctx.fill();
    }
}

// --- Functions ---

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // Re-initialize stars if drastic change
    if (stars.length === 0) {
        for (let i = 0; i < 100; i++) stars.push(new Star());
    }
}

function createParticle(x, y, size, color, speedMult) {
    if (particles.length < 100) {
        particles.push(new Particle(x, y, size, color, speedMult));
    }
}

function checkCollisions() {
    // 1. Asteroid vs Player
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const asteroid = asteroids[i];

        // Player Collision
        const dx = player.x - asteroid.x;
        const dy = player.y - asteroid.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < player.radius + asteroid.radius * 0.8) {
            gameOver();
            return;
        }

        // 2. Projectile vs Asteroid
        for (let j = player.projectiles.length - 1; j >= 0; j--) {
            const proj = player.projectiles[j];

            const pdx = proj.x - asteroid.x;
            const pdy = proj.y - asteroid.y;
            const pDist = Math.sqrt(pdx * pdx + pdy * pdy);

            if (pDist < asteroid.radius + 5) {
                // Destroy Asteroid
                // Particles
                for (let k = 0; k < 10; k++) {
                    createParticle(asteroid.x, asteroid.y, Math.random() * 3, '#aaaaaa', 1.5);
                    createParticle(asteroid.x, asteroid.y, Math.random() * 3, '#ffaa00', 1.5);
                }

                // Remove entities
                asteroids.splice(i, 1);
                player.projectiles.splice(j, 1);

                // Bonus Score? or maybe just survival
                // Let's add slight time bonus visually or just keep it survival
                // User didn't specify score change, just "destroy"

                break; // Break projectile loop since asteroid is gone
            }
        }
    }
}

function gameOver() {
    gameState = 'gameover';

    // Explosion effect
    for (let i = 0; i < 30; i++) {
        createParticle(player.x, player.y, Math.random() * 4 + 2, player.color, 3);
        createParticle(player.x, player.y, Math.random() * 3 + 1, '#ff0000', 4);
    }

    uiFinalScore.textContent = score.toFixed(1);

    // Delay showing screen slightly for effect
    setTimeout(() => {
        uiGameOver.classList.remove('hidden');
        uiGameOver.classList.add('active');
        uiBoost.style.opacity = 0;
    }, 500);
}

function resetGame() {
    player = new Player();
    asteroids = [];
    particles = [];
    score = 0;
    startTime = Date.now();
    currentSpawnRate = SPAWN_RATE_INITIAL;
    lastSpawnTime = 0;

    uiStart.classList.remove('active');
    uiStart.classList.add('hidden');
    uiGameOver.classList.remove('active');
    uiGameOver.classList.add('hidden');
    uiBoost.classList.remove('ready');

    gameState = 'playing';
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    animate();
}

function animate() {
    if (gameState !== 'playing' && particles.length === 0) return;

    ctx.clearRect(0, 0, width, height);

    // Background Stars
    stars.forEach(star => {
        star.update();
        star.draw();
    });

    // Update Game Logic if playing
    if (gameState === 'playing') {
        const now = Date.now();

        // Update Score
        score = (now - startTime) / 1000;
        uiScore.textContent = `Time: ${score.toFixed(1)}s`;

        // Difficulty Ramp
        currentSpawnRate = Math.max(SPAWN_RATE_MIN, SPAWN_RATE_INITIAL - Math.floor(score / 15) * 100);

        // Spawn Asteroids
        if (now - lastSpawnTime > currentSpawnRate) { // Check against limit
            asteroids.push(new Asteroid());
            lastSpawnTime = now;
        }

        player.update();
        checkCollisions();
    }

    // Entities Draw/Update
    if (gameState === 'playing' || gameState === 'gameover') {
        // Draw asteroids even if gameover (freeze frame effect optional, but let's keep them moving slightly or just existing)
        // If gameover, we stop updating them to freeze the scene, but we draw them.

        asteroids.forEach((asteroid, index) => {
            if (gameState === 'playing') asteroid.update();
            asteroid.draw();
            if (asteroid.isOffScreen()) {
                asteroids.splice(index, 1);
            }
        });

        // Draw Particles
        particles.forEach((p, index) => {
            p.update();
            p.draw();
            if (p.life <= 0) particles.splice(index, 1);
        });

        // Draw Player only if playing
        if (gameState === 'playing') {
            player.draw();
        }
    }

    // Loop
    if (gameState === 'playing' || particles.length > 0) {
        gameLoopId = requestAnimationFrame(animate);
    }
}

// --- Event Listeners ---

window.addEventListener('resize', resize);
window.addEventListener('keydown', e => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
});
window.addEventListener('keyup', e => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

btnStart.addEventListener('click', resetGame);
btnRestart.addEventListener('click', resetGame);

// Init
resize();
// Draw initial stars
stars.forEach(star => star.draw());
