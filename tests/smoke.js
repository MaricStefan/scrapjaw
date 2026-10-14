// Headless smoke test: runs full game runs with stubbed DOM/WebGL and real three.js math.
// Usage: npm install && npm test
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const src='(()=>{'+html.split('<script>\n(()=>{')[1].split('</script>')[0];
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
  const G=api.G;console.log(map,cap,'t',t.toFixed(0),'stage',G.stage,'bosses',G.bossKills,'lvl',G.p.level,'silver',api.SAVE.silver,'maps',api.SAVE.maps.join('/'));
}
// natural difficulty (no god) on dustbowl, autopilot circles
for(let k=0;k<6;k++)run('dust','sarge',false);
// god runs to test unlock flow
run('dust','sarge',true);
api.SAVE.silver=5000;
for(const c of ['greta','rolf','sid','ida','lou'])api.SAVE.caps.push(c);
api.SAVE.mods.push('plow','flamer','drone','tesla');
run('iron','lou',true);run('ash','ida',true);run('ash','sid',false);run('iron','greta',false);
// inspect 3D state after a fresh run
api.SAVE.selMap='dust';api.startRun();for(let i=0;i<60*20;i++){if(api.mode==='play'){api.joy.dx=1;api.joy.dy=0;api.update(1/60);}else if(api.mode==='level')api.pick(0);}
api.render();
const R=api.R3;
console.log('R3 on',R.on,'d',Math.round(R.d),'trees',R.trees.length,'flattened',R.trees.filter(t=>t.flat).length);
const counts={};for(const t in R.parts)counts[t]=R.parts[t][0].im.count;console.log('visible',JSON.stringify(counts));
console.log('fx',Object.entries(R.fx).map(([k,v])=>k+':'+v.count).join(' '));
const G=api.G;const ds=G.ents.filter(e=>!e.d.neutral).map(e=>Math.round(Math.hypot(e.x-G.p.x,e.y-G.p.y)));console.log('hostile dists min/median',Math.min(...ds),ds.sort((a,b)=>a-b)[ds.length>>1]);
