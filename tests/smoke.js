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
 const slotOf={cannon:'front',plow:'front',broadside:'side',flamer:'side',mines:'back',drone:'back',layer:'back',turret:'top',tesla:'top'};
 for(const id in api.AB){
   api.setMode('play');const slot=slotOf[id];P.modules[slot]=api.mkMod(id,P.wdm);
   let foe=G.ents.find(e=>!e.d.neutral&&!e.d.boss&&!e.dead);
   if(!foe){foe={type:'tank',d:{hp:9999,r:16,spd:0,stat:1,contact:0},hp:9999,max:9999,r:16,a:0,ta:0,t:99,slow:0,hit:0,flash:0,dead:false,st:'walk',pt:2,spin:0,t2:0,t3:0};G.ents.push(foe);} // every ability needs something to hit
   foe.x=P.x+Math.cos(P.a)*90;foe.y=P.y+Math.sin(P.a)*90;
   if(id==='drone')for(let i=0;i<10;i++)api.update(1/60);
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
// --- ranged and static enemies can't pile up (per-type caps) ---
{api.SAVE.selMap='dust';api.startRun();const G=api.G,P=G.p;G.stage=2;let maxT=0,maxW=0;
 for(let i=0;i<60*120;i++){if(api.mode==='play'){api.joy.dx=0;api.joy.dy=0;api.update(1/60);P.hp=P.maxHp;if(G.boss)G.boss=null,G.bossSpawned=true;
   const c=r=>G.ents.filter(e=>!e.dead&&(e.d.base||e.type)===r).length;maxT=Math.max(maxT,c('tank'));maxW=Math.max(maxW,c('tower'));}else api.pick(0);}
 assert.ok(maxT<=4&&maxW<=2,'Greenvale caps: tanks '+maxT+' towers '+maxW);console.log('type caps ok: tanks',maxT,'towers',maxW);api.endRun('quit');}
// --- Main Gun swings up to 45° each way, never further ---
{api.SAVE.selMap='dust';api.startRun();const G=api.G,P=G.p;P.modules.front=api.mkMod('cannon',1);
 const test=(deg)=>{G.ents=G.ents.filter(e=>e.d.neutral);G.spawnT=G.helperT=1e9;G.pb.length=0;P.gunO=0;P.v=0;P.a=0;P.modules.front.t=0;
   api.joy.dx=api.joy.dy=0;
   api.update(0);api.G.ents.push(Object.assign(Object.create(null),{type:'tank',d:{hp:9999,r:16,spd:0,stat:1,contact:0},x:P.x+Math.cos(deg*Math.PI/180)*250,y:P.y+Math.sin(deg*Math.PI/180)*250,hp:9999,max:9999,r:16,a:0,ta:0,t:99,slow:0,hit:0,flash:0,dead:false,st:'walk',pt:2,spin:0,t2:0,t3:0}));
   let shots=0;for(let i=0;i<40;i++){P.v=0;P.a=0;const n=G.pb.length;api.update(1/60);if(G.pb.length>n)shots++;P.hp=P.maxHp;}
   return {shots,gun:Math.round(P.gunO*180/Math.PI)};};
 const r35=test(35),r70=test(70),rm35=test(-35);
 assert.ok(r35.shots>0&&Math.abs(r35.gun-35)<=3,'gun swings 35° and fires '+JSON.stringify(r35));
 assert.ok(rm35.shots>0&&Math.abs(rm35.gun+35)<=3,'and to the other side '+JSON.stringify(rm35));
 assert.ok(r70.shots===0&&Math.abs(r70.gun)<=45,'never past 45° '+JSON.stringify(r70));
 console.log('gun traverse ok:',JSON.stringify({r35,rm35,r70}));api.render();api.endRun('quit');}
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
// --- mastery: at level 8 every module offers a passive or ability capstone, and each one works ---
{api.SAVE.selMap='dust';api.startRun();const G=api.G,P=G.p;
 const slotOf={cannon:'front',plow:'front',broadside:'side',flamer:'side',mines:'back',drone:'back',layer:'back',turret:'top',tesla:'top'};
 const dummy=(x,y)=>{const e={type:'tank',d:{hp:1e6,r:16,spd:0,stat:1,contact:0},hp:1e6,max:1e6,r:16,a:0,ta:0,t:99,slow:0,hit:0,flash:0,dead:false,st:'walk',pt:2,spin:0,t2:0,t3:0,x,y};G.ents.push(e);return e;};
 const res={};
 api.MODS_CD_TURRET=api.mkMod('turret',1).cd;
 for(const id in api.MASTERY)for(const pick of [0,1]){
   api.setMode('play');G.ents=G.ents.filter(e=>e.d.neutral);G.spawnT=G.helperT=1e9;G.burns=[];G.mines=[];G.sentries=[];G.drones=[];P.a=0;P.gunO=0;
   const slot=slotOf[id];const m=api.mkMod(id,1);m.lvl=8;P.modules[slot]=m;
   api.afterPick();assert.strictEqual(api.mode,'level',id+' offers mastery');api.pick(pick);
   assert.strictEqual(m.mastery,pick?'a':'p',id+' mastery applied');
   const front=dummy(P.x+120,P.y),back=dummy(P.x-120,P.y);
   const ex0=m.extra;assert.ok(api.useAbility(slot),id+'/'+m.mastery+' ability fires');
   const r={burns:G.burns.length,mines:G.mines.length,sentries:G.sentries.length,backHit:back.hp<1e6};
   for(let i=0;i<60*2;i++){if(api.mode!=='play'){api.pick(0);api.setMode('play');}api.update(1/60);P.hp=P.maxHp;if(i%20===0){api.render();api.R3.on=false;api.render();api.R3.on=true;}}
   r.backHit2=back.hp<1e6;res[id+'/'+m.mastery]=r;
   if(m.mastery==='a'){
     if(id==='cannon')assert.ok(r.burns>3,'Siege Shell leaves fire');
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
