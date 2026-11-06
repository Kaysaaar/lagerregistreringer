'use strict';
window.PackingData={
 // Work in hundredths of kg so the proposed parcels always sum to the total.
 distribute(d){
  if(!d.weightPlan?.enabled)return '';
  const total=Math.round(Number(d.weightPlan.total)*100),locked=d.weightPlan.locked||[],free=d.parcels.map((p,i)=>i).filter(i=>!locked[i]);
  const fixed=d.parcels.reduce((sum,p,i)=>sum+(locked[i]?Math.round(Number(p.weight)*100):0),0),rest=total-fixed;
  if(!Number.isFinite(total)||total<=0||!Number.isFinite(fixed)||d.parcels.some((p,i)=>locked[i]&&(!p.weight||Number(p.weight)<=0)))return 'Kontrollér de manuelt angivne vægte.';
  if(rest<0)return 'De rettede vægte overstiger totalvægten. Ret totalvægten eller en colli-vægt.';
  if(!free.length)return rest===0?'':'Alle vægte er rettet manuelt. Summen afviger fra totalvægten med '+(rest/100).toLocaleString('da-DK')+' kg.';
  if(rest<free.length)return 'Der er ikke nok restvægt til de øvrige colli. Ret totalvægten eller en colli-vægt.';
  const each=Math.floor(rest/free.length);free.forEach((index,i)=>d.parcels[index].weight=String((each+(i<rest%free.length?1:0))/100));return '';
 },
 address(r){return [r.customer,r.city].filter(Boolean).join(' · ');}
};
