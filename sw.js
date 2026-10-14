// Scrapjaw service worker: lets the game install and run offline.
// The game page is network-first (updates arrive when online); the pinned three.js and the fonts are cache-first.
// Bump VERSION when this file's caching rules change.
const VERSION='scrapjaw-v1';
const CORE=['./','./index.html','./manifest.webmanifest','https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(VERSION).then(c=>c.addAll(CORE.map(u=>new Request(u,{mode:u.startsWith('http')?'cors':'same-origin'})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const url=new URL(req.url);
  const page=req.mode==='navigate'||(url.origin===location.origin&&/(\/|\.html|\.webmanifest)$/.test(url.pathname));
  if(page){ // network first, fall back to the cached copy
    e.respondWith(fetch(req).then(r=>{if(r.ok){const c=r.clone();caches.open(VERSION).then(ca=>ca.put(req,c));}return r;})
      .catch(()=>caches.match(req,{ignoreSearch:true}).then(r=>r||caches.match('./index.html'))));
    return;
  }
  if(/cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com/.test(url.host)){ // cache first
    e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(r=>{if(r.ok||r.type==='opaque'){const c=r.clone();caches.open(VERSION).then(ca=>ca.put(req,c));}return r;})));
  }
});
