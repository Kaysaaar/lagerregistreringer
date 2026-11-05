'use strict';
// QR images are decoded on this device. Only a validated activation token reaches our API.
(()=>{
function parseLink(value,role,base=location.href){
 let u;try{u=new URL(String(value).trim());}catch(_){throw Error('Indsæt hele det personlige aktiveringslink fra administratoren.');}
 const root=new URL('./',base),file=role==='office'?'office.html':'index.html';
 if(u.origin!==root.origin||u.pathname!==root.pathname+file||u.username||u.password||u.search)throw Error('QR-koden er ikke et personligt link til denne app.');
 const parts=new URLSearchParams(u.hash.slice(1)),token=parts.get('activate');
 if([...parts.keys()].length!==1||!token||!/^([a-f0-9-]{36})\.([a-f0-9]{64})$/i.test(token))throw Error('Aktiveringslinket er ugyldigt. Bed administratoren om et nyt.');
 const [id,key]=token.split('.');return {id,token:key};
}
async function mount({app,role,activate,initialLink}){
 const installed=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 app.innerHTML='<section class="card activation"><h1>Aktivér denne enhed</h1><p id="installHint"></p><button type="button" id="scanActivation" class="primary full">Scan din personlige QR-kode</button><details id="pasteActivation"><summary>Indsæt aktiveringslink</summary><form id="activationForm"><label>Personligt link<textarea id="activationLink" rows="3" autocomplete="off" autocapitalize="off" spellcheck="false" required></textarea></label><button class="primary full">Aktivér enhed</button></form></details><p id="activationMessage" role="status" aria-live="polite"></p><p class="muted">Adgangen gemmes på denne enhed. Din administrator kan tilbagekalde den.</p></section><dialog id="qrScanner"><div class="row"><h2>Scan personlig QR</h2><button type="button" id="closeQr">Annullér</button></div><video autoplay muted playsinline></video><p id="qrMessage" role="status">Hold kameraet mod QR-koden på administratorens skærm.</p></dialog>';
 const el=id=>document.getElementById(id),message=t=>el('activationMessage').textContent=t;
 const needsInstall=ios&&!installed;
 el('installHint').textContent=needsInstall?'Installér først: Tryk Del → Føj til hjemmeskærm. Åbn derefter appens ikon, og scan din personlige QR-kode herinde. Dit link er ikke brugt endnu.':'Scan den personlige QR-kode, som din administrator viser på sin PC. Du skal kun aktivere én gang.';
 if(needsInstall){el('scanActivation').disabled=true;el('pasteActivation').hidden=true;}
 let stream=null,timer=null,generation=0,submitting=false;
 const dialog=el('qrScanner'),video=dialog.querySelector('video');
 function stop(){generation++;clearTimeout(timer);if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;}
 function close(){stop();if(dialog.open)dialog.close();}
 async function submit(value){if(submitting||needsInstall)return;let data;try{data=parseLink(value,role);}catch(e){message(e.message);return;}
 close();submitting=true;el('scanActivation').disabled=true;el('activationForm').querySelector('button').disabled=true;message('Aktiverer enheden…');
 try{await activate(data);location.reload();}catch(e){message(e.message+' Du kan prøve igen eller få et nyt link hos administratoren.');submitting=false;el('scanActivation').disabled=false;el('activationForm').querySelector('button').disabled=false;}
 }
 el('closeQr').onclick=close;dialog.addEventListener('cancel',stop);
 window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)close();});
 el('scanActivation').onclick=async()=>{
 close();dialog.showModal();el('qrMessage').textContent='Hold kameraet mod QR-koden på administratorens skærm.';const own=++generation;
 try{
  if(typeof window.jsQR!=='function')throw Error('QR-scanneren kunne ikke indlæses.');
  const acquired=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
  if(own!==generation){acquired.getTracks().forEach(t=>t.stop());return;}stream=acquired;video.srcObject=stream;await video.play();
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
  function frame(){if(own!==generation)return;
   try{if(video.readyState>=2&&video.videoWidth){const scale=Math.min(1,960/video.videoWidth);canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);ctx.drawImage(video,0,0,canvas.width,canvas.height);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);const code=window.jsQR(pixels.data,pixels.width,pixels.height,{inversionAttempts:'dontInvert'});if(code){try{parseLink(code.data,role);submit(code.data);return;}catch(e){el('qrMessage').textContent=e.message;}}}}catch(_){el('qrMessage').textContent='Kunne ikke aflæse koden. Hold telefonen stille, eller indsæt linket i stedet.';}
   timer=setTimeout(frame,180);
  }frame();
 }catch(e){if(own!==generation)return;close();message('Kameraet kunne ikke åbnes. Tillad kamera i telefonens indstillinger, eller brug “Indsæt aktiveringslink”.');el('pasteActivation').open=true;}
 };
 el('activationForm').onsubmit=e=>{e.preventDefault();submit(el('activationLink').value);};
 if(initialLink&&!needsInstall){el('activationLink').value=initialLink;el('pasteActivation').open=true;message('Dit personlige link er klar. Tryk Aktivér enhed.');}
 window.lagerActivationBusy=()=>submitting||dialog.open;
}
window.LagerActivation={parseLink,mount};
})();
