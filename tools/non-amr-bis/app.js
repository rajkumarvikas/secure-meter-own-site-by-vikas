const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const OK='var(--ok)',BAD='var(--bad)',WARN='var(--warn)',NA='var(--na)',tk=()=>new Promise(r=>setTimeout(r,25));
let M=[],D=[],B=[],P=[],BW='',A=new Map(),MU=[],pg=0,DW=null;
try{window.claude&&window.claude.use('downloads').then(d=>DW=d).catch(()=>{})}catch(e){}
const pc=(a,t)=>t?(a/t*100).toFixed(1)+'%':'0.0%',nf=v=>typeof v=='number'?v.toLocaleString('en-IN'):v;
function parse(t){const R=[];let r=[],f='',q=0;for(let i=0,n=t.length;i<n;i++){const c=t[i];if(q){if(c=='"'){if(t[i+1]=='"'){f+='"';i++}else q=0}else f+=c}else if(c=='"')q=1;else if(c==','){r.push(f);f=''}else if(c=='\n'){r.push(f);R.push(r);r=[];f=''}else if(c!='\r')f+=c}if(f!==''||r.length){r.push(f);R.push(r)}return R}
const msg=(id,t,e)=>{const el=$('#'+id);el.textContent=t;el.className='mg'+(e?' er':'')};
const setO=(s,a,all)=>{const v=s.value;s.innerHTML=(all?`<option value="">${all}</option>`:'')+a.map(x=>`<option>${esc(x)}</option>`).join('');if(a.includes(v))s.value=v};
/* ---------- loaders ---------- */
async function loadM(f){msg('sm','Reading file...');await tk();const a=parse((await f.text()).replace(/^\uFEFF/,'')),h=a[0].map(x=>x.trim()),ix={};h.forEach((x,i)=>ix[x]=i);
 const dc=h.map((x,i)=>/^\d{4}-\d{2}-\d{2}$/.test(x)?i:-1).filter(i=>i>=0),need=['Region','Circle','Substation','Meter serial no','Type of data'];
 if(!dc.length||need.some(k=>!(k in ix))){msg('sm','This is not a meter-wise file. It needs: '+need.join(', ')+' and date columns (YYYY-MM-DD).',1);return false}
 D=dc.map(i=>h[i]);M=a.slice(1).filter(r=>r[ix.Region]&&r[ix['Type of data']]).map(r=>({rg:r[ix.Region],ci:r[ix.Circle],sb:r[ix.Substation],mt:r[ix['Meter serial no']],ty:r[ix['Type of data']],ms:r[ix['Meter status']]||'',gs:r[ix['Gateway status']]||'',lc:r[ix['Meter last connect time']]||'',v:Int16Array.from(dc,i=>+r[i]||0)}));
 let kd=-1;for(const r of M)for(let i=r.v.length-1;i>kd;i--)if(r.v[i]>0){kd=i;break}
 if(kd>=0&&kd<D.length-1){D=D.slice(0,kd+1);M.forEach(r=>r.v=r.v.slice(0,kd+1))}
 const sn=new Set();MU=M.filter(r=>!sn.has(r.mt)&&sn.add(r.mt));const ty=[...new Set(M.map(r=>r.ty))].sort();setO($('#fT'),ty);if(ty.includes('Loadsurvey (Sip data)'))$('#fT').value='Loadsurvey (Sip data)';
 setO($('#fF'),D);setO($('#fE'),D);$('#fF').value=D[0];$('#fE').value=D[defTo()];
 msg('sm',`${f.name}: ${M.length.toLocaleString('en-IN')} rows, ${new Set(M.map(r=>r.mt)).size.toLocaleString('en-IN')} meters, ${D.length} dates.`);await attachPrev();calc();link();ready();return true}
/* ---------- previous month file: used ONLY for Non AMR ageing ---------- */
let CUR=null,PRV=null,PD=[];
async function attachPrev(){PD=[];M.forEach(r=>r.pv=null);if(!PRV||!M.length){if(!PRV)msg('sm2','');return}
 msg('sm2','Reading previous month file...');await tk();
 const a=parse((await PRV.text()).replace(/^\uFEFF/,'')),h=a[0].map(x=>x.trim()),ix={};h.forEach((x,i)=>ix[x]=i);
 const dc=h.map((x,i)=>/^\d{4}-\d{2}-\d{2}$/.test(x)?i:-1).filter(i=>i>=0);
 if(!dc.length||!('Meter serial no' in ix)||!('Type of data' in ix)){msg('sm2','This is not a meter-wise file. It needs Meter serial no, Type of data and date columns (YYYY-MM-DD).',1);PRV=null;return}
 const cols=dc.filter(i=>h[i]<D[0]).sort((x,y)=>h[x]<h[y]?-1:1);
 if(!cols.length){msg('sm2','This file has no dates before the current month file, so it cannot be used for ageing.',1);PRV=null;return}
 PD=cols.map(i=>h[i]);
 const idx=new Map(),cnt=new Map();
 for(const r of M){const k0=r.mt+'|'+r.ty,n=(cnt.get(k0)||0)+1;cnt.set(k0,n);idx.set(k0+'|'+n,r)}
 const seen=new Map();let hit=0;
 for(let q=1;q<a.length;q++){const row=a[q];if(!row[ix['Type of data']])continue;
  const k0=row[ix['Meter serial no']]+'|'+row[ix['Type of data']],n=(seen.get(k0)||0)+1;seen.set(k0,n);
  const r=idx.get(k0+'|'+n);if(!r)continue;r.pv=Int16Array.from(cols,i=>+row[i]||0);hit++}
 msg('sm2',`${PRV.name}: used for ageing only (${PD[0]} to ${PD[PD.length-1]}, ${PD.length} dates). ${hit.toLocaleString('en-IN')} rows matched with current month meters.`)}
async function loadB(f){msg('sb','Reading file...');await tk();const a=parse((await f.text()).replace(/^\uFEFF/,'')),h=a[0].map(x=>x.trim()),ix={};h.forEach((x,i)=>ix[x]=i);
 const need=['Region','Circle','Substation name','Meter serial number','Overall status'];
 if(need.some(k=>!(k in ix))){msg('sb','This is not a BIS summary file. It needs: '+need.join(', '),1);return}
 const j=ix['Overall status']+1;P=h.slice(j);B=a.slice(1).filter(r=>r[ix.Region]).map(r=>({rg:r[ix.Region],ci:r[ix.Circle],sb:r[ix['Substation name']],mt:r[ix['Meter serial number']],st:(r[ix['Overall status']]||'').trim(),p:r.slice(j,j+P.length).map(s=>s.trim())}));
 BW=('Week number' in ix&&a[1])?`Week ${a[1][ix['Week number']]} from ${a[1][ix['Start date']]}`:'';
 msg('sb',`${f.name}: ${B.length.toLocaleString('en-IN')} meters, ${P.length} parameters. ${BW}`);link();ready()}
const pick=async(w,f)=>{if(w){const o=PRV;PRV=f;if(!CUR||!M.length){msg('sm2',f.name+': saved. Now upload the current month file.');return}await attachPrev();if(!PRV&&o)PRV=null;render()}else{const o=CUR;CUR=f;if(!(await loadM(f)))CUR=o}};
[['#dm',fs=>pick(0,fs[0])],['#dm2',fs=>pick(1,fs[0])],['#db',fs=>loadB(fs[0])]].forEach(([s,fn])=>{const z=$(s),i=z.querySelector('input');i.onchange=e=>{if(e.target.files.length)fn([...e.target.files]);e.target.value=''};
 z.ondragover=e=>{e.preventDefault();z.classList.add('on')};z.ondragleave=()=>z.classList.remove('on');z.ondrop=e=>{e.preventDefault();z.classList.remove('on');e.dataTransfer.files.length&&fn([...e.dataTransfer.files])}});
/* ---------- filters and AMR calc ---------- */
function defTo(){const rows=M.filter(r=>r.ty===$('#fT').value),md=D.map((_,i)=>{const a=rows.map(r=>r.v[i]).sort((x,y)=>x-y);return a[a.length>>1]||0}),mx=Math.max(...md);let k=0;D.forEach((_,i)=>{if(mx>0?md[i]>=mx*.9:rows.some(r=>r.v[i]>0))k=i});return k}
const hiI=()=>Math.max(D.indexOf($('#fF').value),D.indexOf($('#fE').value)),loI=()=>Math.min(D.indexOf($('#fF').value),D.indexOf($('#fE').value));
function calc(){A=new Map();if(!M.length)return;const ty=$('#fT').value,lo=loI(),hi=hiI();for(const r of M){if(r.ty!==ty)continue;let s=0;for(let i=lo;i<=hi;i++)s+=r.v[i]>0?r.v[i]:0;A.set(r.mt,{r,s,ok:s>0&&r.v[hi]>0})}}
$('#fT').onchange=()=>{$('#fE').value=D[defTo()];calc();render()};$('#fF').onchange=$('#fE').onchange=()=>{calc();render()};
/* ---------- helpers ---------- */
const kp=a=>a.map(([l,v,c])=>`<div class="kp ${c||''}"><b>${nf(v)}</b><span>${l}</span></div>`).join('');
const grp=(L,kf,vf,n)=>{const m=new Map();for(const x of L){const k=kf(x);let o=m.get(k);if(!o)m.set(k,o={k,v:Array(n).fill(0)});o.v[vf(x)]++}return[...m.values()]};
const sh=o=>o.v[0]/(o.v.reduce((x,y)=>x+y,0)||1);
const stack=(it,nm,co,ab)=>{const mx=ab?Math.max(1,...it.map(o=>o.v.reduce((a,b)=>a+b,0))):0;return '<div class="lg">'+nm.map((n,i)=>`<span><i style="background:${co[i]}"></i>${n}</span>`).join('')+'</div>'+it.map(o=>{const rt=o.v.reduce((a,b)=>a+b,0)||1,t=mx||rt;return `<div class="sr"><div class="sl" title="${esc(o.k)}">${esc(o.k)}</div><div class="sb">${o.v.map((x,i)=>x?`<b style="width:${x/t*100}%;background:${co[i]}"></b>`:'').join('')}</div><div class="sn">${o.v.join(' / ')}<br><small>${o.v.map(x=>(x/rt*100).toFixed(1)+'%').join(' / ')}</small></div></div>`}).join('')};
const tbl=(h,r)=>`<table><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr>${r.map(x=>`<tr>${x.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
const tag=s=>`<span class="tg ${s==='Pass'||s==='AMR'?'t-ok':s==='Fail'||s==='Non AMR'?'t-bad':'t-na'}">${esc(s||'-')}</span>`;
const short=s=>s.replace(' REGION','').replace(' CIRCLE','');
let XS=null;const XC=['0B8F7A','D94F30','E3A008','8A97A8'];
async function save(name,data){if(!DW){const a=document.createElement('a');a.href=URL.createObjectURL(data instanceof Blob?data:new Blob([data]));a.download=name;document.body.appendChild(a);a.click();a.remove();return}
 try{await DW.save({filename:name,data})}catch(e){if(!e||e.code!=='declined')alert('Could not save the file: '+((e&&e.message)||''))}}
const dl=(name,rows)=>save(name,'\ufeff'+rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n'));
const pie=(v,co,lb)=>{const t=v.reduce((a,b)=>a+b,0)||1,R=76,r=48,p=(g,q)=>(100+g*Math.cos(q)).toFixed(2)+' '+(100+g*Math.sin(q)).toFixed(2);let a=-Math.PI/2,s='';
 v.forEach((x,i)=>{if(!x)return;const b=a+x/t*2*Math.PI-(x==t?1e-4:0),L=b-a>Math.PI?1:0;s+=`<path d="M${p(R,a)}A${R} ${R} 0 ${L} 1 ${p(R,b)}L${p(r,b)}A${r} ${r} 0 ${L} 0 ${p(r,a)}Z" style="fill:${co[i]}"/>`;a=b});
 return `<svg viewBox="0 0 200 200" width="190" height="190" role="img"><text x="100" y="107" text-anchor="middle" font-size="20" font-weight="700" fill="currentColor">${lb}</text>${s}</svg>`};
const pieBox=(v,nm,co,lb,T=v.reduce((a,b)=>a+b,0))=>`<div style="text-align:center">${pie(v,co,lb)}</div><div class="lg" style="justify-content:center">`+nm.map((n,i)=>`<span><i style="background:${co[i]}"></i>${n}: ${nf(v[i])} (${pc(v[i],T)})</span>`).join('')+'</div>';
const fsub=m=>`Region: ${sl(mR.sel)} | Circle: ${sl(mC.sel)} | Substation: ${sl(mS.sel)}`+(m?` | ${$('#fT').value}, ${D[loI()]} to ${D[hiI()]}`:'')+` | Generated ${new Date().toLocaleString()}`;
/* ---------- multi-select filters ---------- */
const u=a=>[...new Set(a)].sort(),subOf=r=>r.s2||r.sb,sl=s=>s.size?[...s].map(short).slice(0,6).join(', ')+(s.size>6?` +${s.size-6} more`:''):'All';
function MS(el,title,cb){const o={opts:[],sel:new Set()};el.className='ms';
 el.innerHTML=`<label class="f">${title}</label><details><summary></summary><div class="mp"><input type="search" placeholder="Search"><div class="mb"><button>Select visible</button><button>Clear</button></div><div class="ml"></div></div></details>`;
 const sm=el.querySelector('summary'),q=el.querySelector('input'),[b1,b2]=el.querySelectorAll('button'),ml=el.querySelector('.ml');
 const vis=()=>{const t=q.value.toLowerCase();return o.opts.filter(x=>x.toLowerCase().includes(t))};
 const upd=()=>sm.textContent=o.sel.size?(o.sel.size<=2?[...o.sel].map(short).join(', '):o.sel.size+' selected'):'All ('+o.opts.length+')';
 const draw=()=>{const v=vis();ml.innerHTML=v.slice(0,300).map(x=>`<label><input type="checkbox" value="${esc(x)}"${o.sel.has(x)?' checked':''}>${esc(x)}</label>`).join('')+(v.length>300?`<i>${v.length-300} more, use search</i>`:'');upd()};
 ml.onchange=e=>{const v=e.target.value;e.target.checked?o.sel.add(v):o.sel.delete(v);upd();cb()};
 b1.onclick=()=>{vis().forEach(x=>o.sel.add(x));draw();cb()};b2.onclick=()=>{o.sel.clear();draw();cb()};q.oninput=draw;
 o.set=a=>{o.opts=a;o.sel=new Set([...o.sel].filter(x=>a.includes(x)));draw()};return o}
const mR=MS($('#mR'),'Region',()=>cas1()),mC=MS($('#mC'),'Circle',()=>cas2()),mS=MS($('#mS'),'Substation',()=>render());
const rowsAll=()=>[...MU,...B];
function cas1(){const g=mR.sel;mC.set(u(rowsAll().filter(r=>!g.size||g.has(r.rg)).map(r=>r.ci)));cas2()}
function cas2(){const g=mR.sel,c=mC.sel;mS.set(u(rowsAll().filter(r=>(!g.size||g.has(r.rg))&&(!c.size||c.has(r.ci))).map(subOf)));render()}
const flt=r=>(!mR.sel.size||mR.sel.has(r.rg))&&(!mC.sel.size||mC.sel.has(r.ci))&&(!mS.sel.size||mS.sel.has(subOf(r)));
function link(){if(!MU.length||!B.length)return;const m=new Map(MU.map(r=>[r.mt,r.sb]));B.forEach(x=>x.s2=m.get(x.mt))}
function ready(){mR.set(u(rowsAll().map(r=>r.rg)));cas1()}
document.addEventListener('click',e=>document.querySelectorAll('.ms details[open]').forEach(d=>{if(!d.contains(e.target))d.open=false}));
const ptab=(t,lab,g,nm,xh=[],xf=()=>[])=>({t,h:[lab,'Meters',...nm,...nm.map(x=>x+' %'),...xh],r:g.map(o=>{const n=o.v.reduce((a,b)=>a+b,0);return[o.k,n,...o.v,...o.v.map(x=>pc(x,n)),...xf(o.v,n)]}),nc:1});
/* ---------- AMR page ---------- */
const amrL=()=>[...A.values()].filter(x=>flt(x.r));
const amrRow=x=>[x.r.rg,x.r.ci,x.r.sb,x.r.mt,x.r.ms,x.r.gs,x.s,x.r.v[hiI()]];
function rAMR(q=''){const L=amrL(),ok=L.filter(x=>x.ok).length,n=L.length,hi=hiI(),N=['AMR','Non AMR'],C=[OK,BAD];
 $('#k1'+q).innerHTML=kp([['Total meters',n],['AMR (reporting)',ok,'ok'],['Non AMR',n-ok,'bad'],['AMR %',pc(ok,n),'ok'],['Non AMR %',pc(n-ok,n),'bad']]);
 const G=kf=>grp(L,kf,x=>x.ok?0:1,2).sort((a,b)=>sh(a)-sh(b)),gr=G(x=>short(x.r.rg)),gc=G(x=>short(x.r.ci));
 $('#pa'+q).innerHTML=pieBox([ok,n-ok],N,C,pc(ok,n));$('#a1'+q).innerHTML=stack(gr,N,C);$('#a2'+q).innerHTML=stack(gc,N,C);
 const cn=D.slice(0,hi+1).map((d,i)=>L.filter(x=>x.r.v[i]>0).length),mx=Math.max(1,...cn);
 $('#a3'+q).innerHTML='<div class="tr">'+cn.map((c,i)=>`<div title="${D[i]}: ${c}"><b style="height:${c/mx*84}%"></b><span>${D[i].slice(8)}</span></div>`).join('')+'</div>';
 $('#t1'+q).innerHTML=tbl(['Region','Circle','Substation','Meter','Meter status','Gateway','Sum','Last day'],L.filter(x=>!x.ok).slice(0,200).map(x=>amrRow(x).map((c,i)=>i==4||i==5?tag(c==='Connected'?'Pass':c==='Disconnected'?'Fail':c):esc(c))));
 const X={fn:'amr_dashboard',title:q?'Non AMR dashboard':'AMR Analyzer',sub:fsub(1),kpis:[['Total meters',n],['AMR (reporting)',ok],['Non AMR',n-ok],['AMR %',pc(ok,n)],['Non AMR %',pc(n-ok,n)],['Type of data',$('#fT').value],['Date range',D[loI()]+' to '+D[hi]]],
  tabs:[{t:'AMR vs Non AMR',h:['Status','Meters','Share %'],r:[['AMR',ok,pc(ok,n)],['Non AMR',n-ok,pc(n-ok,n)]],pie:1,c:XC},{t:'By region',h:['Region',...N],r:gr.map(o=>[o.k,...o.v]),c:XC},{t:'By circle',h:['Circle',...N],r:gc.map(o=>[o.k,...o.v]),c:XC},ptab('AMR % by region','Region',gr,N),ptab('AMR % by circle','Circle',gc,N),{t:'Meters reporting per day',h:['Date','Meters'],r:D.slice(0,hi+1).map((d,i)=>[d,cn[i]]),c:['2F5FD0']}],
  head:['Region','Circle','Substation','Meter','Meter status','Gateway','Sum','Last day','Status'],rows:(q?L.filter(x=>!x.ok):L).map(x=>[...amrRow(x),x.ok?'AMR':'Non AMR'])};if(!q)XS=X;return X}
/* ---------- BIS page ---------- */
const bisRow=x=>[x.rg,x.ci,x.sb,x.mt,x.st,...x.p];
function rBIS(q=''){const L=B.filter(flt),c=s=>L.filter(x=>x.st===s).length,pa=c('Pass'),fa=c('Fail'),na=c('Not available'),n=L.length,av=pa+fa,S=['Pass','Fail','Not available'],cl=[OK,BAD,NA],idx=x=>S.indexOf(x.st)<0?2:S.indexOf(x.st),su=new Set(L.map(x=>x.sb)).size;
 $('#k2'+q).innerHTML=kp([['BIS meters',n],['Substations',su],['Data available %',pc(av,n),'ok'],['Pass',pa,'ok'],['Fail',fa,'bad'],['Not available',na,'na'],['Pass % of available',pc(pa,av),'ok'],['Fail % of available',pc(fa,av),'bad'],['Data not available %',pc(na,n),'na']]);
 const gr=grp(L,x=>short(x.rg),idx,3).sort((a,b)=>sh(a)-sh(b)),gc=grp(L,x=>short(x.ci),idx,3).sort((a,b)=>sh(a)-sh(b)),fr=o=>o.v[1]/(o.v[0]+o.v[1]||1),
 gp=P.map((p,j)=>({k:p,v:S.map(s=>L.filter(x=>x.p[j]===s).length)})).sort((a,b)=>fr(b)-fr(a)),t=[...grp(L.filter(x=>x.st==='Not available'),x=>x.sb,()=>0,1)].sort((a,b)=>b.v[0]-a.v[0]).slice(0,10);
 $('#pb'+q).innerHTML=pieBox([pa,fa,na],S,cl,pc(pa,n));$('#c1'+q).innerHTML=stack(gr,S,cl);$('#c2'+q).innerHTML=stack(gc,S,cl);$('#c4'+q).innerHTML=stack(gp,S,cl);
 $('#c3'+q).innerHTML=tbl(['Substation','Meters'],t.map(o=>[esc(o.k),o.v[0]]));
 $('#t2'+q).innerHTML=tbl(['Region','Circle','Substation','Meter','Overall',...P.map(esc)],(q?L.filter(x=>x.st==='Not available'):L).slice(0,200).map(x=>bisRow(x).map((c,i)=>i<4?esc(c):tag(c))));
 const bc=[XC[0],XC[1],XC[3]],row=o=>[o.k,...o.v];
 const X={fn:'bis_dashboard',title:(q?'BIS data not available dashboard':'BIS Dashboard')+(BW?' ('+BW+')':''),sub:fsub(0),kpis:[['BIS meters',n],['Substations',su],['Data available %',pc(av,n)],['Pass',pa],['Fail',fa],['Not available',na],['Pass % of available',pc(pa,av)],['Fail % of available',pc(fa,av)],['Data not available %',pc(na,n)]],
  tabs:[{t:'Overall BIS status',h:['Status','Meters','Share %'],r:[['Pass',pa,pc(pa,n)],['Fail',fa,pc(fa,n)],['Not available',na,pc(na,n)]],pie:1,c:bc},{t:'By region',h:['Region',...S],r:gr.map(row),c:bc},{t:'By circle',h:['Circle',...S],r:gc.map(row),c:bc},ptab('BIS % by region','Region',gr,S,['Data available %'],(v,n)=>[pc(v[0]+v[1],n)]),ptab('BIS % by circle','Circle',gc,S,['Data available %'],(v,n)=>[pc(v[0]+v[1],n)]),{t:'Parameter-wise results',h:['Parameter',...S],r:gp.map(row),c:bc},{t:'Top 10 substations with data not available',h:['Substation','Meters'],r:t.map(row),c:[XC[2]]}],
  head:['Region','Circle','Substation','Meter','Overall',...P],rows:(q?L.filter(x=>x.st==='Not available'):L).map(bisRow)};if(!q)XS=X;return X}
/* ---------- Combined page: Non AMR + BIS data not available, each meter once ---------- */
const NM=['Non AMR','BIS not available (other meters)'],NC=[BAD,WARN];
let W=[];
let sv=0;const CSVS=[];
['1','2'].forEach(i=>$('#v'+i).innerHTML=$('#b'+i).innerHTML.replace(/ id="(\w+)"/g,' id="$1n"').replace('data-x="1"','data-x="c1"').replace('data-x="2">Export Fail and Not available meters (CSV)','data-x="c2">Export BIS not available meters (CSV)'));
$('#sn').onclick=e=>{const s=e.target.dataset.s;if(s!=null){sv=+s;render()}};
function rCmb(){document.querySelectorAll('#sn button').forEach((b,i)=>b.className='btn'+(i==sv?'':' alt'));[0,1,2].forEach(i=>$('#v'+i).classList.toggle('hide',i!=sv));const bm=new Map(B.map(x=>[x.mt,x.st])),Z=new Map();
 for(const x of A.values())if(!x.ok&&flt(x.r))Z.set(x.r.mt,{rg:x.r.rg,ci:x.r.ci,sb:subOf(x.r),mt:x.r.mt,k:0,nv:x.s>0?0:1,ms:x.r.ms,gs:x.r.gs});
 const bn=B.filter(x=>x.st==='Not available'&&flt(x));
 for(const x of bn)if(!Z.has(x.mt)){const a=A.get(x.mt);Z.set(x.mt,{rg:x.rg,ci:x.ci,sb:subOf(x),mt:x.mt,k:1,ms:a?a.r.ms:'',gs:a?a.r.gs:''})}
 const L=[...Z.values()].map(o=>(o.bis=bm.get(o.mt)||'Not in BIS file',o)),n=L.length,a=L.filter(o=>o.k===0).length,b=n-a,tt=o=>o.v[0]+o.v[1],G=kf=>grp(L,kf,o=>o.k,2).sort((x,y)=>tt(y)-tt(x)),gr=G(o=>short(o.rg)),gc=G(o=>short(o.ci)),gs=G(o=>o.sb).slice(0,10);
 $('#i3').textContent=`${n} unique meters need attention: ${a} are Non AMR and ${b} more have BIS data not available. A meter that is in both lists is counted once.`;
 $('#k3').innerHTML=kp([['Problem meters (each counted once)',n,'bad'],['Non AMR meters',a,'bad'],['BIS data not available',bn.length,'warn'],['Substations affected',new Set(L.map(o=>o.sb)).size]]);
 $('#pc').innerHTML=pieBox([a,b],NM,NC,n.toLocaleString('en-IN'));$('#m3').innerHTML=stack(gr,NM,NC,1);$('#s3').innerHTML=stack(gc,NM,NC,1);
 $('#u3').innerHTML=tbl(['Substation','Meters','Non AMR','BIS not available'],gs.map(o=>[esc(o.k),tt(o),o.v[0],o.v[1]]));
 W=L.map(o=>[o.rg,o.ci,o.sb,o.mt,o.k?'BIS data not available':'Non AMR',o.bis,o.ms,o.gs]);
 const cs=s=>tag(s==='Connected'?'Pass':s==='Disconnected'?'Fail':s);
 $('#w3').innerHTML=tbl(['Region','Circle','Substation','Meter','Issue','BIS result','Meter status','Gateway'],W.slice(0,200).map(r=>[esc(r[0]),esc(r[1]),esc(r[2]),esc(r[3]),`<span class="tg ${r[4]==='Non AMR'?'t-bad':'t-warn'}">${r[4]}</span>`,tag(r[5]),cs(r[6]),cs(r[7])]));
 $('#n3').textContent=`Communication uses the AMR settings: ${$('#fT').value}, ${D[loI()]} to ${D[hiI()]}. ${BW?'BIS: '+BW+'. ':''}Showing first 200 of ${n}.`;
 const row=o=>[o.k,...o.v],xc=[XC[1],XC[2]];
 const X0={fn:'problem_meters_dashboard',title:'Non AMR + BIS data not available (combined)',sub:fsub(1),kpis:[['Problem meters (each counted once)',n],['Non AMR meters',a],['BIS data not available',bn.length],['Substations affected',new Set(L.map(o=>o.sb)).size]],
  tabs:[{t:'Problem meters split',h:['Issue','Meters'],r:[[NM[0],a],[NM[1],b]],pie:1,c:xc},{t:'By region',h:['Region',...NM],r:gr.map(row),c:xc},{t:'By circle',h:['Circle',...NM],r:gc.map(row),c:xc},{t:'Top 10 substations',h:['Substation',...NM],r:gs.map(row),c:xc}],
  head:['Region','Circle','Substation','Meter','Issue','BIS result','Meter status','Gateway'],rows:W};
 const X1=rAMR('n'),X2=rBIS('n');CSVS[1]=[X1.head,...X1.rows];CSVS[2]=[X2.head,...X2.rows];
 const NB=naBuild(),ar=amrL().map(x=>[...amrRow(x),x.ok?'AMR':'Non AMR']),br=B.filter(flt).map(bisRow);
 XS={fn:'amr_bis_ageing',title:'AMR, BIS and Non AMR ageing',sub:fsub(1),tt:[X1.title,X2.title],extra:[NB.age.spec],
  multi:[{...X1,title:'AMR and Non AMR dashboard',rows:ar},{...X2,title:'BIS data available and not available dashboard',rows:br},{head:NB.ah,rows:NB.ar,side:NB.age.spec}],
  sn:['AMR-NonAMR Dashboard','BIS Dashboard',''],ds:['AMR-NonAMR Row Data','BIS Row Data','Ageing Row Data']}}
/* ---------- Non AMR day-wise / ageing dashboard (opens on button click) ---------- */
let XD=null,nm=0;
const fd=d=>d.split('-').reverse().join('-'),hx=(i,N)=>{const h=N>1?i/(N-1)*45:0,f=n=>{const k=(n+h/30)%12;return Math.round((.5-.375*Math.max(-1,Math.min(k-3,9-k,1)))*255).toString(16).padStart(2,'0')};return(f(0)+f(8)+f(4)).toUpperCase()};
const dbt=(a,b)=>{const p=s=>Date.UTC(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10));return Math.round((p(b)-p(a))/864e5)},
AL=['0-3 days','4-7 days','8-15 days','16-30 days','31-60 days','61+ days'],AC=['E3A008','E8801A','D94F30','A83226','6E1F18','4A1410'];
function naMode(L,tot,key,lb,co,fix,title,fn,note,tb){const n=L.length,tt=o=>o.v.reduce((a,b)=>a+b,0),cnt=Array(lb.length).fill(0);L.forEach(x=>cnt[key(x)]++);
 const ks=lb.map((_,i)=>i).filter(i=>i<fix||cnt[i]),m=Object.fromEntries(ks.map((i,j)=>[i,j])),nl=ks.map(i=>lb[i]),nc=ks.map(i=>co[i]);
 const rg=grp(L,x=>short(x.r.rg),x=>m[key(x)],ks.length).sort((a,b)=>tt(b)-tt(a)),
 kpis=[['Total meters',tot],['Non AMR meters',n],['Non AMR %',pc(n,tot)],...ks.map(i=>[`${lb[i]} (meters)`,cnt[i]]),...ks.map(i=>[`${lb[i]} (% of Non AMR)`,pc(cnt[i],n)])];
 const hd=['Region',...nl,'Total Non AMR','% of Non AMR'],raw=[...rg.map(o=>[o.k,...o.v,tt(o),pc(tt(o),n)]),['Total',...ks.map(i=>cnt[i]),n,n?'100.0%':'0.0%']],tbh=tbl(hd,raw.map(r=>r.map((c,j)=>j?c:esc(c))));
 return{lb:nl,co:nc,rg,tbh,spec:{fn,title,sub:fsub(1),kpis,tabs:[{t:'Region-wise Non AMR meters',h:['Region',...nl],r:rg.map(o=>[o.k,...o.v]),c:nc},...(tb?[{t:'Region-wise table',h:hd,r:raw,nc:1}]:[])],head:hd,rows:raw,
  html:`<p class="sub">${esc(note)}</p><div class="card"><h3>Region-wise Non AMR meters</h3><div class="chart">${stack(rg,nl,nc.map(c=>'#'+c),1)}</div></div>`+(tb?`<div class="card"><h3>Region-wise table</h3><div class="scroll">${tbh}</div></div>`:'')}}}
function naBuild(){const lo=loI(),hi=hiI(),N=hi-lo+1,all=amrL(),L=all.filter(x=>!x.ok),tot=all.length,last=D[hi];
 for(const x of L){let c=0,a=-1;for(let i=lo;i<=hi;i++)if(x.r.v[i]>0)c++;x.d=c;
  for(let i=hi;i>=0;i--)if(x.r.v[i]>0){a=dbt(D[i],last);x.ld=D[i];break}
  if(a<0&&x.r.pv)for(let i=PD.length-1;i>=0;i--)if(x.r.pv[i]>0){a=dbt(PD[i],last);x.ld=PD[i];break}
  if(a<0){a=dbt(PD[0]||D[0],last)+1;x.ld=''}
  x.a=a}
 const ab=a=>a<=3?0:a<=7?1:a<=15?2:a<=30?3:a<=60?4:5,
 dn=`${N} date(s) selected (${fd(D[lo])} to ${fd(last)}). A Non AMR meter has data on 0 to ${N-1} of these ${N} days.`,
 an=`Ageing is calculated only from the dates in the file up to the Last date (${fd(PD[0]||D[0])} to ${fd(last)}, ${dbt(PD[0]||D[0],last)+1} days); nothing after the Last date is used. Ageing = whole days from the meter's most recent day with data to the Last date. If a meter has no data on any of these days, its ageing is counted from the first date, so it equals the number of days up to the Last date. Buckets longer than that period stay at 0. 0-3 means 0 to 3 days, 4-7 means 4 to 7 days, and so on.`;
 return{N,lo,hi,dn,an,ah:['Region','Circle','Substation','Meter','AMR status','Meter status','Gateway','Last data date','Ageing (days)','Ageing bucket'],ar:L.map(x=>[x.r.rg,x.r.ci,x.r.sb,x.r.mt,'Non AMR',x.r.ms,x.r.gs,x.ld?fd(x.ld):'No data in period',x.a,AL[ab(x.a)]]),day:naMode(L,tot,x=>x.d,[...Array(N)].map((_,d)=>`${d} of ${N} days`),[...Array(N)].map((_,d)=>hx(d,N)),N,`Non AMR day-wise status (${fd(D[lo])} to ${fd(last)})`,'non_amr_daywise',dn),
  age:naMode(L,tot,x=>ab(x.a),AL,AC,5,`Non AMR ageing (as on ${fd(last)})`,'non_amr_ageing',an,1)}}
function rNA(){const B2=naBuild(),M2=nm?B2.age:B2.day;
 XD={fn:'non_amr_daywise_ageing',title:'Non AMR day-wise and ageing',sub:fsub(1),multi:[B2.day.spec,B2.age.spec],sn:['Day-wise','Ageing'],ds:['Day-wise Data','Ageing Data']};
 $('#nh').textContent=nm?`Non AMR ageing as on ${fd(D[B2.hi])}`:`Non AMR day-wise status: ${fd(D[B2.lo])} to ${fd(D[B2.hi])}`;$('#ns').textContent=nm?B2.an:B2.dn;
 document.querySelectorAll('#np [data-m]').forEach(b=>b.className='btn'+(+b.dataset.m===nm?'':' alt'));
 $('#nrb').innerHTML=stack(M2.rg,M2.lb,M2.co.map(c=>'#'+c),1);$('#nrtc').classList.toggle('hide',!nm);$('#nrt').innerHTML=nm?M2.tbh:''}
$('#np').addEventListener('click',e=>{const m=e.target.dataset.m;if(m!=null){nm=+m;rNA()}});
/* ---------- Excel export (native charts, no libraries) ---------- */
const enc=new TextEncoder(),CRT=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc=u=>{let c=-1;for(let i=0;i<u.length;i++)c=CRT[(c^u[i])&255]^(c>>>8);return(c^-1)>>>0};
function zip(fs){const P=[],C=[],w=(a,v,n)=>{for(let i=0;i<n;i++)a.push((v>>>(8*i))&255)};let o=0;
 for(const[n,s]of fs){const nm=enc.encode(n),d=enc.encode(s),k=crc(d),h=[],c=[];w(h,0x04034b50,4);w(h,20,2);w(h,0,6);w(h,33,2);w(h,k,4);w(h,d.length,4);w(h,d.length,4);w(h,nm.length,2);w(h,0,2);
  w(c,0x02014b50,4);w(c,20,2);w(c,20,2);w(c,0,6);w(c,33,2);w(c,k,4);w(c,d.length,4);w(c,d.length,4);w(c,nm.length,2);w(c,0,2);w(c,0,2);w(c,0,2);w(c,0,2);w(c,0,4);w(c,o,4);
  P.push(Uint8Array.from(h),nm,d);C.push(Uint8Array.from(c),nm);o+=h.length+nm.length+d.length}
 const e=[];w(e,0x06054b50,4);w(e,0,4);w(e,fs.length,2);w(e,fs.length,2);w(e,C.reduce((a,b)=>a+b.length,0),4);w(e,o,4);w(e,0,2);
 return new Blob([...P,...C,Uint8Array.from(e)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})}
const CL=i=>{let s='';for(i++;i>0;i=((i-1)/26)|0)s=String.fromCharCode(65+(i-1)%26)+s;return s},X=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'');
const XH='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main',RT='http://schemas.openxmlformats.org/officeDocument/2006/relationships',DN='http://schemas.openxmlformats.org/drawingml/2006/main',CN='http://schemas.openxmlformats.org/drawingml/2006/chart',OD='application/vnd.openxmlformats-officedocument.';
function sheet(rows,wd,dr){return XH+`<worksheet xmlns="${NS}" xmlns:r="${RT}"><cols>`+wd.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')+'</cols><sheetData>'+rows.map((r,y)=>r.length?`<row r="${y+1}">`+r.map((c,x)=>{if(c==null||c==='')return'';const o=typeof c=='object'?c:{v:c},f=CL(x)+(y+1),s=o.s?` s="${o.s}"`:'';return typeof o.v=='number'?`<c r="${f}"${s}><v>${o.v}</v></c>`:`<c r="${f}"${s} t="inlineStr"><is><t>${X(o.v)}</t></is></c>`}).join('')+'</row>':'').join('')+'</sheetData>'+(dr?'<drawing r:id="rId1"/>':'')+'</worksheet>'}
function chart(pi,title,cat,ss,co){const fl=c=>`<c:spPr><a:solidFill><a:srgbClr val="${c}"/></a:solidFill></c:spPr>`;
 const se=ss.map((s,i)=>`<c:ser><c:idx val="${i}"/><c:order val="${i}"/><c:tx><c:strRef><c:f>${s.n}</c:f></c:strRef></c:tx>`+(pi?co.map((c,k)=>`<c:dPt><c:idx val="${k}"/><c:bubble3D val="0"/>${fl(c)}</c:dPt>`).join('')+'<c:dLbls><c:showLegendKey val="0"/><c:showVal val="0"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="1"/><c:showBubbleSize val="0"/><c:showLeaderLines val="1"/></c:dLbls>':fl(co[i%co.length])+'<c:invertIfNegative val="0"/>')+`<c:cat><c:strRef><c:f>${cat}</c:f></c:strRef></c:cat><c:val><c:numRef><c:f>${s.v}</c:f></c:numRef></c:val></c:ser>`).join('');
 return XH+`<c:chartSpace xmlns:c="${CN}" xmlns:a="${DN}" xmlns:r="${RT}"><c:chart><c:title><c:tx><c:rich><a:bodyPr/><a:p><a:r><a:t>${X(title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/><c:plotArea><c:layout/>`+(pi?`<c:pieChart><c:varyColors val="1"/>${se}<c:firstSliceAng val="0"/></c:pieChart>`:`<c:barChart><c:barDir val="bar"/><c:grouping val="stacked"/><c:varyColors val="0"/>${se}<c:gapWidth val="40"/><c:overlap val="100"/><c:axId val="1"/><c:axId val="2"/></c:barChart><c:catAx><c:axId val="1"/><c:scaling><c:orientation val="maxMin"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:crossAx val="2"/></c:catAx><c:valAx><c:axId val="2"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="t"/><c:majorGridlines/><c:numFmt formatCode="General" sourceLinked="0"/><c:crossAx val="1"/></c:valAx>`)+'</c:plotArea><c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend><c:plotVisOnly val="1"/></c:chart></c:chartSpace>'}
const rel=a=>XH+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+a.map(([i,t,g])=>`<Relationship Id="${i}" Type="${RT}/${t}" Target="${g}"/>`).join('')+'</Relationships>';
const anc=(i,c0,r0,c1,r1)=>`<xdr:twoCellAnchor><xdr:from><xdr:col>${c0}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${r0}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>${c1}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${r1}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${i+1}" name="Chart ${i}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="${CN}"><c:chart xmlns:c="${CN}" r:id="rId${i}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`;
async function xl(){if(!XS)return;const ds=XS.multi||[XS],SN=XS.sn||(XS.multi?['Non AMR','BIS Not Available']:['Dashboard']),DS=XS.ds||(XS.multi?['Non AMR Data','BIS NA Data']:['Data']),H=a=>a.map(v=>({v,s:1})),CT='<Override PartName="/xl/',all=[],dr=[],sheets=[];
 ds.forEach((S,d)=>{if(S.tabs){const rows=[[{v:S.title,s:2}],[S.sub],[],H(['Metric','Value']),...S.kpis,[]],ch=[],k0=all.length;
   S.tabs.forEach(t=>{const y0=rows.length,n=t.r.length,h=y0+2,hg=t.nc?n+2:Math.max(n+3,18),R=(c,a,b)=>`'${SN[d]}'!$${CL(c)}$${a}`+(b?`:$${CL(c)}$${b}`:'');
    rows.push([t.t],H(t.h),...t.r);
    if(!t.nc){ch.push({y0,hg});all.push(chart(!!t.pie,t.t,R(0,h+1,h+n),t.pie?[{n:R(1,h),v:R(1,h+1,h+n)}]:t.h.slice(1).map((_,j)=>({n:R(j+1,h),v:R(j+1,h+1,h+n)})),t.c))}
    for(let i=0;i<hg-n-1;i++)rows.push([])});
   sheets.push({n:SN[d],x:sheet(rows,[38,14,14,14,14,14],1),dr:dr.length});
   dr.push({a:ch.map((c,i)=>anc(i+1,6,c.y0,15,c.y0+c.hg)).join(''),r:ch.map((_,i)=>['rId'+(i+1),'chart','../charts/chart'+(k0+i+1)+'.xml'])})}
  {const sd=S.side,hl=S.head.length,pad=r=>[...r,...Array(hl-r.length).fill('')],rows=[[...H(S.head),...(sd?['',...H(sd.head)]:[])]];
   for(let i=0;i<S.rows.length||(sd&&i<sd.rows.length);i++)rows.push([...pad(S.rows[i]||[]),...(sd&&sd.rows[i]?['',...sd.rows[i]]:[])]);
   sheets.push({n:DS[d],x:sheet(rows,[...S.head.map(()=>22),...(sd?[4,...sd.head.map((_,j)=>j?14:22)]:[])],0)})}});
 const ws=sheets.map((_,i)=>['rId'+(i+1),'worksheet',`worksheets/sheet${i+1}.xml`]),
 files=[['[Content_Types].xml',XH+`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${CT}workbook.xml" ContentType="${OD}spreadsheetml.sheet.main+xml"/>${CT}styles.xml" ContentType="${OD}spreadsheetml.styles+xml"/>${ws.map((_,i)=>`${CT}worksheets/sheet${i+1}.xml" ContentType="${OD}spreadsheetml.worksheet+xml"/>`).join('')}${dr.map((_,i)=>`${CT}drawings/drawing${i+1}.xml" ContentType="${OD}drawing+xml"/>`).join('')}${all.map((_,i)=>`${CT}charts/chart${i+1}.xml" ContentType="${OD}drawingml.chart+xml"/>`).join('')}</Types>`],
  ['_rels/.rels',rel([['rId1','officeDocument','xl/workbook.xml']])],
  ['xl/workbook.xml',XH+`<workbook xmlns="${NS}" xmlns:r="${RT}"><sheets>`+sheets.map((s,i)=>`<sheet name="${s.n}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')+'</sheets></workbook>'],
  ['xl/_rels/workbook.xml.rels',rel([...ws,['rId'+(sheets.length+1),'styles','styles.xml']])],
  ['xl/styles.xml',XH+`<styleSheet xmlns="${NS}"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="16"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF12263F"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>`],
  ...sheets.map((s,i)=>[`xl/worksheets/sheet${i+1}.xml`,s.x]),
  ...sheets.flatMap((s,i)=>s.dr==null?[]:[[`xl/worksheets/_rels/sheet${i+1}.xml.rels`,rel([['rId1','drawing',`../drawings/drawing${s.dr+1}.xml`]])]]),
  ...dr.map((x,i)=>[`xl/drawings/drawing${i+1}.xml`,XH+`<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="${DN}" xmlns:r="${RT}">${x.a}</xdr:wsDr>`]),
  ...dr.map((x,i)=>[`xl/drawings/_rels/drawing${i+1}.xml.rels`,rel(x.r)]),...all.map((x,i)=>[`xl/charts/chart${i+1}.xml`,x])];
 save(XS.fn+'_'+new Date().toISOString().slice(0,10)+'.xlsx',zip(files))}
/* ---------- HTML report export ---------- */
function hr(){if(!XS)return;const el=$('#b'+pg).cloneNode(true);el.querySelectorAll('button').forEach(b=>b.remove());el.classList.remove('hide');if(XS.multi){el.querySelector('#sn').remove();el.querySelector('#v0').remove();['#v1','#v2'].forEach((q,i)=>{const v=el.querySelector(q);v.classList.remove('hide');v.insertAdjacentHTML('afterbegin',`<h2 style="margin:18px 0 10px">${esc((XS.tt||[])[i]||'')}</h2>`)});(XS.extra||[]).forEach(s=>el.querySelector('#v1').insertAdjacentHTML('beforeend',`<h2 style='margin:18px 0 10px'>${esc(s.title)}</h2>`+s.html))}
 save(XS.fn+'_report.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(XS.title)}</title><style>${$('style').textContent}</style></head><body><header><h1>Meter Data Hub: ${esc(XS.title)}</h1><p>${esc(XS.sub)}</p></header><main>${el.outerHTML}</main></body></html>`)}
/* ---------- navigation and render ---------- */
function render(){XS=null;const hm=M.length>0,hb=B.length>0;
 $('#fb').classList.toggle('hide',pg==0||!(hm||hb));$('#ac').classList.toggle('hide',pg!=1&&pg!=3||!hm);
 [[1,hm],[2,hb],[3,hm&&hb]].forEach(([p,ok])=>{$('#e'+p).classList.toggle('hide',ok);$('#b'+p).classList.toggle('hide',!ok)});
 $('#nd').classList.toggle('hide',!(hm&&pg==1));if(hm&&pg==1){rAMR();if(!$('#np').classList.contains('hide'))rNA()}if(hb&&pg==2)rBIS();if(hm&&hb&&pg==3)rCmb()}
function go(p){pg=p;document.querySelectorAll('.pg').forEach((e,i)=>e.classList.toggle('hide',i!=p));document.querySelectorAll('#nav button').forEach((b,i)=>b.classList.toggle('on',i==p));render();scrollTo(0,0)}
$('#nav').onclick=e=>{const p=e.target.dataset.p;if(p!=null)go(+p)};$('#chg').onclick=()=>go(1);$('#bn').onclick=()=>{const h=$('#np').classList.toggle('hide');$('#bn').textContent=(h?'Show':'Hide')+' Non AMR day-wise dashboard';if(!h)rNA()};
document.addEventListener('click',e=>{const x=e.target.dataset&&e.target.dataset.x;if(!x)return;
 if(x==='nx'){const o=XS;XS=XD;xl();XS=o;return}if(x==='nc')return dl(nm?'non_amr_ageing.csv':'non_amr_daywise.csv',[XD.multi[nm].head,...XD.multi[nm].rows]);if(x==='xl')return xl();if(x==='hr')return hr();if(x[0]==='c')return dl(['','non_amr_meters.csv','bis_not_available_meters.csv'][+x[1]],CSVS[+x[1]]);if(x==='1')dl('non_amr_meters.csv',[['Region','Circle','Substation','Meter','Meter status','Gateway','Sum','Last day'],...amrL().filter(o=>!o.ok).map(amrRow)]);
 if(x==='2')dl('bis_fail_or_missing.csv',[['Region','Circle','Substation','Meter','Overall',...P],...B.filter(flt).filter(o=>o.st!=='Pass').map(bisRow)]);
 if(x==='3')dl('problem_meters.csv',[['Region','Circle','Substation','Meter','Issue','BIS result','Meter status','Gateway'],...W])});
