# Checks the installable app (PWA) in headless Chromium: manifest + icon, service worker, install criteria, offline start.
# Needs internet the first time (three.js and fonts come from their CDNs) and: pip install playwright && playwright install chromium
# Usage: python3 tests/pwa.py   (Windows: py -3 tests/pwa.py)
import asyncio, functools, http.server, pathlib, sys, threading
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parent.parent

def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self,*a):pass
    h=functools.partial(Quiet,directory=str(ROOT))
    s=http.server.ThreadingHTTPServer(('127.0.0.1',0),h)
    threading.Thread(target=s.serve_forever,daemon=True).start()
    return s

async def main():
    srv=serve();url=f'http://localhost:{srv.server_address[1]}/'
    fails=[]
    def check(ok,msg):
        print(('ok   ' if ok else 'FAIL ')+msg)
        if not ok: fails.append(msg)
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        ctx=await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2)
        pg=await ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.add_init_script("window.__SJ_TEST=a=>window.__api=a")
        await pg.goto(url);await pg.wait_for_timeout(500)
        ready=await pg.evaluate("navigator.serviceWorker.ready.then(r=>!!r.active)")
        check(ready,'service worker active')
        m=await pg.evaluate("fetch('manifest.webmanifest').then(r=>r.json())")
        check(m.get('name')=='Scrapjaw' and m['icons'][0]['src'].startswith('data:image/svg+xml'),'manifest with in-code SVG icon')
        icon=await pg.evaluate("""()=>new Promise(res=>{const i=new Image();i.onload=()=>res([i.naturalWidth,i.naturalHeight]);i.onerror=()=>res(null);
          fetch('manifest.webmanifest').then(r=>r.json()).then(m=>i.src=m.icons[0].src);})""")
        check(bool(icon),'icon SVG decodes')
        await pg.reload();await pg.wait_for_timeout(1200) # second load is controlled by the worker
        check(await pg.evaluate("!!navigator.serviceWorker.controller"),'page controlled by the worker')
        cdp=await ctx.new_cdp_session(pg)
        ie=(await cdp.send('Page.getInstallabilityErrors'))['installabilityErrors']
        check(not ie,'installable (Chrome criteria)'+('' if not ie else ': '+str(ie)))
        check(await pg.evaluate("!!document.querySelector('link[rel=apple-touch-icon]')"),'apple-touch-icon generated')
        await pg.screenshot(path=str(ROOT/'shots/pwa_online.png'))
        # offline: the whole game must still boot, three.js included
        await ctx.set_offline(True)
        await pg.reload();await pg.wait_for_timeout(1500)
        st=await pg.evaluate("({three:!!window.THREE,api:!!window.__api,r3:!!(window.__api&&__api.R3.on),mode:window.__api&&__api.mode})")
        check(st['three'] and st['api'] and st['r3'],'boots offline with 3D: '+str(st))
        await pg.click('#startBtn');await pg.wait_for_timeout(300);await pg.click('#mapGo');await pg.click('#rollBtn');await pg.wait_for_timeout(300)
        check(await pg.evaluate("__api.mode")=='play','run starts offline')
        await pg.screenshot(path=str(ROOT/'shots/pwa_offline.png'))
        check(not errs,'no page errors'+('' if not errs else ': '+str(errs)))
        await b.close()
    srv.shutdown()
    if fails: sys.exit(1)
asyncio.run(main())
