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

// Platforms (updated map)
const platforms = [
  { x: 0, y: 380, width: 800, height: 20, vx: 0 },
  { x: 50, y: 320, width: 120, height: 10, vx: 1, minX: 50, maxX: 200 },
  { x: 200, y: 270, width: 80, height: 10, vx: 0 },
  { x: 300, y: 230, width: 100, height: 10, vx: 1.5, minX: 300, maxX: 450 },
  { x: 450, y: 180, width: 60, height: 10, vx: 0 },
  { x: 550, y: 150, width: 40, height: 10, vx: 0 },
  { x: 610, y: 120, width: 50, height: 10, vx: 0 },
  { x: 700, y: 90, width: 80, height: 10, vx: 2, minX: 700, maxX: 780 },
  { x: 350, y: 100, width: 100, height: 10, vx: 1, minX: 350, maxX: 500 }
];

// Turrets (updated positions)
const turrets = [
  { x: 100, y: 310, cooldown: 0, type: 'normal' },
  { x: 310, y: 220, cooldown: 0, type: 'split' },
  { x: 470, y: 170, cooldown: 0, type: 'splittingsquared' },
  { x: 720, y: 80, cooldown: 0, type: 'split' }
];
const turretFireRate = 120;

// Physics
const gravity = 0.5;
const speed = 3;
const jumpPower = -10;
const slideFriction = 0.05;

// Balls
let balls = [];
const ballSpeed = 8;
const bounceFactor = 0.7;
const ballFriction = 0.9;

// Controls
const keys = {};
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// Mouse
let mouse = { x: 0, y: 0 };
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});
canvas.addEventListener('mousedown', () => shootBall(player.id, 'normal'));
canvas.addEventListener('contextmenu', e => { e.preventDefault(); shootBall(player.id, 'split'); });
window.addEventListener('keydown', e => { if(e.key === 'q') shootBall(player.id, 'splittingsquared'); });

// Shoot
function shootBall(ownerId, type='normal') {
  const dx = mouse.x - (player.x + player.width/2);
  const dy = mouse.y - (player.y + player.height/2);
  const dist = Math.sqrt(dx*dx + dy*dy);
  const vx = (dx / dist) * ballSpeed;
  const vy = (dy / dist) * ballSpeed;

  const radius = type==='split' ? 12 : type==='splittingsquared' ? 16 : 5;
  const gravityValue = type==='split' ? 0.4 : type==='splittingsquared' ? 0.6 : 0.2;

  balls.push({x: player.x+player.width/2, y: player.y+player.height/2, vx, vy, owner: ownerId, type, radius, gravity: gravityValue, bounces: 0});
}

// Turret shoot
function shootTurretBall(turret) {
  const dx = player.x + player.width/2 - turret.x;
  const dy = player.y + player.height/2 - turret.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  const vx = (dx/dist) * ballSpeed;
  const vy = (dy/dist) * ballSpeed;

  const radius = turret.type==='split' ? 12 : turret.type==='splittingsquared' ? 16 : 5;
  const gravityValue = turret.type==='split' ? 0.4 : turret.type==='splittingsquared' ? 0.6 : 0.2;

  balls.push({x: turret.x, y: turret.y, vx, vy, owner: -1, type: turret.type, radius, gravity: gravityValue, bounces:0});
}

// Line of sight check
function hasLineOfSight(turret, player) {
  const steps = 10;
  const dx = (player.x + player.width/2 - turret.x) / steps;
  const dy = (player.y + player.height/2 - turret.y) / steps;

  for (let i=1; i<=steps; i++){
    const checkX = turret.x + dx * i;
    const checkY = turret.y + dy * i;

    for (const plat of platforms){
      if(checkX>plat.x && checkX<plat.x+plat.width && checkY>plat.y && checkY<plat.y+plat.height){
        return false;
      }
    }
  }
  return true;
}

// Split logic
function splitBall(ball){
  const numBalls=9;
  const speed=ballSpeed;
  if(ball.type==='splittingsquared'){
    for(let i=0;i<numBalls;i++){
      const angle=(i/numBalls)*Math.PI*2;
      const vx=Math.cos(angle)*speed;
      const vy=Math.sin(angle)*speed;
      balls.push({x:ball.x, y:ball.y, vx, vy, owner:ball.owner, type:'split', radius:12, gravity:0.4, bounces:0});
    }
  } else if(ball.type==='split'){
    for(let i=0;i<numBalls;i++){
      const angle=(i/numBalls)*Math.PI*2;
      const vx=Math.cos(angle)*speed;
      const vy=Math.sin(angle)*speed;
      balls.push({x:ball.x, y:ball.y, vx, vy, owner:ball.owner, type:'normal', radius:5, gravity:0.2, bounces:0});
    }
  }
}

// Update
function update(){
  for(const plat of platforms){
    if(plat.vx){ plat.x+=plat.vx; if(plat.x<plat.minX||plat.x+plat.width>plat.maxX) plat.vx*=-1; }
  }

  for(const turret of turrets){
    if(turret.cooldown<=0){
      if(hasLineOfSight(turret, player)){
        shootTurretBall(turret);
        turret.cooldown = turretFireRate;
      }
    } else turret.cooldown--;
  }

  const crouching = keys['arrowdown']||keys['s'];

  if(!player.sliding){
    player.vx=0;
    if(keys['arrowleft']||keys['a']) player.vx=-speed;
    if(keys['arrowright']||keys['d']) player.vx=speed;
    if(crouching && Math.abs(player.vx)>0){ player.sliding=true; player.vx*=1.5; }
  }

  if((keys['arrowup']||keys['w']) && player.onGround){ player.vy=jumpPower; player.onGround=false; player.sliding=false; }
  if(player.sliding){ player.vx*=(1-slideFriction); if(Math.abs(player.vx)<0.2) player.sliding=false; }

  player.vy+=gravity; player.x+=player.vx; player.y+=player.vy;

  player.onGround=false;
  for(const plat of platforms){
    const px=player.x,py=player.y,pw=player.width,ph=player.height;
    const bx=plat.x,by=plat.y,bw=plat.width,bh=plat.height;
    if(px<bx+bw && px+pw>bx && py<by+bh && py+ph>by){
      const overlapX1=px+pw-bx, overlapX2=bx+bw-px, overlapY1=py+ph-by, overlapY2=by+bh-py;
      const minOverlap=Math.min(overlapX1,overlapX2,overlapY1,overlapY2);
      if(minOverlap===overlapY1){ player.y=by-ph; player.vy=0; player.onGround=true; if(plat.vx) player.x+=plat.vx; }
      else if(minOverlap===overlapY2) player.y=by+bh, player.vy=0;
      else if(minOverlap===overlapX1) player.x=bx-pw, player.vx=0;
      else if(minOverlap===overlapX2) player.x=bx+bw, player.vx=0;
    }
  }

  if(player.y+player.height>canvas.height){ player.y=canvas.height-player.height; player.vy=0; player.onGround=true; player.sliding=false; }
  if(player.x<0) player.x=0;
  if(player.x+player.width>canvas.width) player.x=canvas.width-player.width;
  if(crouching) player.height=20; else player.height=40;

  for(let i=balls.length-1;i>=0;i--){
    const ball=balls[i];
    ball.vy+=ball.gravity; ball.x+=ball.vx; ball.y+=ball.vy;
    let collided=false;

    for(const plat of platforms){
      const bx=plat.x,by=plat.y,bw=plat.width,bh=plat.height;
      if(ball.x+ball.radius>bx && ball.x-ball.radius<bx+bw && ball.y+ball.radius>by && ball.y-ball.radius<by+bh){
        collided=true;
        if(ball.type==='split'||ball.type==='splittingsquared') { splitBall(ball); balls.splice(i,1); break; }

        const overlapX1=ball.x+ball.radius-bx, overlapX2=bx+bw-(ball.x-ball.radius);
        const overlapY1=ball.y+ball.radius-by, overlapY2=by+bh-(ball.y-ball.radius);
        const minOverlap=Math.min(overlapX1,overlapX2,overlapY1,overlapY2);
        if(minOverlap===overlapY1) ball.y=by-ball.radius, ball.vy*=-bounceFactor;
        else if(minOverlap===overlapY2) ball.y=by+bh+ball.radius, ball.vy*=-bounceFactor;
        else if(minOverlap===overlapX1) ball.x=bx-ball.radius, ball.vx*=-bounceFactor;
        else if(minOverlap===overlapX2) ball.x=bx+bw+ball.radius, ball.vx*=-bounceFactor;

        ball.vx*=ballFriction; ball.vy*=ballFriction; ball.bounces++;
        if(ball.bounces>=4){ balls.splice(i,1); collided=true; break; }
      }
    }
    if(collided) continue;

    if(ball.owner!==player.id){
      const px=player.x,py=player.y,pw=player.width,ph=player.height;
      if(ball.x+ball.radius>px && ball.x-ball.radius<px+pw && ball.y+ball.radius>py && ball.y-ball.radius<py+ph){
        if(ball.type==='split'||ball.type==='splittingsquared') { splitBall(ball); balls.splice(i,1); continue; }
        player.health-=5; if(player.health<0) player.health=0;
        const overlapX1=ball.x+ball.radius-px, overlapX2=px+pw-(ball.x-ball.radius);
        const overlapY1=ball.y+ball.radius-py, overlapY2=py+ph-(ball.y-ball.radius);
        const minOverlap=Math.min(overlapX1,overlapX2,overlapY1,overlapY2);
        if(minOverlap===overlapY1) ball.y=py-ball.radius, ball.vy*=-bounceFactor;
        else if(minOverlap===overlapY2) ball.y=py+ph+ball.radius, ball.vy*=-bounceFactor;
        else if(minOverlap===overlapX1) ball.x=px-ball.radius, ball.vx*=-bounceFactor;
        else if(minOverlap===overlapX2) ball.x=px+pw+ball.radius, ball.vx*=-bounceFactor;
        ball.vx*=ballFriction; ball.vy*=ballFriction; ball.bounces++;
        if(ball.bounces>=4) balls.splice(i,1);
      }
    }

    if(ball.y+ball.radius>canvas.height){
      if(ball.type==='split'||ball.type==='splittingsquared'){ splitBall(ball); balls.splice(i,1); continue; }
      ball.y=canvas.height-ball.radius; ball.vy*=-bounceFactor; ball.vx*=ballFriction;
      ball.bounces++; if(ball.bounces>=4) balls.splice(i,1);
    }

    if(ball.x-ball.radius<0 || ball.x+ball.radius>canvas.width){
      if(ball.type==='split'||ball.type==='splittingsquared'){ splitBall(ball); balls.splice(i,1); continue; }
      if(ball.x-ball.radius<0) ball.x=ball.radius;
      if(ball.x+ball.radius>canvas.width) ball.x=canvas.width-ball.radius;
      ball.vx*=-bounceFactor; ball.bounces++; if(ball.bounces>=4) balls.splice(i,1);
    }
  }
}

// Draw
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  for(const plat of platforms){ ctx.fillStyle='#654321'; ctx.fillRect(plat.x,plat.y,plat.width,plat.height); }

  for(const turret of turrets){
    const dx=player.x+player.width/2-turret.x;
    const dy=player.y+player.height/2-turret.y;
    const angle=Math.atan2(dy,dx);
    ctx.save(); ctx.translate(turret.x,turret.y); ctx.rotate(angle);
    ctx.fillStyle=turret.type==='split'?'darkorange':turret.type==='splittingsquared'?'purple':'darkblue';
    ctx.fillRect(-10,-5,20,10); ctx.restore();
  }

  ctx.fillStyle=player.color; ctx.fillRect(player.x,player.y,player.width,player.height);

  const barWidth=player.width, barHeight=5;
  ctx.fillStyle='black'; ctx.fillRect(player.x,player.y-10,barWidth,barHeight);
  ctx.fillStyle='green'; ctx.fillRect(player.x,player.y-10,barWidth*(player.health/player.maxHealth),barHeight);

  for(const ball of balls){
    ctx.fillStyle=ball.type==='split'?'orange':ball.type==='splittingsquared'?'purple':'blue';
    ctx.beginPath(); ctx.arc(ball.x,ball.y,ball.radius,0,Math.PI*2); ctx.fill();
  }
}

// Loop
function loop(){ update(); draw(); requestAnimationFrame(loop); }
loop();
