// Headless smoke test: runs full game runs with stubbed DOM/WebGL and real three.js math.
// Usage: npm install && npm test
const fs=require('fs');const assert=require('assert');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const src='(()=>{'+html.split(/<script>\r?\n\(\(\)=>\{/)[1].split('</script>')[0];
const mkStub=()=>{const f=function(){return mkStub();};return new Proxy(f,{get(t,k){
  if(k==='getBoundingClientRect')return()=>({width:390,height:800});
  if(k===Symbol.toPrimitive)return()=>0;
  if(k==='classList')return {add(){},remove(){},toggle(){},contains(){return false}};
  if(k==='style')return {setProperty(){}};
  if(k in t)return t[k];
  return mkStub();},set(t,k,v){t[k]=v;return true;}});};
const els={};
global.document={querySelector:s=>els[s]||(els[s]=mkStub()),createElement:()=>mkStub(),createTextNode:()=>mkStub(),addEventListener(){},hidden:false,documentElement:{}};
global.getComputedStyle=()=>({getPropertyValue:()=>'#888'});
global.matchMedia=()=>({addEventListener(){},matches:false});
global.localStorage={_d:{},getItem(k){return this._d[k]||null},setItem(k,v){this._d[k]=v}};
global.addEventListener=()=>{};global.performance={now:()=>Date.now()};
global.requestAnimationFrame=()=>{};global.setTimeout=f=>{f();return 0;};
let api;let T0=Date.now();
class FakeAC{constructor(){this.state='running';this.sampleRate=100;this.destination=mkStub();}get currentTime(){return (Date.now()-T0)/1000;}
 createGain(){return mkStub()}createOscillator(){return mkStub()}createBiquadFilter(){return mkStub()}createBufferSource(){return mkStub()}createDynamicsCompressor(){return mkStub()}
 createBuffer(){return {getChannelData:()=>new Float32Array(200)}}resume(){}}
let ivs=[];global.setInterval=f=>{ivs.push(f);return ivs.length};global.clearInterval=()=>{};
const THREE=require('three');class FakeRen{constructor(){this.domElement={style:{},remove(){}};this.shadowMap={};this.calls=0;}setPixelRatio(){}setSize(){}render(s,c){this.calls++;s.updateMatrixWorld();c.updateMatrixWorld();}}
THREE.WebGLRenderer=FakeRen;global.screen={width:390,height:800};
global.window={__SJ_TEST:a=>api=a,AudioContext:FakeAC,THREE,devicePixelRatio:2};
eval(src);api.audioInit&&api.audioInit();
// --- old saves keep working (shape from before quests existed) ---
api.setDate('2026-10-14T12:00:00');
api.setSave({silver:500,mods:['plow'],caps:['sarge','greta'],maps:['dust','iron'],cleared:{dust:true},settings:{sound:false},selMap:'iron',selCap:'greta',runs:5,stage:4,level:18,wins:1});
{const S=api.SAVE;assert.strictEqual(S.selMap,'iron');assert.strictEqual(S.selCap,'greta');assert.strictEqual(S.settings.sound,false);assert.strictEqual(S.settings.music,true);
 assert.deepStrictEqual(S.best,{time:0,gold:0,bosses:0});assert.ok(S.daily&&S.ms&&S.ms.prog&&S.ms.done);
 api.openGarage();api.renderGarage();
 assert.strictEqual(S.daily.ids.length,3);assert.strictEqual(new Set(S.daily.ids).size,3);
 assert.ok(S.ms.done.m_dust,'Greenvale already cleared -> milestone done on garage open');assert.strictEqual(S.silver,800);assert.ok(!S.ms.done.m_iron);}
// --- dailies rotate by date and are stable within a day ---
{const a=api.SAVE.daily.ids.join();api.ensureDaily();assert.strictEqual(api.SAVE.daily.ids.join(),a);
 api.setDate('2026-10-15T08:00:00');assert.ok(api.ensureDaily());const b=api.SAVE.daily.ids.join();assert.strictEqual(api.SAVE.daily.date,'2026-10-15');
 let differs=false;for(let d=16;d<22;d++){api.setDate('2026-10-'+d+'T08:00:00');api.ensureDaily();if(api.SAVE.daily.ids.join()!==b)differs=true;}assert.ok(differs,'dailies rotate');
 api.setDate('2026-10-14T12:00:00');api.ensureDaily();}
// --- a killed app keeps quest progress from its last snapshot ---
{api.SAVE.selMap='dust';api.startRun();const G=api.G;G.rs.eat.scrap=40;G.p.kills=7;api.snapshotRun();
 const raw=JSON.parse(localStorage.getItem('scrapjaw-v1'));assert.ok(raw.pendingRun);const before=api.SAVE.ms.prog.m_scrap||0;
 api.setSave(raw);assert.strictEqual(api.SAVE.ms.prog.m_scrap,before+40);assert.ok(!api.SAVE.pendingRun);}
// fresh save for the gameplay runs
api.setSave({});api.setDate(null);
function run(map,cap,god){
  api.SAVE.selMap=map;api.SAVE.selCap=cap;api.openGarage();api.renderGarage();api.startRun();
  let t=0;
  for(let i=0;i<60*700;i++){
    const G=api.G;
    if(api.mode==='play'){api.joy.dx=Math.cos(t*0.3);api.joy.dy=Math.sin(t*0.5);api.update(1/60);t+=1/60;if(i%20===0){api.render();ivs.forEach(f=>f());}
      if(god){G.p.hp=Math.max(G.p.hp,G.p.maxHp*0.5);if(G.boss)G.boss.hp-=3;}}
    else if(api.mode==='level'||api.mode==='boss')api.pick(Math.floor(Math.random()*3));
    else break;
  }
  const G=api.G;const e=G.rs.eat,k=G.rs.kill;
  assert.ok(['over','title','garage'].includes(api.mode)||t>0);assert.ok(!G.rs.on||api.mode==='play','run stats closed at end');
  console.log('  eaten',JSON.stringify(e),'killed',JSON.stringify(k),'gold',Math.floor(G.p.totalXp),'quests',G.qDone.map(q=>q.id).join('/')||'-');
  console.log(map,cap,'t',t.toFixed(0),'stage',G.stage,'bosses',G.bossKills,'lvl',G.p.level,'silver',api.SAVE.silver,'maps',api.SAVE.maps.join('/'));
}
// natural difficulty (no god) on dustbowl, autopilot circles
for(let k=0;k<6;k++)run('dust','sarge',false);
// god runs to test unlock flow
run('dust','sarge',true);
api.SAVE.silver=5000;
for(const c of ['greta','rolf','sid','ida','lou'])api.SAVE.caps.push(c);
api.SAVE.mods.push('plow','flamer','drone','tesla','layer');
run('iron','lou',true);run('ash','ida',true);run('ash','sid',false);run('iron','greta',false);
// --- quests complete, pay out and unlock the Turret Layer ---
{const S=api.SAVE;const silver0=S.silver;
 api.SAVE.selMap='dust';api.startRun();const G=api.G;
 S.ms.done.m_mines=false;S.ms.prog.m_mines=0;S.mods=S.mods.filter(m=>m!=='layer');G.p.modules.back={...G.p.modules.back,id:'mines',lvl:10}; // earlier random runs may have finished it already
 const got=api.checkQuests(true);assert.ok(got.some(q=>q.id==='m_mines'),'mine dropper milestone');assert.ok(S.mods.includes('layer'));
 api.endRun('quit');assert.ok(G.qDone.some(q=>q.id==='m_mines'));assert.ok(S.silver>=silver0);
 assert.ok(S.best.time>0||G.t===0);const runs=S.runs;
 // done quests never pay twice
 api.startRun();api.checkQuests(true);assert.ok(!api.G.qDone.some(q=>q.id==='m_mines'));api.endRun('quit');assert.strictEqual(S.runs,runs+1);}
// --- the Turret Layer plants sentries that shoot ---
{api.SAVE.selMap='dust';api.startRun();const G=api.G;const P=G.p;
 P.modules.back={id:'layer',lvl:1,dmg:9,cd:5,range:300,radius:0,shots:1,extra:1,t:0,act:0,ab:{cd:14,t:0,pow:0}};
 let shots=0,maxS=0;for(let i=0;i<60*40;i++){if(api.mode==='play'){api.joy.dx=Math.cos(i/90);api.joy.dy=Math.sin(i/70);const n=G.pb.length;api.update(1/60);maxS=Math.max(maxS,G.sentries.length);if(G.pb.length>n)shots++;P.hp=P.maxHp;if(i%30===0)api.render();}else if(api.mode==='level'||api.mode==='boss')api.pick(0);}
 assert.ok(maxS>=2&&maxS<=P.modules.back.extra+1,'sentry cap '+maxS);assert.ok(shots>0);api.render();
 console.log('turret layer: max sentries',maxS,'fx',api.R3.fx.sentry.count);api.endRun('quit');}
// --- module abilities: every one fires, goes on cooldown, and its cards apply ---
{api.SAVE.selMap='dust';api.startRun();const G=api.G,P=G.p;
 for(let i=0;i<60*25;i++){if(api.mode==='play'){api.joy.dx=1;api.joy.dy=0.3;api.update(1/60);P.hp=P.maxHp;}else api.pick(0);}
 const slotOf=Object.fromEntries(Object.entries(api.MODS).map(([k,d])=>[k,d.slot]));
 api.setMode('play');assert.ok(!api.useAbility('front')&&!api.upgradePool().some(c=>c.t==='Main Gun'&&/ability/.test(JSON.stringify(c.s(1)))),'Main Gun has no ability');
 for(const id in api.AB){if(api.AB[id].none)continue;
   api.setMode('play');const slot=slotOf[id];P.modules[slot]=api.mkMod(id,P.wdm);
   let foe=G.ents.find(e=>!e.d.neutral&&!e.d.boss&&!e.dead);
   if(!foe){foe={type:'tank',d:{hp:9999,r:16,spd:0,stat:1,contact:0},hp:9999,max:9999,r:16,a:0,ta:0,t:99,slow:0,hit:0,flash:0,dead:false,st:'walk',pt:2,spin:0,t2:0,t3:0};G.ents.push(foe);} // every ability needs something to hit
   foe.x=P.x+Math.cos(P.a)*90;foe.y=P.y+Math.sin(P.a)*90;
   if(id==='drone')for(let i=0;i<10;i++)api.update(1/60);
   while(api.mode!=='play'){api.pick(0);api.setMode('play');} // a level-up may have popped up meanwhile
   assert.ok(api.useAbility(slot),id+' ability fires');assert.strictEqual(P.modules[slot].ab.t,api.AB[id].cd,id+' on cooldown');
   assert.ok(!api.useAbility(slot),id+' cannot fire while cooling');
   for(let i=0;i<120;i++){if(api.mode!=='play')api.pick(0);api.setMode('play');api.update(1/60);P.hp=P.maxHp;}
   const m=P.modules[slot],pool=api.upgradePool().filter(c=>c.t===api.AB[id].name);assert.strictEqual(pool.length,2,id+' has cooldown + power cards');
   const cd0=m.ab.cd,pw0=m.ab.pow;pool[0].ap(1);pool[1].ap(1);assert.ok(m.ab.cd<cd0&&m.ab.pow===pw0+1,id+' cards apply'); // a level-up may have taken one already
   api.render();
 }
 console.log('abilities ok:',Object.keys(api.AB).join(' '));api.endRun('quit');}
// --- garrisons burst open when you drive close; the Swarm rushes weak enemies before the boss ---
{api.SAVE.selMap='dust';api.startRun();const G=api.G,P=G.p;G.t=10;
 const hut=G.ents.find(e=>e.type==='hut');assert.ok(G.ents.some(e=>e.garrison),'some buildings are garrisoned');
 hut.garrison=5;hut.x=P.x+150;hut.y=P.y;const before=G.ents.filter(e=>!e.d.neutral).length;api.update(1/60);
 assert.strictEqual(hut.garrison,0,'garrison opens');assert.ok(G.ents.filter(e=>!e.d.neutral).length>=before+5,'soldiers pour out');api.render();
 G.ents=G.ents.filter(e=>e.d.neutral);G.stageT=54;let sawSwarm=false,spawned=0;const seen=new Set();
 for(let i=0;i<60*14;i++){if(api.mode!=='play'){api.pick(0);api.setMode('play');}api.update(1/60);P.hp=P.maxHp;if(G.swarm)sawSwarm=true;
   for(const e of G.ents)if(!e.d.neutral&&!seen.has(e)){seen.add(e);if(G.swarm)spawned++;}}
 assert.ok(sawSwarm&&!G.swarm,'swarm starts and ends');assert.ok(spawned>=20,'swarm spawns lots of enemies: '+spawned);
 console.log('garrison + swarm ok: swarm spawned',spawned);api.endRun('quit');}
// --- health crates heal a flat amount that grows per boss killed ---
{api.SAVE.selMap='dust';api.startRun();const G=api.G,P=G.p;const heal=()=>{P.hp=1;G.crates=[{x:P.x,y:P.y}];api.update(1/60);return Math.round(P.hp-1);};
 const h0=heal();G.bossKills=2;P.maxHp=500;const h2=heal();assert.strictEqual(h0,30);assert.strictEqual(h2,80,'crate heals 30 + 25 per boss');console.log('crates ok:',h0,h2);api.endRun('quit');}
// --- bulk: upgrades make the tank bigger and slower; engine sheds bulk ---
{api.SAVE.selMap='dust';api.startRun();const G=api.G,P=G.p;api.update(1/60);const r0=P.r;
 for(let i=0;i<10;i++){G.lvQ.push(P.level+1+i);}api.update(1/60);let picks=0;while(api.mode==='level'&&picks<20){api.pick(0);picks++;}
 api.setMode('play');api.update(1/60);assert.ok(P.bulk>0&&P.r>r0,'upgrades add bulk: '+P.bulk.toFixed(2)+' r '+P.r.toFixed(1));
 const b0=P.bulk;P.bulk=10;api.update(1/60);const rBig=P.r;P.bulk=b0;assert.ok(rBig>r0+5,'bulk grows the hull');
 console.log('bulk ok: bulk',P.bulk.toFixed(2),'radius',r0,'->',P.r.toFixed(1));api.endRun('quit');}
// --- garage: old Workshop perks are refunded once; modules are bought and picked in one list ---
{const saved=JSON.parse(JSON.stringify(api.SAVE));
 api.setSave(Object.assign({},saved,{perks:['hardened','riveted','secondwind'],silver:100,refunded:0}));
 assert.ok(api.SAVE.silver===100+200+200+900&&api.SAVE.perks.length===0&&api.SAVE.refunded===1300,'perks refunded once: '+api.SAVE.silver);
 api.setSave(Object.assign({},api.SAVE));assert.strictEqual(api.SAVE.silver,1400,'no second refund');
 api.SAVE.mods=api.SAVE.mods.filter(m=>m!=='rockets');assert.ok(api.MOD_PRICE.rockets>0,'modules have a garage price');
 api.openGarage();api.SAVE.silver=5000;api.SAVE.mods.push('rockets');api.SAVE.selMod='rockets';api.renderGarage();api.SAVE.selMap='dust';api.startRun();
 assert.strictEqual(api.G.p.modules.side.id,'rockets','a bought module starts fitted');api.endRun('quit');
 api.setSave(saved);console.log('garage ok');}
// --- artifacts: a chest per stage, a choice of two, and each one works ---
{api.SAVE.selMap='dust';api.startRun();const G=api.G,P=G.p;G.chestT=0.01;api.update(1/60);
 assert.strictEqual(G.chests.length,1,'a chest spawns');const c=G.chests[0];P.x=c.x;P.y=c.y;api.update(1/60);
 assert.strictEqual(api.mode,'level','chest offers a choice');api.pick(0);assert.strictEqual(G.arts.length,1,'artifact taken');api.setMode('play');
 G.arts=Object.keys(api.ARTIFACTS);for(const id of G.arts){const A=api.ARTIFACTS[id];if(A.ap)A.ap(P);}
 P.modules.side=api.mkMod('broadside',P.wdm);P.modules.back=api.mkMod('mines',P.wdm);
 const foe=api.addEnt('tank',P.x+150,P.y);foe.hp=foe.max=1e6;api.addEnt('tank',P.x+200,P.y+60).hp=1e6;
 P.nitroCd=0;let pb=0;api.joy.dx=1;api.joy.dy=0;api.update(0);
 for(let i=0;i<60*4;i++){if(api.mode!=='play'){api.pick(0);api.setMode('play');}if(i===10){P.nitroCd=0;api.update(0);}api.update(1/60);P.hp=P.maxHp;if(i%30===0){api.render();api.R3.on=false;api.render();api.R3.on=true;}}
 assert.ok(G.ents.some(e=>e.burnDps>0),'incendiary sets things burning');
 console.log('artifacts ok:',G.arts.length);api.endRun('quit');}
// --- crew and chassis: perks apply, scout is small and fast, bulwark big and tough, mechanic repairs ---
{const S=api.SAVE,saved={crew:S.crew.slice(),selCrew:S.selCrew,chassis:S.chassis.slice(),selChassis:S.selChassis,perks:S.perks.slice()};S.perks=[];
 S.selCap='sarge';S.selMap='dust';S.chassis=['standard','scout','bulwark'];S.crew=['mechanic','loader','spotter','cook','scrounger'];
 const run=(ch,crew)=>{S.selChassis=ch;S.selCrew=crew;api.startRun();api.update(1/60);return api.G.p;};
 const std=run('standard','');const r0=std.r,hp0=std.maxHp,cd0=std.modules.front.cd,rg0=std.modules.front.range;api.endRun('quit');
 const sc=run('scout','loader');assert.ok(sc.r<r0&&sc.maxHp<hp0&&sc.spdMult>1,'scout: smaller, less HP, faster');assert.ok(sc.modules.front.cd<cd0,'loader reloads faster');api.endRun('quit');
 const bw=run('bulwark','spotter');assert.ok(bw.r>r0&&bw.maxHp>hp0&&bw.spdMult<1,'bulwark: bigger, more HP, slower');assert.ok(bw.modules.front.range>rg0,'spotter adds range');api.render();api.R3.on=false;api.render();api.R3.on=true;api.endRun('quit');
 const me=run('standard','mechanic');const G=api.G;G.spawnT=G.helperT=1e9;G.ents=G.ents.filter(e=>e.d.neutral);me.hp=20;me.hitT=-10;api.update(1/60);for(let i=0;i<60;i++)api.update(1/60);
 assert.ok(me.hp>20,'mechanic repairs when not hit');api.endRun('quit');
 Object.assign(S,saved);console.log('crew + chassis ok');}
// --- tank lines: each boss pick moves the tank up its chassis's speed or armor line, and every model builds ---
{const S=api.SAVE,saved={chassis:S.chassis.slice(),selChassis:S.selChassis,selMap:S.selMap};S.chassis=['standard','scout','bulwark'];S.selMap='dust';
 for(const ch of S.chassis){S.selChassis=ch;api.startRun();const G=api.G,P=G.p,L=api.LINES[ch];
   assert.ok(api.tankId(P)===L.base,ch+' starts as '+L.base);api.render();
   const boss=(card,stage)=>{G.stage=stage;api.openBossReward();assert.ok(api.mode==='boss','boss reward open');api.pick(card);};
   boss(0,1);assert.ok(P.tier===1&&P.tline==='a'&&api.tankId(P)===L.a[0],ch+' armor tier 1: '+api.tankId(P));api.render();
   boss(1,2);assert.ok(P.tier===2&&P.tline==='s'&&api.tankId(P)===L.s[1],ch+' speed tier 2: '+api.tankId(P));api.render();
   boss(0,3);assert.ok(api.tankId(P)===L.a[2],ch+' armor tier 3: '+api.tankId(P));api.render();api.endRun('quit');}
 const all=[...new Set(Object.values(api.LINES).flatMap(L=>[L.base,...L.s,...L.a]))];
 assert.ok(all.length===21&&all.every(id=>api.TANKS[id]),'21 tanks, all defined');
 const full={front:Object.assign(api.mkMod('cannon'),{shots:3}),side:api.mkMod('broadside'),back:api.mkMod('mines'),top:api.mkMod('turret')};
 const bare={front:api.mkMod('plow'),side:api.mkMod('flamer'),back:api.mkMod('drone'),top:api.mkMod('tesla')};
 for(const id of all)for(const M of [full,bare]){const m=api.tankMesh3D(api.TANKS[id],M);assert.ok(m.root.children.length>10&&m.hull&&m.stacks.length,id+' builds');}
 Object.assign(S,saved);console.log('tank lines ok:',all.length,'tanks');}
// --- captains: every one plays a short run, and each special effect works ---
{const S=api.SAVE,saved={caps:S.caps.slice(),selCap:S.selCap,selMap:S.selMap};S.caps=api.CAPS.map(c=>c.id);S.selMap='dust';
 for(const c of api.CAPS){S.selCap=c.id;api.startRun();const G=api.G,P=G.p;
   for(let i=0;i<60*40;i++){if(api.mode==='play'){api.joy.dx=Math.cos(i/80);api.joy.dy=Math.sin(i/60);if(i%300===0)api.tryNitro();api.frame(1/60);P.hp=Math.max(P.hp,P.maxHp*0.5);if(i%120===0)api.render();}else api.pick(0);}
   assert.ok(isFinite(P.hp)&&isFinite(P.x)&&G.t>30,c.id+' plays a run');api.endRun('quit');}
 const run=id=>{S.selCap=id;api.startRun();const G=api.G;G.spawnT=G.helperT=1e9;G.ents=G.ents.filter(e=>e.d.neutral);api.joy.dx=api.joy.dy=0;api.update(1/60);return G;};
 const res={};let G;
 G=run('sarge');const cd0=G.p.modules.front.cd,ab0=api.mkMod('broadside').ab.cd;
 G.overtime=true;G.otT=0;G.otNext=0.001;api.update(1/60);const ot0=G.otSilver;api.endRun('quit');
 G=run('tess');assert.ok(G.p.modules.front.cd<cd0*0.75&&api.mkMod('broadside').ab.cd>ab0*1.3,'Tess: faster guns, slower abilities');api.endRun('quit');
 G=run('marta');G.crateT=0;api.update(1/60);assert.strictEqual(G.crates.length,0,'Marta: no health crates');
 G.p.hp=50;api.addEnt('grunt',G.p.x,G.p.y);for(let i=0;i<5;i++)api.update(1/60);assert.ok(G.p.hp>50,'Marta: eating a soldier heals');res.marta=G.p.hp;api.endRun('quit');
 G=run('hank');const hp0=G.p.maxHp;api.kill(api.addEnt('tank',G.p.x+300,G.p.y));api.kill(api.addEnt('grunt',G.p.x+300,G.p.y));assert.strictEqual(G.p.maxHp,hp0+1,'Hank: a vehicle adds max HP, a soldier does not');api.endRun('quit');
 G=run('rosa');api.tryNitro();assert.ok(G.p.nitro>2,'Rosa: longer Boost');api.endRun('quit');
 G=run('cass');api.tryNitro();for(let i=0;i<30;i++){api.joy.dx=1;api.update(1/60);}assert.ok(G.burns.length>0,'Cass: Boost leaves fire');api.endRun('quit');
 S.selCap='kat';api.startRun();assert.ok(api.G.helperT<20,'Kat: first cart comes sooner');api.endRun('quit');
 G=run('tomo');assert.strictEqual(G.p.rerolls,0,'Tomo: no rerolls');G.p.modules.side=null;G.lvQ=[3];api.openLevel();api.pick(0);
 assert.ok(Object.values(G.p.modules).some(m=>m&&m.id!=='cannon'&&m.lvl===2),'Tomo: new module starts at level 2');api.setMode('play');api.endRun('quit');
 G=run('nell');G.overtime=true;G.otT=0;G.otNext=0.001;api.update(1/60);assert.ok(G.otSilver>=ot0*1.9,'Nell: double Overtime pay '+G.otSilver+' vs '+ot0);api.endRun('quit');
 G=run('ozzy');const t0=G.t;for(let i=0;i<60;i++)api.frame(1/60);assert.ok(Math.abs(G.t-t0-1.4)<0.05,'Ozzy: the game runs 1.4x '+(G.t-t0));api.endRun('quit');
 G=run('lars');const P=G.p;P.nitroCd=5;let n=0;for(const tr of api.R3.trees){if(tr.flat||n>=8)continue;P.x=tr.x;P.y=tr.z;api.render();n++;}
 assert.ok(n===8&&P.nitroCd<=0,'Lars: 8 trees refill Boost');api.endRun('quit');
 Object.assign(S,saved);console.log('captains ok:',api.CAPS.length);}
// --- fighting crews: each one hurts a target on its own (no modules fitted), and Destroy 100 tanks unlocks the Radio Operator ---
{const S=api.SAVE,saved={crew:S.crew.slice(),selCrew:S.selCrew,selMap:S.selMap,done:S.ms.done.m_tanks,prog:S.ms.prog.m_tanks};S.selMap='dust';
 const fight=api.CREW.filter(c=>c.fight).map(c=>c.id);assert.strictEqual(fight.length,5,'five fighting crews');S.crew=fight.slice();const res={};
 for(const id of fight){S.selCrew=id;api.startRun();const G=api.G,P=G.p;G.spawnT=G.helperT=1e9;G.ents=G.ents.filter(e=>e.d.neutral);
   for(const k in P.modules)P.modules[k]=null;
   const dummy=api.addEnt('tank',P.x+200,P.y);dummy.hp=dummy.max=1e6;dummy.d=Object.assign({},dummy.d,{spd:0,shoot:null,contact:0});
   for(let i=0;i<60*6;i++){api.joy.dx=api.joy.dy=0;P.v=0;api.update(1/60);P.hp=P.maxHp;if(api.mode!=='play'){api.pick(0);api.setMode('play');}if(i%60===0)api.render();}
   res[id]=Math.round(1e6-dummy.hp);assert.ok(dummy.hp<1e6,id+' hurts enemies on its own');api.endRun('quit');}
 S.crew=fight.filter(c=>c!=='radio');S.ms.done.m_tanks=false;S.ms.prog.m_tanks=0;api.startRun();const G=api.G;G.rs.on=true;G.rs.kill.tank=100;api.checkQuests(false);
 assert.ok(S.crew.includes('radio')&&S.ms.done.m_tanks,'Destroy 100 tanks unlocks the Radio Operator');api.endRun('quit');
 S.crew=saved.crew;S.selCrew=saved.selCrew;S.selMap=saved.selMap;S.ms.done.m_tanks=saved.done;S.ms.prog.m_tanks=saved.prog;
 console.log('fighting crews ok:',JSON.stringify(res));}
// --- round 2 modules: smoke eats shots, troops and escorts fight, missiles home in, the water jet pushes ---
{api.SAVE.selMap='dust';api.SAVE.selCrew='';api.startRun();const G=api.G,P=G.p;G.spawnT=G.helperT=1e9;G.ents=G.ents.filter(e=>e.d.neutral);
 const dummy=(x,y)=>{const e=api.addEnt('tank',x,y);e.hp=e.max=1e6;e.d=Object.assign({},e.d,{spd:0,shoot:null,contact:0,lob:null});return e;};
 const volley=n=>{for(let i=0;i<n;i++){const a=i*TAU_/n;G.eb.push({x:P.x+Math.cos(a)*160,y:P.y+Math.sin(a)*160,vx:-Math.cos(a)*300,vy:-Math.sin(a)*300,dmg:1,r:5,life:2,col:'#fff'});}
   let lost=0;for(let i=0;i<60;i++){const h=P.hp;P.iframes=0;api.update(1/60);lost+=h-P.hp;P.hp=P.maxHp;}return Math.round(lost*10)/10;};
 const TAU_=Math.PI*2;for(const k in P.modules)P.modules[k]=null;api.update(1/60);
 const bare=volley(40);P.modules.side=api.mkMod('smoke');const thin=volley(40);api.useAbility('side');const screen=volley(40);
 assert.ok(bare>0&&thin<bare&&screen===0,'smoke: some shots fizzle, the screen eats all '+[bare,thin,screen]);
 P.modules.side=api.mkMod('troops');P.modules.side.t=0;const d1=dummy(P.x+180,P.y);
 for(let i=0;i<60*3;i++){P.v=0;api.update(1/60);P.hp=P.maxHp;}
 assert.ok(G.allies.filter(a=>a.kind==='troop').length===2&&d1.hp<1e6,'troops drop and shoot');
 P.modules.back=api.mkMod('escort');api.update(1/60);assert.strictEqual(G.allies.filter(a=>a.perm).length,1,'one escort follows');
 api.useAbility('back');assert.strictEqual(G.allies.filter(a=>a.kind==='escort').length,2,'Call Support adds one');
 for(let i=0;i<60;i++)api.update(1/60);api.render();
 G.allies=[];P.modules.side=null;P.modules.back=null;P.modules.top=api.mkMod('missiles');P.modules.top.t=0;d1.dead=true;
 G.ents=G.ents.filter(e=>e.d.neutral);for(const e of G.ents)e.garrison=false; // no garrison soldiers in the missile path
 const d2=dummy(P.x,P.y+260);for(let i=0;i<60*2;i++){P.v=0;api.update(1/60);P.hp=P.maxHp;}
 assert.ok(d2.hp<1e6,'missile reaches its target');
 P.modules.top=null;d2.dead=true;P.modules.front=api.mkMod('water');const d3=api.addEnt('grunt',P.x+150,P.y);d3.hp=d3.max=1e6;d3.d=Object.assign({},d3.d,{spd:0,shoot:null});
 const x0=d3.x;for(let i=0;i<60;i++){P.v=0;api.update(1/60);P.hp=P.maxHp;}
 assert.ok(d3.x>x0+8&&d3.hp<1e6,'water jet pushes and hurts '+(d3.x-x0).toFixed(0));
 api.render();api.endRun('quit');console.log('round 2 modules ok:',JSON.stringify({bare,thin,screen}));}
// --- loadout: Starting module and Starting kit apply at run start; a few new artifacts ---
{const S=api.SAVE,saved={mods:S.mods.slice(),kit:(S.kit||[]).slice(),selKit:S.selKit,selMod:S.selMod};
 if(!S.mods.includes('rockets'))S.mods.push('rockets');S.selMod='rockets';S.kit=['heavy'];S.selKit='heavy';S.selMap='dust';api.startRun();let G=api.G,P=G.p;
 assert.ok(P.modules.side&&P.modules.side.id==='rockets'&&P.modules.front.id==='cannon','starting module fitted');
 assert.ok(G.arts.includes('heavy')&&Math.abs(P.wdm-1.25)<0.01,'starting kit applied');api.endRun('quit');
 S.selMod='plow';if(!S.mods.includes('plow'))S.mods.push('plow');api.startRun();assert.strictEqual(api.G.p.modules.front.id,'plow','a front pick replaces the Main Gun');api.endRun('quit');
 S.selMod='';S.selKit='';api.startRun();G=api.G;P=G.p;G.spawnT=G.helperT=1e9;G.ents=G.ents.filter(e=>e.d.neutral);
 G.arts=['firststrike'];const e=api.addEnt('tank',P.x+400,P.y);const h0=e.hp;api.hurt(e,10);const first=h0-e.hp;api.hurt(e,10);assert.ok(Math.abs(first-15)<0.01&&Math.abs(h0-e.hp-25)<0.01,'First Strike hits unhurt enemies harder');
 G.arts=['wrench'];G.lvQ=[2];api.openLevel();assert.strictEqual(api.mode,'level','a level-up opens with the wrench in the kit');
 api.setMode('play');api.endRun('quit');S.mods=saved.mods;S.kit=saved.kit;S.selKit=saved.selKit;S.selMod=saved.selMod;console.log('loadout ok');}
// --- world map: nine plots, branching unlocks, old saves; build screen: try before you buy, decorations ---
{const saved=JSON.parse(JSON.stringify(api.SAVE));
 api.setSave({silver:5000});let S=api.SAVE;assert.strictEqual(api.MAPS.length,9,'nine plots');assert.ok(api.MAPS.every(m=>m.pal&&m.rank>=1&&m.reg>=0&&m.tier>=0&&(m.req===null||api.MAPS.some(x=>x.id===m.req))),'every plot is placed and reachable');
 api.openMap();assert.strictEqual(api.mode,'map');for(let i=0;i<30;i++){api.updateMap(1/60);api.render();}
 api.selectPlot('rift');assert.strictEqual(S.selMap,'dust','a locked plot cannot be selected');
 api.startRun();api.clearMap();assert.ok(S.maps.includes('ridge')&&S.maps.includes('iron')&&!S.maps.includes('slag'),'the first plot opens its next plot and the next region');api.endRun('quit');
 api.openMap();api.selectPlot('iron');assert.strictEqual(S.selMap,'iron','an open plot can be selected');
 api.setSave({maps:['dust','iron'],cleared:{dust:true,iron:true}});assert.ok(['ridge','slag','ash'].every(id=>api.SAVE.maps.includes(id)),'old saves get the plots they earned');
 api.setSave({silver:1000});S=api.SAVE;api.openGarage();api.render();const k0=api.DEPOT.key;
 api.gTap('cap','rosa');assert.strictEqual(S.selCap,'sarge','tapping a locked captain only previews it');api.render();assert.notStrictEqual(api.DEPOT.key,k0,'the preview reaches the depot');
 assert.ok(api.gBuy('cap','rosa')&&S.selCap==='rosa'&&S.silver===500&&S.caps.includes('rosa'),'buying selects it');assert.ok(!api.gBuy('cap','ozzy'),'cannot overspend');assert.ok(!api.gBuy('crew','radio'),'quest items cannot be bought');
 S.silver=99999;for(const slot in api.DECOR)for(const it of api.DECOR[slot].items){assert.ok(api.gBuy(slot,it.id),'buy '+it.id);assert.strictEqual(S.decor[slot],it.id);api.render();
   const m=api.tankMesh3D(api.TANKS.t34,{front:api.mkMod('cannon'),side:null,back:null,top:null},'',{[slot]:it.id});assert.ok(m.root.children.length>10,it.id+' builds');}
 api.startRun();api.update(1/60);api.render();api.endRun('quit');
 const again=JSON.parse(JSON.stringify(api.SAVE));api.setSave(again);assert.strictEqual(api.SAVE.decor.mascot,'goat','decorations are saved');
 api.setSave(Object.assign({},again,{decor:{paint:'nope',emblem:'',pennant:'',mascot:''}}));assert.strictEqual(api.SAVE.decor.paint,'','unknown decorations are dropped');
 for(const t of ['chassis','cap','crew','mod','kit','paint','emblem','pennant','mascot']){const L=api.gItems(t);assert.ok(L.length&&L.every(i=>i.name&&i.icon),t+' items are complete');}
 api.R3.on=false;api.openMap();api.render();api.openGarage();api.render();api.R3.on=true;
 api.setSave(saved);console.log('world map + build screen ok');}
// --- mines leave the rack in an arc, bounce, and only arm after they land ---
{api.SAVE.selMap='dust';api.startRun();const G=api.G,P=G.p;G.spawnT=G.helperT=1e9;G.ents=G.ents.filter(e=>e.d.neutral);G.mines=[];P.x=P.y=1500;G.crew='';for(const k in P.modules)P.modules[k]=null;
 api.throwMine({arm:0,dmg:9,rad:40,life:9},P.x,P.y,P.x+150,P.y+60);const m=G.mines[0];let up=0;const near_=api.addEnt('tank',P.x+150,P.y+60);near_.hp=near_.max=1e6;near_.d=Object.assign({},near_.d,{spd:0,shoot:null,contact:0});
 let landed=false;for(let i=0;i<60*2&&G.mines.length;i++){api.update(1/60);P.hp=P.maxHp;if(m.fl<1){up=Math.max(up,m.h);assert.strictEqual(near_.hp,1e6,'a mine in the air does not go off');}else landed=true;api.render();}
 assert.ok(up>20&&landed,'the mine arcs and lands '+up);assert.ok(near_.hp<1e6,'it goes off once it has landed');
 const b=[];P.modules.back=api.mkMod('mines');G.mines=[];for(let i=0;i<8;i++){P.modules.back.t=0;P.v=120;api.update(1/60);P.hp=P.maxHp;if(G.mines.length)b.push(G.mines[G.mines.length-1].tx);G.mines=[];}
 assert.ok(new Set(b.map(x=>Math.round(x))).size>1,'drops land in different spots');api.endRun('quit');console.log('bouncing mines ok');}
// --- ranged and static enemies can't pile up (per-type caps) ---
{api.SAVE.selMap='dust';api.startRun();const G=api.G,P=G.p;G.stage=2;let maxT=0,maxW=0;
 for(let i=0;i<60*120;i++){if(api.mode==='play'){api.joy.dx=0;api.joy.dy=0;api.update(1/60);P.hp=P.maxHp;if(G.boss)G.boss=null,G.bossSpawned=true;
   const c=r=>G.ents.filter(e=>!e.dead&&(e.d.base||e.type)===r).length;maxT=Math.max(maxT,c('tank'));maxW=Math.max(maxW,c('tower'));}else api.pick(0);}
 assert.ok(maxT<=4&&maxW<=2,'Greenvale caps: tanks '+maxT+' towers '+maxW);console.log('type caps ok: tanks',maxT,'towers',maxW);api.endRun('quit');}
// --- Main Gun turret tracks 360° and fires when it's on target ---
{api.SAVE.selMap='dust';api.startRun();const G=api.G,P=G.p;P.modules.front=api.mkMod('cannon',1);
 const test=(deg,frames=90)=>{G.ents=G.ents.filter(e=>e.d.neutral);G.spawnT=G.helperT=1e9;G.pb.length=0;P.gunO=0;P.v=0;P.a=0;P.modules.front.t=0;
   api.joy.dx=api.joy.dy=0;
   api.update(0);api.G.ents.push(Object.assign(Object.create(null),{type:'tank',d:{hp:9999,r:16,spd:0,stat:1,contact:0},x:P.x+Math.cos(deg*Math.PI/180)*250,y:P.y+Math.sin(deg*Math.PI/180)*250,hp:9999,max:9999,r:16,a:0,ta:0,t:99,slow:0,hit:0,flash:0,dead:false,st:'walk',pt:2,spin:0,t2:0,t3:0}));
   let shots=0;for(let i=0;i<frames;i++){P.v=0;P.a=0;const n=G.pb.length;api.update(1/60);if(G.pb.length>n)shots++;P.hp=P.maxHp;}
   return {shots,gun:Math.round(P.gunO*180/Math.PI)};};
 const r35=test(35),r90=test(90),r180=test(180),rm35=test(-35);
 assert.ok(r35.shots>0&&Math.abs(r35.gun-35)<=3,'gun swings 35° and fires '+JSON.stringify(r35));
 assert.ok(rm35.shots>0&&Math.abs(rm35.gun+35)<=3,'and to the other side '+JSON.stringify(rm35));
 assert.ok(r90.shots>0&&Math.abs(r90.gun-90)<=4,'turret reaches 90° '+JSON.stringify(r90));
 assert.ok(r180.shots>0&&Math.abs(Math.abs(r180.gun)-180)<=4,'turret reaches 180° '+JSON.stringify(r180));
 console.log('gun traverse ok:',JSON.stringify({r35,rm35,r90,r180}));api.render();api.endRun('quit');}
// --- Ironfield: Foundry enemies spawn (with some Greenvale ones) and every boss mechanic works ---
{api.SAVE.selMap='iron';api.startRun();const G=api.G,P=G.p;const seen={};
 for(let i=0;i<60*60;i++){if(api.mode==='play'){api.joy.dx=Math.cos(i/90);api.joy.dy=Math.sin(i/70);api.update(1/60);P.hp=P.maxHp;for(const e of G.ents)seen[e.type]=1;if(i%30===0)api.render();}else api.pick(0);}
 for(const t of ['rivet','spark','crawler','shed','orecart'])assert.ok(seen[t],'Ironfield spawns '+t);
 assert.ok(seen.grunt||seen.biker||seen.tank,'some Greenvale enemies still mix in');
 assert.ok(!seen.hut&&!seen.truck,'neutrals are always reskinned');
 const fight=(stage,secs,fn)=>{api.setMode('play');G.ents=G.ents.filter(e=>e.d.neutral);G.boss=null;G.stage=stage;G.stageT=74.9;G.bossSpawned=false;G.spawnT=G.helperT=1e9;
   const out={};for(let i=0;i<60*secs;i++){if(api.mode!=='play'){api.pick(0);api.setMode('play');}api.joy.dx=Math.cos(i/50);api.joy.dy=Math.sin(i/40);api.update(1/60);P.hp=P.maxHp;if(i%20===0){api.render();api.R3.on=false;api.render();api.R3.on=true;}if(G.boss)fn(G.boss,out);}
   return out;};
 const ox=fight(1,12,(b,o)=>{o.type=b.type;o.fire=o.fire||b.st==='fire';o.pools=Math.max(o.pools||0,G.hazards.length);});
 assert.ok(ox.type==='ox'&&ox.fire&&ox.pools>3,'Furnace Ox breathes fire and leaves molten pools '+JSON.stringify(ox));
 const cr=fight(2,16,(b,o)=>{o.type=b.type;o.swing=o.swing||b.st==='swing';o.adds=Math.max(o.adds||0,G.ents.filter(e=>!e.d.neutral&&!e.d.boss).length);});
 assert.ok(cr.type==='crane'&&cr.swing&&cr.adds>=3,'Crane Queen swings and drops reinforcements '+JSON.stringify(cr));
 const an=fight(3,8,(b,o)=>{o.type=b.type;o.waves=Math.max(o.waves||0,G.waves.length);});
 assert.ok(an.type==='anvil'&&an.waves>=1,'The Anvil sends shockwaves '+JSON.stringify(an));
 {const w={x:P.x+300,y:P.y,r:300-1,spd:0,max:999,gaps:[Math.PI],gw:0.8,dmg:22,hit:false};G.waves=[w];P.iframes=0;api.update(1/60);assert.ok(!w.hit,'standing in a gap is safe');
  w.gaps=[0];api.update(1/60);assert.ok(w.hit,'outside a gap the ring hits');G.waves=[];}
 const du=fight(4,3,(b,o)=>{o.type=b.type;o.shielded=b.shielded;o.cars=(b.cars||[]).length;});
 assert.ok(du.type==='duke'&&du.shielded&&du.cars===4,'Iron Duke starts shielded with 4 cars '+JSON.stringify(du));
 const B=G.boss;const hp0=B.hp;api.hurt(B,500);assert.strictEqual(B.hp,hp0,'shield blocks damage');
 api.hurt(B.cars[0],1e9);api.hurt(B.cars[1],1e9);api.update(1/60);assert.strictEqual(B.shield,0.5,'each car takes a quarter off');const h1=B.hp;api.hurt(B,400);assert.ok(Math.abs((h1-B.hp)-200)<1,'half shield halves damage');
 B.cars.forEach(c=>api.hurt(c,1e9));api.update(1/60);assert.ok(!B.shielded,'shield gone with the cars');const h2=B.hp;api.hurt(B,500);assert.ok(Math.abs((h2-B.hp)-500)<1,'full damage');
 api.hurt(B,1e9);for(let i=0;i<120&&api.mode==='play';i++)api.update(1/60);assert.ok(G.bossKills>=1);
 console.log('ironfield ok:',JSON.stringify({ox,cr,an,du}));api.setMode('play');api.endRun('quit');}
// --- Ashlands: the Cinder Clans spawn, and every boss mechanic works ---
{api.SAVE.selMap='ash';api.startRun();const G=api.G,P=G.p;const seen={};
 for(let i=0;i<60*50;i++){if(api.mode==='play'){api.joy.dx=Math.cos(i/90);api.joy.dy=Math.sin(i/70);api.update(1/60);P.hp=P.maxHp;for(const e of G.ents)seen[e.type]=1;if(i%30===0)api.render();}else api.pick(0);}
 for(const t of ['ashwalker','cinderbike','ashhut','scrapwagon'])assert.ok(seen[t],'Ashlands spawns '+t);
 const reset=(stage)=>{api.setMode('play');G.ents=G.ents.filter(e=>e.d.neutral);G.boss=null;G.stage=stage;G.stageT=74.99;G.bossSpawned=false;G.spawnT=G.helperT=1e9;G.eb=[];G.strikes=[];G.waves=[];api.update(1/60);return G.boss;};
 const tick=(n,fn)=>{for(let i=0;i<n;i++){if(api.mode!=='play'){api.pick(0);api.setMode('play');}api.update(1/60);P.hp=P.maxHp;if(fn)fn(i);if(i%20===0){api.render();api.R3.on=false;api.render();api.R3.on=true;}}};
 // Cinder Wyrm: burrows (untargetable), emerges, and its segments pass damage to the head
 let W=reset(1);assert.strictEqual(W.type,'wyrm');let hid=false,back=false;tick(60*9,()=>{if(W.hidden)hid=true;if(hid&&!W.hidden)back=true;});
 assert.ok(hid&&back,'wyrm burrows and resurfaces');assert.strictEqual(W.segs.length,6);
 W.hidden=false;const hw=W.hp;api.hurt(W.segs[2],100);assert.ok(Math.abs((hw-W.hp)-60)<1,'segment relays 60% to the head');
 W.hidden=true;const hh=W.hp;api.hurt(W,100);assert.strictEqual(W.hp,hh,'burrowed wyrm takes no damage');W.hidden=false;
 api.hurt(W,1e9);tick(90);assert.ok(W.segs.every(s=>s.dead),'segments go down with the head');
 // Ash Prophet: the mirror reflects shots and blocks damage
 let Pr=reset(2);assert.strictEqual(Pr.type,'prophet');Pr.st='mirror';Pr.pt=3;Pr.x=P.x+100;Pr.y=P.y;api.update(1/60);
 const ph=Pr.hp;api.hurt(Pr,500);assert.strictEqual(Pr.hp,ph,'mirror blocks damage');
 G.pb.push({x:Pr.x-Pr.r-2,y:Pr.y,vx:300,vy:0,dmg:20,life:1,r:5,pierce:0,hits:[],col:'#fff'});const eb0=G.eb.length;api.update(1/60);
 assert.ok(G.eb.length>eb0,'mirror reflects a shot back');api.hurt(Pr,1e9);api.update(1/60);
 for(let i=0;i<120&&api.mode==='play';i++)api.update(1/60);if(api.mode!=='play')api.pick(0);
 // Twin Kilns: two at once; the first kill enrages the other, the second ends the fight
 let K=reset(3);assert.strictEqual(K.type,'kiln');const K2=K.twin;assert.ok(K2&&K2.type==='kiln'&&K2.twin===K,'two kilns');
 tick(60*3);const kills0=G.bossKills;api.hurt(K,1e9);api.update(1/60);
 assert.ok(K2.enraged&&G.boss===K2&&G.bossKills===kills0,'other kiln enraged, fight goes on');api.hurt(K2,1e9);
 for(let i=0;i<120&&api.mode==='play';i++)api.update(1/60);assert.strictEqual(G.bossKills,kills0+1,'both down ends the fight');if(api.mode!=='play')api.pick(0);
 // The Caldera: vents shield it; meteor showers and lava rings
 let C=reset(4);assert.strictEqual(C.type,'caldera');let sawWave=false,sawStrike=false;tick(60*9,()=>{if(G.waves.length)sawWave=true;if(G.strikes.length)sawStrike=true;});
 assert.ok(C.vents.length===4&&sawWave&&sawStrike,'caldera vents, rings and meteors');
 const alive=C.vents.filter(v=>!v.dead).length,ch=C.hp;api.hurt(C,400);assert.ok(alive>0&&Math.abs((ch-C.hp)-400*(1-alive/4*0.75))<1,'each living vent blocks 18.75% ('+alive+' alive)');C.vents.forEach(v=>api.hurt(v,1e9));api.update(1/60);
 const ch2=C.hp;api.hurt(C,400);assert.ok(Math.abs((ch2-C.hp)-400)<1,'no vents, full damage');
 // Obsidian Spire: warning line, then a sweeping beam that hurts
 api.setMode('play');G.ents=G.ents.filter(e=>e.d.neutral);G.boss=null;G.bossSpawned=true;api.joy.dx=api.joy.dy=0;P.v=0;
 const sp=api.addEnt('spire',P.x+200,P.y);sp.lt=0;let aimed=false,fired=false,dmg=0;
 for(let i=0;i<60*3;i++){P.v=0;P.iframes=0;const h=P.hp;api.update(1/60);dmg+=Math.max(0,h-P.hp);P.hp=P.maxHp;if(sp.las==='aim')aimed=true;if(sp.las==='fire')fired=true;if(i%20===0)api.render();}
 assert.ok(aimed&&fired&&dmg>0,'spire warns, then its beam hurts: '+dmg.toFixed(1));
 console.log('ashlands ok: wyrm, prophet, twin kilns, caldera');api.setMode('play');api.endRun('quit');}
// --- mastery: at level 8 every module offers a passive or ability capstone, and each one works ---
{api.SAVE.selMap='dust';api.startRun();const G=api.G,P=G.p;
 const slotOf=Object.fromEntries(Object.entries(api.MODS).map(([k,d])=>[k,d.slot]));
 const dummy=(x,y)=>{const e={type:'tank',d:{hp:1e6,r:16,spd:0,stat:1,contact:0},hp:1e6,max:1e6,r:16,a:0,ta:0,t:99,slow:0,hit:0,flash:0,dead:false,st:'walk',pt:2,spin:0,t2:0,t3:0,x,y};G.ents.push(e);return e;};
 const res={};
 api.MODS_CD_TURRET=api.mkMod('turret',1).cd;
 for(const id in api.MASTERY)for(const pick of [0,1]){
   api.setMode('play');G.ents=G.ents.filter(e=>e.d.neutral);G.spawnT=G.helperT=1e9;G.burns=[];G.mines=[];G.sentries=[];G.drones=[];P.a=0;P.gunO=0;
   const slot=slotOf[id];const m=api.mkMod(id,1);m.lvl=8;P.modules[slot]=m;
   api.afterPick();assert.strictEqual(api.mode,'level',id+' offers mastery');api.pick(pick);
   assert.strictEqual(m.mastery,pick?'a':'p',id+' mastery applied');
   const front=dummy(P.x+120,P.y),back=dummy(P.x-120,P.y);
   while(api.mode!=='play'){api.pick(0);api.setMode('play');}
   const ex0=m.extra;assert.ok(api.AB[id].none?!api.useAbility(slot):api.useAbility(slot),id+'/'+m.mastery+' ability fires');
   const r={burns:G.burns.length,mines:G.mines.length,sentries:G.sentries.length,backHit:back.hp<1e6};
   for(let i=0;i<60*2;i++){if(api.mode!=='play'){api.pick(0);api.setMode('play');}api.update(1/60);P.hp=P.maxHp;if(i%20===0){api.render();api.R3.on=false;api.render();api.R3.on=true;}}
   r.backHit2=back.hp<1e6;res[id+'/'+m.mastery]=r;
   if(m.mastery==='a'){
     if(id==='cannon')assert.ok(m.extra===3&&m.dmg>24*1.2,'Sabot Rounds pierce and hit harder');
     if(id==='plow')assert.ok(r.backHit,'Earthquake hits behind you');
     if(id==='flamer')assert.ok(r.burns>=12,'Inferno Ring');
     if(id==='mines')assert.ok(r.mines>=12,'Carpet doubles mines');
     if(id==='layer')assert.ok(r.sentries>=2,'Airdrop drops two');
   }else{
     if(id==='drone')assert.strictEqual(m.extra,3,'Swarm Bay adds drones');
     if(id==='turret')assert.ok(m.cd<api.MODS_CD_TURRET,'Twin Mount fires faster');
   }
 }
 // a module gets its mastery offer only once
 const m=P.modules.front;api.setMode('play');api.afterPick();assert.strictEqual(api.mode,'play','no second offer');
 console.log('mastery ok:',Object.keys(res).length,'capstones');api.endRun('quit');}
// --- Overtime is optional after the 4th boss, and the clear counts either way ---
function toChoice(){api.SAVE.selMap='dust';api.startRun();const G=api.G;G.stage=4;G.stageT=74;G.p.rank=3;
  for(let i=0;i<60*30&&(api.mode==='play'||api.mode==='level');i++){if(api.mode==='level'){api.pick(0);continue;}api.update(1/60);G.p.hp=G.p.maxHp;if(G.boss)api.hurt(G.boss,1e9);}
  assert.strictEqual(api.mode,'boss','choice after the last boss');assert.ok(G.cleared&&api.SAVE.cleared.dust);return G;}
{const wins=api.SAVE.wins,runs=api.SAVE.runs;const G=toChoice();assert.strictEqual(api.SAVE.wins,wins+1,'clear counted before choosing');
 api.pick(0);assert.strictEqual(api.mode,'over');assert.ok(!G.overtime);assert.strictEqual(api.SAVE.runs,runs+1);}
{const wins=api.SAVE.wins,silver0=api.SAVE.silver;const G=toChoice();api.pick(1);
 assert.strictEqual(api.mode,'play');assert.ok(G.overtime&&!G.boss);
 for(let i=0;i<60*65;i++){api.joy.dx=Math.cos(i/80);api.joy.dy=Math.sin(i/60);api.update(1/60);G.p.hp=G.p.maxHp;if(api.mode==='level')api.pick(0);}
 assert.ok(G.otSilver>0&&G.otT>=60,'overtime pays silver');assert.ok(!G.bossSpawned||!G.boss,'no boss in overtime');
 G.p.hp=1;G.p.iframes=0;api.endRun(false);assert.strictEqual(api.SAVE.wins,wins+1,'dying in overtime is still one win');assert.ok(api.SAVE.silver>=silver0+G.otSilver);
 console.log('overtime ok: lasted',Math.round(G.otT),'s, bonus',G.otSilver);}
// --- no screen shake: the camera stays put even after big explosions ---
{api.SAVE.selMap='dust';api.startRun();const G=api.G;G.shake=18;api.render();const c1=api.R3.cam.position.clone();G.shake=18;api.render();const c2=api.R3.cam.position;
 assert.ok(c1.distanceTo(c2)<1e-6,'camera does not shake');console.log('no shake ok');api.endRun('quit');}
// inspect 3D state after a fresh run
api.SAVE.selMap='dust';api.startRun();for(let i=0;i<60*20;i++){if(api.mode==='play'){api.joy.dx=1;api.joy.dy=0;api.update(1/60);}else if(api.mode==='level')api.pick(0);}
api.render();
const R=api.R3;
console.log('R3 on',R.on,'d',Math.round(R.d),'trees',R.trees.length,'flattened',R.trees.filter(t=>t.flat).length);
const counts={};for(const t in R.parts)counts[t]=R.parts[t][0].im.count;console.log('visible',JSON.stringify(counts));
console.log('fx',Object.entries(R.fx).map(([k,v])=>k+':'+v.count).join(' '));
const G=api.G;const ds=G.ents.filter(e=>!e.d.neutral).map(e=>Math.round(Math.hypot(e.x-G.p.x,e.y-G.p.y)));console.log('hostile dists min/median',Math.min(...ds),ds.sort((a,b)=>a-b)[ds.length>>1]);
