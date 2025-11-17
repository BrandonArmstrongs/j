const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Player
let player = {
  id: 1,
  x: 50,
  y: 300,
  width: 20,
  height: 40,
  color: 'red',
  vx: 0,
  vy: 0,
  onGround: false,
  sliding: false,
  maxHealth: 100,
  health: 100
};

// Platforms
const platforms = [
  { x: 0, y: 380, width: 800, height: 20, vx: 0 },
  { x: 150, y: 300, width: 100, height: 10, vx: 1, minX: 150, maxX: 300 },
  { x: 400, y: 250, width: 120, height: 10, vx: 0 },
  { x: 600, y: 180, width: 80, height: 10, vx: 2, minX: 600, maxX: 700 }
];

// Turrets
const turrets = [
  { x: 300, y: 350, cooldown: 0, type: 'normal' },
  { x: 500, y: 220, cooldown: 0, type: 'split' }
];
const turretFireRate = 120; // frames between shots

// Physics
const gravity = 0.5;
const speed = 3;
const jumpPower = -10;
const slideFriction = 0.05;

// Projectiles
let balls = [];
const ballSpeed = 8;
const bounceFactor = 0.7;
const ballFriction = 0.9;

// Controls
const keys = {};
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// Mouse aiming
let mouse = { x: 0, y: 0 };
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});
canvas.addEventListener('mousedown', () => shootBall(player.id, 'normal'));
canvas.addEventListener('contextmenu', e => {
  e.preventDefault();
  shootBall(player.id, 'split');
});

// Shoot function (player)
function shootBall(ownerId, type = 'normal') {
  const dx = mouse.x - (player.x + player.width / 2);
  const dy = mouse.y - (player.y + player.height / 2);
  const dist = Math.sqrt(dx * dx + dy * dy);
  const vx = (dx / dist) * ballSpeed;
  const vy = (dy / dist) * ballSpeed;

  const radius = type === 'split' ? 12 : 5;
  const gravityValue = type === 'split' ? 0.4 : 0.2; // double gravity for split

  balls.push({
    x: player.x + player.width / 2,
    y: player.y + player.height / 2,
    vx,
    vy,
    owner: ownerId,
    type,
    radius,
    gravity: gravityValue,
    bounces: 0
  });
}

// Turret shooting function
function shootTurretBall(turret) {
  const dx = player.x + player.width/2 - turret.x;
  const dy = player.y + player.height/2 - turret.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  const vx = (dx / dist) * ballSpeed;
  const vy = (dy / dist) * ballSpeed;

  const radius = turret.type === 'split' ? 12 : 5;
  const gravityValue = turret.type === 'split' ? 0.4 : 0.2; // double gravity for split

  balls.push({
    x: turret.x,
    y: turret.y,
    vx,
    vy,
    owner: -1, // turret balls are not owned by player
    type: turret.type,
    radius,
    gravity: gravityValue,
    bounces: 0
  });
}

// Split ball explosion
function splitBall(ball) {
  const numBalls = 9;
  const speed = ballSpeed; // same speed as normal
  for (let i = 0; i < numBalls; i++) {
    const angle = (i / numBalls) * Math.PI * 2;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    balls.push({
      x: ball.x,
      y: ball.y,
      vx,
      vy,
      owner: ball.owner,
      type: 'normal',
      radius: 5,
      gravity: 0.2,
      bounces: 0
    });
  }
}

// Update loop
function update() {
  // Move platforms
  for (const plat of platforms) {
    if (plat.vx) {
      plat.x += plat.vx;
      if (plat.x < plat.minX || plat.x + plat.width > plat.maxX) plat.vx *= -1;
    }
  }

  // Turret logic
  for (const turret of turrets) {
    if (turret.cooldown <= 0) {
      shootTurretBall(turret);
      turret.cooldown = turretFireRate;
    } else {
      turret.cooldown -= 1;
    }
  }

  const crouching = keys['arrowdown'] || keys['s'];

  // Player horizontal movement
  if (!player.sliding) {
    player.vx = 0;
    if (keys['arrowleft'] || keys['a']) player.vx = -speed;
    if (keys['arrowright'] || keys['d']) player.vx = speed;
    if (crouching && Math.abs(player.vx) > 0) {
      player.sliding = true;
      player.vx *= 1.5;
    }
  }

  // Jump
  if ((keys['arrowup'] || keys['w']) && player.onGround) {
    player.vy = jumpPower;
    player.onGround = false;
    player.sliding = false;
  }

  // Slide friction
  if (player.sliding) {
    player.vx *= (1 - slideFriction);
    if (Math.abs(player.vx) < 0.2) player.sliding = false;
  }

  // Apply gravity
  player.vy += gravity;
  player.x += player.vx;
  player.y += player.vy;

  // Player-platform collisions
  player.onGround = false;
  for (const plat of platforms) {
    const px = player.x, py = player.y, pw = player.width, ph = player.height;
    const bx = plat.x, by = plat.y, bw = plat.width, bh = plat.height;

    if (px < bx + bw && px + pw > bx && py < by + bh && py + ph > by) {
      const overlapX1 = px + pw - bx;
      const overlapX2 = bx + bw - px;
      const overlapY1 = py + ph - by;
      const overlapY2 = by + bh - py;
      const minOverlap = Math.min(overlapX1, overlapX2, overlapY1, overlapY2);

      if (minOverlap === overlapY1) {
        player.y = by - ph;
        player.vy = 0;
        player.onGround = true;
        if (plat.vx) player.x += plat.vx;
      } else if (minOverlap === overlapY2) player.y = by + bh, player.vy = 0;
      else if (minOverlap === overlapX1) player.x = bx - pw, player.vx = 0;
      else if (minOverlap === overlapX2) player.x = bx + bw, player.vx = 0;
    }
  }

  // Canvas boundaries
  if (player.y + player.height > canvas.height) {
    player.y = canvas.height - player.height;
    player.vy = 0;
    player.onGround = true;
    player.sliding = false;
  }
  if (player.x < 0) player.x = 0;
  if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

  if (crouching) player.height = 20; else player.height = 40;

  // Update balls
  for (let i = balls.length - 1; i >= 0; i--) {
    const ball = balls[i];
    ball.vy += ball.gravity;
    ball.x += ball.vx;
    ball.y += ball.vy;

    let collided = false;

    // Platform collisions
    for (const plat of platforms) {
      const bx = plat.x, by = plat.y, bw = plat.width, bh = plat.height;
      if (ball.x + ball.radius > bx && ball.x - ball.radius < bx + bw &&
          ball.y + ball.radius > by && ball.y - ball.radius < by + bh) {
        collided = true;

        if (ball.type === 'split') { splitBall(ball); balls.splice(i, 1); break; }

        const overlapX1 = ball.x + ball.radius - bx;
        const overlapX2 = bx + bw - (ball.x - ball.radius);
        const overlapY1 = ball.y + ball.radius - by;
        const overlapY2 = by + bh - (ball.y - ball.radius);
        const minOverlap = Math.min(overlapX1, overlapX2, overlapY1, overlapY2);

        if (minOverlap === overlapY1) ball.y = by - ball.radius, ball.vy *= -bounceFactor;
        else if (minOverlap === overlapY2) ball.y = by + bh + ball.radius, ball.vy *= -bounceFactor;
        else if (minOverlap === overlapX1) ball.x = bx - ball.radius, ball.vx *= -bounceFactor;
        else if (minOverlap === overlapX2) ball.x = bx + bw + ball.radius, ball.vx *= -bounceFactor;

        ball.vx *= ballFriction;
        ball.vy *= ballFriction;
        ball.bounces += 1;
        if (ball.bounces >= 4) { balls.splice(i, 1); collided = true; break; }
      }
    }
    if (collided) continue;

    // Player collision
    if (ball.owner !== player.id) {
      const px = player.x, py = player.y, pw = player.width, ph = player.height;
      if (ball.x + ball.radius > px && ball.x - ball.radius < px + pw &&
          ball.y + ball.radius > py && ball.y - ball.radius < py + ph) {

        if (ball.type === 'split') { splitBall(ball); balls.splice(i, 1); continue; }
        player.health -= 5; if (player.health < 0) player.health = 0;

        const overlapX1 = ball.x + ball.radius - px;
        const overlapX2 = px + pw - (ball.x - ball.radius);
        const overlapY1 = ball.y + ball.radius - py;
        const overlapY2 = py + ph - (ball.y - ball.radius);
        const minOverlap = Math.min(overlapX1, overlapX2, overlapY1, overlapY2);

        if (minOverlap === overlapY1) ball.y = py - ball.radius, ball.vy *= -bounceFactor;
        else if (minOverlap === overlapY2) ball.y = py + ph + ball.radius, ball.vy *= -bounceFactor;
        else if (minOverlap === overlapX1) ball.x = px - ball.radius, ball.vx *= -bounceFactor;
        else if (minOverlap === overlapX2) ball.x = px + pw + ball.radius, ball.vx *= -bounceFactor;

        ball.vx *= ballFriction;
        ball.vy *= ballFriction;
        ball.bounces += 1;
        if (ball.bounces >= 4) balls.splice(i, 1);
      }
    }

    // Ground
    if (ball.y + ball.radius > canvas.height) {
      if (ball.type === 'split') { splitBall(ball); balls.splice(i, 1); continue; }
      ball.y = canvas.height - ball.radius;
      ball.vy *= -bounceFactor;
      ball.vx *= ballFriction;
      ball.bounces += 1;
      if (ball.bounces >= 4) { balls.splice(i, 1); continue; }
    }

    // Walls
    if (ball.x - ball.radius < 0 || ball.x + ball.radius > canvas.width) {
      if (ball.type === 'split') { splitBall(ball); balls.splice(i, 1); continue; }
      if (ball.x - ball.radius < 0) ball.x = ball.radius;
      if (ball.x + ball.radius > canvas.width) ball.x = canvas.width - ball.radius;
      ball.vx *= -bounceFactor;
      ball.bounces += 1;
      if (ball.bounces >= 4) balls.splice(i, 1);
    }
  }
}

// Draw loop
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Platforms
  ctx.fillStyle = '#654321';
  for (const plat of platforms) ctx.fillRect(plat.x, plat.y, plat.width, plat.height);

  // Turrets
  for (const turret of turrets) {
    const dx = player.x + player.width/2 - turret.x;
    const dy = player.y + player.height/2 - turret.y;
    const angle = Math.atan2(dy, dx);
    ctx.save();
    ctx.translate(turret.x, turret.y);
    ctx.rotate(angle);
    ctx.fillStyle = turret.type === 'split' ? 'darkorange' : 'darkblue';
    ctx.fillRect(-10, -5, 20, 10); // rectangle rotated toward player
    ctx.restore();
  }

  // Player
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // Health bar
  const barWidth = player.width, barHeight = 5;
  ctx.fillStyle = 'black';
  ctx.fillRect(player.x, player.y - 10, barWidth, barHeight);
  ctx.fillStyle = 'green';
  ctx.fillRect(player.x, player.y - 10, barWidth * (player.health / player.maxHealth), barHeight);

  // Balls
  for (let ball of balls) {
    ctx.fillStyle = ball.type === 'split' ? 'orange' : 'blue';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Game loop
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
