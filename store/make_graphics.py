# Builds the Google Play graphics from the real game in headless Chromium (needs: pip install playwright && playwright install chromium)
# Usage: py -3 store/make_graphics.py
#   icons/icon-192.png, icons/icon-512.png, icons/maskable-512.png   PNG app icons (drawn from the SVGs in manifest.webmanifest)
#   store/graphics/icon-512.png                                       Play listing icon
#   store/graphics/feature-1024x500.png                               Play feature graphic
#   store/graphics/screenshot-*.png                                   1920x1080 raw game screenshots (landscape, 16:9)
#   store/graphics/play-*.png                                         1920x1080 captioned store screenshots (upload these)
# Rerun it before release so the screenshots show the finished game.
import asyncio, base64, json, pathlib, urllib.parse
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
    await pg.add_init_script("window.__SJ_TEST=a=>window.__api=a;localStorage.setItem('scrapjaw-v1',JSON.stringify({silver:4200,maps:['dust','iron','ash'],caps:['sarge','greta','rolf'],chassis:['standard','scout','bulwark'],crew:['riflemen','mortar'],mods:['broadside','drone','rockets','howitzer','booster','tesla','flamer','mines','turret','troops'],selMod:'rockets'}))")
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
    await pg.click('#startBtn');await pg.wait_for_timeout(900);await snap('6-world-map')
    await pg.click('#mapGo');await pg.wait_for_timeout(600)
    await pg.click('#bTabs button:has-text("Module")');await pg.wait_for_timeout(600);await snap('7-build')
    # Greenvale with fighting crew, drones and a full loadout
    await pg.evaluate("()=>{const a=__api;a.SAVE.selMap='dust';a.SAVE.selCrew='riflemen';a.startRun();const P=a.G.p;P.modules.side=a.mkMod('broadside');P.modules.back=a.mkMod('drone');P.modules.top=a.mkMod('turret');P.modules.back.extra=3;__ff(40);}")
    await pg.evaluate(CLEAR);await snap('1-greenvale')
    await pg.evaluate("()=>{__api.setMode('play');__ff(60,true);}");await snap('5-upgrade-cards')
    # Ironfield boss fight
    await pg.evaluate("""()=>{const a=__api;a.SAVE.selMap='iron';a.SAVE.selChassis='bulwark';a.startRun();const G=a.G;__ff(20);for(let k=0;k<30&&a.mode!=='play';k++)a.pick(0);
      G.ents=G.ents.filter(e=>e.d.neutral);G.stage=2;G.stageT=74.9;G.bossSpawned=false;G.p.rank=1;G.p.tier=1;G.p.tline='a';
      for(let i=0;i<60*5;i++){if(a.mode!=='play'){a.pick(0);a.setMode('play');}a.joy.dx=Math.cos(i/50);a.joy.dy=Math.sin(i/40);a.update(1/60);G.p.hp=G.p.maxHp;}
      G.hazards&&(G.hazards.length=0);G.clouds&&(G.clouds.length=0);
      if(G.boss){G.boss.x=G.p.x+300;G.boss.y=G.p.y-40;G.boss.a=Math.PI;for(let i=0;i<40;i++){a.update(1/60);G.p.hp=G.p.maxHp;}G.cam.x=(G.boss.x+G.p.x)/2;G.cam.y=(G.boss.y+G.p.y)/2;}}""")
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

CAPTIONS=[ # (raw screenshot, store file, headline, sub line) in upload order
  ('1-greenvale','1','Eat the battlefield','Swallow scrap, soldiers and huts to grow your tank'),
  ('2-ironfield-boss','2','Twelve historic bosses','From the KV-2 to the Maus and the Schwerer Gustav'),
  ('3-ashlands','3','Build a rolling fortress','Bolt on rockets, drones, troops and missiles'),
  ('7-build','4','Your tank, your way','Chassis, captain, crew, module and kit'),
  ('5-upgrade-cards','5','Upgrade at every level','A new choice of cards each time you level up'),
  ('4-overtime','6','Endless Overtime','Night falls, mortars rain, the silver keeps coming'),
  ('6-world-map','7','Nine battlefields','Three regions, each with its own enemies'),
]
async def captioned(b):
    pg=await b.new_page(viewport={'width':1920,'height':1080})
    made=[]
    for raw,num,head,sub in CAPTIONS:
        src='data:image/png;base64,'+base64.b64encode((OUT/f'screenshot-{raw}.png').read_bytes()).decode()
        await pg.set_content(f"""<html><head><link href="https://fonts.googleapis.com/css2?family=Black+Ops+One&family=Barlow+Condensed:wght@600&display=swap" rel="stylesheet">
<style>body{{margin:0;width:1920px;height:1080px;overflow:hidden;background:radial-gradient(ellipse at 50% 0%,#3b3326,#1e1922 70%);font-family:'Barlow Condensed',sans-serif}}
.st{{position:absolute;left:0;right:0;top:0;height:14px;background:repeating-linear-gradient(-45deg,#f0b429 0 22px,#1e1922 22px 44px)}}
h1{{position:absolute;top:34px;left:0;right:0;margin:0;text-align:center;font:84px 'Black Ops One',sans-serif;color:#f3ead7;text-shadow:0 5px 0 #0e0c10;letter-spacing:1px}}
p{{position:absolute;top:132px;left:0;right:0;margin:0;text-align:center;font-weight:600;font-size:40px;color:#f0b429}}
img{{position:absolute;left:{(1920-1540)//2}px;top:196px;width:1540px;height:866px;border-radius:26px;border:6px solid #0e0c10;box-shadow:0 18px 50px rgba(0,0,0,.6)}}</style></head>
<body><div class=st></div><h1>{head}</h1><p>{sub}</p><img src="{src}"></body></html>""",wait_until='networkidle')
        await pg.evaluate('document.fonts.ready');await pg.wait_for_timeout(200)
        name=f'play-{num}-{raw.split("-",1)[1]}.png';await pg.screenshot(path=str(OUT/name));made.append(name)
    await pg.close();return made

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
        play=await captioned(b)
        await b.close()
    print('icons, feature graphic and screenshots:',', '.join(shots))
    print('captioned store screenshots:',', '.join(play))
    print('page errors:',(e1+e2) or 'none')
asyncio.run(main())
