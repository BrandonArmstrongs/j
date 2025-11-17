const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Player
let player = {
  id: 1,  // unique player ID
  x: 50,
  y: 300,
  width: 20,
  height: 40,
  color: 'red',
  vx: 0,
  vy: 0,
  onGround: false,
  sliding: false
};

// Platforms
const platforms = [
  { x: 0, y: 380, width: 800, height: 20, vx: 0 },
  { x: 150, y: 300, width: 100, height: 10, vx: 1, minX: 150, maxX: 300 },
  { x: 400, y: 250, width: 120, height: 10, vx: 0 },
  { x: 600, y: 180, width: 80, height: 10, vx: 2, minX: 600, maxX: 700 }
];

// Physics
const gravity = 0.5;
const speed = 3;
const jumpPower = -10;
const slideFriction = 0.05;

// Projectiles
let balls = [];
const ballSpeed = 8;
const ballRadius = 5;
const ballGravity = 0.2;  // less gravity for floating effect
const bounceFactor = 0.7; // lose 30% speed on bounce
const ballFriction = 0.9; // horizontal friction on ground/platform

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
canvas.addEventListener('mousedown', () => shootBall(player.id));

// Shoot function
function shootBall(ownerId) {
  const dx = mouse.x - (player.x + player.width / 2);
  const dy = mouse.y - (player.y + player.height / 2);
  const dist = Math.sqrt(dx * dx + dy * dy);
  const vx = (dx / dist) * ballSpeed;
  const vy = (dy / dist) * ballSpeed;
  balls.push({
    x: player.x + player.width / 2,
    y: player.y + player.height / 2,
    vx,
    vy,
    alpha: 1,
    fadeTimer: 0,
    owner: ownerId
  });
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

  const crouching = keys['arrowdown'] || keys['s'];

  // Horizontal movement
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

  // Player-platform collisions (full sides)
  player.onGround = false;
  for (const plat of platforms) {
    const px = player.x;
    const py = player.y;
    const pw = player.width;
    const ph = player.height;
    const bx = plat.x;
    const by = plat.y;
    const bw = plat.width;
    const bh = plat.height;

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
      } else if (minOverlap === overlapY2) {
        player.y = by + bh;
        player.vy = 0;
      } else if (minOverlap === overlapX1) {
        player.x = bx - pw;
        player.vx = 0;
      } else if (minOverlap === overlapX2) {
        player.x = bx + bw;
        player.vx = 0;
      }
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

  // Adjust height for crouching
  if (crouching) player.height = 20;
  else player.height = 40;

  // Update balls
  for (let i = balls.length - 1; i >= 0; i--) {
    let ball = balls[i];
    ball.vy += ballGravity;
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Platform collisions
    for (const plat of platforms) {
      const bx = plat.x;
      const by = plat.y;
      const bw = plat.width;
      const bh = plat.height;

      if (ball.x + ballRadius > bx && ball.x - ballRadius < bx + bw &&
          ball.y + ballRadius > by && ball.y - ballRadius < by + bh) {

        const overlapX1 = ball.x + ballRadius - bx;
        const overlapX2 = bx + bw - (ball.x - ballRadius);
        const overlapY1 = ball.y + ballRadius - by;
        const overlapY2 = by + bh - (ball.y - ballRadius);
        const minOverlap = Math.min(overlapX1, overlapX2, overlapY1, overlapY2);

        if (minOverlap === overlapY1) {
          ball.y = by - ballRadius;
          ball.vy *= -bounceFactor;
        } else if (minOverlap === overlapY2) {
          ball.y = by + bh + ballRadius;
          ball.vy *= -bounceFactor;
        } else if (minOverlap === overlapX1) {
          ball.x = bx - ballRadius;
          ball.vx *= -bounceFactor;
        } else if (minOverlap === overlapX2) {
          ball.x = bx + bw + ballRadius;
          ball.vx *= -bounceFactor;
        }

        ball.vx *= ballFriction;
        ball.vy *= ballFriction;
      }
    }

    // Ball-player collision (ignore own balls)
    if (ball.owner !== player.id) {
      const px = player.x;
      const py = player.y;
      const pw = player.width;
      const ph = player.height;

      if (ball.x + ballRadius > px && ball.x - ballRadius < px + pw &&
          ball.y + ballRadius > py && ball.y - ballRadius < py + ph) {

        const overlapX1 = ball.x + ballRadius - px;
        const overlapX2 = px + pw - (ball.x - ballRadius);
        const overlapY1 = ball.y + ballRadius - py;
        const overlapY2 = py + ph - (ball.y - ballRadius);
        const minOverlap = Math.min(overlapX1, overlapX2, overlapY1, overlapY2);

        if (minOverlap === overlapY1) {
          ball.y = py - ballRadius;
          ball.vy *= -bounceFactor;
        } else if (minOverlap === overlapY2) {
          ball.y = py + ph + ballRadius;
          ball.vy *= -bounceFactor;
        } else if (minOverlap === overlapX1) {
          ball.x = px - ballRadius;
          ball.vx *= -bounceFactor;
        } else if (minOverlap === overlapX2) {
          ball.x = px + pw + ballRadius;
          ball.vx *= -bounceFactor;
        }

        ball.vx *= ballFriction;
        ball.vy *= ballFriction;
      }
    }

    // Ground collision
    if (ball.y + ballRadius > canvas.height) {
      ball.y = canvas.height - ballRadius;
      ball.vy *= -bounceFactor;
      ball.vx *= ballFriction;
      if (Math.abs(ball.vx) < 0.05) ball.vx = 0;
      if (Math.abs(ball.vy) < 0.05) ball.vy = 0;
    }

    // Left/Right walls
    if (ball.x - ballRadius < 0) { ball.x = ballRadius; ball.vx *= -bounceFactor; }
    if (ball.x + ballRadius > canvas.width) { ball.x = canvas.width - ballRadius; ball.vx *= -bounceFactor; }

    // Fade out if slow
    const fadeThreshold = 1;    // velocity threshold
    const fadeDuration = 0.25;  // fade over 0.25 seconds
    if (Math.abs(ball.vx) < fadeThreshold && Math.abs(ball.vy) < fadeThreshold) {
      ball.fadeTimer += 1/60;
      ball.alpha = Math.max(0, 1 - ball.fadeTimer / fadeDuration);
      if (ball.alpha === 0) balls.splice(i, 1);
    } else {
      ball.fadeTimer = 0;
      ball.alpha = 1;
    }
  }
}

// Draw loop
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw platforms
  ctx.fillStyle = '#654321';
  for (const plat of platforms) {
    ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
  }

  // Draw player rectangle
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // Draw balls
  for (let ball of balls) {
    ctx.globalAlpha = ball.alpha;
    ctx.fillStyle = 'blue';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// Game loop
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
