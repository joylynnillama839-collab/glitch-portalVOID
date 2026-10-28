(() => {
'use strict';
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);
const W = canvas.width, H = canvas.height;
const LEVELS = [
 {name:'The First Shift', platforms:[[0,480,960,60],[190,405,145,16],[400,340,145,16],[620,280,130,16]], shards:[[260,370],[465,305],[680,245]], portal:[865,420], hazards:[]},
 {name:'Mind the Gaps', platforms:[[0,480,175,60],[230,430,120,16],[390,365,120,16],[550,300,120,16],[740,250,220,16]], shards:[[270,395],[590,265],[815,215]],portal:[890,190],hazards:[[355,466,35,14],[510,466,35,14],[680,466,35,14]]},
 {name:'A Little Pressure', platforms:[[0,480,210,60],[265,420,115,16],[430,350,115,16],[600,420,100,16],[760,340,200,16]],shards:[[305,385],[475,315],[820,305]],portal:[885,280],hazards:[[220,466,43,14],[390,466,35,14],[555,466,42,14]]},
 {name:'Moving Signal', platforms:[[0,480,190,60],[250,420,125,16],[440,350,125,16],[630,290,120,16],[810,350,150,16]],shards:[[290,385],[480,315],[855,315]],portal:[900,300],hazards:[[390,466,40,14],[580,466,40,14]]},
 {name:'False Floor', platforms:[[0,480,220,60],[285,430,100,16],[445,380,100,16],[610,325,100,16],[775,270,185,16]],shards:[[320,395],[480,345],[825,235]],portal:[900,220],hazards:[[225,466,60,14],[390,466,48,14],[550,466,60,14],[720,466,48,14]]},
 {name:'The Long Leap', platforms:[[0,480,150,60],[220,425,105,16],[390,360,105,16],[560,425,105,16],[730,350,105,16],[865,290,95,16]],shards:[[255,390],[425,325],[765,315]],portal:[910,240],hazards:[[155,466,65,14],[325,466,65,14],[495,466,65,14],[665,466,65,14],[835,466,30,14]]},
 {name:'Laser Practice', platforms:[[0,480,190,60],[250,420,125,16],[435,355,125,16],[620,300,125,16],[800,350,160,16]],shards:[[290,385],[475,320],[850,315]],portal:[900,300],hazards:[[390,466,35,14],[575,466,35,14],[760,466,35,14]],laser:true},
 {name:'Phantom Steps', platforms:[[0,480,220,60],[275,420,100,16],[430,360,100,16],[585,300,100,16],[740,360,100,16],[860,300,100,16]],shards:[[310,385],[465,325],[890,265]],portal:[915,250],hazards:[[225,466,50,14],[380,466,50,14],[535,466,50,14],[690,466,50,14],[840,466,20,14]]},
 {name:'Portal Shuffle', platforms:[[0,480,175,60],[235,425,100,16],[395,365,100,16],[555,305,100,16],[715,365,100,16],[850,300,110,16]],shards:[[270,390],[430,330],[885,265]],portal:[900,250],hazards:[[180,466,55,14],[340,466,55,14],[500,466,55,14],[660,466,55,14],[815,466,35,14]],teleport:true},
 {name:'The Final Shift', platforms:[[0,480,180,60],[230,425,105,16],[390,365,105,16],[550,410,105,16],[710,335,105,16],[850,270,110,16]],shards:[[265,390],[745,300],[890,235]],portal:[910,220],hazards:[[185,466,45,14],[335,466,55,14],[500,466,50,14],[660,466,50,14],[815,466,35,14]],laser:true}
];
let levelIndex=0, level, player, shards=[], particles=[], keys={}, active=false, started=false, muted=true;
let deaths=0, elapsed=0, sectorTime=0, lastTime=0, frame=0, collected=0, selected=0, toastTimer=0, laserPhase=0, teleported=false;
const soundBtn=$('soundBtn');
function getAudioContext(){
 const AC=window.AudioContext||window.webkitAudioContext;
 if(!window.audioCtx&&AC)window.audioCtx=new AC();
 return window.audioCtx;
}
function beep(freq=440,duration=.08,type='sine'){
 if(muted)return; try{const a=getAudioContext();if(!a)return;const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.045,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+duration);o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+duration)}catch(e){}
}
// Soft, looping sci-fi ambience. It is generated locally so no extra audio files are needed.
let musicNodes=[], musicTimer=null, musicStep=0;
function startBackgroundMusic(){
 try{
  const a=getAudioContext();if(!a||musicNodes.length)return;
  if(a.state==='suspended')a.resume();
  const master=a.createGain();master.gain.value=.12;master.connect(a.destination);
  // Warm low pad and two airy high tones.
  [[55,'sine',.22],[110,'sine',.09],[164.81,'triangle',.035]].forEach(([freq,type,volume])=>{
   const osc=a.createOscillator(),gain=a.createGain();osc.type=type;osc.frequency.value=freq;gain.gain.value=volume;osc.connect(gain);gain.connect(master);osc.start();musicNodes.push(osc,gain);
  });
  musicNodes.push(master);
  const notes=[220,261.63,329.63,392,329.63,293.66,261.63,196];
  const playNote=()=>{
   if(muted||!musicNodes.length)return;
   try{const osc=a.createOscillator(),gain=a.createGain();osc.type='sine';osc.frequency.value=notes[musicStep%notes.length];gain.gain.setValueAtTime(.0001,a.currentTime);gain.gain.exponentialRampToValueAtTime(.045,a.currentTime+.35);gain.gain.exponentialRampToValueAtTime(.0001,a.currentTime+2.1);osc.connect(gain);gain.connect(master);osc.start();osc.stop(a.currentTime+2.15);musicStep++;}catch(e){}
  };
  playNote();musicTimer=window.setInterval(playNote,1450);
 }catch(e){}
}
function stopBackgroundMusic(){
 if(musicTimer!==null){window.clearInterval(musicTimer);musicTimer=null;}
 if(!musicNodes.length)return;
 const a=window.audioCtx;
 try{const master=musicNodes[musicNodes.length-1];if(a&&master&&master.gain){master.gain.setTargetAtTime(0,a.currentTime,.08);window.setTimeout(()=>{musicNodes.forEach(node=>{try{if(node.stop)node.stop();if(node.disconnect)node.disconnect()}catch(e){}});musicNodes=[];},350);}else musicNodes=[];}catch(e){musicNodes=[];}
}
function showToast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');toastTimer=100}
function formatTime(s){return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`}
function buildPicker(){const p=$('levelPicker');p.innerHTML='';LEVELS.forEach((l,i)=>{const b=document.createElement('button');b.textContent=String(i+1).padStart(2,'0');b.className=i===selected?'selected':'';b.title=l.name;b.onclick=()=>{selected=i;[...p.children].forEach((x,j)=>x.classList.toggle('selected',j===i));$('overlayTitle').textContent=`SECTOR ${String(i+1).padStart(2,'0')}`;$('overlayText').textContent=l.name+' — collect three shards and reach the portal.';$('mainBtn').innerHTML='START SECTOR <span>→</span>'};p.appendChild(b)})}
function loadLevel(i){levelIndex=i;level=JSON.parse(JSON.stringify(LEVELS[i]));player={x:35,y:425,w:25,h:34,vx:0,vy:0,ground:false,coyote:0,jumpBuffer:0,face:1};shards=level.shards.map(([x,y])=>({x,y,got:false}));particles=[];collected=0;sectorTime=0;laserPhase=0;teleported=false;active=true;started=true;lastTime=performance.now();updateHud();$('overlay').classList.add('hidden');showToast(`SECTOR ${i+1}: ${level.name}`)}
function updateHud(){$('levelLabel').textContent=`${String(levelIndex+1).padStart(2,'0')} / ${LEVELS.length}`;$('levelName').textContent=LEVELS[levelIndex].name;$('shardLabel').textContent=`${collected} / 3`;$('deathLabel').textContent=deaths;$('timeLabel').textContent=formatTime(elapsed)}
function restart(){if(!started)return;deaths++;loadLevel(levelIndex);updateHud();showToast('Sector restarted')}
function menu(){active=false;$('overlay').classList.remove('hidden');$('overlayTitle').innerHTML='GLITCH <span class="title-accent">PORTAL</span>';$('overlayText').textContent='Jump, dodge hazards, collect energy shards, and find the real portal. The traps are sneaky—but fair.';$('mainBtn').innerHTML='RESUME SECTOR <span>→</span>';buildPicker()}
function start(){selected=Math.max(0,Math.min(LEVELS.length-1,selected));if(started&&levelIndex===selected&&level){active=true;$('overlay').classList.add('hidden')}else loadLevel(selected);beep(520,.12)}
$('mainBtn').addEventListener('click',start);$('restartBtn').addEventListener('click',restart);
soundBtn.addEventListener('click',()=>{muted=!muted;soundBtn.textContent=muted?'♫ Sound: Off':'♫ Sound: On';soundBtn.setAttribute('aria-pressed',String(!muted));if(muted){stopBackgroundMusic()}else{startBackgroundMusic();beep(600,.06)}});
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if([' ','arrowleft','arrowright','arrowup'].includes(k))e.preventDefault();if(k==='escape'){if($('overlay').classList.contains('hidden'))menu();else if(started)start();return}if(k==='r'){restart();return}keys[k]=true;if([' ','w','arrowup'].includes(k)&&player)player.jumpBuffer=8});
window.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false});
canvas.addEventListener('pointerdown',e=>{if(!active)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*W;if(x<W*.35)keys.arrowleft=true;else if(x>W*.65)keys.arrowright=true;else {keys.space=true;player.jumpBuffer=8}});
canvas.addEventListener('pointerup',()=>{keys.arrowleft=keys.arrowright=keys.space=false});
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function die(){deaths++;beep(120,.22,'sawtooth');loadLevel(levelIndex);showToast('Glitch caught you — try again!')}
function win(){active=false;beep(660,.18);if(levelIndex===LEVELS.length-1){$('overlayTitle').textContent='VOID SHIFT CONQUERED!';$('overlayText').textContent=`All 10 sectors cleared. Total deaths: ${deaths}. Time: ${formatTime(elapsed)}. You made it through the anomaly zone.`;$('mainBtn').innerHTML='PLAY AGAIN <span>↻</span>';selected=0;$('mainBtn').onclick=()=>{deaths=0;elapsed=0;selected=0;loadLevel(0);$('mainBtn').onclick=start;buildPicker()}}else{$('overlayTitle').textContent=`SECTOR ${levelIndex+1} CLEARED!`;$('overlayText').textContent=`Shards collected: ${collected}/3 · Sector time: ${formatTime(sectorTime)}. ${collected===3?'Perfect collection!':'Try collecting all three shards next time.'}`;$('mainBtn').innerHTML='NEXT SECTOR <span>→</span>';selected=levelIndex+1;$('mainBtn').onclick=()=>{loadLevel(selected);$('mainBtn').onclick=start;buildPicker()}}buildPicker();$('overlay').classList.remove('hidden')}
function update(dt){
 if(!active)return;frame++;sectorTime+=dt;elapsed+=dt;laserPhase+=dt*2.5;
 const left=keys.a||keys.arrowleft,right=keys.d||keys.arrowright;
 if(left){player.vx-=.62;player.face=-1}if(right){player.vx+=.62;player.face=1}
 if(!left&&!right)player.vx*=.79;player.vx=Math.max(-4.5,Math.min(4.5,player.vx));
 player.vy=Math.min(10,player.vy+.42);if(player.ground)player.coyote=8;else player.coyote=Math.max(0,player.coyote-1);
 if((keys[' ']||keys.w||keys.arrowup)&&!player._jumpHeld)player.jumpBuffer=8;player._jumpHeld=!!(keys[' ']||keys.w||keys.arrowup);
 player.jumpBuffer=Math.max(0,player.jumpBuffer-1);if(player.jumpBuffer>0&&player.coyote>0){player.vy=-10.1;player.ground=false;player.coyote=0;player.jumpBuffer=0;beep(420,.07,'square')}
 player.x+=player.vx;player.x=Math.max(0,Math.min(W-player.w,player.x));
 const oldY=player.y;player.y+=player.vy;player.ground=false;
 for(const p of level.platforms){const box={x:p[0],y:p[1],w:p[2],h:p[3]};if(overlap(player,box)&&player.vy>=0&&oldY+player.h<=box.y+10){player.y=box.y-player.h;player.vy=0;player.ground=true}}
 if(player.y>H+30){die();return}
 for(const h of level.hazards){if(overlap(player,{x:h[0],y:h[1],w:h[2],h:h[3]})){die();return}}
 if(level.laser){const lx=480+Math.sin(laserPhase)*140;if(Math.abs(player.x+player.w/2-lx)<7&&player.y+player.h>90){die();return}}
 if(level.teleport&&player.x>660&&player.x<720&&player.y<390&&!teleported){player.x=250;player.y=370;player.vx=0;player.vy=0;teleported=true;showToast('Portal shuffle! Find another route.')}
 for(const s of shards){if(!s.got&&Math.hypot(player.x+player.w/2-s.x,player.y+player.h/2-s.y)<24){s.got=true;collected++;beep(700+collected*100,.1);updateHud();showToast('Energy shard collected!')}}
 const po=level.portal;if(Math.hypot(player.x+player.w/2-po[0],player.y+player.h/2-po[1])<31){win();return}
 particles=particles.filter(p=>p.life>0);for(const p of particles){p.x+=p.vx;p.y+=p.vy;p.life--}
 if(toastTimer>0&&--toastTimer===0)$('toast').classList.remove('show');
 updateHud()
}
function draw(){
 ctx.clearRect(0,0,W,H);const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#0c0820');grad.addColorStop(1,'#05030b');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
 ctx.strokeStyle='#9b5de012';ctx.lineWidth=1;for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=(frame*.35)%40;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
 for(let i=0;i<55;i++){const x=(i*173+frame*.12)%W,y=(i*97)%H;ctx.fillStyle='#d8b4fe55';ctx.fillRect(x,y,2,2)}
 for(const p of level.platforms){ctx.fillStyle='#17102b';ctx.fillRect(...p);ctx.strokeStyle='#a78bfa';ctx.lineWidth=2;ctx.strokeRect(...p);ctx.fillStyle='#e9d5ff';ctx.fillRect(p[0],p[1],p[2],3);ctx.fillStyle='#a78bfa22';ctx.fillRect(p[0],p[1]+4,p[2],p[3]-4)}
 for(const h of level.hazards){ctx.fillStyle='#fb416b';ctx.shadowColor='#fb416b';ctx.shadowBlur=10;for(let x=h[0];x<h[0]+h[2];x+=12){ctx.beginPath();ctx.moveTo(x,h[1]+h[3]);ctx.lineTo(x+6,h[1]);ctx.lineTo(x+12,h[1]+h[3]);ctx.fill()}ctx.shadowBlur=0}
 if(level.laser){const x=480+Math.sin(laserPhase)*140;ctx.strokeStyle='#fb7185';ctx.shadowColor='#fb416b';ctx.shadowBlur=14;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x,80);ctx.lineTo(x,480);ctx.stroke();ctx.shadowBlur=0}
 for(const s of shards){if(s.got)continue;ctx.save();ctx.translate(s.x,s.y);ctx.rotate(frame*.025);ctx.shadowColor='#67e8f9';ctx.shadowBlur=14;ctx.fillStyle='#67e8f9';ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(8,0);ctx.lineTo(0,10);ctx.lineTo(-8,0);ctx.closePath();ctx.fill();ctx.restore()}
 const [px,py]=level.portal;ctx.save();ctx.translate(px,py);ctx.rotate(frame*.018);ctx.shadowColor='#c084fc';ctx.shadowBlur=20;ctx.strokeStyle='#d8b4fe';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,0,17,27,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#c084fc55';ctx.beginPath();ctx.ellipse(0,0,10,20,0,0,Math.PI*2);ctx.fill();ctx.restore();
 if(player){
  // New player design: a tiny neon explorer with a helmet, visor, jacket and boots.
  ctx.save();ctx.translate(player.x+player.w/2,player.y+player.h/2);ctx.scale(player.face,1);
  const bob=player.ground&&Math.abs(player.vx)>.5?Math.sin(frame*.28)*1.2:0;ctx.translate(0,bob);
  // soft glow
  ctx.shadowColor='#67e8f9';ctx.shadowBlur=13;ctx.fillStyle='#67e8f922';ctx.beginPath();ctx.ellipse(0,13,13,4,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  // boots
  ctx.fillStyle='#211333';ctx.strokeStyle='#d8b4fe';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(-9,8);ctx.lineTo(-2,8);ctx.lineTo(-2,13);ctx.quadraticCurveTo(-2,16,-6,16);ctx.lineTo(-11,16);ctx.quadraticCurveTo(-12,12,-9,8);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(2,8);ctx.lineTo(9,8);ctx.lineTo(11,13);ctx.quadraticCurveTo(11,16,7,16);ctx.lineTo(2,16);ctx.closePath();ctx.fill();ctx.stroke();
  // body / explorer jacket
  ctx.fillStyle='#35204f';ctx.strokeStyle='#c4b5fd';ctx.lineWidth=1.7;ctx.beginPath();ctx.moveTo(-9,-3);ctx.quadraticCurveTo(-10,-7,-6,-8);ctx.lineTo(6,-8);ctx.quadraticCurveTo(10,-7,9,-3);ctx.lineTo(7,10);ctx.lineTo(-7,10);ctx.closePath();ctx.fill();ctx.stroke();
  // chest power core
  ctx.shadowColor='#67e8f9';ctx.shadowBlur=8;ctx.fillStyle='#67e8f9';ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(4,-1);ctx.lineTo(0,3);ctx.lineTo(-4,-1);ctx.closePath();ctx.fill();ctx.shadowBlur=0;
  // arms
  ctx.strokeStyle='#f0abfc';ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-8,-5);ctx.lineTo(-11,2);ctx.moveTo(8,-5);ctx.lineTo(11,1);ctx.stroke();
  // helmet
  ctx.shadowColor='#c084fc';ctx.shadowBlur=12;ctx.fillStyle='#221337';ctx.strokeStyle='#e9d5ff';ctx.lineWidth=1.8;ctx.beginPath();ctx.ellipse(0,-11,11,10,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
  // glass visor
  ctx.fillStyle='#67e8f9';ctx.globalAlpha=.9;ctx.beginPath();ctx.ellipse(1,-11,7,5.2,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  ctx.fillStyle='#ffffff';ctx.globalAlpha=.8;ctx.beginPath();ctx.ellipse(-1,-13,2.5,1.2,-.4,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  // helmet side antenna
  ctx.strokeStyle='#f0abfc';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(8,-17);ctx.lineTo(11,-21);ctx.stroke();ctx.fillStyle='#f0abfc';ctx.beginPath();ctx.arc(11,-21,2,0,Math.PI*2);ctx.fill();
  ctx.restore();
 }
 for(const p of particles){ctx.fillStyle=`rgba(192,132,252,${p.life/30})`;ctx.fillRect(p.x,p.y,3,3)}
}
function loop(now){const dt=Math.min(.035,(now-lastTime)/1000||0);lastTime=now;update(dt);draw();requestAnimationFrame(loop)}
buildPicker();loadLevel(0);active=false;menu();requestAnimationFrame(loop);
})();
