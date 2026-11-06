'use strict';
(()=>{
 if(!('serviceWorker' in navigator))return;
 let requested=false,registration,lastCheck=0;
 const banner=document.createElement('aside');
 banner.className='update-banner';banner.hidden=true;
 const button=document.createElement('button'),message=document.createElement('p');
 button.type='button';button.className='primary';
 button.textContent='Opdatering klar – tryk her for at opdatere';
 message.setAttribute('role','status');banner.append(button,message);document.body.append(banner);
 const show=()=>{if(registration.waiting&&navigator.serviceWorker.controller)banner.hidden=false;};
 button.onclick=async()=>{
  button.disabled=true;message.textContent='';
  try{
   if(!registration.waiting){message.textContent='Opdateringen er ikke længere klar. Prøv at åbne appen igen.';return;}
   const reason=await window.lagerPrepareUpdate();
   if(reason){message.textContent=reason;return;}
   requested=true;
   message.textContent='Opdaterer… Din kladde er bevaret.';
   registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});
  }catch(e){message.textContent='Kladden kunne ikke gemmes på enheden. Appen er ikke opdateret. Prøv igen.';}
  finally{if(!requested)button.disabled=false;}
 };
 // Other open tabs keep their current page. Only the tab that requested an
 // update reloads, after its draft has been committed to local storage.
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(requested)location.reload();});
 const checker=document.createElement('button');
 checker.type='button';checker.className='update-check';checker.textContent='Søg efter opdatering';
 const checkStatus=document.createElement('p');checkStatus.className='update-check-status';checkStatus.setAttribute('role','status');
 const controls=document.createElement('div');controls.className='update-controls';controls.append(checker,checkStatus);document.body.append(controls);
 checker.disabled=true;
 navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(r=>{
  registration=r;checker.disabled=false;show();
  const watch=()=>{
   const worker=r.installing;
   if(worker)worker.addEventListener('statechange',()=>{
    if(worker.state==='installed'){show();if(r.waiting)checkStatus.textContent='Opdatering klar – brug den grønne opdateringsknap.';}
    if(worker.state==='redundant')checkStatus.textContent='Opdateringen kunne ikke hentes. Prøv igen med internetforbindelse.';
   });
  };
  r.addEventListener('updatefound',watch);watch();
  const check=async(force=false)=>{
   if(document.hidden)return;
   if(!navigator.onLine){if(force)checkStatus.textContent='Ingen internetforbindelse. Prøv igen, når du er online.';return;}
   if(!force&&Date.now()-lastCheck<30000)return;
   lastCheck=Date.now();
   if(force){checker.disabled=true;checkStatus.textContent='Søger efter opdatering…';}
   try{
    await r.update();show();
    if(force)checkStatus.textContent=r.waiting?'Opdatering klar – brug den grønne opdateringsknap.':r.installing?'Henter opdateringen…':'Ingen ny opdatering fundet lige nu.';
   }catch(e){if(force)checkStatus.textContent='Kunne ikke søge efter opdatering. Kontrollér internetforbindelsen og prøv igen.';}
   finally{checker.disabled=false;}
  };
  checker.onclick=()=>check(true);
  document.addEventListener('visibilitychange',()=>check());
  window.addEventListener('focus',()=>check());
  window.addEventListener('pageshow',()=>check());
  window.addEventListener('online',()=>check(true));setInterval(()=>check(),60000);check();
 }).catch(()=>{checkStatus.textContent='Appens opdateringskontrol kunne ikke starte. Luk appen helt og åbn den igen.';});
})();
