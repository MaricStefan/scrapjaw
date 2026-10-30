# Renders real screenshots in headless Chromium (needs: pip install playwright && playwright install chromium)
# Usage: python3 tests/screenshots.py  (Windows: py -3 tests/screenshots.py)  -> writes shots/*.png
import asyncio, os, pathlib
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parent.parent
THREE=(ROOT/'node_modules/three/build/three.min.js').read_text()
async def main():
    os.makedirs(ROOT/'shots',exist_ok=True)
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        # phone held upright: only the "turn your phone" prompt
        up=await b.new_page(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
        await up.route('**/three.min.js',lambda r:r.fulfill(body=THREE,content_type='application/javascript'))
        await up.goto((ROOT/'index.html').as_uri());await up.wait_for_timeout(500);await up.screenshot(path=str(ROOT/'shots/rotate.png'));await up.close()
        # the game is played on a phone in landscape
        pg=await b.new_page(viewport={'width':844,'height':390},device_scale_factor=2,is_mobile=True,has_touch=True)
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.add_init_script("window.__SJ_TEST=a=>window.__api=a")
        await pg.route('**/three.min.js',lambda r:r.fulfill(body=THREE,content_type='application/javascript'))
        await pg.goto((ROOT/'index.html').as_uri());await pg.wait_for_timeout(800)
        await pg.screenshot(path=str(ROOT/'shots/title.png'))
        await pg.click('#startBtn');await pg.wait_for_timeout(300);await pg.screenshot(path=str(ROOT/'shots/garage.png'))
        await pg.evaluate("document.querySelector('.gbody').scrollTop=1e6");await pg.wait_for_timeout(150);await pg.screenshot(path=str(ROOT/'shots/garage_milestones.png'))
        await pg.click('#rollBtn')
        await pg.evaluate("""()=>{const a=__api;window.__ff=(secs,stop)=>{for(let i=0;i<secs*60;i++){if(a.mode==='play'){a.joy.dx=Math.cos(a.G.t*0.4);a.joy.dy=Math.sin(a.G.t*0.55);a.update(1/60);a.G.p.hp=Math.max(a.G.p.hp,40);}else if(a.mode==='level'||a.mode==='boss'){if(stop)return a.mode;a.pick(Math.floor(Math.random()*3));}}return a.mode;};}""")
        await pg.evaluate("__ff(50)");await pg.wait_for_timeout(400);await pg.screenshot(path=str(ROOT/'shots/play.png'))
        await pg.evaluate("()=>{__api.G.rs.eat.scrap=(__api.G.rs.eat.scrap||0)+300;__api.G.qT=0;__ff(0.1);}");await pg.wait_for_timeout(450);await pg.screenshot(path=str(ROOT/'shots/toast.png'))
        await pg.evaluate("__ff(120,true)");await pg.wait_for_timeout(500);await pg.screenshot(path=str(ROOT/'shots/levelup.png'))
        # abilities: fire two, so one slot shows its cooldown sweep and the rest glow ready
        await pg.evaluate("()=>{const a=__api;a.pick(0);a.setMode('play');const P=a.G.p;if(!P.modules.top)P.modules.top=a.mkMod('turret',P.wdm);a.useAbility('front');a.useAbility('side');__ff(1.5);a.setMode('play');}")
        await pg.wait_for_timeout(400);await pg.screenshot(path=str(ROOT/'shots/abilities.png'))
        # last boss down -> Finish or Overtime
        await pg.evaluate("""()=>{const a=__api,G=a.G;G.stage=4;G.stageT=74;for(let i=0;i<60*20&&(a.mode==='play'||a.mode==='level');i++){if(a.mode==='level'){a.pick(0);continue;}a.update(1/60);G.p.hp=G.p.maxHp;if(G.boss)a.hurt(G.boss,1e9);}}""")
        await pg.wait_for_timeout(500);await pg.screenshot(path=str(ROOT/'shots/clear_choice.png'))
        await pg.evaluate("()=>{__api.pick(1);__ff(40);__api.setMode('play');}");await pg.wait_for_timeout(1200);await pg.screenshot(path=str(ROOT/'shots/overtime.png'))
        await pg.evaluate("()=>{if(__api.mode!=='play'){__api.setMode('play');}__api.endRun(false);}");await pg.wait_for_timeout(1300);await pg.screenshot(path=str(ROOT/'shots/over.png'))
        # Ironfield: the Foundry family, then each boss mid-fight
        await pg.evaluate("()=>{const a=__api;a.SAVE.maps.push('iron');a.SAVE.selMap='iron';a.startRun();__ff(45);a.setMode('play');}")
        await pg.wait_for_timeout(400);await pg.screenshot(path=str(ROOT/'shots/iron_play.png'))
        for st,name,secs in [(1,'ox',4.6),(2,'crane',4.2),(3,'anvil',5.6),(4,'duke',5)]:
            await pg.evaluate(f"""()=>{{const a=__api,G=a.G;a.setMode('play');G.ents=G.ents.filter(e=>e.d.neutral);G.boss=null;G.stage={st};G.stageT=74.9;G.bossSpawned=false;G.p.rank={st}-1;
              for(let i=0;i<60*{secs};i++){{if(a.mode!=='play'){{a.pick(0);a.setMode('play');}}a.joy.dx=Math.cos(i/50);a.joy.dy=Math.sin(i/40);a.update(1/60);G.p.hp=G.p.maxHp;}}
              if(G.boss){{G.cam.x=(G.boss.x+G.p.x)/2;G.cam.y=(G.boss.y+G.p.y)/2;}}}}""")
            await pg.wait_for_timeout(500);await pg.screenshot(path=str(ROOT/f'shots/iron_{name}.png'))
        # tank lines: the boss reward names the next tank, the new model in play, then all 21 models (rows: scout, standard, bulwark; base, speed 1-3, armor 1-3)
        await pg.evaluate("()=>{const a=__api;a.SAVE.selMap='dust';a.SAVE.selChassis='standard';a.startRun();__ff(3);a.setMode('play');a.G.stage=1;a.openBossReward();}")
        await pg.wait_for_timeout(500);await pg.screenshot(path=str(ROOT/'shots/boss_reward.png'))
        await pg.evaluate("()=>{__api.pick(1);__ff(2);__api.setMode('play');}");await pg.wait_for_timeout(400);await pg.screenshot(path=str(ROOT/'shots/tank_tier1.png'))
        await pg.evaluate("""()=>{const api=__api;api.startRun();const G=api.G,P=G.p,R3=api.R3;G.ents=[];G.spawnT=1e9;api.render();R3.player.root.visible=false;
          const M={front:api.mkMod('cannon'),side:null,back:null,top:null};
          ['scout','standard','bulwark'].forEach((ch,r)=>{const L=api.LINES[ch];[L.base,...L.s,...L.a].forEach((id,c)=>{
            const m=api.tankMesh3D(api.TANKS[id],M);m.root.position.set(P.x+(c-3)*95,0,P.y+(r-1)*120);m.root.rotation.y=-0.5;m.root.scale.set(30,30,30);R3.scene.add(m.root);});});
          G.cam.x=P.x;G.cam.y=P.y;R3.d=330;api.render();R3.d=330;api.render();document.querySelectorAll('#hud,#banner').forEach(e=>e.style.display='none');}""")
        await pg.wait_for_timeout(300);await pg.screenshot(path=str(ROOT/'shots/tanks.png'))
        print('page errors:',errs or 'none')
        await b.close()
asyncio.run(main())
