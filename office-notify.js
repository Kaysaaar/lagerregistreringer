(function(root){
'use strict';
// Kontor-notifikationer (1.2.0). Hver kontorenhed vælger selv, hvilke ordretyper
// den vil have besked om. Valget gemmes kun i denne browser (pr. enheds-ID).
// Typelisten kommer fra serveren (hello.carriers), så nye og fjernede typer
// følger administrationen automatisk.
const POLL_MS=30000,TYPES_MS=15*60000;
const settingsKey=id=>'lager.notify.v1.'+id;
const defaults=()=>({enabled:false,codes:[],sound:true});
function readSettings(id){try{const s=JSON.parse(localStorage.getItem(settingsKey(id))||'null');return s&&typeof s==='object'?{...defaults(),...s,codes:Array.isArray(s.codes)?s.codes.filter(c=>typeof c==='string'):[]}:defaults();}catch(_){return defaults();}}
function writeSettings(id,s){try{localStorage.setItem(settingsKey(id),JSON.stringify(s));}catch(_){}}
const supported=()=>typeof Notification!=='undefined';
const permission=()=>supported()?Notification.permission:'unsupported';

// Pure: which list items are new registrations this device wants to hear about.
function pickNew(items,{watermark,codes,seen}){
 let mark=watermark;const fresh=[];
 for(const r of items||[]){
  const at=String(r&&r.createdAt||'');if(!at)continue;
  if(at>mark)mark=at;
  if(at<=watermark||r.mergedInto||seen.has(r.id))continue;
  if(!r.carrier||!codes.includes(r.carrier.code))continue;
  fresh.push(r);
 }
 return {fresh,watermark:mark};
}
const kg=v=>Number(v).toLocaleString('da-DK',{maximumFractionDigits:2});
const day=d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'')?d.slice(8,10)+'.'+d.slice(5,7):'';
function describe(r){
 const parcels=Array.isArray(r.parcels)?r.parcels:[],orders=(r.orders||[r.order]).join(' + ');
 const total=parcels.length&&parcels.every(p=>p.weight!==null&&p.weight!==''&&p.weight!==undefined)?parcels.reduce((s,p)=>s+Number(p.weight),0):null;
 const first='Ordre '+orders+' · '+parcels.length+' colli'+(total!==null?' · '+kg(total)+' kg':'');
 const second=[r.delivery&&r.delivery.customer,day(r.delivery&&r.delivery.deliveryDate)&&'levering '+day(r.delivery.deliveryDate)].filter(Boolean).join(' · ');
 return second?first+'\n'+second:first;
}
// Pure: notification text for one or several new registrations.
function compose(list){
 if(list.length===1){const r=list[0];return {title:'Ny lager-registrering · '+r.carrier.code,body:describe(r),tag:'lager-'+r.id,id:r.id};}
 const lines=list.slice(0,4).map(r=>r.carrier.code+' · Ordre '+(r.orders||[r.order]).join(' + '));
 if(list.length>4)lines.push('… og '+(list.length-4)+' mere');
 return {title:list.length+' nye lager-registreringer',body:lines.join('\n'),tag:'lager-flere-'+list.map(r=>r.id).sort().join('-').slice(0,120),id:null};
}

function create({rpc,user,refresh,anchor}){
 let carriers=Array.isArray(user.carriers)?user.carriers:[],settings=readSettings(user.id),stopped=false,polling=false,timer=null,typesAt=Date.now();
 let watermark=new Date().toISOString();const seen=new Set();
 const button=document.createElement('button');button.type='button';button.className='notify-button';
 const dialog=document.createElement('dialog');dialog.className='notify-dialog';dialog.setAttribute('aria-labelledby','notifyTitle');
 anchor.append(button);document.body.append(dialog);
 const activeCodes=()=>settings.codes.filter(c=>carriers.some(x=>x.code===c));
 const live=()=>settings.enabled&&permission()==='granted'&&activeCodes().length>0;
 function label(){
  const p=permission(),codes=activeCodes();
  button.classList.toggle('on',live());button.setAttribute('aria-haspopup','dialog');
  button.innerHTML='<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>';
  const text=document.createElement('span');
  text.textContent=p==='unsupported'?'Notifikationer findes ikke i denne browser':p==='denied'&&settings.enabled?'Notifikationer blokeret':!settings.enabled?'Slå notifikationer til':codes.length?'Mine notifikationer · '+codes.join(', '):'Notifikationer · vælg typer';
  button.append(text);
 }
 const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
 function render(){
  const p=permission();dialog.replaceChildren();
  const head=el('div','notify-head');const h=el('h2',null,'Dine notifikationer');h.id='notifyTitle';head.append(h,el('p','muted','Kontorenhed: '+(user.name||'')));dialog.append(head);
  if(p==='unsupported'){dialog.append(el('p',null,'Denne browser kan ikke vise notifikationer. Brug Chrome, Edge eller Safari på PC eller Mac.'));}
  else if(p==='denied'){
   const box=el('div','notify-blocked');box.append(el('strong',null,'Browseren har blokeret notifikationer'),el('p',null,'Sådan slår du dem til igen:'));
   const ol=el('ol');['Klik på ikonet til venstre for adressen.','Sæt "Notifikationer" til Tillad.','Genindlæs kontorsiden.'].forEach(t=>ol.append(el('li',null,t)));
   box.append(ol,el('p',null,'På Mac skal browseren også have lov under Systemindstillinger › Notifikationer.'));dialog.append(box);
  }
  dialog.append(el('p','muted','Du får besked, når lageret gemmer en ny registrering af de ordretyper, du vælger. Kontorsiden skal være åben, men må gerne ligge i baggrunden. Rettelser og sammenlagte pakninger giver ikke besked.'));
  const fs=el('fieldset','notify-types');fs.append(el('legend',null,'Giv mig besked om nye'));
  if(!carriers.length)fs.append(el('p','muted','Der er ingen aktive ordretyper.'));
  carriers.forEach(c=>{const l=el('label','notify-type'),i=el('input');i.type='checkbox';i.checked=settings.codes.includes(c.code);
   i.onchange=()=>{settings.codes=i.checked?[...new Set([...settings.codes,c.code])]:settings.codes.filter(x=>x!==c.code);writeSettings(user.id,settings);label();};
   const name=el('span',null,c.code);const desc=el('small','muted',' '+(c.label||'')+(c.simple?' · uden mål og vægt':''));l.append(i,name,desc);fs.append(l);});
  dialog.append(fs);
  const sl=el('label','notify-type'),si=el('input');si.type='checkbox';si.checked=settings.sound!==false;si.onchange=()=>{settings.sound=si.checked;writeSettings(user.id,settings);};sl.append(si,el('span',null,'Afspil lyd'));dialog.append(sl);
  const status=el('p','notify-status');status.setAttribute('role','status');
  const actions=el('div','notify-actions');
  if(p!=='unsupported'&&p!=='denied'){
   if(!settings.enabled||p!=='granted'){const on=el('button','primary','Slå notifikationer til');on.type='button';on.onclick=async()=>{try{const result=p==='granted'?'granted':await Notification.requestPermission();if(result==='granted'){settings.enabled=true;writeSettings(user.id,settings);watermark=new Date().toISOString();status.textContent=activeCodes().length?'Notifikationer er slået til.':'Slået til. Vælg mindst én ordretype.';}else status.textContent='Browseren gav ikke lov til notifikationer.';}catch(_){status.textContent='Browseren gav ikke lov til notifikationer.';}label();render();start();};actions.append(on);}
   else{
    const test=el('button',null,'Send en test');test.type='button';test.onclick=()=>{show({title:'Test · Lager Kontor',body:'Sådan ser en notifikation ud på denne PC.',tag:'lager-test',id:null});status.textContent='Testen er sendt. Kom der ingen boble, så tjek PC’ens indstillinger for notifikationer.';};
    const off=el('button',null,'Slå fra');off.type='button';off.onclick=()=>{settings.enabled=false;writeSettings(user.id,settings);label();render();};
    actions.append(test,off);
   }
  }
  const close=el('button',null,'Luk');close.type='button';close.onclick=()=>dialog.close();actions.append(close);
  dialog.append(actions,status);
 }
 async function refreshTypes(){try{const h=await rpc('hello');if(Array.isArray(h.carriers))carriers=h.carriers;typesAt=Date.now();label();}catch(_){/* behold sidste kendte liste */}}
 button.onclick=async()=>{render();dialog.showModal();await refreshTypes();if(dialog.open)render();};
 async function open(id){try{window.focus();}catch(_){}try{await refresh();}catch(_){}
  const card=id&&document.querySelector('[data-record-id="'+(window.CSS&&CSS.escape?CSS.escape(id):id)+'"]');
  if(card){const fold=card.querySelector('.order-fold');if(fold)fold.open=true;card.classList.add('notify-flash');card.scrollIntoView({block:'center',behavior:'smooth'});setTimeout(()=>card.classList.remove('notify-flash'),4000);}}
 function show(n){if(permission()!=='granted')return;try{const note=new Notification(n.title,{body:n.body,tag:n.tag,icon:'office-icon-192.png',silent:settings.sound===false});note.onclick=()=>{note.close();open(n.id);};}catch(_){/* fx en browser der kræver service worker */}}
 async function poll(){
  if(stopped||polling||!live()||!navigator.onLine)return;polling=true;
  try{
   if(Date.now()-typesAt>TYPES_MS)await refreshTypes();
   const page=await rpc('list',{offset:0,recent:true,since:watermark});if(stopped)return;
   const {fresh,watermark:mark}=pickNew(page&&page.items,{watermark,codes:activeCodes(),seen});watermark=mark;
   fresh.forEach(r=>seen.add(r.id));if(fresh.length)show(compose(fresh));
  }catch(_){/* næste forsøg om 30 sek. */}finally{polling=false;}
 }
 function start(){clearInterval(timer);timer=setInterval(poll,POLL_MS);}
 label();start();
 return {stop(){stopped=true;clearInterval(timer);button.remove();dialog.remove();},poll};
}
root.OfficeNotify={create,pickNew,compose,describe};
})(typeof window==='undefined'?globalThis:window);
