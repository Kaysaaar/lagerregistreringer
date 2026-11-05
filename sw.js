const CACHE='wallmann-lager-1.0.7';const FILES=['./','./index.html','./office.html','./style.css','./app.js','./activation.js','./jsQR.js','./updates.js','./config.js','./wallmann-logo.png','./manifest.json','./office-manifest.json','./warehouse-icon-180.png','./warehouse-icon-192.png','./warehouse-icon-512.png','./office-icon-180.png','./office-icon-192.png','./office-icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('wallmann-lager-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('message',e=>{if(e.data&&e.data.type==='ACTIVATE_UPDATE')self.skipWaiting();});
// Serve one complete release, rather than mixing new HTML with old scripts.
// Only this app's static files are cached; never API calls or customer images.
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const url=new URL(e.request.url),base=self.registration.scope;
 if(!FILES.some(file=>new URL(file,base).href===url.origin+url.pathname))return;
 e.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(url.origin+url.pathname))||fetch(e.request)));
});
