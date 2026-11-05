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
 navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(r=>{
  registration=r;show();
  r.addEventListener('updatefound',()=>{
   const worker=r.installing;
   if(worker)worker.addEventListener('statechange',()=>{if(worker.state==='installed')show();});
  });
  const check=()=>{
   if(document.hidden||!navigator.onLine||Date.now()-lastCheck<300000)return;
   lastCheck=Date.now();r.update().catch(()=>{});show();
  };
  document.addEventListener('visibilitychange',check);
  window.addEventListener('online',check);setInterval(check,300000);check();
 }).catch(()=>{});
})();
