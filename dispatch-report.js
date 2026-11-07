(function(root){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const weight=v=>v===null||v===undefined||v===''?'Ikke angivet':esc(Number(v).toLocaleString('da-DK',{maximumFractionDigits:2}))+' kg';
function render(records){
 const rows=records.map(r=>{const parcels=r.parcels||[];return '<tr><td><strong>'+esc(r.order)+'</strong><br><small>'+esc(r.carrier?.code||'')+'</small></td><td>'+esc(r.delivery?.customer||'Ikke angivet')+'</td><td class="report-address">'+esc(r.delivery?.address||'Ikke angivet')+'</td><td>'+parcels.length+'</td><td>'+parcels.map((p,i)=>'Colli '+(i+1)+': '+weight(p.weight)).join('<br>')+'</td></tr>';}).join('');
 return '<h1>Wallmann · Kørselsrapport</h1><p>'+records.length+' '+(records.length===1?'ordre':'ordrer')+' · '+records.reduce((n,r)=>n+(r.parcels||[]).length,0)+' colli</p><table><thead><tr><th>Ordrenummer</th><th>Kunde</th><th>Leveringsadresse</th><th>Colli</th><th>Vægt pr. colli</th></tr></thead><tbody>'+rows+'</tbody></table>';
}
function open(records){if(!records.length)return;document.getElementById('dispatchReport')?.remove();const d=document.createElement('dialog');d.id='dispatchReport';d.innerHTML='<div class="report-controls"><button type="button" data-close>‹ Tilbage</button><button type="button" class="primary" data-print>Print rapport</button></div><div class="report-paper">'+render(records)+'</div>';document.body.append(d);d.querySelector('[data-close]').onclick=()=>d.close();d.querySelector('[data-print]').onclick=()=>window.print();d.addEventListener('close',()=>d.remove());d.showModal();}
root.DispatchReport={render,open};
})(typeof window==='undefined'?globalThis:window);
