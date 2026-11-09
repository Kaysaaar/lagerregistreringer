(function(root){
'use strict';
const isNew=(r,now=Date.now())=>{const age=now-new Date(r.createdAt||r.updatedAt).getTime();return Number.isFinite(age)&&age>=0&&age<86400000;};
function create({rpc,user,refresh,onState}){
 let baseline='',states={},polling=false,stopped=false,timer,busy=new Set(),bindings=new Map();
 const banner=document.createElement('button');banner.type='button';banner.className='office-live-update';banner.hidden=true;banner.textContent='Nye eller ændrede ordrer – tryk her for at opdatere oversigten';banner.onclick=refresh;
 const health=document.createElement('p');health.className='office-live-health';health.setAttribute('role','status');
 const anchor=document.getElementById('officeCarriers');anchor.after(banner,health);
 function draw(id){for(const {element,record} of bindings.get(id)||[]){const state=states[id]||{version:0,status:'open'},booked=state.status==='booked';record.booking=state;onState?.(record);element.replaceChildren();const button=document.createElement('button');button.type='button';button.className='booking-toggle'+(booked?' booked':'');button.textContent=booked?'✓ Booket':'Markér som booket';button.setAttribute('aria-pressed',String(booked));button.disabled=busy.has(id);if(booked)button.title='Markeret af '+state.by+(state.at?' · '+new Date(state.at).toLocaleString('da-DK'):'')+'. Tryk for at fortryde.';button.onpointerdown=e=>e.stopPropagation();button.onclick=async e=>{e.preventDefault();e.stopPropagation();if(booked&&!confirm('Fjern markeringen Booket?'))return;busy.add(id);draw(id);try{states[id]=await rpc('booking',{id,version:state.version,revision:record.revision,action:booked?'release':'mark'});health.textContent='Bookingstatus gemt.';}catch(error){await check();health.textContent=error.message;}finally{busy.delete(id);draw(id);}};element.append(button);if(booked&&state.recordRevision!==record.revision){const note=document.createElement('small');note.textContent='Ændret efter booking – kontrollér pakning';element.append(note);}
 }}
 async function markMany(records,onProgress){
  const items=[...new Map(records.map(r=>[r.id,{id:r.id,order:(r.orders||[r.order]).join(' + '),revision:r.revision,state:{...(states[r.id]||{version:0,status:'open'})}}])).values()];
  const result={done:[],skipped:[],failed:[]};
  for(const item of items){if(busy.has(item.id))throw Error('Vent til den igangværende markering er gemt.');}
  items.forEach(item=>busy.add(item.id));items.forEach(item=>draw(item.id));
  try{for(const item of items){
   if(item.state.status==='booked'){result.skipped.push(item.id);}else{
    try{const next=await rpc('booking',{id:item.id,version:item.state.version,revision:item.revision,action:'mark'});if(!states[item.id]||next.version>=states[item.id].version)states[item.id]=next;result.done.push(item.id);}
    catch(error){result.failed.push({id:item.id,order:item.order,message:error.message});}
   }
   draw(item.id);onProgress?.(result.done.length+result.skipped.length+result.failed.length,items.length);
  }}finally{items.forEach(item=>busy.delete(item.id));items.forEach(item=>draw(item.id));}
  if(result.failed.length)await check();
  return result;
 }
 function apply(pulse){if(!pulse)return;for(const [id,state] of Object.entries(pulse.states||{})){if(!states[id]||state.version>=states[id].version)states[id]=state;}for(const id of bindings.keys())draw(id);}
 function accept(pulse){if(!pulse)return;baseline=pulse.stamp;banner.hidden=true;apply(pulse);}
 async function check(){if(stopped||polling||document.hidden||!navigator.onLine)return;polling=true;try{const pulse=await rpc('officePulse');if(stopped)return;apply(pulse);banner.hidden=!baseline||pulse.stamp===baseline;health.textContent='Status opdateret '+new Date().toLocaleTimeString('da-DK',{hour:'2-digit',minute:'2-digit'});}catch(e){if(!stopped)health.textContent='Liveopdatering afventer forbindelse. Du kan stadig trykke Opdatér.';}finally{polling=false;}}
 const visible=()=>{if(!document.hidden)check();};document.addEventListener('visibilitychange',visible);window.addEventListener('online',check);timer=setInterval(check,30000);
 return {accept,apply,check,markMany,bind(record,element){const list=bindings.get(record.id)||[];list.push({record,element});bindings.set(record.id,list);draw(record.id);},clear(){bindings.clear();},stop(){stopped=true;clearInterval(timer);document.removeEventListener('visibilitychange',visible);window.removeEventListener('online',check);banner.remove();health.remove();},isNew};
}
root.OfficeLive={create,isNew};
})(typeof window==='undefined'?globalThis:window);
