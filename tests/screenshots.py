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
        pg=await b.new_page(viewport={'width':390,'height':844},device_scale_factor=2)
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
        await pg.evaluate("()=>{if(__api.mode!=='play'){__api.setMode('play');}__api.endRun(false);}");await pg.wait_for_timeout(1300);await pg.screenshot(path=str(ROOT/'shots/over.png'))
        print('page errors:',errs or 'none')
        await b.close()
asyncio.run(main())
