const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const socketUrl = 'https://YOUR_CLOUDFLARE_WORKER_URL'; // Worker URL

let player = { x: 50, y: 300, width: 30, height: 30, color: 'red', vx: 0, vy: 0 };
let players = {}; // Other players

// Physics
const gravity = 0.5;
const speed = 3;
const jumpPower = -10;

// Controls
const keys = {};
window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);

// Connect to worker
const ws = new WebSocket(socketUrl.replace(/^http/, 'ws'));
ws.onmessage = event => {
  players = JSON.parse(event.data);
};

// Game loop
function update() {
  // Player movement
  if (keys['ArrowLeft']) player.vx = -speed;
  else if (keys['ArrowRight']) player.vx = speed;
  else player.vx = 0;

  if (keys['ArrowUp'] && player.onGround) {
    player.vy = jumpPower;
    player.onGround = false;
  }

  // Physics
  player.vy += gravity;
  player.x += player.vx;
  player.y += player.vy;

  // Ground collision
  if (player.y + player.height > canvas.height) {
    player.y = canvas.height - player.height;
    player.vy = 0;
    player.onGround = true;
  }

  // Send position to server
  ws.send(JSON.stringify(player));
}

// Draw
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw other players
  for (const id in players) {
    const p = players[id];
    ctx.fillStyle = p.color || 'blue';
    ctx.fillRect(p.x, p.y, p.width, p.height);
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
