const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Player
let player = {
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
canvas.addEventListener('mousedown', () => shootBall());

// Shoot function
function shootBall() {
  const dx = mouse.x - (player.x + player.width / 2);
  const dy = mouse.y - (player.y + player.height / 2);
  const dist = Math.sqrt(dx * dx + dy * dy);
  const vx = (dx / dist) * ballSpeed;
  const vy = (dy / dist) * ballSpeed;
  balls.push({
    x: player.x + player.width / 2,
    y: player.y + player.height / 2,
    vx,
    vy
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
      const overlapX1 = px + pw - bx; // left side
      const overlapX2 = bx + bw - px; // right side
      const overlapY1 = py + ph - by; // top side
      const overlapY2 = by + bh - py; // bottom side
      const minOverlap = Math.min(overlapX1, overlapX2, overlapY1, overlapY2);

      if (minOverlap === overlapY1) {
        // Landed on top
        player.y = by - ph;
        player.vy = 0;
        player.onGround = true;
        if (plat.vx) player.x += plat.vx;
      } else if (minOverlap === overlapY2) {
        // Hit bottom
        player.y = by + bh;
        player.vy = 0;
      } else if (minOverlap === overlapX1) {
        // Hit left side
        player.x = bx - pw;
        player.vx = 0;
      } else if (minOverlap === overlapX2) {
        // Hit right side
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
  for (let ball of balls) {
    ball.vy += ballGravity;
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Ground collision
    if (ball.y + ballRadius > canvas.height) {
      ball.y = canvas.height - ballRadius;
      ball.vy *= -bounceFactor;
      if (Math.abs(ball.vy) < 0.5) ball.vy = 0;
      ball.vx *= ballFriction;
      if (Math.abs(ball.vx) < 0.1) ball.vx = 0;
    }

    // Platform collisions
    for (const plat of platforms) {
      if (
        ball.x + ballRadius > plat.x &&
        ball.x - ballRadius < plat.x + plat.width &&
        ball.y + ballRadius > plat.y &&
        ball.y - ballRadius < plat.y + plat.height &&
        ball.vy > 0
      ) {
        ball.y = plat.y - ballRadius;
        ball.vy *= -bounceFactor;
        if (Math.abs(ball.vy) < 0.5) ball.vy = 0;
        ball.vx *= ballFriction;
        if (Math.abs(ball.vx) < 0.1) ball.vx = 0;
      }
    }

    // Left/Right walls
    if (ball.x - ballRadius < 0 || ball.x + ballRadius > canvas.width) {
      ball.vx *= -bounceFactor;
      if (ball.x - ballRadius < 0) ball.x = ballRadius;
      if (ball.x + ballRadius > canvas.width) ball.x = canvas.width - ballRadius;
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
  ctx.fillStyle = 'blue';
  for (let ball of balls) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
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
