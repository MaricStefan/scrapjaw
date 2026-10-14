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
 G.p.modules.back={...G.p.modules.back,id:'mines',lvl:10};
 const got=api.checkQuests(true);assert.ok(got.some(q=>q.id==='m_mines'),'mine dropper milestone');assert.ok(S.mods.includes('layer'));
 api.endRun('quit');assert.ok(G.qDone.some(q=>q.id==='m_mines'));assert.ok(S.silver>=silver0);
 assert.ok(S.best.time>0||G.t===0);const runs=S.runs;
 // done quests never pay twice
 api.startRun();api.checkQuests(true);assert.ok(!api.G.qDone.some(q=>q.id==='m_mines'));api.endRun('quit');assert.strictEqual(S.runs,runs+1);}
// --- the Turret Layer plants sentries that shoot ---
{api.SAVE.selMap='dust';api.startRun();const G=api.G;const P=G.p;
 P.modules.back={id:'layer',lvl:1,dmg:9,cd:5,range:300,radius:0,shots:1,extra:1,t:0,act:0};
 let shots=0,maxS=0;for(let i=0;i<60*40;i++){if(api.mode==='play'){api.joy.dx=Math.cos(i/90);api.joy.dy=Math.sin(i/70);const n=G.pb.length;api.update(1/60);maxS=Math.max(maxS,G.sentries.length);if(G.pb.length>n)shots++;P.hp=P.maxHp;if(i%30===0)api.render();}else if(api.mode==='level'||api.mode==='boss')api.pick(0);}
 assert.ok(maxS>=2&&maxS<=P.modules.back.extra+1,'sentry cap '+maxS);assert.ok(shots>0);api.render();
 console.log('turret layer: max sentries',maxS,'fx',api.R3.fx.sentry.count);api.endRun('quit');}
// inspect 3D state after a fresh run
api.SAVE.selMap='dust';api.startRun();for(let i=0;i<60*20;i++){if(api.mode==='play'){api.joy.dx=1;api.joy.dy=0;api.update(1/60);}else if(api.mode==='level')api.pick(0);}
api.render();
const R=api.R3;
console.log('R3 on',R.on,'d',Math.round(R.d),'trees',R.trees.length,'flattened',R.trees.filter(t=>t.flat).length);
const counts={};for(const t in R.parts)counts[t]=R.parts[t][0].im.count;console.log('visible',JSON.stringify(counts));
console.log('fx',Object.entries(R.fx).map(([k,v])=>k+':'+v.count).join(' '));
const G=api.G;const ds=G.ents.filter(e=>!e.d.neutral).map(e=>Math.round(Math.hypot(e.x-G.p.x,e.y-G.p.y)));console.log('hostile dists min/median',Math.min(...ds),ds.sort((a,b)=>a-b)[ds.length>>1]);
