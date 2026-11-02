'use strict';
/* ============ UTIL ============ */
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hash2(a,b,c){a|=0;b|=0;c|=0;let h=(Math.imul(a,374761393)+Math.imul(b,668265263)+Math.imul(c,1442695041))|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return(h>>>0)/4294967296}
const C=h=>new THREE.Color(h).convertSRGBToLinear();
function makeNoise(seed){
  const r=mulberry32(seed),p=new Uint8Array(512),a=[];
  for(let i=0;i<256;i++)a.push(i);
  for(let i=255;i>0;i--){const j=(r()*(i+1))|0;const t=a[i];a[i]=a[j];a[j]=t}
  for(let i=0;i<512;i++)p[i]=a[i&255];
  const gx=new Float32Array(256),gy=new Float32Array(256);
  for(let i=0;i<256;i++){const t=r()*6.2831853;gx[i]=Math.cos(t);gy[i]=Math.sin(t)}
  return function(x,y){
    const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,X=xi&255,Y=yi&255;
    const u=xf*xf*xf*(xf*(xf*6-15)+10),v=yf*yf*yf*(yf*(yf*6-15)+10);
    const aa=p[p[X]+Y],ab=p[p[X]+Y+1],ba=p[p[X+1]+Y],bb=p[p[X+1]+Y+1];
    const n00=gx[aa]*xf+gy[aa]*yf,n10=gx[ba]*(xf-1)+gy[ba]*yf,n01=gx[ab]*xf+gy[ab]*(yf-1),n11=gx[bb]*(xf-1)+gy[bb]*(yf-1);
    const x1=n00+(n10-n00)*u,x2=n01+(n11-n01)*u;
    return(x1+(x2-x1)*v)*1.41;
  };
}

/* ============ PLANET TYPES ============ */
const TYPES=[
{id:'verdant',name:'Verdant World',pal:['#cdbb85','#3f7d30','#5c9c3a','#9b9b88','#6e6254'],flora:['#6b4a2b','#2f7a2a','#58a23a'],sky:['#2c6ad0','#a8d3f2'],sun:'#fff3dc',amp:[34,48],freq:.0042,ridge:.25,wl:-.16,water:'#2a85b0',veg:[['tree',5],['rock',1]],dens:1,fog:.0017,haz:'none',hl:[0,0],g:[.8,1.2],temp:[8,30],life:[.7,1],atmo:1,atmoLabel:'Oxygen-rich',mote:'pollen',hue:.05,storm:0},
{id:'desert',name:'Desert World',pal:['#d8c590','#b98d4e','#d2a65c','#e6cf9a','#8e5f3c'],flora:['#5a8a45','#4f8a4a','#7aa85a'],sky:['#5d95d6','#efd3a2'],sun:'#fff0d0',amp:[26,40],freq:.0034,ridge:.35,wl:null,veg:[['cactus',3],['rock',2],['spire',1]],dens:.55,fog:.0021,haz:'heat',hl:[1,2],g:[.7,1.1],temp:[38,58],life:[.3,.7],atmo:.9,atmoLabel:'Thin, dry air',mote:'dust',hue:.04,storm:.9},
{id:'frozen',name:'Glacial World',pal:['#a9c9de','#cfe4f1','#eaf5fb','#fbfdff','#6d879f'],flora:['#6b5640','#e6f1f6','#7fa8a0'],sky:['#4772b5','#cfe5f5'],sun:'#e8f1ff',amp:[30,46],freq:.0045,ridge:.45,wl:-.28,water:'#8fc8e6',ice:true,veg:[['pine',4],['crystal',1.2],['rock',1.5]],dens:.75,fog:.0021,haz:'cold',hl:[1,3],g:[.7,1.2],temp:[-70,-20],life:[.25,.6],atmo:.85,atmoLabel:'Frigid nitrogen mix',mote:'snow',hue:.03,storm:1},
{id:'volcanic',name:'Volcanic World',pal:['#4a2c20','#2d2623','#3d322d','#5b4a42','#1b1614'],flora:['#1c1a1e','#3a1a14','#ff5a1a'],sky:['#2b1411','#c24f22'],sun:'#ffcfa0',amp:[40,62],freq:.0046,ridge:.7,wl:-.3,water:'#ff5a12',lava:true,veg:[['spire',3],['rock',3]],dens:.6,fog:.0032,haz:'heat',hl:[2,3],g:[1,1.5],temp:[80,160],life:[.1,.4],atmo:.8,atmoLabel:'Sulfurous haze',mote:'ember',hue:.03,storm:.8},
{id:'oceanic',name:'Archipelago World',pal:['#e5d6a8','#5aaa6c','#4a9356','#8c9c7a','#7c6c5a'],flora:['#8a6a3a','#3fa04e','#6bc060'],sky:['#2a78d6','#bde3f8'],sun:'#fff6e0',amp:[18,28],freq:.004,ridge:.1,wl:.12,water:'#1f8fb8',veg:[['palm',4],['rock',1]],dens:.8,fog:.0016,haz:'none',hl:[0,0],g:[.8,1.1],temp:[18,34],life:[.8,1],atmo:1,atmoLabel:'Humid oxygen',mote:'pollen',hue:.05,storm:.3},
{id:'toxic',name:'Toxic World',pal:['#b5ad55','#6b7a2a','#8a9a30','#b6bd52','#4d4a2b'],flora:['#5a4a2a','#b4e03a','#e0b030'],sky:['#68781c','#cdd96e'],sun:'#f4ffcf',amp:[26,40],freq:.0042,ridge:.3,wl:-.15,water:'#86d43a',glowWater:true,veg:[['mushroom',3],['tendril',2],['rock',1]],dens:1,fog:.0034,haz:'toxic',hl:[1,3],g:[.8,1.2],temp:[20,45],life:[.6,1],atmo:1,atmoLabel:'Chlorine-laden',mote:'spore',hue:.04,storm:.7},
{id:'crystal',name:'Crystalline World',pal:['#8a7ad0','#463678','#6a4ca8','#b69cf0','#2c2250'],flora:['#6a4a9a','#8be8ff','#ff8be8'],sky:['#1d1048','#a468dc'],sun:'#f0e0ff',amp:[34,52],freq:.0044,ridge:.5,wl:-.2,water:'#5ad8ff',veg:[['crystal',4],['rock',1.5],['spire',1]],dens:.8,fog:.002,haz:'radiation',hl:[0,2],g:[.5,1],temp:[-10,15],life:[.2,.6],atmo:.7,atmoLabel:'Tenuous argon',mote:'sparkle',hue:.06,storm:.3},
{id:'barren',name:'Airless Moon',pal:['#5d5d61','#707074','#8c8c90','#b2b2b6','#45454a'],flora:['#555555','#777777','#999999'],sky:['#000000','#030305'],sun:'#ffffff',amp:[24,40],freq:.0038,ridge:.6,wl:null,craters:true,veg:[['rock',4],['spire',.4]],dens:.7,fog:.00025,haz:'vacuum',hl:[2,2],g:[.2,.5],temp:[-150,100],life:[.1,.3],atmo:0,atmoLabel:'None (vacuum)',mote:'none',hue:.02,storm:0,giant:true},
{id:'fungal',name:'Bioluminescent World',pal:['#2a8a7a','#1a5a5a','#1f7a6a','#36b09a','#2a2a4a'],flora:['#6a3a7a','#ff5fd0','#5fffe0'],sky:['#0a1a38','#1d6a80'],sun:'#cfe9ff',amp:[24,36],freq:.0044,ridge:.25,wl:-.12,water:'#20d0b0',glowWater:true,veg:[['mushroom',5],['tendril',2],['rock',.6]],dens:1.3,fog:.0034,haz:'toxic',hl:[0,1],g:[.7,1.1],temp:[22,34],life:[.9,1],atmo:1,atmoLabel:'Spore-laden',mote:'glowspore',hue:.08,storm:.5},
{id:'irradiated',name:'Irradiated Wasteland',pal:['#9a8648','#7a6a3a','#8c7a3e','#a89c5e','#4a3a2a'],flora:['#4a3a2a','#6a5a3a','#8a7a4a'],sky:['#6b6a22','#e0b845'],sun:'#fff0b0',amp:[28,42],freq:.0042,ridge:.5,wl:null,veg:[['deadtree',3],['rock',2],['spire',1]],dens:.6,fog:.0026,haz:'radiation',hl:[2,3],g:[.8,1.2],temp:[30,60],life:[.2,.5],atmo:.8,atmoLabel:'Ionized haze',mote:'dust',hue:.04,storm:.8}
];
const MOTES={pollen:{c:'#fff0a8',s:.11,n:220,vy:.03,dr:.5},dust:{c:'#e8c890',s:.13,n:320,vy:0,dr:7},snow:{c:'#ffffff',s:.15,n:460,vy:-1.6,dr:1.6},ember:{c:'#ff7a2a',s:.13,n:260,vy:1.3,dr:.9},spore:{c:'#b0ff50',s:.13,n:260,vy:.4,dr:.7},glowspore:{c:'#8affd8',s:.17,n:320,vy:.3,dr:.6},sparkle:{c:'#e8c8ff',s:.15,n:200,vy:0,dr:.4},none:{c:'#fff',s:.1,n:0,vy:0,dr:0}};
const HAZ={none:'None',heat:'Extreme heat',cold:'Extreme cold',toxic:'Toxic atmosphere',radiation:'Radiation',vacuum:'Vacuum exposure'};
const THREAT=['Low','Moderate','High','Severe','Lethal'];

/* ============ GALAXY ============ */
const SYLS=['ka','ro','vi','ta','zen','lu','mar','os','eth','kri','nol','xa','dra','qui','pho','sel','tor','ven','yar','ul','ae','bel','cor','dun','fey','gal','hy','ith'];
const ROMAN=['I','II','III','IV','V','VI','VII','VIII'];
function genName(r){let n='';const k=2+(r()*2|0);for(let i=0;i<k;i++)n+=SYLS[(r()*SYLS.length)|0];n=n[0].toUpperCase()+n.slice(1);return r()<.65?n+' '+ROMAN[(r()*8)|0]:n+'-'+(100+(r()*900|0))+String.fromCharCode(97+(r()*6|0))}
const GALAXY=[];
(function(){
  const r=mulberry32(777),W=[14,12,10,8,10,10,9,9,8,10],tw=W.reduce((a,b)=>a+b);
  for(let i=0;i<300;i++){
    let g;
    for(let tries=0;tries<30;tries++){
      let rad=i===0?36:10+Math.sqrt(r())*92,th=rad*.065+(i%3)*2.094+(r()-.5)*.9;if(i===0)th=.4;
      g={x:Math.cos(th)*rad,y:Math.sin(th)*rad};
      if(i===0||!GALAXY.some(o=>Math.hypot(o.x-g.x,o.y-g.y)<3.6))break;
    }
    let t=0,x=r()*tw;while(x>W[t]){x-=W[t];t++}
    if(i===0)t=0;
    g.id=i;g.seed=(1000+i*7919+((r()*1e6)|0))|0;g.type=t;g.name=i===0?'Haven':genName(r);g.P=null;
    GALAXY.push(g);
  }
  const h=GALAXY[0];
  GALAXY.forEach(g=>{g.dist=Math.hypot(g.x-h.x,g.y-h.y);g.tier=Math.min(4,Math.floor(g.dist/22))});
})();

/* ============ PLANET GENERATION ============ */
const BODIES=['quad','biped','hex','floater','crawler','strider'];
const SA=['Glim','Vor','Skar','Nym','Thra','Qua','Zel','Mor','Ur','Kel','Bri','Dru','Vash','Pel','Ix','Orn'];
const SB=['back','claw','hopper','wing','strider','maw','horn','fin','tail','crawler','grazer','stalker','drifter','howler','lurker','skitter'];
function planetOf(g){if(!g.P)g.P=makePlanet(g);return g.P}
function makePlanet(g){
  const T=TYPES[g.type],r=mulberry32(g.seed),R=(a,b)=>a+(b-a)*r();
  const hs=(r()-.5)*T.hue*2,ss=(r()-.5)*.12,ls=(r()-.5)*.08;
  const col=h=>new THREE.Color(h).offsetHSL(hs,ss,ls).convertSRGBToLinear();
  const sky=h=>new THREE.Color(h).offsetHSL(hs,0,0).convertSRGBToLinear();
  const P={g,id:g.id,name:g.name,seed:g.seed,type:T,tier:g.tier};
  P.palC=T.pal.map(col);P.palA=P.palC.map(c=>[c.r,c.g,c.b]);P.flora=T.flora.map(col);
  P.skyTop=sky(T.sky[0]);P.skyHor=sky(T.sky[1]);P.sunCol=C(T.sun);P.sunI=R(.95,1.2);
  P.amp=R(T.amp[0],T.amp[1]);P.freq=T.freq*R(.8,1.25);P.ridge=T.ridge*R(.6,1.4);
  P.waterY=T.wl===null?-1e9:T.wl*P.amp;P.waterCol=T.water?col(T.water):null;P.lava=!!T.lava;
  P.gravity=R(T.g[0],T.g[1]);P.temp=Math.round(R(T.temp[0],T.temp[1]));
  P.hazard=T.haz;P.hazLevel=Math.round(R(T.hl[0],T.hl[1]));
  if(g.id===0){P.hazard='none';P.hazLevel=0}
  P.life=R(T.life[0],T.life[1]);P.maxCreatures=Math.round(5+P.life*10);
  P.tilt=R(.15,.6);P.dayLen=R(260,720);P.fog=T.fog*R(.8,1.3);P.atmo=T.atmo;P.dens=T.dens*R(.7,1.3);
  P.moons=Math.round(R(0,2.6));P.giant=!!T.giant||r()<.15;
  P.aether=new THREE.Color().setHSL(r(),.8,.6).convertSRGBToLinear();
  P.aetherHex='#'+new THREE.Color().setHSL(P.aether?0:0,0,0).getHexString();
  P.species=genSpecies(P,r);
  return P;
}
function genSpecies(P,r){
  const n=3+(r()*2|0),out=[],bw=P.type.id==='barren'?['crawler','hex','crawler','quad']:BODIES;
  const baseHue=r();
  for(let i=0;i<n;i++){
    const body=bw[(r()*bw.length)|0];
    let size=body==='floater'?.8+r()*1.6:(r()<.18?3+r()*3:.6+r()*2);
    const tw=[3,3,2,1+P.tier],tt=tw.reduce((a,b)=>a+b);let x=r()*tt,ti=0;while(x>tw[ti]){x-=tw[ti];ti++}
    const temper=['docile','skittish','territorial','aggressive'][ti];
    const hue=(baseHue+(r()-.5)*.5+1)%1;
    const bc=new THREE.Color().setHSL(hue,.3+r()*.4,.22+r()*.3),ac=new THREE.Color().setHSL((hue+.45+r()*.1)%1,.65,.5),gc=new THREE.Color().setHSL((hue+.1+r()*.6)%1,.9,.6);
    const sp={idx:i,id:P.id+':'+i,body,size,temper,variant:r()<.5?0:1,
      name:SA[(r()*SA.length)|0]+SB[(r()*SB.length)|0],
      spd:(body==='crawler'?1.5:2.5)+r()*3.5,
      hp:Math.round(22*Math.pow(size,1.4)*(1+.35*P.tier)),
      dmg:Math.round((5+size*4)*(1+.25*P.tier)),
      aggro:temper==='skittish'?24:30+size*4,
      bc,ac,gc,glow:r()<.45,horns:r()<.5,spikes:r()<.4,eyes:1+(r()*3|0),tail:r()<.75,
      bio:Math.max(1,Math.round(size*2))};
    sp.name=sp.name[0].toUpperCase()+sp.name.slice(1).toLowerCase();
    out.push(sp);
  }
  return out;
}

/* ============ GAME STATE & UPGRADES ============ */
const RES={ferrite:{n:'Ferrite',col:'#e0904f',price:14},carbon:{n:'Carbon',col:'#aab4c6',price:18},aether:{n:'Aether Crystal',col:'#7df9ff',price:85},bio:{n:'Biomatter',col:'#8be36a',price:26}};
const UPG={
  shield:{n:'Aegis Shield',d:'Absorbs damage and recharges when you are out of combat.',base:140,mat:['ferrite','carbon'],eff:L=>`${40+20*(L-1)} shield · regen ${8+2*L}/s`},
  life:{n:'Life Support',d:'Bigger reserve and better hazard resistance on hostile worlds.',base:130,mat:['carbon','ferrite'],eff:L=>`${80+20*(L-1)} capacity · ×${(1+.25*(L-1)).toFixed(2)} resistance`},
  jet:{n:'Jetpack',d:'More fuel and stronger lift for crossing canyons and escaping creatures.',base:150,mat:['ferrite','carbon'],eff:L=>`${60+25*(L-1)} fuel · ${(10+(L-1)).toFixed(0)} m/s climb`},
  legs:{n:'Exo-Legs',d:'Faster walking, sprinting and higher jumps.',base:120,mat:['ferrite','bio'],eff:L=>`${(6+.5*(L-1)).toFixed(1)} walk · ${(10.5+1.1*(L-1)).toFixed(1)} sprint m/s`},
  beam:{n:'Mining Beam',d:'Cuts deposits faster, from further away, and wrings out more material.',base:160,mat:['ferrite','carbon'],eff:L=>`${22+12*(L-1)} dps · ${18+4*(L-1)} m · +${15*(L-1)}% yield`},
  blaster:{n:'Pulse Blaster',d:'Harder hits and a faster firing cycle for self-defence.',base:180,mat:['ferrite','bio'],eff:L=>`${14+7*(L-1)} dmg · ${(1/(.34-.03*(L-1))).toFixed(1)} shots/s`},
  scanner:{n:'Scanner',d:'Longer range, quicker scans and better data payouts.',base:170,mat:['carbon','bio'],eff:L=>`${50+20*(L-1)} m · ${(1.4/(1+.15*(L-1))).toFixed(1)}s scan · ×${(1+.25*(L-1)).toFixed(2)} pay`},
  tank:{n:'Fuel Tank',d:'Store more warp fuel for longer hops between stars.',base:150,mat:['ferrite','carbon'],eff:L=>`${100+50*(L-1)} fuel`},
  warp:{n:'Warp Drive',d:'Longer jump range and better fuel efficiency.',base:220,mat:['ferrite','carbon'],eff:L=>`${22+8*(L-1)} ly range · ${(1+.1*(L-1)).toFixed(1)}× efficiency`},
  cargo:{n:'Cargo Hold',d:'Carry more resources per trip.',base:130,mat:['ferrite','bio'],eff:L=>`${30+15*(L-1)} units`}
};
const MAXL=6;
const S={pos:new THREE.Vector3(),vel:new THREE.Vector3(),yaw:0,pitch:0,onGround:false,health:100,shield:40,life:80,jet:60,shieldT:0,hurtT:0,tool:1,
  credits:0,inv:{ferrite:0,carbon:0,aether:0,bio:0},upg:{shield:1,life:1,jet:1,legs:1,beam:1,blaster:1,scanner:1,tank:1,warp:1,cargo:1},fuel:100,
  planetId:0,visited:new Set([0]),codex:new Set(),surveyed:new Set(),flags:{},alive:true,scanP:0,scanKey:null,fireCd:0,lamp:false,bob:0,jetT:0,fallV:0};
let ST_=null;
function ST(){const u=S.upg;return{maxShield:40+20*(u.shield-1),shieldRegen:8+2*u.shield,maxLife:80+20*(u.life-1),lifeRes:1+.25*(u.life-1),maxJet:60+25*(u.jet-1),jetUp:10+(u.jet-1),
  walk:6+.5*(u.legs-1),sprint:10.5+1.1*(u.legs-1),jumpH:1.2+.3*(u.legs-1),beamDps:22+12*(u.beam-1),beamRange:18+4*(u.beam-1),yieldMul:1+.15*(u.beam-1),
  blDmg:14+7*(u.blaster-1),blCd:.34-.03*(u.blaster-1),scanRange:50+20*(u.scanner-1),scanTime:1.4/(1+.15*(u.scanner-1)),scanMul:1+.25*(u.scanner-1),
  maxFuel:100+50*(u.tank-1),warpRange:22+8*(u.warp-1),warpEff:1+.1*(u.warp-1),cargo:30+15*(u.cargo-1)}}
function recalc(){ST_=ST();S.shield=Math.min(S.shield,ST_.maxShield);S.life=Math.min(S.life,ST_.maxLife);S.jet=Math.min(S.jet,ST_.maxJet);S.fuel=Math.min(S.fuel,ST_.maxFuel)}
recalc();
const cargoUsed=()=>S.inv.ferrite+S.inv.carbon+S.inv.aether+S.inv.bio;
function upCost(k){const L=S.upg[k],u=UPG[k],c={credits:Math.round(u.base*Math.pow(L,1.75))};c[u.mat[0]]=2+3*L;c[u.mat[1]]=L;if(L>=3)c.aether=(L-2)*2;return c}
function canPay(c){for(const k in c){const have=k==='credits'?S.credits:S.inv[k];if(have<c[k])return false}return true}
function warpCost(g){const d=Math.hypot(g.x-GALAXY[S.planetId].x,g.y-GALAXY[S.planetId].y);return Math.ceil(d*1.5/ST_.warpEff)}
function warpDist(g){return Math.hypot(g.x-GALAXY[S.planetId].x,g.y-GALAXY[S.planetId].y)}

/* ============ RENDERER / SCENE ============ */
const canvas=$('gl');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(72,1,.15,9000);camera.rotation.order='YXZ';scene.add(camera);
scene.fog=new THREE.FogExp2(0x88aacc,.002);
const hemi=new THREE.HemisphereLight(0xffffff,0x444444,.8);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffffff,1.6);sun.castShadow=true;
sun.shadow.camera.left=-70;sun.shadow.camera.right=70;sun.shadow.camera.top=70;sun.shadow.camera.bottom=-70;sun.shadow.camera.near=1;sun.shadow.camera.far=420;
sun.shadow.bias=-.0004;sun.shadow.normalBias=.5;scene.add(sun);scene.add(sun.target);
const lamp=new THREE.SpotLight(0xdff4ff,0,90,.5,.6,1.4);lamp.position.set(0,-.1,0);camera.add(lamp);const lampT=new THREE.Object3D();lampT.position.set(0,0,-5);camera.add(lampT);lamp.target=lampT;

const GFX={low:{pr:.75,sh:1024,rad:3,mote:.4,label:'Low'},med:{pr:1,sh:2048,rad:3,mote:.7,label:'Medium'},high:{pr:0,sh:2048,rad:4,mote:1,label:'High (native)'},ultra:{pr:-1,sh:4096,rad:5,mote:1,label:'Ultra · 4K'}};
let gfxQ='high',VIEW_R=4;
function applyGfx(q){
  gfxQ=q;const G=GFX[q];VIEW_R=G.rad;
  sun.castShadow=q!=='low';
  sun.shadow.mapSize.set(G.sh,G.sh);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null}
  onResize();
  const lab=document.querySelectorAll('.gfxB');lab.forEach(b=>b.classList.toggle('sel',b.dataset.q===q));
  const t=`Rendering ${Math.round(innerWidth*curPR)}×${Math.round(innerHeight*curPR)} px. `+(q==='ultra'?'Ultra targets 3840 px wide (4K) and needs a strong GPU.':'If the game stutters, drop one level.');
  ['gfxNote','gfxNote2'].forEach(i=>{const e=$(i);if(e)e.textContent=t});
  if(W.P)setupMotes();
}
let curPR=1;
function onResize(){
  const G=GFX[gfxQ],dpr=window.devicePixelRatio||1;
  curPR=G.pr===0?Math.min(dpr,2):G.pr===-1?clamp(3840/innerWidth,1,3):G.pr;
  renderer.setPixelRatio(curPR);renderer.setSize(innerWidth,innerHeight);
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  const wc=$('warpCv');wc.width=innerWidth;wc.height=innerHeight;
}
addEventListener('resize',()=>{onResize();if(mode==='terminal'&&tab==='map')mapDraw()});

/* sky */
const skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
  uniforms:{top:{value:new THREE.Color()},hor:{value:new THREE.Color()},sunDir:{value:new THREE.Vector3(0,1,0)},sunCol:{value:new THREE.Color()},stars:{value:0},sunSize:{value:1}},
  vertexShader:'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`uniform vec3 top,hor,sunDir,sunCol;uniform float stars,sunSize;varying vec3 vDir;
  float h31(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
  void main(){vec3 d=normalize(vDir);float y=d.y;
   vec3 col=mix(hor,top,pow(clamp(y,0.,1.),.45));col=mix(col,hor*.7,smoothstep(0.,-.2,y));
   float sd=max(dot(d,sunDir),0.);col+=sunCol*(pow(sd,1500.)*14.+pow(sd,48.)*.3*sunSize+pow(sd,5.)*.1);
   if(stars>.01&&y>-.1){vec3 p=d*240.;vec3 c=floor(p);float h=h31(c);
     if(h>.982){vec3 f=fract(p)-.5;float m=smoothstep(.32,0.,length(f));col+=vec3(.85,.92,1.)*m*(.5+.5*sin(h*500.))*stars*(h-.982)*70.;}
     float band=exp(-pow(dot(d,normalize(vec3(.3,.8,.5))),2.)*22.);col+=vec3(.2,.24,.4)*band*.1*stars*(.5+h31(floor(d*35.)));}
   gl_FragColor=vec4(col,1.);
   #include <tonemapping_fragment>
   #include <encodings_fragment>
  }`});
const skyMesh=new THREE.Mesh(new THREE.SphereGeometry(5000,32,16),skyMat);skyMesh.renderOrder=-10;skyMesh.frustumCulled=false;scene.add(skyMesh);
const skyGroup=new THREE.Group();scene.add(skyGroup);

/* canvas textures */
function makeCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function tileNoiseTex(){
  const N=256,c=makeCanvas(N,N),x=c.getContext('2d'),img=x.createImageData(N,N),r=mulberry32(5),grids=[];
  for(const g of[8,16,32,64]){const a=new Float32Array(g*g);for(let i=0;i<a.length;i++)a[i]=r();grids.push([g,a])}
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){
    let v=0,amp=.5,tot=0;
    for(const[g,a]of grids){const fx=i/N*g,fy=j/N*g,x0=Math.floor(fx),y0=Math.floor(fy),tx=fx-x0,ty=fy-y0,sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty);
      const a00=a[(y0%g)*g+x0%g],a10=a[(y0%g)*g+(x0+1)%g],a01=a[((y0+1)%g)*g+x0%g],a11=a[((y0+1)%g)*g+(x0+1)%g];
      v+=(a00+(a10-a00)*sx+(a01-a00+(a11-a01-a10+a00)*sx)*sy)*amp;tot+=amp;amp*=.62}
    v=v/tot;const b=Math.round(clamp(.62+v*.5,0,1)*255),k=(j*N+i)*4;img.data[k]=img.data[k+1]=img.data[k+2]=b;img.data[k+3]=255;
  }
  x.putImageData(img,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;
}
const detailTex=tileNoiseTex();
const glowTex=(()=>{const c=makeCanvas(64,64),x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.3,'rgba(255,255,255,.35)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new THREE.CanvasTexture(c)})();
function moonTex(r,base){
  const c=makeCanvas(256,128),x=c.getContext('2d');x.fillStyle=base;x.fillRect(0,0,256,128);
  for(let i=0;i<260;i++){const rad=2+r()*r()*18;x.fillStyle=`rgba(${r()<.5?0:255},${r()<.5?0:255},${r()<.5?0:255},${.05+r()*.12})`;x.beginPath();x.arc(r()*256,r()*128,rad,0,6.3);x.fill()}
  return new THREE.CanvasTexture(c);
}
function giantTex(r,hue){
  const c=makeCanvas(256,128),x=c.getContext('2d');
  for(let j=0;j<128;j++){x.fillStyle=`hsl(${(hue*360+Math.sin(j*.21)*14+r()*8)%360},${40+Math.sin(j*.5)*18}%,${40+Math.sin(j*.13+1)*16+r()*6}%)`;x.fillRect(0,j,256,1)}
  for(let i=0;i<5;i++){x.fillStyle='rgba(255,255,255,.12)';x.beginPath();x.ellipse(r()*256,r()*128,20+r()*30,4+r()*6,0,0,6.3);x.fill()}
  return new THREE.CanvasTexture(c);
}

/* ============ WORLD ============ */
const W={P:null,height:null,chunks:new Map(),nodes:[],creatures:[],mined:new Set(),tod:.08,storm:0,landT:99,landed:true,motes:null,moteV:null,ship:null,time:0,spawnT:0,flame:null};
const H=(x,z)=>W.height(x,z);
const CS=96,SEG=48;
function setupHeight(P){
  const n1=makeNoise(P.seed|0),n2=makeNoise((P.seed+101)|0),n3=makeNoise((P.seed+202)|0);P.nCol=makeNoise((P.seed+303)|0);
  const A=P.amp,f=P.freq,rg=P.ridge,cr=P.type.craters,sd=P.seed&1023;
  function crater(x,z){
    const cs=110,cx=Math.floor(x/cs),cz=Math.floor(z/cs);let d=0;
    for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){
      const gx=cx+i,gz=cz+j;if(hash2(gx,gz,sd)<.5)continue;
      const px=(gx+hash2(gx,gz,sd+7))*cs,pz=(gz+hash2(gx,gz,sd+13))*cs,R=16+hash2(gx,gz,sd+29)*38,dd=Math.hypot(x-px,z-pz)/R;
      if(dd<1.5){d+=(dd<1?-(1-dd*dd)*R*.3:0)+Math.exp(-(dd-1)*(dd-1)*18)*R*.11}
    }
    return d;
  }
  const raw=(x,z)=>{
    const b=n1(x*f*.3,z*f*.3)*.7+n1(x*f*.6+17,z*f*.6-9)*.3;
    let hl=0,amp=1,fr=f,tot=0;for(let o=0;o<4;o++){hl+=n2(x*fr+o*31.7,z*fr-o*17.3)*amp;tot+=amp;amp*=.5;fr*=2.1}hl/=tot;
    let r2=1-Math.abs(n3(x*f*.7,z*f*.7));r2=r2*r2*r2;
    let h=(b*.65+hl*.3+(r2-.4)*rg)*A+n3(x*.18+5,z*.18)*.45;
    if(cr)h+=crater(x,z);
    return h;
  };
  const h0=raw(0,0);P.flatH=P.waterY>-1e8?Math.max(h0,P.waterY+2.4):h0;
  W.height=(x,z)=>{const d=Math.hypot(x,z),r=raw(x,z);if(d>=58)return r;return lerp(P.flatH,r,smooth(20,58,d))};
}

/* merged geometry builder */
const BG={};
(function(){
  const ni=g=>g.index?g.toNonIndexed():g;
  BG.cyl=ni(new THREE.CylinderGeometry(1,1,1,7,1).translate(0,.5,0));BG.cone=ni(new THREE.ConeGeometry(1,1,7,1).translate(0,.5,0));
  BG.ico=ni(new THREE.IcosahedronGeometry(1,0));BG.sph=ni(new THREE.SphereGeometry(1,8,6));BG.oct=ni(new THREE.OctahedronGeometry(1,0));
  BG.cone5=ni(new THREE.ConeGeometry(1,1,5,1).translate(0,.5,0));BG.dome=ni(new THREE.SphereGeometry(1,10,5,0,6.283,0,1.5708));
})();
const _m=new THREE.Matrix4(),_q=new THREE.Quaternion(),_e=new THREE.Euler(),_v=new THREE.Vector3(),_s=new THREE.Vector3(),_p=new THREE.Vector3(),_n=new THREE.Vector3();
class Builder{
  constructor(){this.p=[];this.n=[];this.c=[]}
  add(geo,x,y,z,sx,sy,sz,col,ry,rx,rz,tint){
    _e.set(rx||0,ry||0,rz||0);_q.setFromEuler(_e);_m.compose(_p.set(x,y,z),_q,_s.set(sx,sy,sz));
    const pa=geo.attributes.position.array,na=geo.attributes.normal.array,k=1+(tint||0);
    for(let i=0;i<pa.length;i+=3){
      _v.set(pa[i],pa[i+1],pa[i+2]).applyMatrix4(_m);this.p.push(_v.x,_v.y,_v.z);
      _n.set(na[i],na[i+1],na[i+2]).transformDirection(_m);this.n.push(_n.x,_n.y,_n.z);
      this.c.push(col.r*k,col.g*k,col.b*k);
    }
  }
  mesh(mat,cast){
    if(!this.p.length)return null;
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(this.p),3));g.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(this.n),3));g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(this.c),3));
    g.computeBoundingSphere();const m=new THREE.Mesh(g,mat);m.castShadow=!!cast;m.receiveShadow=true;m.matrixAutoUpdate=false;return m;
  }
}
const propMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85,metalness:0});
const glowMat=new THREE.MeshBasicMaterial({vertexColors:true});
const terrainMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.96,metalness:0,map:detailTex,bumpMap:detailTex,bumpScale:2.2});
const PROPS={
  tree(B,G,x,y,z,r,P,col){
    const h=3+r()*3.5,rd=.22+r()*.2;B.add(BG.cyl,x,y,z,rd,h,rd,P.flora[0],r()*6,0,0,(r()-.5)*.2);
    for(let i=0;i<3;i++){const s=2.3+r()*1.6-i*.5;B.add(BG.ico,x+(r()-.5)*1.4,y+h+i*1.1+.4,z+(r()-.5)*1.4,s,s*.8,s,r()<.5?P.flora[1]:P.flora[2],r()*6,r(),0,(r()-.5)*.25)}
    col.push([x,z,.7]);
  },
  pine(B,G,x,y,z,r,P,col){
    const h=5+r()*4;B.add(BG.cyl,x,y,z,.28,h*.5,.28,P.flora[0],0);
    for(let i=0;i<4;i++){const s=2.8-i*.55+r()*.3;B.add(BG.cone,x,y+1.3+i*h*.19,z,s,h*.34,s,i%2?P.flora[1]:P.flora[2],r()*6,0,0,(r()-.5)*.2)}col.push([x,z,.6]);
  },
  palm(B,G,x,y,z,r,P,col){
    const h=5+r()*3,lean=(r()-.5)*.5,ry=r()*6;let cx=x,cy=y,cz=z;const dx=Math.cos(ry)*lean,dz=Math.sin(ry)*lean;
    for(let i=0;i<5;i++){B.add(BG.cyl,cx,cy,cz,.26-i*.02,h/5+.1,.26-i*.02,P.flora[0],0,dz*.9,-dx*.9);cx+=dx*h/5;cz+=dz*h/5;cy+=h/5}
    for(let i=0;i<7;i++){const a=i/7*6.283+r()*.3;B.add(BG.cone5,cx,cy,cz,.5,3.4,.12,i%2?P.flora[1]:P.flora[2],a,0,1.25+r()*.3,0)}
    col.push([x,z,.5]);
  },
  cactus(B,G,x,y,z,r,P,col){
    const h=2+r()*3;B.add(BG.cyl,x,y,z,.4,h,.4,P.flora[1],0);B.add(BG.sph,x,y+h,z,.4,.4,.4,P.flora[1],0);
    for(let i=0;i<2;i++){if(r()<.3)continue;const s=i?1:-1,ah=h*(.3+r()*.25),al=.8+r()*1.2;B.add(BG.cyl,x+s*.8,y+ah,z,.25,al,.25,P.flora[2],0);B.add(BG.cyl,x+s*.4,y+ah,z,.5,.2,.2,P.flora[2],0,0,s*1.57)}
    col.push([x,z,.55]);
  },
  mushroom(B,G,x,y,z,r,P,col){
    const h=1.5+r()*r()*7,cap=1+h*.4+r()*.8,glow=P.type.id==='fungal';
    B.add(BG.cyl,x,y,z,.22+h*.06,h,.22+h*.06,P.flora[0],0);
    (glow?G:B).add(BG.dome,x,y+h*.95,z,cap,cap*.6,cap,r()<.5?P.flora[1]:P.flora[2],0,0,0,glow?0:(r()-.5)*.2);
    col.push([x,z,.35+h*.06]);
  },
  tendril(B,G,x,y,z,r,P,col){
    const h=2.5+r()*4;let cx=x,cz=z;const a=r()*6,l=(r()-.5)*.35;
    for(let i=0;i<4;i++){B.add(BG.cone5,cx,y+i*h/4,cz,.22-i*.04,h/4+.3,.22-i*.04,P.flora[0],0,Math.sin(a)*l*i,Math.cos(a)*l*i);cx+=Math.cos(a)*l*h/4;cz+=Math.sin(a)*l*h/4}
    G.add(BG.sph,cx,y+h,cz,.3,.3,.3,P.flora[r()<.5?1:2],0);
  },
  crystal(B,G,x,y,z,r,P,col){
    const n=3+(r()*4|0),c1=P.flora[1],c2=P.flora[2];
    for(let i=0;i<n;i++){const h=1.5+r()*r()*7,w=.35+h*.12,a=r()*6,tl=.35*i/n;
      G.add(BG.cone5,x+Math.cos(a)*.8*r(),y-.3,z+Math.sin(a)*.8*r(),w,h,w,(r()<.5?c1:c2),a,Math.sin(a)*tl,Math.cos(a)*tl,(r()-.5)*.5)}
    col.push([x,z,1.1]);
  },
  spire(B,G,x,y,z,r,P,col){
    const h=6+r()*12,w=1.4+r()*1.4,c=P.palC[4];B.add(BG.cone,x,y-1,z,w,h,w,c,r()*6,0,0,(r()-.5)*.3);
    if(r()<.6)B.add(BG.cone,x+w*.9,y-1,z+w*.4,w*.6,h*.55,w*.6,c,r()*6,0,0,.1);col.push([x,z,w*.7]);
  },
  rock(B,G,x,y,z,r,P,col){
    const s=.7+r()*r()*3.4;B.add(BG.ico,x,y+s*.25,z,s*(.8+r()*.6),s*(.5+r()*.5),s*(.8+r()*.6),P.palC[4],r()*6,r()*.4,r()*.4,(r()-.5)*.3);if(s>1.2)col.push([x,z,s*.8]);
  },
  deadtree(B,G,x,y,z,r,P,col){
    const h=3+r()*3;B.add(BG.cyl,x,y,z,.2,h,.2,P.flora[0],0,(r()-.5)*.2,(r()-.5)*.2);
    for(let i=0;i<3;i++){const a=r()*6;B.add(BG.cyl,x,y+h*(.5+i*.15),z,.09,1.4+r(),.09,P.flora[1],a,0,.9)}col.push([x,z,.4]);
  }
};
function pickWeighted(list,r){let t=0;for(const l of list)t+=l[1];let x=r()*t;for(const l of list){if(x<l[1])return l[0];x-=l[1]}return list[0][0]}

/* resource nodes */
const nodeGeo={ico:new THREE.IcosahedronGeometry(1,0),oct:new THREE.OctahedronGeometry(1,0),cone:new THREE.ConeGeometry(1,1,5,1).translate(0,.5,0)};
let nodeMats={};
function setupNodeMats(P){
  nodeMats={ferrite:new THREE.MeshStandardMaterial({color:C('#b0663a'),roughness:.45,metalness:.7,flatShading:true}),
    carbon:new THREE.MeshStandardMaterial({color:C('#1c1f26'),roughness:.25,metalness:.4,emissive:C('#1a2a40'),flatShading:true}),
    aether:new THREE.MeshStandardMaterial({color:P.aether,emissive:P.aether,emissiveIntensity:1.6,roughness:.2,flatShading:true}),
    glow:new THREE.SpriteMaterial({map:glowTex,color:P.aether,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:.8,fog:false})};
}
function makeNode(type,x,y,z,r){
  const g=new THREE.Group();g.position.set(x,y,z);
  if(type==='ferrite'){for(let i=0;i<3;i++){const m=new THREE.Mesh(nodeGeo.ico,nodeMats.ferrite),s=.6+r()*.7;m.scale.set(s,s*.8,s);m.position.set((r()-.5)*1.6,s*.5,(r()-.5)*1.6);m.rotation.set(r()*3,r()*3,0);m.castShadow=true;g.add(m)}}
  else if(type==='carbon'){for(let i=0;i<4;i++){const m=new THREE.Mesh(nodeGeo.oct,nodeMats.carbon),s=.4+r()*.5;m.scale.set(s*.7,s*1.6,s*.7);m.position.set((r()-.5)*1.4,s*.8,(r()-.5)*1.4);m.rotation.set((r()-.5)*.6,r()*3,(r()-.5)*.6);m.castShadow=true;g.add(m)}}
  else{for(let i=0;i<4;i++){const m=new THREE.Mesh(nodeGeo.cone,nodeMats.aether),s=.3+r()*.35;m.scale.set(s,s*(3+r()*3),s);m.position.set((r()-.5)*1.2,0,(r()-.5)*1.2);m.rotation.set((r()-.5)*.7,r()*3,(r()-.5)*.7);g.add(m)}
    const sp=new THREE.Sprite(nodeMats.glow);sp.scale.set(7,7,1);sp.position.y=1.4;g.add(sp)}
  scene.add(g);return g;
}

/* chunk construction */
function buildChunk(cx,cz){
  const P=W.P,N=SEG,cell=CS/N,x0=cx*CS,z0=cz*CS,M=N+3,Hh=new Float32Array(M*M);
  for(let j=0;j<M;j++)for(let i=0;i<M;i++)Hh[j*M+i]=H(x0+(i-1)*cell,z0+(j-1)*cell);
  const V=(N+1)*(N+1),pos=new Float32Array(V*3),nor=new Float32Array(V*3),col=new Float32Array(V*3),uv=new Float32Array(V*2),idx=new Uint16Array(N*N*6);
  const pal=P.palA,A=P.amp,wy=P.waterY,wc=P.waterCol;
  let k=0;
  for(let j=0;j<=N;j++)for(let i=0;i<=N;i++,k++){
    const hi=(j+1)*M+i+1,h=Hh[hi],x=x0+i*cell,z=z0+j*cell;
    let nx=Hh[hi-1]-Hh[hi+1],nz=Hh[hi-M]-Hh[hi+M],ny=2*cell;const l=Math.hypot(nx,ny,nz);nx/=l;ny/=l;nz/=l;
    pos[k*3]=x;pos[k*3+1]=h;pos[k*3+2]=z;nor[k*3]=nx;nor[k*3+1]=ny;nor[k*3+2]=nz;uv[k*2]=x/7;uv[k*2+1]=z/7;
    const hn=h/A,nv=P.nCol(x*.013,z*.013),nf=P.nCol(x*.31+9,z*.31);
    const t1=smooth(-.2,.15,hn+nv*.12),t2=smooth(.15,.55,hn+nv*.15);
    let r=pal[1][0],g=pal[1][1],b=pal[1][2];
    r=lerp(r,pal[2][0],t1);g=lerp(g,pal[2][1],t1);b=lerp(b,pal[2][2],t1);
    r=lerp(r,pal[3][0],t2);g=lerp(g,pal[3][1],t2);b=lerp(b,pal[3][2],t2);
    const sh=wy>-1e8?smooth(wy+2.4,wy+.3,h):0;r=lerp(r,pal[0][0],sh);g=lerp(g,pal[0][1],sh);b=lerp(b,pal[0][2],sh);
    const rk=smooth(.1,.34,1-ny+nf*.04);r=lerp(r,pal[4][0],rk);g=lerp(g,pal[4][1],rk);b=lerp(b,pal[4][2],rk);
    let br=1+nf*.14+nv*.07;
    if(wc&&h<wy){const u=smooth(wy,wy-7,h);r=lerp(r,wc.r*.5,u*.6);g=lerp(g,wc.g*.5,u*.6);b=lerp(b,wc.b*.5,u*.6)}
    col[k*3]=r*br;col[k*3+1]=g*br;col[k*3+2]=b*br;
  }
  let q=0;for(let j=0;j<N;j++)for(let i=0;i<N;i++){const a=j*(N+1)+i,b=a+1,c=a+N+1,d=c+1;idx[q++]=a;idx[q++]=c;idx[q++]=b;idx[q++]=b;idx[q++]=c;idx[q++]=d}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(nor,3));geo.setAttribute('color',new THREE.BufferAttribute(col,3));geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));geo.setIndex(new THREE.BufferAttribute(idx,1));geo.computeBoundingSphere();
  const terrain=new THREE.Mesh(geo,terrainMat);terrain.receiveShadow=true;terrain.castShadow=true;terrain.matrixAutoUpdate=false;scene.add(terrain);
  const ch={key:cx+','+cz,cx,cz,terrain,meshes:[terrain],nodes:[],cols:[],objs:[]};
  /* props */
  const r=mulberry32(hash2(cx,cz,P.seed)*4294967296|0),B=new Builder(),G=new Builder(),n=Math.round(26*P.dens);
  for(let i=0;i<n;i++){
    const x=x0+r()*CS,z=z0+r()*CS;if(x*x+z*z<30*30)continue;
    const h=H(x,z);if(h<P.waterY+.5)continue;
    if(Math.abs(H(x+1.5,z)-h)>1.1||Math.abs(H(x,z+1.5)-h)>1.1)continue;
    PROPS[pickWeighted(P.type.veg,r)](B,G,x,h-.1,z,r,P,ch.cols);
  }
  const pm=B.mesh(propMat,true),gm=G.mesh(glowMat,false);
  if(pm){scene.add(pm);ch.meshes.push(pm)}if(gm){scene.add(gm);ch.meshes.push(gm)}
  /* resource nodes */
  const nn=r()<.5?1:r()<.5?2:0;
  for(let i=0;i<nn;i++){
    const key=cx+'_'+cz+'_'+i;if(W.mined.has(key))continue;
    const x=x0+8+r()*(CS-16),z=z0+8+r()*(CS-16);if(x*x+z*z<28*28)continue;const h=H(x,z);if(h<P.waterY+.4)continue;
    const t=r(),type=t<.42?'ferrite':t<.76-.02*P.tier?'carbon':'aether';
    const obj=makeNode(type,x,h-.1,z,r);
    const nd={type,key,hp:type==='aether'?140:type==='ferrite'?90:100,max:type==='aether'?140:type==='ferrite'?90:100,pos:new THREE.Vector3(x,h+1,z),r:1.7,obj,ch,seed:r()};
    ch.nodes.push(nd);W.nodes.push(nd);
  }
  W.chunks.set(ch.key,ch);return ch;
}
function removeChunk(ch){
  for(const m of ch.meshes){scene.remove(m);m.geometry.dispose()}
  for(const n of ch.nodes){scene.remove(n.obj);const i=W.nodes.indexOf(n);if(i>=0)W.nodes.splice(i,1)}
  W.chunks.delete(ch.key);
}
function streamChunks(budget){
  const cx=Math.floor(S.pos.x/CS),cz=Math.floor(S.pos.z/CS),R=VIEW_R;let built=0;
  const need=[];
  for(let j=-R;j<=R;j++)for(let i=-R;i<=R;i++){const d=Math.hypot(i,j);if(d<=R+.3&&!W.chunks.has((cx+i)+','+(cz+j)))need.push([d,cx+i,cz+j])}
  need.sort((a,b)=>a[0]-b[0]);
  for(const nd of need){if(built>=budget)break;buildChunk(nd[1],nd[2]);built++}
  for(const ch of[...W.chunks.values()])if(Math.hypot(ch.cx-cx,ch.cz-cz)>R+1.6)removeChunk(ch);
  return need.length-built;
}
function nearCols(x,z,fn){const cx=Math.floor(x/CS),cz=Math.floor(z/CS);for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const ch=W.chunks.get((cx+i)+','+(cz+j));if(ch)for(const c of ch.cols)fn(c)}}

/* water */
const waterGeo=new THREE.PlaneGeometry(9000,9000).rotateX(-Math.PI/2);
const waterTex=detailTex.clone();waterTex.needsUpdate=true;waterTex.wrapS=waterTex.wrapT=THREE.RepeatWrapping;waterTex.repeat.set(1500,1500);
const waterMesh=new THREE.Mesh(waterGeo,new THREE.MeshStandardMaterial({color:0x2060a0,transparent:true,opacity:.8,roughness:.12,metalness:.25,bumpMap:waterTex,bumpScale:.6,depthWrite:false}));
waterMesh.renderOrder=2;scene.add(waterMesh);

/* sky objects (moons, giant) */
function setupSkyObjects(P){
  while(skyGroup.children.length){const o=skyGroup.children.pop();o.geometry&&o.geometry.dispose()}
  const r=mulberry32(P.seed+55);
  for(let i=0;i<P.moons;i++){
    const rad=60+r()*180,m=new THREE.Mesh(new THREE.SphereGeometry(rad,24,16),new THREE.MeshStandardMaterial({map:moonTex(r,['#8a8a90','#a89a88','#7a8090'][i%3]),roughness:1,fog:false,emissive:0x101216}));
    const az=r()*6.28,el=.2+r()*.8;m.position.set(Math.cos(az)*Math.cos(el),Math.sin(el),Math.sin(az)*Math.cos(el)).multiplyScalar(4200);skyGroup.add(m);
  }
  if(P.giant){
    const hue=r(),rad=520+r()*300,gm=new THREE.Mesh(new THREE.SphereGeometry(rad,40,24),new THREE.MeshStandardMaterial({map:giantTex(r,hue),roughness:1,fog:false,emissive:0x0c0c10}));
    const dir=new THREE.Vector3(Math.cos(1.1),.45,Math.sin(1.1)).normalize().multiplyScalar(3900);gm.position.copy(dir);gm.rotation.z=.4;skyGroup.add(gm);
    const rg=new THREE.RingGeometry(rad*1.35,rad*2.3,80),uv=rg.attributes.uv,pp=rg.attributes.position;
    for(let i=0;i<pp.count;i++)uv.setXY(i,(Math.hypot(pp.getX(i),pp.getY(i))-rad*1.35)/(rad*.95),.5);
    const c=makeCanvas(128,2),x=c.getContext('2d');for(let i=0;i<128;i++){x.fillStyle=`rgba(210,190,160,${(.25+.5*Math.abs(Math.sin(i*.4)*Math.cos(i*.11)))*(i<8||i>118?.3:1)})`;x.fillRect(i,0,1,2)}
    const rm=new THREE.Mesh(rg,new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,side:THREE.DoubleSide,fog:false,depthWrite:false}));
    rm.position.copy(dir);rm.rotation.set(1.25,.2,.4);skyGroup.add(rm);
  }
}

/* motes (ambient particles) */
let moteCfg=null;
function setupMotes(){
  if(W.motes){scene.remove(W.motes);W.motes.geometry.dispose();W.motes.material.dispose();W.motes=null}
  const P=W.P;if(!P)return;moteCfg=MOTES[P.type.mote];const n=Math.round(moteCfg.n*GFX[gfxQ].mote);if(!n)return;
  const g=new THREE.BufferGeometry(),pos=new Float32Array(n*3);W.moteV=new Float32Array(n*3);
  for(let i=0;i<n;i++){pos[i*3]=(Math.random()-.5)*80;pos[i*3+1]=Math.random()*30;pos[i*3+2]=(Math.random()-.5)*80;W.moteV[i*3]=(Math.random()-.5);W.moteV[i*3+1]=(Math.random()-.5);W.moteV[i*3+2]=(Math.random()-.5)}
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  W.motes=new THREE.Points(g,new THREE.PointsMaterial({color:C(moteCfg.c),size:moteCfg.s,sizeAttenuation:true,transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending}));
  W.motes.frustumCulled=false;scene.add(W.motes);
}
