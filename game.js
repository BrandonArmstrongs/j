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
  frame: 0 // for animation
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
const slideFriction = 0.05; // slower friction = longer slide

// Controls
const keys = {};
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// Game update function
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

    // Start sliding if crouching and moving
    if (crouching && Math.abs(player.vx) > 0) {
      player.sliding = true;
      player.vx *= 1.5; // boost initial slide speed
    }
  }

  // Jump
  if ((keys['arrowup'] || keys['w']) && player.onGround) {
    player.vy = jumpPower;
    player.onGround = false;
    player.sliding = false;
  }

  // Apply sliding friction
  if (player.sliding) {
    player.vx *= (1 - slideFriction);
    if (Math.abs(player.vx) < 0.2) player.sliding = false;
  }

  // Apply gravity
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

      // Move player with moving platform
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

  // Animate frame for stickman legs
  if (Math.abs(player.vx) > 0 && player.onGround && !player.sliding) {
    player.frame += 0.2;
    if (player.frame > 2) player.frame = 0;
  } else player.frame = 0;
}

// Draw function
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw platforms
  ctx.fillStyle = '#654321';
  for (const plat of platforms) {
    ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
  }

  // Draw stickman
  ctx.strokeStyle = player.color;
  ctx.lineWidth = 2;

  // Body
  ctx.beginPath();
  ctx.moveTo(player.x + player.width/2, player.y + player.height); // feet
  ctx.lineTo(player.x + player.width/2, player.y + (player.height/2)); // body
  ctx.stroke();

  // Head
  ctx.beginPath();
  ctx.arc(player.x + player.width/2, player.y + (player.height/2) - 10, 5, 0, Math.PI*2);
  ctx.stroke();

  // Arms
  ctx.beginPath();
  ctx.moveTo(player.x + player.width/2, player.y + player.height/2);
  if (!player.sliding) {
    // swing arms
    ctx.lineTo(player.x + player.width/2 + (player.frame === 0 ? -10 : 10), player.y + player.height/2 + 10);
  } else {
    ctx.lineTo(player.x + player.width/2 + 15 * Math.sign(player.vx), player.y + player.height/2 + 5);
  }
  ctx.stroke();

  // Legs
  ctx.beginPath();
  ctx.moveTo(player.x + player.width/2, player.y + player.height);
  if (!player.sliding) {
    ctx.lineTo(player.x + player.width/2 + (player.frame === 0 ? -5 : 5), player.y + player.height + 15);
  } else {
    // sliding leg
    ctx.lineTo(player.x + player.width/2 + 20 * Math.sign(player.vx), player.y + player.height + 5);
  }
  ctx.stroke();
}

// Game loop
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
