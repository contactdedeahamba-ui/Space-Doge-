/**
 * Retro Space Shooter Engine
 * Built with Vanilla JavaScript and HTML5 Canvas
 */

export class Player {
  constructor(x, y, width, height, color, speed) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
    this.speed = speed;
    this.sidePadding = 10;
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(this.x + this.width / 2, this.y);
    ctx.lineTo(this.x + this.width, this.y + this.height);
    ctx.lineTo(this.x, this.y + this.height);
    ctx.closePath();
    ctx.fill();
    
    // Add a glow effect
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.color;
  }

  update(keys, canvasWidth) {
    if ((keys['ArrowLeft'] || keys['a']) && this.x > this.sidePadding) {
      this.x -= this.speed;
    }
    if ((keys['ArrowRight'] || keys['d']) && this.x < canvasWidth - this.width - this.sidePadding) {
      this.x += this.speed;
    }
  }
}

export class Projectile {
  constructor(x, y, radius, color, velocity) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.velocity = velocity;
    this.markedForDeletion = false;
  }

  draw(ctx) {
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  update() {
    this.y -= this.velocity;
    if (this.y < -this.radius) this.markedForDeletion = true;
  }
}

export class Enemy {
  constructor(x, y, width, height, color, velocity) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
    this.velocity = velocity;
    this.markedForDeletion = false;
  }

  draw(ctx) {
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // Add some "details" to the enemy
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(this.x + 5, this.y + 5, 10, 10);
    ctx.fillRect(this.x + this.width - 15, this.y + 5, 10, 10);
  }

  update(canvasHeight) {
    this.y += this.velocity;
    if (this.y > canvasHeight) this.markedForDeletion = true;
  }
}

export class Particle {
  constructor(x, y, radius, color, velocity) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.velocity = velocity;
    this.alpha = 1;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  update() {
    this.x += this.velocity.x;
    this.y += this.velocity.y;
    this.alpha -= 0.02;
  }
}

export async function initGame(canvasId, scoreId, restartBtnId, waveId, pauseBtnId, pauseOverlayId, manualRebootBtnId) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById(scoreId);
  const waveEl = document.getElementById(waveId);
  const restartBtn = document.getElementById(restartBtnId);
  const pauseBtn = document.getElementById(pauseBtnId);
  const pauseOverlay = document.getElementById(pauseOverlayId);
  const manualRebootBtn = document.getElementById(manualRebootBtnId);

  // Set canvas size
  canvas.width = 600;
  canvas.height = 800;

  // Load config
  let config;
  try {
    const response = await fetch('./data.json');
    config = await response.json();
  } catch (error) {
    console.error('Failed to load data.json:', error);
    return;
  }

  let player;
  let projectiles = [];
  let enemies = [];
  let particles = [];
  let score = 0;
  let gameActive = true;
  let isPaused = false;
  let keys = {};
  let wave = 1;
  let lastEnemySpawn = 0;
  let stars = [];

  // Initialize starfield
  for (let i = 0; i < 100; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2,
      speed: Math.random() * 2 + 0.5
    });
  }

  function reset() {
    player = new Player(
      canvas.width / 2 - config.player.width / 2,
      canvas.height - 100,
      config.player.width,
      config.player.height,
      config.player.color,
      config.player.speed
    );
    projectiles = [];
    enemies = [];
    particles = [];
    score = 0;
    wave = 1;
    scoreEl.innerText = '000000';
    waveEl.innerText = '1';
    gameActive = true;
    isPaused = false;
    restartBtn.style.display = 'none';
    pauseOverlay.classList.add('hidden');
    requestAnimationFrame(animate); 
  }

  function togglePause() {
    if (!gameActive) return;
    isPaused = !isPaused;
    if (isPaused) {
      pauseOverlay.classList.remove('hidden');
      pauseBtn.innerText = 'PLAY';
    } else {
      pauseOverlay.classList.add('hidden');
      pauseBtn.innerText = 'PAUSE';
      requestAnimationFrame(animate);
    }
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'Escape') {
      togglePause();
      return;
    }

    keys[e.key] = true;
    if (e.key === ' ' && gameActive && !isPaused) {
      projectiles.push(new Projectile(
        player.x + player.width / 2,
        player.y,
        config.projectile.radius,
        config.projectile.color,
        config.projectile.velocity
      ));
    }
  });

  window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
  });

  restartBtn.addEventListener('click', () => {
    if (!gameActive) reset();
  });

  pauseBtn.addEventListener('click', togglePause);
  manualRebootBtn.addEventListener('click', () => {
    if (confirm('REBOOT SYSTEM? ALL PROGRESS WILL BE LOST.')) {
      reset();
    }
  });

  function createExplosion(x, y, color) {
    for (let i = 0; i < 15; i++) {
      particles.push(new Particle(
        x,
        y,
        Math.random() * 3,
        color,
        {
          x: (Math.random() - 0.5) * 8,
          y: (Math.random() - 0.5) * 8
        }
      ));
    }
  }

  function spawnEnemy() {
    const x = Math.random() * (canvas.width - config.enemy.width);
    const speedBoost = Math.min(wave * 0.2, 3);
    enemies.push(new Enemy(
      x,
      -config.enemy.height,
      config.enemy.width,
      config.enemy.height,
      config.enemy.color,
      config.enemy.velocity + speedBoost
    ));
  }

  function drawStarfield(ctx) {
    ctx.fillStyle = '#ffffff';
    stars.forEach(star => {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
      star.y += star.speed;
      if (star.y > canvas.height) star.y = 0;
    });
  }

  function animate(timestamp) {
    if (!gameActive || isPaused) return;

    requestAnimationFrame(animate);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background style
    ctx.fillStyle = config.canvas.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Starfield
    drawStarfield(ctx);

    // Wave Progression
    const newWave = 1 + Math.floor(score / 2000);
    if (newWave !== wave) {
      wave = newWave;
      waveEl.innerText = wave;
    }
    const waveSpawnRate = Math.max(config.enemy.spawnRate - (wave * 100), 400);

    // Spawn enemies
    if (timestamp - lastEnemySpawn > waveSpawnRate) {
      spawnEnemy();
      lastEnemySpawn = timestamp;
    }

    // Update & Draw Player
    player.update(keys, canvas.width);
    player.draw(ctx);

    // Update & Draw Projectiles
    projectiles.forEach((projectile, index) => {
      projectile.update();
      projectile.draw(ctx);
      if (projectile.markedForDeletion) {
        projectiles.splice(index, 1);
      }
    });

    // Update & Draw Enemies
    enemies.forEach((enemy, enemyIndex) => {
      enemy.update(canvas.height);
      enemy.draw(ctx);

      // Collision Detection: Bullet vs Enemy
      projectiles.forEach((projectile, projectileIndex) => {
        if (
          projectile.x + projectile.radius > enemy.x &&
          projectile.x - projectile.radius < enemy.x + enemy.width &&
          projectile.y + projectile.radius > enemy.y &&
          projectile.y - projectile.radius < enemy.y + enemy.height
        ) {
          createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color);
          enemies.splice(enemyIndex, 1);
          projectiles.splice(projectileIndex, 1);
          score += 100;
          scoreEl.innerText = score.toString().padStart(6, '0');
          scoreEl.classList.add('scale-110');
          setTimeout(() => scoreEl.classList.remove('scale-110'), 100);
        }
      });

      // Collision Detection: Enemy vs Player
      if (
        enemy.x < player.x + player.width &&
        enemy.x + enemy.width > player.x &&
        enemy.y < player.y + player.height &&
        enemy.y + enemy.height > player.y
      ) {
        gameActive = false;
        restartBtn.style.display = 'block';
        createExplosion(player.x + player.width / 2, player.y + player.height / 2, player.color);
      }

      if (enemy.markedForDeletion) {
        enemies.splice(enemyIndex, 1);
      }
    });

    // Particles
    particles.forEach((particle, index) => {
      if (particle.alpha <= 0) {
        particles.splice(index, 1);
      } else {
        particle.update();
        particle.draw(ctx);
      }
    });
  }

  reset();
}
