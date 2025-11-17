const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const socketUrl = 'wss://YOUR_WORKER_URL'; // WebSocket endpoint

// Player
let player = { x: 50, y: 300, width: 30, height: 30, color: 'red', vx: 0, vy: 0, onGround: false };
let players = {}; // Other players

// Platforms
const platforms = [
  { x: 0, y: 380, width: 800, height: 20 },  // ground
  { x: 150, y: 300, width: 100, height: 10 },
  { x: 400, y: 250, width: 120, height: 10 },
  { x: 600, y: 180, width: 80, height: 10 },
];

// Physics
const gravity = 0.5;
const speed = 3;
const jumpPower = -10;

// Controls
const keys = {};
window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);

// Connect to server
const ws = new WebSocket(socketUrl);
ws.onmessage = event => {
  players = JSON.parse(event.data);
};

// Game loop
function update() {
  // Horizontal movement
  player.vx = 0;
  if (keys['ArrowLeft']) player.vx = -speed;
  if (keys['ArrowRight']) player.vx = speed;

  // Jump
  if (keys['ArrowUp'] && player.onGround) {
    player.vy = jumpPower;
    player.onGround = false;
  }

  // Apply gravity
  player.vy += gravity;
  player.x += player.vx;
  player.y += player.vy;

  // Platform collision
  player.onGround = false;
  for (const plat of platforms) {
    if (player.x < plat.x + plat.width &&
        player.x + player.width > plat.x &&
        player.y + player.height > plat.y &&
        player.y + player.height - player.vy <= plat.y) {
      player.y = plat.y - player.height;
      player.vy = 0;
      player.onGround = true;
    }
  }

  // Canvas bounds
  if (player.y + player.height > canvas.height) {
    player.y = canvas.height - player.height;
    player.vy = 0;
    player.onGround = true;
  }

  if (player.x < 0) player.x = 0;
  if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

  // Send player state to server
  ws.send(JSON.stringify(player));
}

// Draw everything
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw platforms
  ctx.fillStyle = '#654321';
  for (const plat of platforms) {
    ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
  }

  // Draw other players
  for (const id in players) {
    if (players[id] !== player) {
      const p = players[id];
      ctx.fillStyle = p.color || 'blue';
      ctx.fillRect(p.x, p.y, p.width, p.height);
    }
  }

  // Draw self
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
