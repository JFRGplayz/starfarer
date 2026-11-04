/* ============ UI ============ */
let lastObj='';
const show=id=>$(id).classList.remove('hidden'),hide=id=>$(id).classList.add('hidden');
const hc={};function setH(id,h){if(hc[id]!==h){hc[id]=h;$(id).innerHTML=h}}
const TCOL=['#5fd36a','#e0b060','#bfe4ff','#ff6a3a','#3aa8ff','#b4e03a','#c08cff','#bbbbbb','#3affd0','#e8d040'];
const pct=(v,m)=>Math.round(clamp(v/m,0,1)*100);
function hudUpdate(){
  const P=W.P,u=ST_;
  setH('pName',P.name);setH('pSub',`${P.type.name} · Threat ${THREAT[P.tier]}`);
  const hh=Math.floor(W.tod*24),mm=Math.floor((W.tod*24-hh)*60);
  setH('pStats',`GRAV ${P.gravity.toFixed(2)} g · ${P.temp}°C<br>ATMO ${P.type.atmoLabel}<br>HAZARD ${HAZ[P.hazard]}${P.hazLevel?' '+'I'.repeat(P.hazLevel):''}<br>LOCAL ${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}${W.storm>.3?' · STORM':''}`);
  const f=S.flags,sc=P.species.filter(s=>S.codex.has(s.id)).length;
  const ob=[[f.mined,'Mine a deposit (hold LMB near a glowing rock)'],[f.scanned,'Scan a lifeform (hold Q)'],[f.sold,'Sell cargo at your ship [E]'],[f.upgraded,'Buy an upgrade'],[f.warped,'Warp to another world'],[S.surveyed.has(P.id),`Survey ${P.name}: ${sc}/${P.species.length} species`]];
  setH('objList',ob.map(o=>`<li class="${o[0]?'done':''}">${o[1]}</li>`).join(''));
  const b=((-S.yaw*180/Math.PI)%360+360)%360;setH('compass',`${['N','NE','E','SE','S','SW','W','NW'][Math.round(b/45)%8]} ${String(Math.round(b)%360).padStart(3,'0')}°`);
  const set=(i,v,m)=>{$('b'+i).style.width=pct(v,m)+'%';$('v'+i).textContent=Math.ceil(v)};
  set('Health',S.health,100);set('Shield',S.shield,u.maxShield);set('Life',S.life,u.maxLife);set('Jet',S.jet,u.maxJet);
  setH('toolBox',`<div class="tl ${S.tool===1?'on':''}">[1] MINING BEAM L${S.upg.beam}</div><div class="tl ${S.tool===2?'on':''}">[2] PULSE BLASTER L${S.upg.blaster}</div><div class="tl">[Q] SCANNER L${S.upg.scanner}</div>${S.lamp?'<div class="tl on">[T] LAMP</div>':''}`);
  setH('invBox',`<div class="row"><span>CREDITS</span><b class="mono">${Math.floor(S.credits)}</b></div><div class="row"><span>CARGO</span><b class="mono">${cargoUsed()}/${u.cargo}</b></div>`+Object.keys(RES).map(k=>`<div class="row"><span style="color:${RES[k].col}">${RES[k].n}</span><b class="mono">${S.inv[k]}</b></div>`).join('')+`<div class="row"><span>WARP FUEL</span><b class="mono">${Math.floor(S.fuel)}/${u.maxFuel}</b></div>`);
  const a=S.aim;let th='';
  if(a&&a.dist<130){
    if(a.type==='creature'){const c=a.obj,sp=c.sp,k=S.codex.has(sp.id);th=`<div class="tn">${k?sp.name:'Unknown lifeform'}</div><div class="ts">${Math.round(a.dist)} m${k?' · '+sp.temper:''}${a.dist>u.scanRange?' · out of scan range':' · hold Q to scan'}</div><div class="hpbar"><b style="width:${c.hp/sp.hp*100}%"></b></div>`}
    else th=`<div class="tn" style="color:${RES[a.obj.type].col}">${RES[a.obj.type].n} deposit</div><div class="ts">${Math.round(a.dist)} m${a.dist<=u.beamRange?' · hold LMB to mine':''}</div>`;
  }
  setH('targetBox',th);
  $('scanRing').style.opacity=S.scanP>0?1:0;$('scanRing').style.setProperty('--p',Math.round(S.scanP*100));
  const near=W.ship&&Math.hypot(
  S.pos.x-W.ship.position.x,
  S.pos.z-W.ship.position.z
)<18;

let prompt='';

if(flight.active){
  prompt=flight.landed
    ?'[E] EXIT SHIP'
    :'FLIGHT ACTIVE · SPACE ASCEND · CTRL DESCEND';
}else if(near&&W.landed){
  prompt='[E] BOARD SHIP · [V] SHIP TERMINAL';
}

setH('prompt',prompt);
}
function resetState(){
  Object.assign(S,{health:100,alive:true,tool:1,credits:0,fuel:100,planetId:0,flags:{},scanP:0,scanKey:null,lamp:false,jet:60,life:80,shield:40});
  S.inv={ferrite:0,carbon:0,aether:0,bio:0};S.upg={shield:1,life:1,jet:1,legs:1,beam:1,blaster:1,scanner:1,tank:1,warp:1,cargo:1};
  S.visited=new Set([0]);S.codex=new Set();S.surveyed=new Set();recalc();S.shield=ST_.maxShield;S.life=ST_.maxLife;S.jet=ST_.maxJet;S.fuel=ST_.maxFuel;
}
const SAVE_KEY='starfarer_odyssey_v1';
function saveGame(){try{localStorage.setItem(SAVE_KEY,JSON.stringify({cr:S.credits,inv:S.inv,upg:S.upg,fuel:S.fuel,vis:[...S.visited],codex:[...S.codex],sur:[...S.surveyed],pl:S.planetId,fl:S.flags}))}catch(e){}}
function loadSave(){
  try{const s=JSON.parse(localStorage.getItem(SAVE_KEY));if(!s)return false;resetState();S.credits=s.cr||0;Object.assign(S.inv,s.inv);Object.assign(S.upg,s.upg);recalc();S.fuel=s.fuel;S.visited=new Set(s.vis);S.codex=new Set(s.codex);S.surveyed=new Set(s.sur);S.planetId=s.pl||0;S.flags=s.fl||{};S.shield=ST_.maxShield;S.life=ST_.maxLife;S.jet=ST_.maxJet;return true}catch(e){return false}
}
function hasSave(){try{return!!localStorage.getItem(SAVE_KEY)}catch(e){return false}}

/* ---- terminal ---- */
function openTerminal(kind){
  mode='terminal';termMode=kind;mouseL=false;try{document.exitPointerLock()}catch(e){}
  $('tabs').innerHTML=kind==='ship'?['trade:Trade & Fuel','upgrades:Upgrades','map:Galaxy Map','codex:Codex'].map(t=>`<button data-tab="${t.split(':')[0]}">${t.split(':')[1]}</button>`).join(''):'';
  $('tclose').textContent=kind==='ship'?'Close [E]':'Close [C]';show('terminal');setTab(kind==='codex'?'codex':'trade');
}
function closeTerminal(){hide('terminal');mode='play';requestLock();saveGame()}
function setTab(t){tab=t;document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('sel',b.dataset.tab===t));renderTab()}
function renderTab(){
  const c=$('tcontent');
  if(tab==='trade')c.innerHTML=tabTrade();else if(tab==='upgrades')c.innerHTML=tabUpg();else if(tab==='codex')c.innerHTML=tabCodex();
  else{c.innerHTML='<div class="mapwrap"><canvas id="mapCv"></canvas><div id="mapInfo"></div></div>';mapInit()}
}
const mult=()=>1+.18*W.P.tier;
function tabTrade(){
  const m=mult();let tot=0;
  const rows=Object.keys(RES).map(k=>{const v=S.inv[k],p=Math.round(RES[k].price*m);tot+=v*p;return`<div class="kv" style="align-items:center"><span style="color:${RES[k].col}">${RES[k].n} × ${v}</span><span>${p} cr each <button data-act="sell:${k}" ${v?'':'disabled'} style="padding:3px 12px;font-size:13px">Sell</button></span></div>`}).join('');
  const need=Math.max(0,ST_.maxFuel-S.fuel);
  return`<h3 class="sec">Cargo ${cargoUsed()}/${ST_.cargo} · Credits ${Math.floor(S.credits)}</h3>${rows}<div class="row-btn"><button data-act="sellall" ${tot?'':'disabled'}>Sell everything · ${tot} cr</button></div>
  <div class="note">${S.visited.size>1?'Frontier markets pay more the further you are from Haven.':''} Current market: ×${m.toFixed(2)}.</div>
  <h3 class="sec">Warp fuel ${Math.floor(S.fuel)}/${ST_.maxFuel}</h3><div class="row-btn"><button data-act="refuel:carbon" ${need>0&&S.inv.carbon?'':'disabled'}>Refuel · Carbon (+12 each)</button><button data-act="refuel:bio" ${need>0&&S.inv.bio?'':'disabled'}>Refuel · Biomatter (+6 each)</button></div>
  <div class="note">Suit life support recharges automatically near the ship. Out in the field press R to burn a Carbon for +35.</div>`;
}
function tabUpg(){
  return`<div class="note" style="margin:0 0 10px">Credits ${Math.floor(S.credits)} · Ferrite ${S.inv.ferrite} · Carbon ${S.inv.carbon} · Biomatter ${S.inv.bio} · Aether ${S.inv.aether}</div><div class="grid">`+Object.keys(UPG).map(k=>{
    const u=UPG[k],L=S.upg[k],max=L>=MAXL,c=max?null:upCost(k);
    const cost=max?'<span class="ok">MAX LEVEL</span>':Object.keys(c).map(r=>{const have=r==='credits'?S.credits:S.inv[r];return`<span class="${have>=c[r]?'ok':'no'}">${r==='credits'?c[r]+' cr':c[r]+' '+RES[r].n}</span>`}).join('');
    S.upg[k]=L+1;const nx=max?'':UPG[k].eff(L+1);S.upg[k]=L;
    return`<div class="up"><h4><span>${u.n}</span><span class="pips">${Array.from({length:MAXL},(_,i)=>`<i class="${i<L?'on':''}"></i>`).join('')}</span></h4><p>${u.d}</p><div class="eff">${u.eff(L)}${max?'':'<br>→ '+nx}</div><div class="cost">${cost}</div><button data-act="buy:${k}" ${max||!canPay(c)?'disabled':''}>Upgrade</button></div>`}).join('')+'</div>';
}
function tabCodex(){
  const vis=[...S.visited].sort((a,b)=>a-b);
  return`<div class="note" style="margin:0 0 8px">Worlds visited ${S.visited.size}/${GALAXY.length} · Species catalogued ${S.codex.size}</div>`+vis.map(id=>{
    const P=planetOf(GALAXY[id]);return`<h3 class="sec">${P.name} · ${P.type.name}${S.surveyed.has(id)?' · SURVEYED':''}</h3><div class="grid">`+P.species.map(sp=>{const k=S.codex.has(sp.id);
      return`<div class="up"><h4>${k?sp.name:'Unknown lifeform'}</h4><div class="eff">${k?`${sp.body} · ${sp.size.toFixed(1)} m · ${sp.temper}<br>HP ${sp.hp} · bite ${sp.dmg}`:'Not yet scanned'}</div></div>`}).join('')+'</div>'}).join('');
}
$('tcontent').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b||b.disabled)return;const a=b.dataset.act;if(!a)return;const[act,arg]=a.split(':');
  if(act==='sell'){const p=Math.round(RES[arg].price*mult());S.credits+=S.inv[arg]*p;S.inv[arg]=0;S.flags.sold=true;SFX.buy()}
  else if(act==='sellall'){for(const k in RES){S.credits+=S.inv[k]*Math.round(RES[k].price*mult());S.inv[k]=0}S.flags.sold=true;SFX.buy()}
  else if(act==='refuel'){const per=arg==='carbon'?12:6,n=Math.min(S.inv[arg],Math.ceil((ST_.maxFuel-S.fuel)/per));S.inv[arg]-=n;S.fuel=Math.min(ST_.maxFuel,S.fuel+n*per);SFX.buy()}
  else if(act==='buy'){const c=upCost(arg);if(canPay(c)&&S.upg[arg]<MAXL){for(const k in c){if(k==='credits')S.credits-=c[k];else S.inv[k]-=c[k]}S.upg[arg]++;recalc();S.flags.upgraded=true;SFX.buy();toast(UPG[arg].n+' → level '+S.upg[arg],'good')}}
  else if(act==='warp'){const g=GALAXY[MAP.sel];if(g)startWarp(g);return}
  saveGame();renderTab();
});
$('tabs').addEventListener('click',e=>{const b=e.target.closest('button');if(b)setTab(b.dataset.tab)});
$('tclose').addEventListener('click',()=>{if(termMode==='ship')closeTerminal();else closeTerminal()});

/* ---- galaxy map ---- */
const MAP={cx:0,cy:0,sc:3,sel:null,hover:null,dragged:false,drag:null,bg:null};
function mapInit(){
  const cv=$('mapCv'),cur=GALAXY[S.planetId];
  if(!MAP.bg){const r=mulberry32(9);MAP.bg=Array.from({length:380},()=>[(r()-.5)*260,(r()-.5)*260,r()])}
  sizeMap();MAP.cx=cur.x;MAP.cy=cur.y;MAP.sc=Math.min(cv.clientWidth,cv.clientHeight)/230;MAP.sel=null;MAP.hover=null;
  cv.onpointerdown=e=>{cv.setPointerCapture(e.pointerId);MAP.drag={x:e.clientX,y:e.clientY,cx:MAP.cx,cy:MAP.cy};MAP.dragged=false};
  cv.onpointermove=e=>{
    if(MAP.drag){const dx=e.clientX-MAP.drag.x,dy=e.clientY-MAP.drag.y;if(Math.abs(dx)+Math.abs(dy)>4)MAP.dragged=true;if(MAP.dragged){MAP.cx=MAP.drag.cx-dx/MAP.sc;MAP.cy=MAP.drag.cy-dy/MAP.sc}}
    const r=cv.getBoundingClientRect();MAP.hover=mapPick(e.clientX-r.left,e.clientY-r.top);mapDraw();
  };
  cv.onpointerup=e=>{if(!MAP.dragged){const r=cv.getBoundingClientRect(),p=mapPick(e.clientX-r.left,e.clientY-r.top);if(p!==null){MAP.sel=p;mapInfo()}}MAP.drag=null;mapDraw()};
  cv.onwheel=e=>{e.preventDefault();MAP.sc=clamp(MAP.sc*(e.deltaY<0?1.15:.87),1.2,14);mapDraw()};
  mapInfo();mapDraw();
}
function sizeMap(){const cv=$('mapCv'),d=window.devicePixelRatio||1;cv.width=cv.clientWidth*d;cv.height=cv.clientHeight*d}
function m2s(g,cv){return[cv.clientWidth/2+(g.x-MAP.cx)*MAP.sc,cv.clientHeight/2+(g.y-MAP.cy)*MAP.sc]}
function mapPick(px,py){const cv=$('mapCv');let best=null,bd=14;for(const g of GALAXY){const[x,y]=m2s(g,cv),d=Math.hypot(x-px,y-py);if(d<bd){bd=d;best=g.id}}return best}
function known(g){return S.visited.has(g.id)||warpDist(g)<=ST_.warpRange*1.6}
function mapDraw(){
  const cv=$('mapCv');if(!cv)return;const d=window.devicePixelRatio||1,x=cv.getContext('2d');x.setTransform(d,0,0,d,0,0);x.clearRect(0,0,cv.clientWidth,cv.clientHeight);
  const cur=GALAXY[S.planetId],[cx,cy]=m2s({x:0,y:0},cv);
  for(const b of MAP.bg){x.fillStyle=`rgba(170,200,255,${.08+b[2]*.18})`;x.fillRect(cv.clientWidth/2+(b[0]-MAP.cx)*MAP.sc,cv.clientHeight/2+(b[1]-MAP.cy)*MAP.sc,1.3,1.3)}
  const[ux,uy]=m2s(cur,cv);x.strokeStyle='rgba(82,214,255,.45)';x.setLineDash([5,5]);x.beginPath();x.arc(ux,uy,ST_.warpRange*MAP.sc,0,6.283);x.stroke();x.setLineDash([]);
  x.fillStyle='rgba(82,214,255,.05)';x.fill();
  const now=performance.now()/1000;
  for(const g of GALAXY){
    const[sx,sy]=m2s(g,cv);if(sx<-10||sy<-10||sx>cv.clientWidth+10||sy>cv.clientHeight+10)continue;
    const inR=warpDist(g)<=ST_.warpRange,kn=known(g);
    x.fillStyle=kn?TCOL[g.type]:'#8a97ad';x.globalAlpha=inR||S.visited.has(g.id)?1:.5;x.beginPath();x.arc(sx,sy,inR?3.6:2.6,0,6.283);x.fill();x.globalAlpha=1;
    if(S.visited.has(g.id)){x.strokeStyle='#fff';x.lineWidth=1;x.beginPath();x.arc(sx,sy,6,0,6.283);x.stroke()}
    if(g.id===S.planetId){x.strokeStyle='#52d6ff';x.lineWidth=2;x.beginPath();x.arc(sx,sy,8+Math.sin(now*3)*2,0,6.283);x.stroke();x.lineWidth=1}
    if(g.id===MAP.sel){x.strokeStyle='#ffc857';x.lineWidth=2;x.strokeRect(sx-9,sy-9,18,18);x.lineWidth=1}
    if(MAP.sc>5||g.id===MAP.hover||g.id===MAP.sel||g.id===S.planetId){x.fillStyle='#e3edff';x.font='12px Rajdhani,sans-serif';x.fillText(kn||S.visited.has(g.id)?g.name:'Unsurveyed',sx+9,sy+4)}
  }
}
function mapInfo(){
  const el=$('mapInfo');if(!el)return;const id=MAP.sel;
  if(id===null){el.innerHTML=`<h3>Galaxy map</h3><div class="note">Drag to pan, scroll to zoom, click a star. Dashed ring is your warp range (${ST_.warpRange} ly). Worlds inside 1.6× range reveal their details.</div><div class="kv"><span>Fuel</span><span>${Math.floor(S.fuel)}/${ST_.maxFuel}</span></div><div class="kv"><span>Warp efficiency</span><span>${ST_.warpEff.toFixed(1)}×</span></div>`;return}
  const g=GALAXY[id],kn=known(g),dist=warpDist(g),cost=warpCost(g),here=id===S.planetId;let h=`<h3>${kn||S.visited.has(id)?g.name:'Unsurveyed world'}</h3>`;
  if(kn){const P=planetOf(g);h+=`<div class="kv"><span>Type</span><span style="color:${TCOL[g.type]}">${P.type.name}</span></div><div class="kv"><span>Gravity</span><span>${P.gravity.toFixed(2)} g</span></div><div class="kv"><span>Temperature</span><span>${P.temp}°C</span></div><div class="kv"><span>Atmosphere</span><span>${P.type.atmoLabel}</span></div><div class="kv"><span>Hazard</span><span>${HAZ[P.hazard]}${P.hazLevel?' '+'I'.repeat(P.hazLevel):''}</span></div><div class="kv"><span>Life</span><span>${P.life<.35?'Sparse':P.life<.7?'Moderate':'Abundant'}</span></div><div class="kv"><span>Threat</span><span>${THREAT[g.tier]}</span></div>`}
  else h+='<div class="note">Too far for long-range sensors. Move closer to reveal details.</div>';
  h+=`<div class="kv"><span>Distance</span><span>${dist.toFixed(1)} ly</span></div><div class="kv"><span>Fuel cost</span><span style="color:${cost>S.fuel?'var(--bad)':'var(--good)'}">${cost}</span></div>`;
  const ok=!here&&dist<=ST_.warpRange&&cost<=S.fuel;
  h+=`<div class="row-btn"><button data-act="warp" ${ok?'':'disabled'}>${here?'You are here':dist>ST_.warpRange?'Out of range':cost>S.fuel?'Not enough fuel':'Warp'}</button></div>`;
  el.innerHTML=h;
}

/* ---- warp ---- */
let warpT=0,warpDest=null,warpLoaded=false;const wstars=Array.from({length:260},()=>({a:Math.random()*6.283,r:Math.random(),v:.2+Math.random()*.8}));
function startWarp(g){
  if(warpCost(g)>S.fuel||warpDist(g)>ST_.warpRange)return;
  S.fuel-=warpCost(g);saveGame();hide('terminal');mode='warp';warpT=0;warpDest=g;warpLoaded=false;S.flags.warped=true;
  $('warpCv').style.opacity=1;$('warpTxt').style.opacity=1;$('warpTxt').textContent='Warping to '+g.name;SFX.warp();requestLock();
}
function warpFrame(dt){
  warpT+=dt;const cv=$('warpCv'),x=cv.getContext('2d'),w=cv.width,h=cv.height,sp=1+warpT*warpT*2.2;
  x.fillStyle='rgba(2,4,10,.3)';x.fillRect(0,0,w,h);x.lineCap='round';
  for(const s of wstars){s.r+=s.v*dt*.5*sp;if(s.r>1.2){s.r=.02;s.a=Math.random()*6.283}
    const R=Math.max(w,h)*.6,r0=s.r*R,len=(8+r0*.08)*sp*.5,cx=w/2,cy=h/2;x.strokeStyle=`rgba(${150+s.v*100|0},${210},255,${Math.min(1,s.r*2)})`;x.lineWidth=1+s.r*2;
    x.beginPath();x.moveTo(cx+Math.cos(s.a)*r0,cy+Math.sin(s.a)*r0);x.lineTo(cx+Math.cos(s.a)*(r0+len),cy+Math.sin(s.a)*(r0+len));x.stroke()}
  if(warpT>3.2&&!warpLoaded){warpLoaded=true;$('warpTxt').textContent='Entering atmosphere';loadWorld(warpDest,true);saveGame()}
  if(warpLoaded&&warpT>4.4){$('warpCv').style.opacity=0;$('warpTxt').style.opacity=0;mode='play';toast('Arrived at '+warpDest.name,'good')}
}

/* ============ INPUT ============ */
function requestLock(){noLock=false;try{const p=canvas.requestPointerLock();if(p&&p.catch)p.catch(()=>{noLock=true})}catch(e){noLock=true}}
document.addEventListener('pointerlockerror',()=>{noLock=true});
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&mode==='play'&&!noLock)setPause(true)});
function setPause(on){if(on){mode='pause';show('pause');mouseL=false;for(const k in keys)keys[k]=false}else{hide('pause');mode='play';requestLock()}}
addEventListener('keydown',e=>{
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(e.code))e.preventDefault();
  if(e.repeat&&e.code!=='x')keys[e.code]=true;else keys[e.code]=true;
  if(mode==='play'){
    if(e.code==='Space'&&!e.repeat)S.jumpReq=true;
    else if(e.code==='Digit1')S.tool=1;
    else if(e.code==='Digit2')S.tool=2;
    else if(e.code==='KeyE'&&!e.repeat)interact();
    else if(e.code==='KeyV'&&!e.repeat){
      if(W.landed&&W.ship&&Math.hypot(
        S.pos.x-W.ship.position.x,
        S.pos.z-W.ship.position.z
      )<18){
        openTerminal('ship');
      }
    }
    else if(e.code==='KeyT'&&!e.repeat)S.lamp=!S.lamp;
    else if(e.code==='KeyR'&&!e.repeat)recharge();
    else if(e.code==='KeyC'&&!e.repeat)openTerminal('codex');
    else if(e.code==='Escape'&&noLock)setPause(true);
  }else if(mode==='terminal'&&!e.repeat&&(e.code==='Escape'||e.code==='KeyE'||(e.code==='KeyC'&&termMode==='codex')))closeTerminal();
  else if(mode==='pause'&&e.code==='Escape')setPause(false);
});
addEventListener('keyup',e=>{keys[e.code]=false});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;mouseL=false});
canvas.addEventListener('mousedown',e=>{if(mode!=='play')return;if(e.button===0)mouseL=true;if(e.button===2)mouseR=true;audioInit()});
addEventListener('mouseup',e=>{if(e.button===0)mouseL=false;if(e.button===2)mouseR=false});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('mousemove',e=>{
  if(mode!=='play')return;
  if(document.pointerLockElement===canvas||(noLock&&mouseR)){S.yaw-=e.movementX*.0022;S.pitch=clamp(S.pitch-e.movementY*.0022,-1.5,1.5)}
});
addEventListener('wheel',e=>{if(mode==='play'){S.tool=S.tool===1?2:1}},{passive:true});

/* ============ MAIN LOOP ============ */
let last=performance.now(),fAcc=0,fN=0,fpsWarn=false,saveT=0;
function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min(.05,(now-last)/1000);last=now;
  if(!W.P)return;
  fAcc+=dt;fN++;if(fAcc>4){const fps=fN/fAcc;if(fps<22&&!fpsWarn&&mode==='play'&&gfxQ!=='low'){fpsWarn=true;toast('Low frame rate — lower Graphics quality in the pause menu','warn')}fAcc=0;fN=0}
  if(mode==='play'){
   if(mode==='play'){

    if(flight.active){
      updateShip(dt);

      const ship=W.ship;
      const bx=Math.sin(S.yaw)*18;
      const bz=Math.cos(S.yaw)*18;

      camera.position.set(
        ship.position.x+bx,
        ship.position.y+8,
        ship.position.z+bz
      );

      camera.lookAt(
        ship.position.x,
        ship.position.y+2.5,
        ship.position.z
      );

      camera.updateMatrixWorld();

    }else{
      if(S.alive)updatePlayer(dt);

      camera.position.set(
        S.pos.x,
        S.pos.y+1.7+(S.onGround?Math.sin(S.bob)*.03:0),
        S.pos.z
      );

      camera.rotation.set(S.pitch,S.yaw,0);
      camera.updateMatrixWorld();

      updateShip(dt);
    }
    const aim=computeAim();S.aim=aim;updateCombat(dt,aim);updateScan(dt,aim);
    updateCreatures(dt);updateShip(dt);streamChunks(2);fxUpdate(dt);updateSky(dt);lamp.intensity=S.lamp?2.4:0;hudUpdate();
    saveT+=dt;if(saveT>30){saveT=0;saveGame()}
  }else if(mode==='title'){
    const t=now/1000*.07,P=W.P;camera.position.set(Math.cos(t)*34,P.flatH+9+Math.sin(t*.7)*3,Math.sin(t)*34);camera.lookAt(0,P.flatH+3,0);camera.updateMatrixWorld();
    S.aim=null;updateCreatures(dt);updateShip(dt);fxUpdate(dt);updateSky(dt);
  }else if(mode==='warp'){warpFrame(dt);fxUpdate(dt);updateSky(dt)}
  else{camera.updateMatrixWorld();updateSky(0)}
  renderer.render(scene,camera);
}

/* ============ START ============ */
function startGame(){
  hide('title');hide('pause');show('hud');loadWorld(GALAXY[S.planetId],true);mode='play';S.alive=true;requestLock();saveGame();
  toast('Welcome aboard. Mine, scan, upgrade, explore.','good');
}
$('bNew').onclick=()=>{audioInit();resetState();startGame()};
$('bCont').onclick=()=>{audioInit();if(!loadSave())resetState();startGame()};
$('bResume').onclick=()=>{audioInit();setPause(false)};
$('bSave').onclick=()=>{saveGame();toast('Game saved','good')};
$('bMute').onclick=()=>{muted=!muted;$('bMute').textContent='Sound: '+(muted?'off':'on');if(master)master.gain.value=muted?0:.4;if(mineGain&&muted)mineGain.gain.value=0};
['gfxRow','gfxRow2'].forEach(id=>{const row=$(id);for(const q in GFX){const b=document.createElement('button');b.className='gfxB';b.dataset.q=q;b.textContent=GFX[q].label;b.onclick=()=>applyGfx(q);row.appendChild(b)}});
if(hasSave())show('bCont');else hide('bCont');
applyGfx(matchMedia('(pointer:coarse)').matches?'med':'high');
resetState();
requestAnimationFrame(()=>setTimeout(()=>{loadWorld(GALAXY[0],false);hide('load');mode='title';W.landed=true;requestAnimationFrame(frame)},30));
window.__sf={S,W,GALAXY,loadWorld,planetOf,startGame,setMode:m=>{mode=m},getMode:()=>mode};
