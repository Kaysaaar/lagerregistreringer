(function(root){
'use strict';
const isNew=(r,now=Date.now())=>{const age=now-new Date(r.createdAt||r.updatedAt).getTime();return Number.isFinite(age)&&age>=0&&age<86400000;};
function create({rpc,user,refresh,onState}){
 let baseline='',states={},polling=false,stopped=false,timer,busy=new Set(),bindings=new Map();
 const banner=document.createElement('button');banner.type='button';banner.className='office-live-update';banner.hidden=true;banner.textContent='Nye eller ændrede ordrer – tryk her for at opdatere oversigten';banner.onclick=refresh;
 const health=document.createElement('p');health.className='office-live-health';health.setAttribute('role','status');
 const anchor=document.getElementById('officeCarriers');anchor.after(banner,health);
 function draw(id){for(const {element,record} of bindings.get(id)||[]){const state=states[id]||{version:0,status:'open'},active=state.status==='claim',booked=state.status==='booked',mine=state.device===user.id;record.booking=state;onState?.(record);element.replaceChildren();const tag=document.createElement('span');tag.className='booking-label '+(booked?'booked':active?'claimed':'');tag.textContent=booked?'✓ Booket · '+state.by:active?'Bookes af '+state.by+' · '+state.label:'Ikke booket';if(state.at)tag.title=new Date(state.at).toLocaleString('da-DK');element.append(tag);if(state.status!=='open'&&state.recordRevision&&state.recordRevision!==record.revision){const note=document.createElement('strong');note.className='error';note.textContent='Pakning ændret – kontrollér bookingen';element.append(note);}
 const add=(text,action,confirmText)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.disabled=busy.has(id);b.onclick=async()=>{if(confirmText&&!confirm(confirmText))return;busy.add(id);draw(id);try{states[id]=await rpc('booking',{id,version:state.version,revision:record.revision,action});health.textContent='Bookingstatus gemt.';}catch(e){await check();health.textContent=e.message;}finally{busy.delete(id);draw(id);}};element.append(b);};
 if(!active&&!booked)add('Start booking','claim');if(active&&mine)add('✓ Markér booket','book');if(active||booked)add(booked?'Fortryd booket':'Frigiv', 'release',booked?'Fjern Booket-markeringen? Kontrollér først, at ordren ikke bliver booket to gange.':'Frigiv booking hos '+state.by+'? Aftal det med kollegaen først, hvis bookingen er i gang.');
 }}
 function apply(pulse){if(!pulse)return;for(const [id,state] of Object.entries(pulse.states||{})){if(!states[id]||state.version>=states[id].version)states[id]=state;}for(const id of bindings.keys())draw(id);}
 function accept(pulse){if(!pulse)return;baseline=pulse.stamp;banner.hidden=true;apply(pulse);}
 async function check(){if(stopped||polling||document.hidden||!navigator.onLine)return;polling=true;try{const pulse=await rpc('officePulse');if(stopped)return;apply(pulse);banner.hidden=!baseline||pulse.stamp===baseline;health.textContent='Status opdateret '+new Date().toLocaleTimeString('da-DK',{hour:'2-digit',minute:'2-digit'});}catch(e){if(!stopped)health.textContent='Liveopdatering afventer forbindelse. Du kan stadig trykke Opdatér.';}finally{polling=false;}}
 const visible=()=>{if(!document.hidden)check();};document.addEventListener('visibilitychange',visible);window.addEventListener('online',check);timer=setInterval(check,30000);
 return {accept,apply,check,bind(record,element){const list=bindings.get(record.id)||[];list.push({record,element});bindings.set(record.id,list);draw(record.id);},clear(){bindings.clear();},stop(){stopped=true;clearInterval(timer);document.removeEventListener('visibilitychange',visible);window.removeEventListener('online',check);banner.remove();health.remove();},isNew};
}
root.OfficeLive={create,isNew};
})(typeof window==='undefined'?globalThis:window);
