const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const wrapper = document.getElementById("game-wrapper");
function resizeCanvas(){ canvas.width = wrapper.clientWidth; canvas.height = wrapper.clientHeight; }
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// --- Input ---
const menu = document.getElementById("menu");
const joystickBase = document.getElementById("joystick-base");
const joystickStick = document.getElementById("joystick-stick");
let isMobile = /Mobi|Android/i.test(navigator.userAgent);
if(isMobile) joystickBase.style.display = "block";

let pointer={x:canvas.width/2, y:canvas.height/2};
canvas.addEventListener("mousemove", e=>{ if(!isMobile){ const rect=canvas.getBoundingClientRect(); pointer.x=(e.clientX-rect.left)*(canvas.width/rect.width); pointer.y=(e.clientY-rect.top)*(canvas.height/rect.height); } });
canvas.addEventListener("touchmove", e=>{ if(!isMobile) return; const rect=canvas.getBoundingClientRect(); pointer.x=(e.touches[0].clientX-rect.left)*(canvas.width/rect.width); pointer.y=(e.touches[0].clientY-rect.top)*(canvas.height/rect.height); e.preventDefault(); });

// --- Joystick ---
let joyActive=false, joyX=0, joyY=0;
joystickBase.addEventListener("touchstart", e=>{ joyActive=true; e.preventDefault(); });
joystickBase.addEventListener("touchmove", e=>{
  if(!joyActive) return;
  const rect=joystickBase.getBoundingClientRect();
  const t=e.touches[0];
  joyX = t.clientX - rect.left - rect.width/2;
  joyY = t.clientY - rect.top - rect.height/2;
  const dist=Math.hypot(joyX, joyY);
  const max=rect.width/2;
  if(dist>max){ joyX=joyX/dist*max; joyY=joyY/dist*max; }
  joystickStick.style.left=50+joyX-25+"px";
  joystickStick.style.top=50+joyY-25+"px";
  e.preventDefault();
});
joystickBase.addEventListener("touchend", e=>{ joyActive=false; joyX=0; joyY=0; joystickStick.style.left="50%"; joystickStick.style.top="50%"; });

// --- Game Data ---
let running=false, score=0, level=1;
const player={x:canvas.width/2, y:canvas.height/2, r:12, trail:[]};
let enemies=[], baseEnemyCount=3, enemySpeed=1.5;
let orbs=[], bossOrbs=[], boss=null, bullets=[], powerUps=[], lastPowerUpTime=0, lastBossOrbTime=0;
let particles=[];
const layers=[{color:"#0a1a2f",speed:0.2,y:0},{color:"#0f2a4f",speed:0.5,y:0},{color:"#123a6f",speed:0.8,y:0}];
let isSuperman = false;
let supermanEndTime = 0;

let lastSupermanTime = 0;
let nextSupermanDelay = 0;
let startTime = 0;
let elapsedTime = 0;

// --- Sounds ---
const sndOrb = new Audio('https://www.soundjay.com/button/sounds/button-16.mp3'); // ăn orb
const sndBossOrb = new Audio('https://www.soundjay.com/button/sounds/button-4.mp3'); // orb bắn boss
const sndHitBoss = new Audio('https://www.soundjay.com/button/sounds/button-7.mp3'); // boss trúng đạn
const sndBossDead = new Audio('https://www.soundjay.com/button/sounds/explosion-02.mp3'); // boss chết
const sndBossSpawn = new Audio('https://www.soundjay.com/button/sounds/button-10.mp3'); // boss spawn
const sndPowerUp = new Audio('https://www.soundjay.com/button/sounds/button-3.mp3'); // power-up ăn
const sndGameOver = new Audio('https://www.soundjay.com/button/sounds/button-15.mp3'); // game over
const bgMusic = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'); 
bgMusic.loop = true; bgMusic.volume = 0.3;

// --- Game Functions ---
function startGame(){ 
  running=true; score=0; level=1; enemySpeed=1.2; menu.style.display="none"; spawnLevel(); 
  const now = Date.now();
  lastPowerUpTime = now;                 // ⭐ FIX
  lastSupermanTime = now;                // ⭐ FIX
  nextSupermanDelay = 30000 + Math.random()*30000; // ⭐ FIX
  startTime = Date.now();

  bgMusic.currentTime=0; bgMusic.play();
}

function spawnOrbs(){ 
  orbs = [];
  const num = level + 2;
  for(let i=0;i<num;i++)
    orbs.push({x:Math.random()*(canvas.width-40)+20, y:Math.random()*(canvas.height-40)+20, r:8});
}

function spawnBossOrbs(){ 
  if(!boss) return;
  bossOrbs.push({x:Math.random()*(canvas.width-40)+20, y:Math.random()*(canvas.height-40)+20, r:10});
}

function spawnBoss(){ 
  const hp=10+Math.floor(level/5-1)*5; 
  boss={x:canvas.width/2, y:-60, r:32,hp:hp,maxHp:hp,trail:[],frozen:false, spawnAnim:true, spawnStep:0}; 
  sndBossSpawn.play();
}

function increaseEnemiesForNewLevel(){ 
  const targetCount=baseEnemyCount + Math.floor((level-1)/2); 
  while(enemies.length < targetCount){ 
    enemies.push({x:Math.random()*(canvas.width-40)+20, y:Math.random()*(canvas.height-40)+20, r:14, speed:enemySpeed, targetX:null, targetY:null, frozen:false, angle:Math.random()*Math.PI*2}); 
  } 
}

function spawnPowerUp(){ 
  const type=Math.random()<0.5?"freeze":"kill"; 
  powerUps.push({x:Math.random()*(canvas.width-40)+20, y:Math.random()*(canvas.height-40)+20, r:10, type, vx:(Math.random()-0.5)*2, vy:(Math.random()-0.5)*2}); 
}

function spawnSuperman(){
  powerUps.push({
    x:Math.random()*(canvas.width-40)+20,
    y:Math.random()*(canvas.height-40)+20,
    r:12,
    type:"superman",
    vx:(Math.random()-0.5)*2,
    vy:(Math.random()-0.5)*2
  });
}

// --- Particle
function createParticle(x,y,color,r){ particles.push({x,y,vx:(Math.random()-0.5)*2,vy:(Math.random()-0.5)*2,life:20,color,r}); }
function createBossDeathParticles(){ for(let i=0;i<100;i++) particles.push({x:boss.x,y:boss.y,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*5,life:40,color:"orange",r:Math.random()*4+2}); }
function createOrbExplosion(x,y,color){ for(let i=0;i<20;i++) particles.push({x,y,vx:(Math.random()-0.5)*3,vy:(Math.random()-0.5)*3,life:15,color,r:Math.random()*4+2}); }

function gameOver(){
  running=false;
  bgMusic.pause();
  sndGameOver.play();
  menu.style.display="flex";
  const shareURL = encodeURIComponent('https://circle-survival.vercel.app/'); // link trang
  const shareText = encodeURIComponent(`Tôi vừa đạt ${score} điểm trong CircleSurvival 3D! Bạn thử xem nào!`);
  const minutes = Math.floor(elapsedTime / 60);
  const seconds = elapsedTime % 60;

  menu.style.display="flex";
  menu.innerHTML=`
    <h2>💀 Thua rồi</h2>
    <p>Score(Điểm): ${score}</p>
    <p>Level(Màn chơi đã vượt qua): ${level}</p>  <!-- ✅ Dòng mới -->
    <p>Time: ${minutes}:${seconds.toString().padStart(2,"0")}</p>
    <button onclick='location.reload()'>Play again</button>
	<button onclick='shareFacebook()'>Share Facebook</button>  
  `;
}

// --- Draw helpers ---
function drawCircle(x,y,r,color){ ctx.fillStyle=color; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); }
function drawSquare(x,y,r,color){ ctx.fillStyle=color; ctx.fillRect(x-r,y-r,r*2,r*2); }
function drawTriangleEnemy(e){ const size=e.r*2; ctx.save(); ctx.translate(e.x,e.y); e.angle+=0.05; ctx.rotate(e.angle); ctx.beginPath(); ctx.moveTo(0,-size/2); ctx.lineTo(-size/2, size/2); ctx.lineTo(size/2, size/2); ctx.closePath(); ctx.fillStyle="#ff4444"; ctx.fill(); ctx.restore(); }
//function drawBoss(b){ ctx.save(); ctx.translate(b.x,b.y); ctx.fillStyle="crimson"; ctx.beginPath(); ctx.arc(0,0,b.r,0,Math.PI*2); ctx.fill(); ctx.strokeStyle="gold"; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(-b.r*0.5,-b.r*0.8); ctx.lineTo(-b.r*0.7,-b.r*1.2); ctx.moveTo(b.r*0.5,-b.r*0.8); ctx.lineTo(b.r*0.7,-b.r*1.2); ctx.stroke(); ctx.fillStyle="yellow";// --- Mouth ---
//const mouthOpen = 0.15 + Math.abs(Math.sin(Date.now() / 200)) * 0.25;

//ctx.strokeStyle = "#000";
//ctx.lineWidth = 3;
//ctx.beginPath();
//ctx.arc(
 // 0,
 // b.r * 0.25,
 // b.r * 0.35,
 // Math.PI * (1 + mouthOpen),
 // Math.PI * (2 - mouthOpen)
//);
function drawBoss(b){
  ctx.save();
  ctx.translate(b.x, b.y);

  // 🔥 LỬA CHÁY QUANH THÂN BOSS
  const flame = 10 + Math.abs(Math.sin(Date.now() / 100)) * 20;
  ctx.shadowBlur = flame;
  ctx.shadowColor = "#ff4500";

  // --- Body ---
  ctx.fillStyle = "crimson";
  ctx.beginPath();
  ctx.arc(0, 0, b.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0; // reset shadow

  // --- Horns / ears ---
  ctx.strokeStyle = "gold";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-b.r * 0.5, -b.r * 0.8);
  ctx.lineTo(-b.r * 0.7, -b.r * 1.2);
  ctx.moveTo(b.r * 0.5, -b.r * 0.8);
  ctx.lineTo(b.r * 0.7, -b.r * 1.2);
  ctx.stroke();

  // --- Eyes ---
  ctx.fillStyle = "yellow";
  ctx.beginPath();
  ctx.arc(-b.r * 0.3, -b.r * 0.2, b.r * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(b.r * 0.3, -b.r * 0.2, b.r * 0.1, 0, Math.PI * 2);
  ctx.fill();

  // 👄 Miệng nhúc nhích
  const mouthOpen = 0.15 + Math.abs(Math.sin(Date.now() / 200)) * 0.25;
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(
    0,
    b.r * 0.25,
    b.r * 0.35,
    Math.PI * (1 + mouthOpen),
    Math.PI * (2 - mouthOpen)
  );
  ctx.stroke();





 ctx.beginPath(); ctx.arc(-b.r*0.3,-b.r*0.2,b.r*0.1,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(b.r*0.3,-b.r*0.2,b.r*0.1,0,Math.PI*2); ctx.fill(); ctx.fillStyle="#333"; ctx.fillRect(-b.r,b.r+5,b.r*2,6); ctx.fillStyle="orange"; ctx.fillRect(-b.r,b.r+5,b.r*2*(b.hp/b.maxHp),6); ctx.restore(); }
function drawDiamond(x, y, r, color) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}
// --- Update & Draw loop ---
function update(){
  if(!running) return;
  elapsedTime = Math.floor((Date.now() - startTime) / 1000);
  const now=Date.now();
  if(now-lastPowerUpTime>15000){ spawnPowerUp(); lastPowerUpTime=now; }
  if(isSuperman && now > supermanEndTime){
  isSuperman = false;
}
  if(boss && now-lastBossOrbTime>1000){ spawnBossOrbs(); lastBossOrbTime=now; }
	
	if(now - lastSupermanTime > nextSupermanDelay){spawnSuperman();lastSupermanTime = now; nextSupermanDelay = 30000 + Math.random()*30000; // 30–60s
}

  // Boss spawn animation
  if(boss && boss.spawnAnim){ boss.y += 2; boss.spawnStep++; if(boss.spawnStep>50){ boss.spawnAnim=false; } }

  player.trail.push({x:player.x,y:player.y}); if(player.trail.length>10) player.trail.shift();
  if(joyActive && isMobile){ const maxSpeed=3; const len=Math.hypot(joyX,joyY); if(len>0){ player.x += joyX/50*maxSpeed; player.y += joyY/50*maxSpeed; if(player.x<0) player.x=0; if(player.x>canvas.width) player.x=canvas.width; if(player.y<0) player.y=0; if(player.y>canvas.height) player.y=canvas.height; } } else { player.x=pointer.x; player.y=pointer.y; }

  enemies.forEach(e=>{
    if(e.frozen) return;
    const dx=player.x-e.x, dy=player.y-e.y, d=Math.hypot(dx,dy);
    if(d<200){ e.x+=dx/d*e.speed; e.y+=dy/d*e.speed; }
    else{ if(!e.targetX||Math.hypot(e.x-e.targetX,e.y-e.targetY)<5){ e.targetX=Math.random()*(canvas.width-40)+20; e.targetY=Math.random()*(canvas.height-40)+20; } const ddx=e.targetX-e.x,ddy=e.targetY-e.y,dist=Math.hypot(ddx,ddy); e.x+=ddx/dist*e.speed*0.5; e.y+=ddy/dist*e.speed*0.5; }
    if(d < player.r + e.r){
  if(isSuperman){
    createParticle(e.x,e.y,"#00ff00",6);
    enemies.splice(enemies.indexOf(e),1);
  }else{
    gameOver();
  }
}
  });

  for(let i=orbs.length-1;i>=0;i--){ const o=orbs[i]; if(Math.hypot(player.x-o.x,player.y-o.y)<player.r+o.r){ score++; sndOrb.play(); createOrbExplosion(o.x,o.y,"#ffd700"); orbs.splice(i,1); } }

  for(let i=bossOrbs.length-1;i>=0;i--){ const o=bossOrbs[i]; if(Math.hypot(player.x-o.x,player.y-o.y)<player.r+o.r){ if(boss){ bullets.push({x:player.x,y:player.y,vx:(boss.x-player.x)*0.05,vy:(boss.y-player.y)*0.05}); } sndBossOrb.play(); createOrbExplosion(o.x,o.y,"#ff4444"); bossOrbs.splice(i,1); } }

  for(let i=powerUps.length-1;i>=0;i--){ const p=powerUps[i]; p.x+=p.vx; p.y+=p.vy; if(p.x<0||p.x>canvas.width) p.vx*=-1; if(p.y<0||p.y>canvas.height) p.vy*=-1; if(Math.hypot(player.x-p.x,player.y-p.y)<player.r+p.r){ sndPowerUp.play(); if(p.type==="freeze"){ enemies.forEach(e=>e.frozen=true); if(boss) boss.frozen=true; setTimeout(()=>{enemies.forEach(e=>e.frozen=false); if(boss) boss.frozen=false;},5000); } else if(p.type==="superman"){
  isSuperman = true;
  supermanEndTime = now + 3000; // 3 giây
}else if(p.type==="kill" && enemies.length>0){ const idx=Math.floor(Math.random()*enemies.length); enemies.splice(idx,1); } powerUps.splice(i,1); } }

  for(let i=bullets.length-1;i>=0;i--){ const b=bullets[i]; b.x+=b.vx; b.y+=b.vy; if(boss && Math.hypot(b.x-boss.x,b.y-boss.y)<boss.r){ boss.hp--; sndHitBoss.play(); createParticle(boss.x,boss.y,"crimson",5); bullets.splice(i,1); } else if(b.x<0||b.x>canvas.width||b.y<0||b.y>canvas.height) bullets.splice(i,1); }

  if(boss && !boss.spawnAnim){ if(!boss.frozen){ boss.trail.push({x:boss.x,y:boss.y}); if(boss.trail.length>8) boss.trail.shift(); boss.x+=(player.x-boss.x)*0.02; boss.y+=(player.y-boss.y)*0.02; } if(Math.hypot(player.x-boss.x,player.y-boss.y)<player.r+boss.r) gameOver(); if(boss.hp<=0){ sndBossDead.play(); createBossDeathParticles(); boss=null; spawnOrbs(); } }

  for(let i=particles.length-1;i>=0;i--){ const p=particles[i]; p.x+=p.vx; p.y+=p.vy; p.life--; if(p.life<=0) particles.splice(i,1); }

  if(boss) return;
  if(orbs.length===0){ level++; if(level%5===0) enemySpeed+=0.3; spawnLevel(); }
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  //layers.forEach(layer=>{ ctx.fillStyle=layer.color; ctx.fillRect(0,layer.y,canvas.width,canvas.height); ctx.fillRect(0,layer.y-canvas.height,canvas.width,canvas.height); if(layer.y>canvas.height) layer.y=0; });
  layers.forEach(layer => {
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, layer.color);
  grad.addColorStop(1, "#000022"); // chuyển dần về đen
  ctx.fillStyle = grad;
  
  ctx.fillRect(0, layer.y, canvas.width, canvas.height);
  ctx.fillRect(0, layer.y - canvas.height, canvas.width, canvas.height);

  layer.y += layer.speed;
  if(layer.y > canvas.height) layer.y = 0;
});

  //orbs.forEach(o=>drawCircle(o.x,o.y,o.r,"#ffd700"));
  orbs.forEach(o => {
  const sparkle = 0.5 + Math.sin(Date.now() / 150) * 0.5;
  ctx.save();
  ctx.globalAlpha = 0.7 + sparkle * 0.3;
  ctx.shadowBlur = 15 + sparkle * 15;
  ctx.shadowColor = "#ffd700";
  drawDiamond(o.x, o.y, o.r, "#ffd700");
  ctx.restore();
});

  bossOrbs.forEach(o=>drawSquare(o.x,o.y,o.r,"#00eaff"));
  //powerUps.forEach(p=>drawCircle(p.x,p.y,p.r,p.type==="freeze"?"#0ff":"#ff0"));
  powerUps.forEach(p => {
  const glow = 0.5 + Math.sin(Date.now() / 200) * 0.5; // nhấp nháy
  ctx.save();
  ctx.globalAlpha = 0.6 + glow * 0.4;
  ctx.shadowBlur = 20 + glow * 20;
  ctx.shadowColor = p.type === "freeze" ? "#0ff" : "#ff0";
  drawCircle(p.x, p.y, p.r, p.type === "freeze" ? "#0ff" : "#ff0");
  ctx.restore();
});

  player.trail.forEach((t,i)=>{ ctx.fillStyle=`rgba(0,234,255,${i/10})`; ctx.beginPath(); ctx.arc(t.x,t.y,player.r*(i/10),0,Math.PI*2); ctx.fill(); });
  drawCircle(
  player.x,
  player.y,
  player.r,
  isSuperman ? "#00ff00" : "#00eaff"
);
  enemies.forEach(e=>drawTriangleEnemy(e));
  bullets.forEach(b=>drawCircle(b.x,b.y,4,"#red"));
  if(boss) drawBoss(boss);
  particles.forEach(p=>{ ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); });
  ctx.fillStyle="#fff"; ctx.font="16px Arial"; ctx.fillText(`Score(Điểm): ${score}`,10,20); ctx.fillText(`Level(Màn): ${level}`,10,40);
  const minutes = Math.floor(elapsedTime / 60);
const seconds = elapsedTime % 60;
ctx.fillText(
  `Time: ${minutes}:${seconds.toString().padStart(2,"0")}`,
  10,
  60
);
}

function spawnLevel(){ spawnOrbs(); increaseEnemiesForNewLevel(); if(level%5===0) spawnBoss(); }

// --- Loop ---
function loop(){ update(); draw(); requestAnimationFrame(loop); }
loop();
function shareFacebook(){
  const text = `Tôi vừa chơi CircleSurvival 3D và đạt điểm ${score} trong ${Math.floor(elapsedTime/60)}:${(elapsedTime%60).toString().padStart(2,"0")}! Thử thách bạn nào chơi được hơn tôi không?`;
  const url = encodeURIComponent("https://circle-survival.vercel.app/");
  const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${encodeURIComponent(text)}`;
  window.open(shareUrl, "_blank");
}
