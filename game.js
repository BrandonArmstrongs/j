const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Player (stickman)
let player = {
  x: 50,
  y: 300,
  width: 20,
  height: 40,
  color: 'red',
  vx: 0,
  vy: 0,
  onGround: false,
  sliding: false,
  swing: 0 // swing angle for running animation
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

// Controls
const keys = {};
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

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

  // Sliding friction
  if (player.sliding) {
    player.vx *= (1 - slideFriction);
    if (Math.abs(player.vx) < 0.2) player.sliding = false;
  }

  // Gravity
  player.vy += gravity;
  player.x += player.vx;
  player.y += player.vy;

  // Platform collision
  player.onGround = false;
  for (const plat of platforms) {
    if (
      player.x < plat.x + plat.width &&
      player.x + player.width > plat.x &&
      player.y + player.height > plat.y &&
      player.y + player.height - player.vy <= plat.y
    ) {
      player.y = plat.y - player.height;
      player.vy = 0;
      player.onGround = true;
      if (plat.vx) player.x += plat.vx;
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

  // Update swing for smooth running animation
  if (player.onGround && !player.sliding && Math.abs(player.vx) > 0) {
    player.swing += 0.2;
  } else player.swing = 0;
}

// Draw stickman
function drawPlayer() {
  ctx.strokeStyle = player.color;
  ctx.lineWidth = 2;

  const cx = player.x + player.width / 2;
  const cy = player.y + player.height / 2;

  // Body
  ctx.beginPath();
  ctx.moveTo(cx, player.y + player.height);
  ctx.lineTo(cx, cy);
  ctx.stroke();

  // Head
  ctx.beginPath();
  ctx.arc(cx, cy - 10, 6, 0, Math.PI * 2);
  ctx.stroke();

  // Arms
  ctx.beginPath();
  const armSwing = Math.sin(player.swing) * 10;
  ctx.moveTo(cx, cy);
  if (!player.sliding) {
    ctx.lineTo(cx + armSwing, cy + 10);
  } else {
    ctx.lineTo(cx + 15 * Math.sign(player.vx || 1), cy + 8);
  }
  ctx.stroke();

  // Legs
  ctx.beginPath();
  const legSwing = Math.sin(player.swing + Math.PI / 2) * 10;
  ctx.moveTo(cx, player.y + player.height);
  if (!player.sliding) {
    ctx.lineTo(cx + legSwing, player.y + player.height + 15);
  } else {
    ctx.lineTo(cx + 20 * Math.sign(player.vx || 1), player.y + player.height + 5);
  }
  ctx.stroke();
}

// Draw loop
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw platforms
  ctx.fillStyle = '#654321';
  for (const plat of platforms) {
    ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
  }

  drawPlayer();
}

// Game loop
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
