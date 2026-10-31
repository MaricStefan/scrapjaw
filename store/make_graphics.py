# Builds the Google Play graphics from the real game in headless Chromium (needs: pip install playwright && playwright install chromium)
# Usage: py -3 store/make_graphics.py
#   icons/icon-192.png, icons/icon-512.png, icons/maskable-512.png   PNG app icons (drawn from the SVGs in manifest.webmanifest)
#   store/graphics/icon-512.png                                       Play listing icon
#   store/graphics/feature-1024x500.png                               Play feature graphic
#   store/graphics/screenshot-*.png                                   1920x1080 phone screenshots (landscape, 16:9)
# Rerun it before release so the screenshots show the finished game.
import asyncio, json, pathlib, urllib.parse
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parent.parent
OUT=ROOT/'store'/'graphics'
THREE=(ROOT/'node_modules/three/build/three.min.js').read_text()
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']

async def icons(b):
    m=json.loads((ROOT/'manifest.webmanifest').read_text(encoding='utf-8'))
    svg={i['purpose']:urllib.parse.unquote(i['src'].split(',',1)[1]) for i in m['icons'] if i['type']=='image/svg+xml'}
    (ROOT/'icons').mkdir(exist_ok=True)
    for name,purpose,size in [('icon-192','any',192),('icon-512','any',512),('maskable-512','maskable',512)]:
        pg=await b.new_page(viewport={'width':size,'height':size})
        await pg.set_content(f'<html><body style="margin:0;background:transparent">{svg[purpose].replace("<svg ","<svg width=%d height=%d "%(size,size),1)}</body></html>')
        await pg.screenshot(path=str(ROOT/'icons'/f'{name}.png'),omit_background=True,clip={'x':0,'y':0,'width':size,'height':size})
        await pg.close()
    (OUT/'icon-512.png').write_bytes((ROOT/'icons'/'icon-512.png').read_bytes())

async def game_page(b,w,h,dsf):
    pg=await b.new_page(viewport={'width':w,'height':h},device_scale_factor=dsf,is_mobile=True,has_touch=True)
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.add_init_script("window.__SJ_TEST=a=>window.__api=a;localStorage.setItem('scrapjaw-v1',JSON.stringify({silver:4200,maps:['dust','iron','ash'],caps:['sarge','greta','rolf'],chassis:['standard','scout','bulwark'],crew:['riflemen','mortar']}))")
    await pg.route('**/three.min.js',lambda r:r.fulfill(body=THREE,content_type='application/javascript'))
    await pg.goto((ROOT/'index.html').as_uri());await pg.wait_for_timeout(900)
    return pg,errs

# fast-forward helper: drive in loops, pick upgrade cards, never die
FF="""()=>{const a=__api;window.__ff=(secs,stop)=>{for(let i=0;i<secs*60;i++){if(a.mode==='play'){a.joy.dx=Math.cos(a.G.t*0.4);a.joy.dy=Math.sin(a.G.t*0.55);a.update(1/60);a.G.p.hp=Math.max(a.G.p.hp,a.G.p.maxHp*0.6);}
  else if(a.mode==='level'||a.mode==='boss'){if(stop)return a.mode;a.pick(Math.floor(Math.random()*2));}}return a.mode;};}"""
CLEAR="()=>{for(let k=0;k<30&&__api.mode!=='play';k++)__api.pick(0);document.querySelectorAll('#banner,#hint').forEach(e=>e.style.visibility='hidden');__api.render();}"

async def screenshots(b):
    pg,errs=await game_page(b,960,540,2) # 1920x1080, inside the phone layout
    await pg.evaluate(FF)
    shots=[]
    async def snap(name):
        await pg.wait_for_timeout(450);p=OUT/f'screenshot-{name}.png';await pg.screenshot(path=str(p));shots.append(p.name)
    await pg.click('#startBtn');await pg.wait_for_timeout(300);await snap('6-garage')
    # Greenvale with fighting crew, drones and a full loadout
    await pg.evaluate("()=>{const a=__api;a.SAVE.selMap='dust';a.SAVE.selCrew='riflemen';a.startRun();const P=a.G.p;P.modules.side=a.mkMod('broadside');P.modules.back=a.mkMod('drone');P.modules.top=a.mkMod('turret');P.modules.back.extra=3;__ff(40);}")
    await pg.evaluate(CLEAR);await snap('1-greenvale')
    await pg.evaluate("()=>{__api.setMode('play');__ff(60,true);}");await snap('5-upgrade-cards')
    # Ironfield boss fight
    await pg.evaluate("""()=>{const a=__api;a.SAVE.selMap='iron';a.SAVE.selChassis='bulwark';a.startRun();const G=a.G;__ff(20);for(let k=0;k<30&&a.mode!=='play';k++)a.pick(0);
      G.ents=G.ents.filter(e=>e.d.neutral);G.stage=2;G.stageT=74.9;G.bossSpawned=false;G.p.rank=1;G.p.tier=1;G.p.tline='a';
      for(let i=0;i<60*5;i++){if(a.mode!=='play'){a.pick(0);a.setMode('play');}a.joy.dx=Math.cos(i/50);a.joy.dy=Math.sin(i/40);a.update(1/60);G.p.hp=G.p.maxHp;}
      if(G.boss){G.cam.x=(G.boss.x+G.p.x)/2;G.cam.y=(G.boss.y+G.p.y)/2;}}""")
    await pg.evaluate(CLEAR);await snap('2-ironfield-boss')
    # Ashlands with troops, escort and rockets
    await pg.evaluate("""()=>{const a=__api;a.SAVE.selMap='ash';a.SAVE.selChassis='scout';a.startRun();const P=a.G.p;
      P.modules.side=a.mkMod('troops');P.modules.back=a.mkMod('escort');P.modules.top=a.mkMod('missiles');P.modules.side.t=0;__ff(35);}""")
    await pg.evaluate(CLEAR);await snap('3-ashlands')
    # Overtime at night
    await pg.evaluate("""()=>{const a=__api;a.SAVE.selMap='dust';a.SAVE.selChassis='standard';a.startRun();const G=a.G;__ff(25);for(let k=0;k<30&&a.mode!=='play';k++)a.pick(0);
      G.stage=4;G.overtime=true;G.otT=0;G.otNext=30;G.bossSpawned=true;G.p.rank=3;G.p.tier=3;G.p.tline='s';__ff(25);}""")
    await pg.evaluate(CLEAR);await pg.wait_for_timeout(1200);await snap('4-overtime')
    await pg.close();return errs,shots

async def feature(b):
    pg,errs=await game_page(b,1024,500,1)
    await pg.evaluate("""()=>{const api=__api;api.SAVE.selMap='dust';api.startRun();const G=api.G,P=G.p,R3=api.R3;G.ents=G.ents.filter(e=>e.d.neutral);G.spawnT=1e9;api.render();R3.player.root.visible=false;
      const M=(f,s,b,t)=>({front:api.mkMod(f),side:s&&api.mkMod(s),back:b&&api.mkMod(b),top:t&&api.mkMod(t)});
      [['amx13_105',M('autocannon','rockets','booster',null),-130,40],['t54',M('cannon','broadside','drone','turret'),0,0],['is3',M('cannon','smoke','escort','howitzer'),135,40]].forEach(([id,mods,dx,dz])=>{
        const m=api.tankMesh3D(api.TANKS[id],mods,'');m.root.position.set(P.x+dx+60,0,P.y+dz);m.root.rotation.y=-0.35;m.root.scale.set(34,34,34);R3.scene.add(m.root);});
      G.cam.x=P.x;G.cam.y=P.y+10;R3.d=300;api.render();R3.d=300;api.render();
      document.querySelectorAll('#hud,#banner,#hint').forEach(e=>e.style.display='none');
      const t=document.createElement('div');t.innerHTML='<div style="font:72px \\'Black Ops One\\',sans-serif;color:#f3ead7;text-shadow:0 5px 0 #1d1a12,0 0 24px rgba(0,0,0,.6);line-height:1">SCRAPJAW</div><div style="font:600 30px \\'Barlow Condensed\\',sans-serif;color:#f3ead7;text-shadow:0 2px 6px #000;margin-top:8px">Drive a tank that eats the battlefield.</div>';
      t.style.cssText='position:fixed;left:44px;top:46px;z-index:99';document.body.appendChild(t);}""")
    await pg.wait_for_timeout(700);await pg.screenshot(path=str(OUT/'feature-1024x500.png'))
    await pg.close();return errs

async def main():
    OUT.mkdir(parents=True,exist_ok=True)
    async with async_playwright() as p:
        b=await p.chromium.launch(args=ARGS)
        await icons(b)
        e1,shots=await screenshots(b)
        e2=await feature(b)
        await b.close()
    print('icons, feature graphic and screenshots:',', '.join(shots))
    print('page errors:',(e1+e2) or 'none')
asyncio.run(main())
