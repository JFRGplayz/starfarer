/* ============ AUDIO ============ */
let AC=null,master=null,mineOsc=null,mineGain=null,windGain=null,muted=false;
function audioInit(){
  if(AC)return;
  try{
    AC=new(window.AudioContext||window.webkitAudioContext)();master=AC.createGain();master.gain.value=.4;master.connect(AC.destination);
    mineOsc=AC.createOscillator();mineOsc.type='sawtooth';mineOsc.frequency.value=95;mineGain=AC.createGain();mineGain.gain.value=0;
    const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=700;mineOsc.connect(f);f.connect(mineGain);mineGain.connect(master);mineOsc.start();
    const buf=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    const ns=AC.createBufferSource();ns.buffer=buf;ns.loop=true;const wf=AC.createBiquadFilter();wf.type='bandpass';wf.frequency.value=380;wf.Q.value=.6;windGain=AC.createGain();windGain.gain.value=0;ns.connect(wf);wf.connect(windGain);windGain.connect(master);ns.start();
  }catch(e){AC=null}
}
function tone(f,d,type,v,slide){
  if(!AC||muted)return;
  try{const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);
  if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),t+d);g.gain.setValueAtTime(v||.2,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(master);o.start(t);o.stop(t+d)}catch(e){}
}
const SFX={shot(){tone(900,.15,'square',.12,-700)},hit(){tone(180,.12,'sawtooth',.15,-100)},pick(){tone(660,.1,'sine',.18,300);setTimeout(()=>tone(990,.12,'sine',.15),70)},
  hurt(){tone(120,.25,'sawtooth',.25,-60)},scan(){tone(1300,.05,'sine',.07)},done(){tone(520,.12,'triangle',.2);setTimeout(()=>tone(780,.12,'triangle',.2),100);setTimeout(()=>tone(1040,.2,'triangle',.2),200)},
  warp(){tone(80,2.8,'sawtooth',.25,500)},jet(){tone(140,.06,'sawtooth',.03,-40)},buy(){tone(440,.08,'square',.12);setTimeout(()=>tone(880,.15,'square',.12),80)},err(){tone(150,.15,'square',.12)}};

/* ============ EFFECTS ============ */
const PN=900,pGeo=new THREE.BufferGeometry(),pPos=new Float32Array(PN*3).fill(-1e5),pCol=new Float32Array(PN*3),pBase=new Float32Array(PN*3),pVel=new Float32Array(PN*3),pLife=new Float32Array(PN),pMax=new Float32Array(PN).fill(1);
pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3));pGeo.setAttribute('color',new THREE.BufferAttribute(pCol,3));
const pPts=new THREE.Points(pGeo,new THREE.PointsMaterial({size:.32,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true}));pPts.frustumCulled=false;scene.add(pPts);
let pI=0;
function burst(p,n,col,spd,life,up){
  for(let k=0;k<n;k++){const i=pI;pI=(pI+1)%PN;pPos[i*3]=p.x;pPos[i*3+1]=p.y;pPos[i*3+2]=p.z;
    const a=Math.random()*6.283,b=Math.random()*2-1,s=spd*(.3+Math.random()*.7),q=Math.sqrt(1-b*b);
    pVel[i*3]=Math.cos(a)*q*s;pVel[i*3+1]=b*s+(up||0);pVel[i*3+2]=Math.sin(a)*q*s;pLife[i]=pMax[i]=life*(.6+Math.random()*.6);pBase[i*3]=col.r;pBase[i*3+1]=col.g;pBase[i*3+2]=col.b}
}
function fxUpdate(dt){
  const g=W.P?9.8*W.P.gravity*.5:4;
  for(let i=0;i<PN;i++){if(pLife[i]<=0)continue;pLife[i]-=dt;
    if(pLife[i]<=0){pPos[i*3+1]=-1e5;pCol[i*3]=pCol[i*3+1]=pCol[i*3+2]=0;continue}
    pVel[i*3+1]-=g*dt;pPos[i*3]+=pVel[i*3]*dt;pPos[i*3+1]+=pVel[i*3+1]*dt;pPos[i*3+2]+=pVel[i*3+2]*dt;
    const f=pLife[i]/pMax[i];pCol[i*3]=pBase[i*3]*f;pCol[i*3+1]=pBase[i*3+1]*f;pCol[i*3+2]=pBase[i*3+2]*f}
  pGeo.attributes.position.needsUpdate=true;pGeo.attributes.color.needsUpdate=true;
}
const beamGeo=new THREE.CylinderGeometry(1,1,1,6,1,true).rotateX(Math.PI/2).translate(0,0,.5);
function makeBeam(c){const m=new THREE.Mesh(beamGeo,new THREE.MeshBasicMaterial({color:C(c),transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));m.visible=false;m.frustumCulled=false;scene.add(m);return m}
function setBeam(m,a,b,rad){m.position.copy(a);m.lookAt(b);m.scale.set(rad,rad,a.distanceTo(b));m.visible=true}
const mineBeam=makeBeam('#5dff9a'),tracers=[0,1,2,3].map(()=>({m:makeBeam('#52d6ff'),t:0}));

/* ============ SHIP ============ */
function buildShip(P){
  const g=new THREE.Group(),hullG=new THREE.Group();g.add(hullG);
  const hm=new THREE.MeshStandardMaterial({color:C('#cdd6e2'),metalness:.65,roughness:.35}),am=new THREE.MeshStandardMaterial({color:C('#ff8a3d'),metalness:.4,roughness:.5}),dk=new THREE.MeshStandardMaterial({color:C('#2a3140'),metalness:.6,roughness:.5});
  const pts=[[0,-6],[.7,-5.7],[1.4,-4.2],[1.8,-1],[1.7,2],[1.25,4.5],[.6,6],[0,6.6]].map(p=>new THREE.Vector2(p[0],p[1]));
  const hull=new THREE.Mesh(new THREE.LatheGeometry(pts,28),hm);hull.rotation.x=Math.PI/2;hull.scale.set(1,1,.75);hull.castShadow=true;hull.receiveShadow=true;hullG.add(hull);
  const glass=new THREE.Mesh(new THREE.SphereGeometry(1,16,10),new THREE.MeshStandardMaterial({color:0x0a1830,emissive:0x0a3a66,metalness:.9,roughness:.08}));glass.scale.set(.95,.55,1.8);glass.position.set(0,.85,2.6);hullG.add(glass);
  for(const s of[-1,1]){
    const w=new THREE.Mesh(new THREE.BoxGeometry(5.2,.14,3.4),am);w.position.set(s*3.4,-.1,-1.6);w.rotation.set(0,s*.45,s*-.05);w.castShadow=true;hullG.add(w);
    const e=new THREE.Mesh(new THREE.CylinderGeometry(.6,.75,2.4,14).rotateX(Math.PI/2),dk);e.position.set(s*1.5,-.1,-5.2);e.castShadow=true;hullG.add(e);
    const d=new THREE.Mesh(new THREE.CircleGeometry(.55,14),new THREE.MeshBasicMaterial({color:0x66ddff}));d.position.set(s*1.5,-.1,-6.42);d.rotation.y=Math.PI;hullG.add(d);
    const fin=new THREE.Mesh(new THREE.BoxGeometry(.12,1.6,2),am);fin.position.set(s*4.9,.5,-2.8);fin.rotation.z=s*.2;hullG.add(fin);
    for(const z of[-3.5,2]){const l=new THREE.Mesh(new THREE.CylinderGeometry(.1,.14,2.1,6),dk);l.position.set(s*1.1,-1.35,z);l.rotation.z=s*.28;l.castShadow=true;hullG.add(l);
      const f=new THREE.Mesh(new THREE.CylinderGeometry(.5,.55,.12,10),dk);f.position.set(s*1.55,-2.4,z);hullG.add(f)}
  }
  const fl=new THREE.Mesh(new THREE.ConeGeometry(.9,1,10).rotateX(-Math.PI/2).translate(0,0,-.5),new THREE.MeshBasicMaterial({color:0x66b8ff,transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false}));
  const fl2=fl.clone();fl.position.set(-1.5,-.1,-6.5);fl2.position.set(1.5,-.1,-6.5);hullG.add(fl);hullG.add(fl2);
  const pad=new THREE.Mesh(new THREE.CylinderGeometry(10,10.4,.3,40),new THREE.MeshStandardMaterial({color:C('#2b323c'),metalness:.5,roughness:.6}));pad.position.y=.05;pad.receiveShadow=true;g.add(pad);
  const ring=new THREE.Mesh(new THREE.RingGeometry(8.4,8.9,48).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x52d6ff}));ring.position.y=.22;g.add(ring);
  g.userData={hullG,flames:[fl,fl2]};hullG.position.y=2.4;g.position.set(0,P.flatH,0);g.rotation.y=.6;
  scene.add(g);return g;
}

/* ============ CREATURES ============ */
const CG={sph:new THREE.SphereGeometry(1,14,10),cone:new THREE.ConeGeometry(1,1,7,1).translate(0,.5,0),hang:new THREE.CylinderGeometry(1,1,1,7,1).translate(0,-.5,0),dome:new THREE.SphereGeometry(1,16,8,0,6.283,0,1.5708)};
function mk(geo,mat,sx,sy,sz,x,y,z,parent){const m=new THREE.Mesh(geo,mat);m.scale.set(sx,sy,sz);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m}
function addLeg(parent,x,y,z,len,th,mat,ph,amp,legs,side,out){
  const hip=new THREE.Group();hip.position.set(x,y,z);parent.add(hip);if(side)hip.rotation.z=side*(out||0);
  mk(CG.hang,mat,th,len*.5,th,0,0,0,hip);const knee=new THREE.Group();knee.position.y=-len*.5;hip.add(knee);
  mk(CG.hang,mat,th*.8,len*.55,th*.8,0,0,0,knee);mk(CG.sph,mat,th*1.2,th*.8,th*1.5,0,-len*.55,th*.4,knee);legs.push({hip,knee,ph,amp});
}
function buildCreature(sp){
  if(!sp.mats){sp.mats={body:new THREE.MeshStandardMaterial({color:C('#ffffff').copy(sp.bc).convertSRGBToLinear(),roughness:.7,emissive:sp.glow?sp.gc.clone().multiplyScalar(.12):0x000000}),
    acc:new THREE.MeshStandardMaterial({color:sp.ac.clone().convertSRGBToLinear(),roughness:.5,emissive:sp.glow?sp.gc.clone().multiplyScalar(.5):0x000000}),
    eye:new THREE.MeshBasicMaterial({color:sp.gc.clone().multiplyScalar(2)})}}
  const M=sp.mats,s=sp.size,root=new THREE.Group(),model=new THREE.Group();root.add(model);const legs=[];let tick=null,hover=0;
  const eyes=(x,y,z,sc)=>{for(let i=0;i<sp.eyes;i++){const sd=i%2?1:-1,row=(i/2)|0;mk(CG.sph,M.eye,.05*sc,.05*sc,.05*sc,sd*(.11-row*.04)*sc,y+row*.07*sc,z+row*.02*sc,model)}};
  const b=sp.body;
  if(b==='quad'||b==='strider'){
    const tall=b==='strider',ll=(tall?1.7:.55)*s,by=ll+(tall?.15:.3)*s,k=tall?.7:1;
    mk(CG.sph,M.body,.42*s*k,.38*s*k,.75*s*k,0,by,0,model);
    let hy=by+(tall?.95:.2)*s,hz=(tall?.7:.85)*s;
    if(tall){for(let i=1;i<=3;i++)mk(CG.sph,M.body,.1*s,.1*s,.1*s,0,by+i*.28*s,.2*s+i*.17*s,model)}
    mk(CG.sph,M.body,.26*s,.24*s,.32*s,0,hy,hz,model);mk(CG.sph,M.acc,.15*s,.13*s,.18*s,0,hy-.05*s,hz+.28*s,model);eyes(0,hy+.07*s,hz+.2*s,s*1.6);
    if(sp.horns)for(const sd of[-1,1]){const h=mk(CG.cone,M.acc,.07*s,.4*s,.07*s,sd*.15*s,hy+.18*s,hz-.05*s,model);h.rotation.z=-sd*.5;h.rotation.x=-.3}
    if(sp.spikes)for(let i=0;i<5;i++)mk(CG.cone,M.acc,.07*s,.22*s,.07*s,0,by+.36*s*k,(-.5+i*.25)*s*k,model);
    if(sp.tail){const t=mk(CG.cone,M.body,.14*s,.9*s,.14*s,0,by+.05*s,-.7*s,model);t.rotation.x=-1.9}
    const lt=tall?.06*s:.09*s;
    [[-1,1],[1,1],[-1,-1],[1,-1]].forEach((q,i)=>addLeg(model,q[0]*.28*s*k,by-.15*s,q[1]*.4*s*k,ll,lt,M.body,i%3===0?0:Math.PI,.7,legs));
    sp.hgt=hy+.3*s;
  }else if(b==='biped'){
    const ll=.9*s,ty=ll+.55*s;
    const tor=mk(CG.sph,M.body,.36*s,.58*s,.38*s,0,ty,0,model);tor.rotation.x=.3;
    const hy=ty+.7*s;mk(CG.sph,M.body,.24*s,.22*s,.28*s,0,hy,.2*s,model);mk(CG.sph,M.acc,.12*s,.1*s,.16*s,0,hy-.05*s,.45*s,model);eyes(0,hy+.06*s,.38*s,s*1.5);
    if(sp.horns)for(const sd of[-1,1]){const h=mk(CG.cone,M.acc,.06*s,.3*s,.06*s,sd*.12*s,hy+.2*s,.1*s,model);h.rotation.z=-sd*.4}
    if(sp.spikes)for(let i=0;i<4;i++)mk(CG.cone,M.acc,.07*s,.2*s,.07*s,0,ty+(.35-i*.2)*s,-.28*s,model);
    if(sp.tail){const t=mk(CG.cone,M.body,.14*s,1*s,.14*s,0,ty-.35*s,-.2*s,model);t.rotation.x=-2}
    for(const sd of[-1,1]){addLeg(model,sd*.2*s,ll,0,ll,.1*s,M.body,sd>0?0:Math.PI,.8,legs);addLeg(model,sd*.42*s,ty+.3*s,.1*s,.7*s,.06*s,M.acc,sd>0?Math.PI:0,.6,legs)}
    sp.hgt=hy+.3*s;
  }else if(b==='hex'){
    const ll=.4*s,by=ll+.2*s;
    mk(CG.sph,M.body,.45*s,.35*s,.7*s,0,by,-.35*s,model);mk(CG.sph,M.acc,.3*s,.26*s,.35*s,0,by+.02*s,.45*s,model);mk(CG.sph,M.body,.2*s,.2*s,.22*s,0,by+.02*s,.85*s,model);eyes(0,by+.1*s,.98*s,s*1.4);
    for(const sd of[-1,1]){const m=mk(CG.cone,M.acc,.05*s,.3*s,.05*s,sd*.1*s,by-.05*s,1*s,model);m.rotation.x=1.9;m.rotation.z=sd*.3}
    if(sp.spikes)for(let i=0;i<4;i++)mk(CG.cone,M.acc,.06*s,.2*s,.06*s,0,by+.3*s,(-.7+i*.22)*s,model);
    [.45,.05,-.4].forEach((z,i)=>{for(const sd of[-1,1])addLeg(model,sd*.25*s,by-.05*s,z*s,ll*1.5,.05*s,M.body,(i%2?0:Math.PI)+(sd>0?0:Math.PI),.6,legs,sd,.95)});
    sp.hgt=by+.6*s;
  }else if(b==='floater'){
    hover=2.2+s;const tents=[],wings=[];
    if(sp.variant===0){
      const d=mk(CG.dome,M.acc,.8*s,.6*s,.8*s,0,0,0,model);mk(CG.sph,M.eye,.35*s,.25*s,.35*s,0,.05*s,0,model);
      for(let i=0;i<7;i++){const a=i/7*6.283,t=new THREE.Group();t.position.set(Math.cos(a)*.55*s,0,Math.sin(a)*.55*s);model.add(t);mk(CG.hang,M.body,.04*s,(.9+(i%3)*.3)*s,.04*s,0,0,0,t);tents.push({t,ph:i});}
      eyes(0,.1*s,.7*s,s*1.4);
    }else{
      mk(CG.sph,M.body,.9*s,.14*s,.6*s,0,0,0,model);mk(CG.sph,M.acc,.3*s,.2*s,.4*s,0,.05*s,.5*s,model);eyes(0,.1*s,.6*s,s*1.2);
      for(const sd of[-1,1]){const w=new THREE.Group();w.position.set(sd*.5*s,0,0);model.add(w);mk(CG.sph,M.acc,.9*s,.05*s,.5*s,sd*.8*s,0,0,w);wings.push({w,sd})}
      const t=mk(CG.cone,M.body,.06*s,1.2*s,.06*s,0,0,-.5*s,model);t.rotation.x=-1.6;
    }
    tick=(c,t)=>{tents.forEach(o=>{o.t.rotation.x=Math.sin(t*2+o.ph)*.25;o.t.rotation.z=Math.cos(t*1.7+o.ph)*.25});wings.forEach(o=>{o.w.rotation.z=o.sd*Math.sin(t*3.5)*.5})};
    sp.hgt=hover+.8*s;
  }else{
    const n=6+(s>2?2:0),segs=[];
    for(let i=0;i<n;i++){const r=(.38-i*.03)*s,m=mk(CG.sph,i%2?M.body:M.acc,r,r*.9,r*1.1,0,r,-i*.55*s*.8,model);segs.push(m)}
    mk(CG.sph,M.body,.34*s,.3*s,.38*s,0,.34*s,.5*s,model);eyes(0,.46*s,.7*s,s*1.4);
    for(const sd of[-1,1]){const m=mk(CG.cone,M.acc,.05*s,.3*s,.05*s,sd*.14*s,.25*s,.8*s,model);m.rotation.x=1.9}
    if(sp.spikes)segs.forEach((m,i)=>mk(CG.cone,M.acc,.06*s,.2*s,.06*s,0,.34*s*(1-i*.05)+.12*s,-i*.44*s,model));
    tick=(c,t,mv)=>{segs.forEach((m,i)=>{m.position.x=Math.sin(t*3-i*.7)*.25*s*(.3+mv)})};
    sp.hgt=.8*s;
  }
  root.traverse(o=>{if(o.isMesh)o.castShadow=true});
  return{root,model,legs,tick,hover};
}
function spawnCreature(sp,x,z){
  const y=H(x,z),b=buildCreature(sp),c={sp,root:b.root,model:b.model,legs:b.legs,tick:b.tick,hover:b.hover,x,z,y,heading:Math.random()*6.28,state:'idle',tx:x,tz:z,timer:Math.random()*3,hp:sp.hp,dead:false,deadT:0,provoked:0,cd:0,lunge:0,phase:Math.random()*6,mv:0,t:Math.random()*10};
  c.root.position.set(x,y+c.hover,z);scene.add(c.root);W.creatures.push(c);return c;
}
function trySpawn(minD,maxD){
  const P=W.P,a=Math.random()*6.283,d=minD+Math.random()*(maxD-minD),x=S.pos.x+Math.cos(a)*d,z=S.pos.z+Math.sin(a)*d;
  if(Math.hypot(x,z)<35)return;const sp=P.species[(Math.random()*P.species.length)|0];
  if(sp.body!=='floater'&&H(x,z)<P.waterY+.3)return;spawnCreature(sp,x,z);
}
function removeCreature(c){scene.remove(c.root);const i=W.creatures.indexOf(c);if(i>=0)W.creatures.splice(i,1)}
function updateCreatures(dt){
  const P=W.P;W.spawnT-=dt;
  if(W.spawnT<=0){W.spawnT=.7;if(W.creatures.length<P.maxCreatures)trySpawn(60,140)}
  for(const c of[...W.creatures]){
    const sp=c.sp;c.t+=dt;
    if(c.dead){c.deadT+=dt;c.model.rotation.z=Math.min(1.5,c.deadT*3);c.root.position.y=lerp(c.root.position.y,c.y+(c.hover?0:0),dt*3);if(c.deadT>7)removeCreature(c);continue}
    const dx=S.pos.x-c.x,dz=S.pos.z-c.z,d=Math.hypot(dx,dz);
    if(d>240){removeCreature(c);continue}
    const live=mode==='play'&&S.alive;
    c.provoked=Math.max(0,c.provoked-dt);c.cd-=dt;c.timer-=dt;
    let st=c.state;
    if(live){
      if(sp.temper==='aggressive'&&d<sp.aggro)st='chase';
      else if(sp.temper==='territorial'&&(c.provoked>0||d<sp.aggro*.35))st='chase';
      else if(sp.temper==='skittish'&&d<sp.aggro*.85)st='flee';
      else if(sp.temper==='docile'&&c.provoked>0)st='flee';
      else if(st==='chase'||st==='flee'){if(d>sp.aggro*1.6||c.provoked<=0&&sp.temper!=='aggressive'&&sp.temper!=='skittish')st='idle'}
    }else if(st==='chase'||st==='flee')st='idle';
    if(st==='chase'&&d>sp.aggro*1.6&&sp.temper==='aggressive')st='idle';
    if(st==='idle'||st==='wander'){if(c.timer<=0){if(Math.random()<.5){st='idle';c.timer=1+Math.random()*3}else{st='wander';c.timer=3+Math.random()*5;const a=Math.random()*6.28,r=8+Math.random()*18;c.tx=c.x+Math.cos(a)*r;c.tz=c.z+Math.sin(a)*r}}}
    c.state=st;
    let tx=c.tx,tz=c.tz,spd=0;
    if(st==='chase'){tx=S.pos.x;tz=S.pos.z;spd=sp.spd*1.15}else if(st==='flee'){tx=c.x-dx;tz=c.z-dz;spd=sp.spd*1.2}else if(st==='wander')spd=sp.spd*.35;
    const reach=sp.size*.9+1.6;
    if(st==='chase'&&d<reach*.8)spd=0;
    if(spd>0){
      const want=Math.atan2(tx-c.x,tz-c.z);let df=want-c.heading;while(df>Math.PI)df-=6.283;while(df<-Math.PI)df+=6.283;c.heading+=df*Math.min(1,dt*5);
      const step=spd*dt,nx=c.x+Math.sin(c.heading)*step,nz=c.z+Math.cos(c.heading)*step,gh=H(nx,nz);
      if(sp.body!=='floater'&&(gh<P.waterY-.2||Math.abs(gh-c.y)>step*1.5+.3)){c.heading+=1.6;c.timer=0;spd=0}else{c.x=nx;c.z=nz}
    }
    c.mv+=(((spd>0)?1:0)-c.mv)*Math.min(1,dt*6);
    const gy=H(c.x,c.z);c.y+=(gy-c.y)*Math.min(1,dt*10);
    c.phase+=dt*(2.5+spd*1.6/Math.pow(sp.size,.35));
    for(const l of c.legs){l.hip.rotation.x=Math.sin(c.phase+l.ph)*l.amp*c.mv;l.knee.rotation.x=Math.max(0,-Math.sin(c.phase+l.ph+1.2))*l.amp*1.1*c.mv}
    let by=0;if(c.hover)by=c.hover+Math.sin(c.t*1.3)*.4;
    c.lunge=Math.max(0,c.lunge-dt*3);
    c.model.position.z=Math.sin(c.lunge*3.14)*sp.size*.5;c.model.position.y=c.legs.length?Math.abs(Math.sin(c.phase))*.04*sp.size*c.mv:0;
    c.model.rotation.z=0;c.root.position.set(c.x,c.y+by,c.z);c.root.rotation.y=c.heading;
    if(c.tick)c.tick(c,c.t,c.mv);
    if(live&&st==='chase'&&d<reach&&Math.abs(S.pos.y-c.y)<4+(c.hover||0)&&c.cd<=0){c.cd=1.3;c.lunge=1;hurt(sp.dmg*(.8+Math.random()*.4),c)}
  }
}
function damageCreature(c,dmg){
  if(c.dead)return;c.hp-=dmg;c.provoked=8;SFX.hit();
  burst(new THREE.Vector3(c.x,c.y+(c.hover||0)+c.sp.size*.6,c.z),6,C('#ff6a4a'),4,.5);
  if(c.hp<=0){c.dead=true;c.state='dead';const t=addRes('bio',c.sp.bio);const cr=Math.round(8*c.sp.size*(1+.3*W.P.tier));S.credits+=cr;toast(`${S.codex.has(c.sp.id)?c.sp.name:'Lifeform'} neutralised · +${cr} cr${t?' · +'+t+' Biomatter':''}`,'good')}
}

/* ============ PLAYER ============ */
const keys={};
let mode='title',noLock=false,mouseL=false,mouseR=false,tab='map',termMode='ship';

// SHIP FLIGHT
const flight={
  active:false,
  speed:0,
  verticalSpeed:0,
  turnSpeed:1.5,
  acceleration:12,
  maxSpeed:35,
  landed:true
};

function hurt(n,src,pierce){
  if(mode!=='play'||!S.alive)return;
  S.hurtT=0;S.shieldT=4;
  if(!pierce&&S.shield>0){const a=Math.min(S.shield,n);S.shield-=a;n-=a}
  S.health-=n;SFX.hurt();$('fx').style.opacity=Math.min(1,.4+n/30);setTimeout(()=>$('fx').style.opacity=0,200);
  if(S.health<=0)die();
}
function die(){
  S.alive=false;S.health=0;show('death');mouseL=false;SFX.warp();
  setTimeout(()=>{S.credits=Math.floor(S.credits*.8);S.health=100;S.shield=ST_.maxShield;S.life=ST_.maxLife;S.jet=ST_.maxJet;S.alive=true;
    S.pos.set(10,H(10,9)+.1,9);S.vel.set(0,0,0);hide('death');for(const c of W.creatures)c.provoked=0},2600);
}
function toast(msg,kind){
  const t=document.createElement('div');t.className='toast '+(kind||'');t.textContent=msg;const box=$('toasts');box.appendChild(t);while(box.children.length>4)box.removeChild(box.firstChild);setTimeout(()=>t.remove(),4200);
}
function addRes(k,n){const room=ST_.cargo-cargoUsed(),t=Math.max(0,Math.min(n,room));if(t<n)toast('Cargo hold full — sell at your ship','warn');S.inv[k]+=t;if(t){SFX.pick()}return t}
const _d=new THREE.Vector3(),_o=new THREE.Vector3(),_t=new THREE.Vector3(),_t2=new THREE.Vector3();
function raySphere(o,d,c,r){const mx=o.x-c.x,my=o.y-c.y,mz=o.z-c.z,b=mx*d.x+my*d.y+mz*d.z,cc=mx*mx+my*my+mz*mz-r*r;if(cc>0&&b>0)return-1;const di=b*b-cc;if(di<0)return-1;const t=-b-Math.sqrt(di);return t<0?0:t}
function rayTerrain(o,d,max){let prev=0;for(let t=1;t<max;t+=Math.max(1.5,t*.02)){const x=o.x+d.x*t,y=o.y+d.y*t,z=o.z+d.z*t;if(y<H(x,z)){let a=prev,b=t;for(let i=0;i<5;i++){const m=(a+b)/2;if(o.y+d.y*m<H(o.x+d.x*m,o.z+d.z*m))b=m;else a=m}return b}prev=t}return-1}
function computeAim(){
  camera.getWorldDirection(_d);_o.copy(camera.position);
  let bt=180,res=null;const tt=rayTerrain(_o,_d,180);if(tt>0)bt=tt;
  for(const c of W.creatures){if(c.dead)continue;_t.set(c.x,c.y+(c.hover||0)+c.sp.size*.6,c.z);const t=raySphere(_o,_d,_t,c.sp.size*.75+.4);if(t>=0&&t<bt){bt=t;res={type:'creature',obj:c,dist:t}}}
  for(const n of W.nodes){const t=raySphere(_o,_d,n.pos,n.r);if(t>=0&&t<bt){bt=t;res={type:'node',obj:n,dist:t}}}
  S.aimT=bt;return res;
}
function updatePlayer(dt){
  const P=W.P,u=ST_,g=9.8*P.gravity;
  if(keys.ArrowLeft)S.yaw+=1.9*dt;if(keys.ArrowRight)S.yaw-=1.9*dt;if(keys.ArrowUp)S.pitch=Math.min(1.5,S.pitch+1.6*dt);if(keys.ArrowDown)S.pitch=Math.max(-1.5,S.pitch-1.6*dt);
  const sy=Math.sin(S.yaw),cy=Math.cos(S.yaw),f=(keys.KeyW?1:0)-(keys.KeyS?1:0),sd=(keys.KeyD?1:0)-(keys.KeyA?1:0);
  let wx=-sy*f+cy*sd,wz=-cy*f-sy*sd;const wl=Math.hypot(wx,wz);if(wl>0){wx/=wl;wz/=wl}
  const inW=P.waterY>-1e8&&S.pos.y<P.waterY-.3;
  let sp=(keys.ShiftLeft||keys.ShiftRight)?u.sprint:u.walk;if(inW)sp*=.55;
  const ac=S.onGround?45:7,tx=wx*sp,tz=wz*sp,k=Math.min(1,ac*dt);
  S.vel.x+=(tx-S.vel.x)*k;S.vel.z+=(tz-S.vel.z)*k;
  if(S.jumpReq&&S.onGround){S.vel.y=Math.sqrt(2*9.8*u.jumpH);S.onGround=false;S.jumpT=.25}S.jumpReq=false;
  S.jumpT=Math.max(0,(S.jumpT||0)-dt);
  if(keys.Space&&!S.onGround&&S.jumpT<=0&&S.jet>0){S.vel.y=Math.min(S.vel.y+(g+13)*dt,u.jetUp);S.jet-=24*dt;S.jetT=.5;if(Math.random()<.5)burst(_t.set(S.pos.x,S.pos.y+.2,S.pos.z),1,C('#ffb060'),3,.35);if(Math.random()<.2)SFX.jet()}
  else if(S.onGround){S.jetT-=dt;if(S.jetT<=0)S.jet=Math.min(u.maxJet,S.jet+30*dt)}
  S.vel.y-=g*dt;if(S.vel.y<-60)S.vel.y=-60;
  const ox=S.pos.x,oz=S.pos.z,oy=S.pos.y;
  S.pos.x+=S.vel.x*dt;S.pos.z+=S.vel.z*dt;S.pos.y+=S.vel.y*dt;
  nearCols(S.pos.x,S.pos.z,c=>{const dx=S.pos.x-c[0],dz=S.pos.z-c[1],r=c[2]+.4,d=Math.hypot(dx,dz);if(d<r&&d>.001){S.pos.x=c[0]+dx/d*r;S.pos.z=c[1]+dz/d*r}});
  const sd2=Math.hypot(S.pos.x,S.pos.z);if(sd2<7.2&&S.pos.y<W.ship.position.y+4){S.pos.x*=7.2/sd2;S.pos.z*=7.2/sd2}
  let gh=H(S.pos.x,S.pos.z);
  const step=Math.hypot(S.pos.x-ox,S.pos.z-oz);
  if(S.onGround&&step>.001&&(gh-oy)/step>1.2){S.pos.x=ox;S.pos.z=oz;S.vel.x=S.vel.z=0;gh=H(ox,oz)}
  if(S.pos.y<=gh){
    if(!S.onGround&&S.vel.y<-14){const dmg=(-S.vel.y-14)*3.2;hurt(dmg,null,true);}
    if(!S.onGround&&S.vel.y<-5)burst(_t.set(S.pos.x,gh+.1,S.pos.z),8,C('#bbaa99'),3,.6);
    S.pos.y=gh;S.vel.y=Math.max(0,S.vel.y);S.onGround=true;
  }else if(S.pos.y>gh+.15)S.onGround=false;
  if(S.onGround&&step>.01){S.bob+=step*1.5;if(Math.floor(S.bob/3.1416)!==Math.floor((S.bob-step*1.5)/3.1416))tone(70+Math.random()*30,.05,'triangle',.05)}
  /* env */
  S.hurtT+=dt;S.shieldT-=dt;
  if(P.lava&&S.pos.y<P.waterY+.4){hurt(26*dt,null,true);if(Math.random()<.1)toast('LAVA!','bad')}
  const nearShip=Math.hypot(S.pos.x,S.pos.z)<14&&W.landed;
  const drain=(P.hazard!=='none'&&P.hazLevel>0)?P.hazLevel*.9/u.lifeRes:0;
  if(nearShip){S.life=Math.min(u.maxLife,S.life+40*dt);S.jet=Math.min(u.maxJet,S.jet+60*dt);S.health=Math.min(100,S.health+20*dt)}
  else S.life=Math.max(0,S.life-drain*dt);
  if(S.life<=0&&drain>0){S.health-=3*dt;S.hurtT=0;if(S.health<=0)die();if(Math.random()<.01)toast('LIFE SUPPORT DEPLETED — press R to recharge','bad')}
  if(S.shieldT<=0)S.shield=Math.min(u.maxShield,S.shield+u.shieldRegen*dt);
  if(S.hurtT>8&&S.life>0)S.health=Math.min(100,S.health+1.5*dt);
}
function recharge(){
  if(S.inv.carbon<1){toast('No Carbon to burn for life support','warn');SFX.err();return}
  if(S.life>=ST_.maxLife-1){toast('Life support already full');return}
  S.inv.carbon--;S.life=Math.min(ST_.maxLife,S.life+35);SFX.buy();
}
/* viewmodel */
const gun=new THREE.Group(),gunBody=new THREE.Mesh(new THREE.BoxGeometry(.08,.1,.5),new THREE.MeshStandardMaterial({color:0x3a4252,metalness:.8,roughness:.35})),gunTip=new THREE.Mesh(new THREE.CylinderGeometry(.03,.04,.2,8).rotateX(Math.PI/2),new THREE.MeshBasicMaterial({color:0x5dff9a})),muzzle=new THREE.Object3D();
gunTip.position.z=-.34;muzzle.position.z=-.46;gun.add(gunBody,gunTip,muzzle);gun.position.set(.24,-.22,-.45);camera.add(gun);
gunBody.renderOrder=gunTip.renderOrder=5;
function updateCombat(dt,aim){
  const fire=(mouseL||keys.KeyF)&&S.alive;S.fireCd-=dt;let mining=false;
  gunTip.material.color.set(S.tool===1?0x5dff9a:0x52d6ff);
  gun.position.z+=((-.45)-gun.position.z)*Math.min(1,dt*14);
  if(fire&&S.tool===1){
    const u=ST_;camera.updateMatrixWorld();muzzle.getWorldPosition(_t);
    let end;
    if(aim&&aim.dist<=u.beamRange){
      end=_t2.copy(_o).addScaledVector(_d,aim.dist);mining=true;
      if(aim.type==='node'){const n=aim.obj;n.hp-=u.beamDps*dt;n.obj.position.y+=Math.sin(performance.now()*.05)*.003;burst(end,1,C(RES[n.type].col),3,.4);if(n.hp<=0)harvest(n)}
      else{damageCreatureBeam(aim.obj,u.beamDps*.35*dt)}
    }else end=_t2.copy(_o).addScaledVector(_d,Math.min(S.aimT,u.beamRange));
    setBeam(mineBeam,_t,end,.02+Math.random()*.012);
    if(mineGain&&!muted)mineGain.gain.value=aim&&aim.dist<=u.beamRange?.07:.03;
  }else{mineBeam.visible=false;if(mineGain)mineGain.gain.value=0}
  if(fire&&S.tool===2&&S.fireCd<=0){
    S.fireCd=ST_.blCd;gun.position.z=-.36;camera.updateMatrixWorld();muzzle.getWorldPosition(_t);
    const dist=aim&&aim.dist<150?aim.dist:Math.min(S.aimT,150);_t2.copy(_o).addScaledVector(_d,dist);
    const tr=tracers.find(x=>x.t<=0)||tracers[0];setBeam(tr.m,_t,_t2,.035);tr.t=.07;SFX.shot();burst(_t2,5,C('#9eeaff'),4,.4);
    if(aim&&aim.type==='creature'&&aim.dist<150)damageCreature(aim.obj,ST_.blDmg);
  }
  for(const tr of tracers){if(tr.t>0){tr.t-=dt;if(tr.t<=0)tr.m.visible=false}}
}
let beamHitT=0;
function damageCreatureBeam(c,d){c.hp-=d;c.provoked=8;beamHitT-=d;if(beamHitT<0){beamHitT=3;SFX.hit()}if(c.hp<=0){c.hp=.01;damageCreature(c,1)}}
function harvest(n){
  scene.remove(n.obj);W.mined.add(n.key);const i=W.nodes.indexOf(n);if(i>=0)W.nodes.splice(i,1);const j=n.ch.nodes.indexOf(n);if(j>=0)n.ch.nodes.splice(j,1);
  const base=n.type==='aether'?1+Math.floor(n.seed*3):4+Math.floor(n.seed*5),amt=Math.max(1,Math.round(base*ST_.yieldMul)),t=addRes(n.type,amt);
  burst(n.pos,24,C(RES[n.type].col),7,.9,3);S.flags.mined=true;if(t)toast(`+${t} ${RES[n.type].n}`,'good');
}
function updateScan(dt,aim){
  const ok=keys.KeyQ&&aim&&(aim.type==='creature'||aim.type==='node')&&aim.dist<=ST_.scanRange&&S.alive;
  if(!keys.KeyQ)S.scanDone=null;
  if(ok&&aim.obj!==S.scanDone){
    if(S.scanKey!==aim.obj){S.scanKey=aim.obj;S.scanP=0}
    S.scanP+=dt/ST_.scanTime;if(Math.random()<.3)SFX.scan();
    if(S.scanP>=1){S.scanP=0;S.scanDone=aim.obj;finishScan(aim)}
  }else if(!ok){S.scanP=0;S.scanKey=null}
}
function finishScan(a){
  SFX.done();
  if(a.type==='creature'){
    const sp=a.obj.sp;
    if(!S.codex.has(sp.id)){
      S.codex.add(sp.id);S.flags.scanned=true;const cr=Math.round((70+sp.size*25)*(1+.5*W.P.tier)*ST_.scanMul);S.credits+=cr;toast(`Discovered: ${sp.name} · +${cr} cr`,'good');
      const P=W.P;if(P.species.every(s=>S.codex.has(s.id))&&!S.surveyed.has(P.id)){S.surveyed.add(P.id);const b=Math.round(250*(1+.5*P.tier));S.credits+=b;setTimeout(()=>toast(`${P.name} fully surveyed · +${b} cr`,'good'),900)}
      saveGame();
    }else toast(`${sp.name} already catalogued`);
  }else toast(`${RES[a.obj.type].n} deposit · ${Math.ceil(a.obj.hp/a.obj.max*100)}% intact`);
}
function interact(){
  if(Math.hypot(S.pos.x,S.pos.z)<14&&W.landed){openTerminal('ship')}
}
/* ============ SKY / LIGHT ============ */
const sunDir=new THREE.Vector3(),tmpTop=new THREE.Color(),tmpHor=new THREE.Color(),tmpSS=new THREE.Color(),tmpC=new THREE.Color();
function updateSky(dt){
  const P=W.P;if(!P)return;W.time+=dt;
  W.tod=(W.tod+dt/P.dayLen)%1;const a=W.tod*6.2832;sunDir.set(Math.cos(a),Math.sin(a)*Math.cos(P.tilt),Math.sin(a)*Math.sin(P.tilt)).normalize();
  const el=sunDir.y,vac=P.atmo<.1,day=vac?1:smooth(-.14,.22,el),dusk=vac?0:Math.exp(-Math.pow(el*4.5,2));
  W.storm=P.type.storm*clamp(Math.sin(W.time*.025+P.seed)+Math.sin(W.time*.067+2)*.7-.3,0,1);
  if(vac){tmpTop.setRGB(0,0,0);tmpHor.setRGB(0,0,.002)}
  else{tmpTop.copy(P.nTop).lerp(P.skyTop,day);tmpHor.copy(P.nHor).lerp(P.skyHor,day);tmpSS.setRGB(1,.3,.1);tmpHor.lerp(tmpSS,dusk*.55*P.atmo);tmpTop.lerp(tmpSS,dusk*.1);
    if(W.storm>0){tmpC.copy(P.skyHor).multiplyScalar(.6);tmpTop.lerp(tmpC,W.storm*.5*day);tmpHor.lerp(tmpC,W.storm*.5*day)}}
  const u=skyMat.uniforms;u.top.value.copy(tmpTop);u.hor.value.copy(tmpHor);u.sunDir.value.copy(sunDir);u.sunCol.value.copy(P.sunCol);u.stars.value=vac?1:clamp(1-day*1.4,0,1);u.sunSize.value=vac?0:1;
  skyMesh.position.copy(camera.position);skyGroup.position.copy(camera.position);
  const tx=Math.round(S.pos.x),tz=Math.round(S.pos.z);sun.target.position.set(tx,S.pos.y,tz);sun.position.set(tx+sunDir.x*200,S.pos.y+sunDir.y*200,tz+sunDir.z*200);
  sun.color.copy(P.sunCol).lerp(tmpSS.setRGB(1,.55,.3),dusk*.6);sun.intensity=P.sunI*(vac?2.4:1.7)*smooth(-.04,.25,el)*(1-W.storm*.5);
  hemi.color.copy(tmpHor).lerp(tmpTop,.5).multiplyScalar(vac?1:1.4).addScalar(vac?0:.02);hemi.groundColor.copy(P.palC[2]).multiplyScalar(.35);
  hemi.intensity=vac?.07:lerp(.16,1,day)*(.55+.45*P.atmo);
  scene.fog.color.copy(tmpHor);scene.fog.density=P.fog*(1+W.storm*2.4);
  const cy=S.pos.y+1.7,uw=P.waterY>-1e8&&cy<P.waterY;
  if(uw){scene.fog.color.copy(P.waterCol).multiplyScalar(.4);scene.fog.density=.045}
  $('uw').style.opacity=uw?1:0;
  /* water */
  if(P.waterY>-1e8){waterMesh.visible=true;waterMesh.position.set(camera.position.x,P.waterY,camera.position.z);waterTex.offset.set(camera.position.x/6+W.time*.07,-camera.position.z/6+W.time*.04)}
  else waterMesh.visible=false;
  /* motes */
  if(W.motes){
    const pos=W.motes.geometry.attributes.position.array,v=W.moteV,n=pos.length/3,R=40,mc=moteCfg,wind=(mc.dr*(1+W.storm*3)),px=camera.position.x,py=camera.position.y,pz=camera.position.z;
    for(let i=0;i<n;i++){const k=i*3;pos[k]+=(v[k]*.8+wind*(mc.dr>3?.9:.2))*dt;pos[k+1]+=(v[k+1]*.4+mc.vy)*dt;pos[k+2]+=(v[k+2]*.8+wind*(mc.dr>3?.4:.1))*dt;
      if(pos[k]-px>R)pos[k]-=2*R;else if(pos[k]-px<-R)pos[k]+=2*R;if(pos[k+1]-py>R*.6)pos[k+1]-=R*1.2;else if(pos[k+1]-py<-R*.6)pos[k+1]+=R*1.2;if(pos[k+2]-pz>R)pos[k+2]-=2*R;else if(pos[k+2]-pz<-R)pos[k+2]+=2*R}
    W.motes.geometry.attributes.position.needsUpdate=true;W.motes.material.opacity=(mc.c==='#ffffff'?.9:.45+.4*(1-day))*(1+W.storm*.4);
  }
}
/* ============ WORLD LOAD ============ */
function loadWorld(g,land){
  for(const ch of[...W.chunks.values()])removeChunk(ch);
  for(const c of[...W.creatures])removeCreature(c);
  if(W.ship){scene.remove(W.ship);W.ship=null}
  W.mined=new Set();const P=planetOf(g);W.P=P;
  P.nTop=P.skyTop.clone().multiplyScalar(.03).add(new THREE.Color(.002,.004,.014));P.nHor=P.skyHor.clone().multiplyScalar(.05).add(new THREE.Color(.002,.003,.01));
  setupHeight(P);setupNodeMats(P);
  const wm=waterMesh.material;
  if(P.waterCol){wm.color.copy(P.waterCol);wm.emissive.setRGB(0,0,0);wm.opacity=.8;wm.roughness=.12;
    if(P.lava){wm.emissive.copy(P.waterCol);wm.emissiveIntensity=1.4;wm.opacity=1;wm.roughness=.9}
    else if(P.type.glowWater){wm.emissive.copy(P.waterCol).multiplyScalar(.35);wm.emissiveIntensity=1;wm.opacity=.88}
    else if(P.type.ice){wm.opacity=.97;wm.roughness=.25}
    wm.needsUpdate=true}
  W.tod=.07+hash2(g.id,3,3)*.05;W.time=0;W.storm=0;W.spawnT=0;
  setupSkyObjects(P);setupMotes();
  W.ship=buildShip(P);
  S.pos.set(10,P.flatH,9);S.yaw=Math.atan2(10,9);S.pitch=-.05;S.vel.set(0,0,0);S.onGround=true;
  streamChunks(1e9);
  const n=Math.round(P.maxCreatures*.6);for(let i=0;i<n;i++)trySpawn(40,150);
  W.landT=99;
  W.landed=true;
  flight.active=false;
  flight.speed=0;
  flight.verticalSpeed=0;
  flight.landed=true;
  S.planetId=g.id;S.visited.add(g.id);
  if(!land){W.ship.userData.hullG.position.y=2.4;W.ship.userData.flames.forEach(f=>f.visible=false)}
  lastObj='';
}
function updateShip(dt){
  if(!W.ship)return;

  const fl=W.ship.userData.flames;

  if(!flight.active){
    fl.forEach(f=>f.visible=false);
  }
}
