const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const OK='var(--ok)',BAD='var(--bad)',WARN='var(--warn)',NA='var(--na)',tk=()=>new Promise(r=>setTimeout(r,25));
let MI=[],M=[],D=[],A=new Map(),MU=[],pg=0,DW=null;
try{window.claude&&window.claude.use('downloads').then(d=>DW=d).catch(()=>{})}catch(e){}
const normSt=s=>{s=String(s||'').trim().toLowerCase();return s==='pass'?'Pass':s==='fail'?'Fail':'Not available'};
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
const pick=async(w,f)=>{if(w){const o=PRV;PRV=f;if(!CUR||!M.length){msg('sm2',f.name+': saved. Now upload the current month file.');return}await attachPrev();if(!PRV&&o)PRV=null;render()}else{const o=CUR;CUR=f;if(!(await loadM(f)))CUR=o}};
[['#dm',fs=>pick(0,fs[0])],['#dm2',fs=>pick(1,fs[0])],['#dw',fs=>loadW(fs)]].forEach(([s,fn0])=>{const z=$(s),i=z.querySelector('input'),fn=fs=>Promise.resolve().then(()=>fn0(fs)).catch(err=>msg({'#dm':'sm','#dm2':'sm2','#dw':'sw'}[s],'Could not read the file: '+err.message,1));i.onchange=e=>{if(e.target.files.length)fn([...e.target.files]);e.target.value=''};
 z.tabIndex=0;z.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();i.click()}};z.ondragover=e=>{e.preventDefault();z.classList.add('on')};z.ondragleave=()=>z.classList.remove('on');z.ondrop=e=>{e.preventDefault();z.classList.remove('on');e.dataTransfer.files.length&&fn([...e.dataTransfer.files])}});
/* ---------- filters and AMR calc ---------- */
function defTo(){const rows=M.filter(r=>r.ty===$('#fT').value),md=D.map((_,i)=>{const a=rows.map(r=>r.v[i]).sort((x,y)=>x-y);return a[a.length>>1]||0}),mx=Math.max(...md);let k=0;D.forEach((_,i)=>{if(mx>0?md[i]>=mx*.9:rows.some(r=>r.v[i]>0))k=i});return k}
const hiI=()=>Math.max(D.indexOf($('#fF').value),D.indexOf($('#fE').value)),loI=()=>Math.min(D.indexOf($('#fF').value),D.indexOf($('#fE').value));
function calc(){A=new Map();if(!M.length)return;const ty=$('#fT').value,lo=loI(),hi=hiI();for(const r of M){if(r.ty!==ty)continue;let s=0,dd=0;for(let i=lo;i<=hi;i++)if(r.v[i]>0){s+=r.v[i];dd++}A.set(r.mt,{r,s,dd,ok:s>0})}}
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
 return `<svg viewBox="0 0 200 200" width="190" height="190" role="img" aria-label="Pie chart: ${lb}"><text x="100" y="107" text-anchor="middle" font-size="20" font-weight="700" fill="currentColor">${lb}</text>${s}</svg>`};
const pieBox=(v,nm,co,lb,T=v.reduce((a,b)=>a+b,0))=>`<div style="text-align:center">${pie(v,co,lb)}</div><div class="lg" style="justify-content:center">`+nm.map((n,i)=>`<span><i style="background:${co[i]}"></i>${n}: ${nf(v[i])} (${pc(v[i],T)})</span>`).join('')+'</div>';
const fsub=m=>`Region: ${sl(mR.sel)} | Circle: ${sl(mC.sel)} | Substation: ${sl(mS.sel)}`+(m?` | ${$('#fT').value}, ${D[loI()]} to ${D[hiI()]}`:'')+` | Generated ${new Date().toLocaleString()}`;
/* ---------- multi-select filters ---------- */
const u=a=>[...new Set(a)].sort(),subOf=r=>pg==2?r.sb:(r.s2||r.sb),sl=s=>s.size?[...s].map(short).slice(0,6).join(', ')+(s.size>6?` +${s.size-6} more`:''):'All';
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
const rowsAll=()=>pg==1?MU:pg==2?MI:[...MU,...MI];
function cas1(){const g=mR.sel;mC.set(u(rowsAll().filter(r=>!g.size||g.has(r.rg)).map(r=>r.ci)));cas2()}
function cas2(){const g=mR.sel,c=mC.sel;mS.set(u(rowsAll().filter(r=>(!g.size||g.has(r.rg))&&(!c.size||c.has(r.ci))).map(subOf)));render()}
const flt=r=>(!mR.sel.size||mR.sel.has(r.rg))&&(!mC.sel.size||mC.sel.has(r.ci))&&(!mS.sel.size||mS.sel.has(subOf(r)));
function link(){if(!MU.length||!MI.length)return;const m=new Map(MU.map(r=>[r.mt,r.sb]));MI.forEach(x=>x.s2=m.get(x.mt))}
function ready(){mR.set(u(rowsAll().map(r=>r.rg)));cas1()}
document.addEventListener('click',e=>document.querySelectorAll('.ms details[open]').forEach(d=>{if(!d.contains(e.target))d.open=false}));
const ptab=(t,lab,g,nm,xh=[],xf=()=>[])=>({t,h:[lab,'Meters',...nm,...nm.map(x=>x+' %'),...xh],r:g.map(o=>{const n=o.v.reduce((a,b)=>a+b,0);return[o.k,n,...o.v,...o.v.map(x=>pc(x,n)),...xf(o.v,n)]}),nc:1});
/* ---------- AMR page ---------- */
const amrL=()=>[...A.values()].filter(x=>flt(x.r));
const amrRow=x=>[x.r.rg,x.r.ci,x.r.sb,x.r.mt,x.r.ms,x.r.gs,x.s,x.dd],
AH=['Region','Circle','Substation','Meter','Meter status','Gateway','Total readings (range)','Days with data (range)','Status'],
NH=['Region','Circle','Substation','Meter','Meter status','Gateway','Last data date','Ageing (days)'],
naRow=x=>{const o=ageOf(x);return[x.r.rg,x.r.ci,x.r.sb,x.r.mt,x.r.ms,x.r.gs,o.ld?fd(o.ld):'No data in period',o.a]};
function rAMR(q=''){const L=amrL(),ok=L.filter(x=>x.ok).length,n=L.length,hi=hiI(),N=['AMR','Non AMR'],C=[OK,BAD];
 $('#k1'+q).innerHTML=kp([['Total meters',n],['AMR (reporting)',ok,'ok'],['Non AMR',n-ok,'bad'],['AMR %',pc(ok,n),'ok'],['Non AMR %',pc(n-ok,n),'bad']]);
 const G=kf=>grp(L,kf,x=>x.ok?0:1,2).sort((a,b)=>sh(a)-sh(b)),gr=G(x=>short(x.r.rg)),gc=G(x=>short(x.r.ci));
 $('#pa'+q).innerHTML=pieBox([ok,n-ok],N,C,pc(ok,n));$('#a1'+q).innerHTML=stack(gr,N,C);$('#a2'+q).innerHTML=stack(gc,N,C);
 const cn=D.slice(0,hi+1).map((d,i)=>L.filter(x=>x.r.v[i]>0).length),mx=Math.max(1,...cn);
 $('#a3'+q).innerHTML='<div class="tr">'+cn.map((c,i)=>`<div title="${D[i]}: ${nf(c)} meters (${pc(c,n)})"><em>${pc(c,n)}</em><b style="height:${c/mx*66}%"></b><span>${D[i].slice(8)}</span></div>`).join('')+'</div>';
 const NL=L.filter(x=>!x.ok);$('#t1'+q).innerHTML=tbl(NH,NL.slice(0,200).map(x=>naRow(x).map((c,i)=>i==4||i==5?tag(c==='Connected'?'Pass':c==='Disconnected'?'Fail':c):esc(c))));
 const X={fn:'amr_dashboard',title:q?'Non AMR dashboard':'AMR Analyzer',sub:fsub(1),kpis:[['Total meters',n],['AMR (reporting)',ok],['Non AMR',n-ok],['AMR %',pc(ok,n)],['Non AMR %',pc(n-ok,n)],['Type of data',$('#fT').value],['Date range',D[loI()]+' to '+D[hi]]],
  tabs:[{t:'AMR vs Non AMR',h:['Status','Meters','Share %'],r:[['AMR',ok,pc(ok,n)],['Non AMR',n-ok,pc(n-ok,n)]],pie:1,c:XC},{t:'By region',h:['Region',...N],r:gr.map(o=>[o.k,...o.v]),c:XC},{t:'By circle',h:['Circle',...N],r:gc.map(o=>[o.k,...o.v]),c:XC},ptab('AMR % by region','Region',gr,N),ptab('AMR % by circle','Circle',gc,N),{t:'Meters reporting per day',h:['Date','Meters'],r:D.slice(0,hi+1).map((d,i)=>[d,cn[i]]),c:['2F5FD0'],pt:n}],
  head:q?NH:AH,rows:q?NL.map(x=>naRow(x)):L.map(x=>[...amrRow(x),x.ok?'AMR':'Non AMR'])};if(!q)XS=X;return X}
/* ---------- Combined page: Non AMR + BIS data not available, each meter once ---------- */
const NM=['Non AMR','Not Ready for invoice (other meters)'],NC=[BAD,WARN];
let W=[];
let sv=0;const CSVS=[];
$('#v1').innerHTML=$('#b1').innerHTML.replace(/ id="(\w+)"/g,' id="$1n"').replace('data-x="1"','data-x="c1"');
$('#sn').onclick=e=>{const s=e.target.dataset.s;if(s!=null){sv=+s;render()}};
function rCmb(){document.querySelectorAll('#sn button').forEach((b,i)=>b.className='btn'+(i==sv?'':' alt'));[0,1].forEach(i=>$('#v'+i).classList.toggle('hide',i!=sv));const bm=new Map(MI.map(o=>[o.mt,o.inv])),Z=new Map();
 for(const x of A.values())if(!x.ok&&flt(x.r))Z.set(x.r.mt,{rg:x.r.rg,ci:x.r.ci,sb:subOf(x.r),mt:x.r.mt,k:0,ms:x.r.ms,gs:x.r.gs});
 const bn=MI.filter(o=>o.inv!==RDY&&flt(o));
 for(const o of bn)if(!Z.has(o.mt)){const a=A.get(o.mt);Z.set(o.mt,{rg:o.rg,ci:o.ci,sb:subOf(o),mt:o.mt,k:1,ms:a?a.r.ms:'',gs:a?a.r.gs:''})}
 const L=[...Z.values()].map(o=>(o.bis=bm.get(o.mt)||'Not in weekly files',o)),n=L.length,a=L.filter(o=>o.k===0).length,b=n-a,tt=o=>o.v[0]+o.v[1],G=kf=>grp(L,kf,o=>o.k,2).sort((x,y)=>tt(y)-tt(x)),gr=G(o=>short(o.rg)),gc=G(o=>short(o.ci)),gs=G(o=>o.sb).slice(0,10);
 $('#i3').textContent=`${n} unique meters need attention: ${a} are Non AMR and ${b} more are Not Ready for invoice. A meter that is in both lists is counted once.`;
 $('#k3').innerHTML=kp([['Problem meters (each counted once)',n,'bad'],['Non AMR meters',a,'bad'],['Not Ready for invoice',bn.length,'warn'],['Substations affected',new Set(L.map(o=>o.sb)).size]]);
 $('#pc').innerHTML=pieBox([a,b],NM,NC,n.toLocaleString('en-IN'));$('#m3').innerHTML=stack(gr,NM,NC,1);$('#s3').innerHTML=stack(gc,NM,NC,1);
 $('#u3').innerHTML=tbl(['Substation','Meters','Non AMR','Not Ready for invoice'],gs.map(o=>[esc(o.k),tt(o),o.v[0],o.v[1]]));
 const WH2=['Region','Circle','Substation','Meter','Issue','Invoice status','Meter status','Gateway'];
 W=L.map(o=>[o.rg,o.ci,o.sb,o.mt,o.k?'Not Ready for invoice':'Non AMR',o.bis,o.ms,o.gs]);
 const cs=s=>tag(s==='Connected'?'Pass':s==='Disconnected'?'Fail':s);
 $('#w3').innerHTML=tbl(WH2,W.slice(0,200).map(r=>[esc(r[0]),esc(r[1]),esc(r[2]),esc(r[3]),`<span class="tg ${r[4]==='Non AMR'?'t-bad':'t-warn'}">${r[4]}</span>`,`<span class="tg ${r[5]===RDY?'t-ok':'t-na'}">${esc(r[5])}</span>`,cs(r[6]),cs(r[7])]));
 $('#n3').textContent=`Communication uses the AMR settings: ${$('#fT').value}, ${D[loI()]} to ${D[hiI()]}. A meter is Non AMR when it has no data on any of these dates. Not Ready for invoice means fewer than ${IMIN} week(s) with Pass or Fail in the weekly BIS files. Showing first 200 of ${n}.`;
 const X1=rAMR('n');CSVS[1]=[X1.head,...X1.rows];
 const NB=naBuild(),AG=NB.age.spec;const IM=invModel(),IX=invSpec(IM,1),sec=t=>[{v:t,s:1},{v:'',s:1}],pf=(p,ts)=>ts.map(t=>({...t,t:p+': '+t.t}));
 XS={fn:'combined_dashboard',title:'Non AMR, Ageing and BIS invoice',sub:fsub(1),tt:[X1.title],htmlRows:1,extra:[AG,{title:'BIS invoice dashboard',gen:()=>invHtml(IM)}],
  multi:[{title:'Combined dashboard: Non AMR, Ageing and BIS invoice',sub:fsub(1),kpis:[sec('Non AMR dashboard'),...X1.kpis,sec('Ageing dashboard'),...AG.kpis,sec('BIS invoice dashboard'),...IX.kpis],tabs:[...pf('Non AMR',X1.tabs),...pf('Ageing',AG.tabs),...pf('BIS invoice',IX.tabs)],head:AH,rows:amrL().map(x=>[...amrRow(x),x.ok?'AMR':'Non AMR'])},
   {head:NB.ah,rows:NB.ar,side:AG},{head:IX.head,rows:IX.rows}],
  sn:['Dashboard','',''],ds:['Non AMR Row Data','Ageing Row Data','BIS Invoice Row Data']}}
/* ---------- Non AMR day-wise / ageing dashboard (opens on button click) ---------- */
let XD=null,nm=0;
const fd=d=>d.split('-').reverse().join('-'),hx=(i,N)=>{const h=N>1?i/(N-1)*120:0,f=n=>{const k=(n+h/30)%12;return Math.round((.5-.375*Math.max(-1,Math.min(k-3,9-k,1)))*255).toString(16).padStart(2,'0')};return(f(0)+f(8)+f(4)).toUpperCase()};
const dbt=(a,b)=>{const p=s=>Date.UTC(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10));return Math.round((p(b)-p(a))/864e5)},
AL=['0-3 days','4-7 days','8-15 days','16-30 days','31-60 days','61+ days'],AC=['E3A008','E8801A','D94F30','A83226','6E1F18','4A1410'];
function ageOf(x){const hi=hiI(),last=D[hi];let a=-1,ld='';
 for(let i=hi;i>=0;i--)if(x.r.v[i]>0){a=dbt(D[i],last);ld=D[i];break}
 if(a<0&&x.r.pv)for(let i=PD.length-1;i>=0;i--)if(x.r.pv[i]>0){a=dbt(PD[i],last);ld=PD[i];break}
 if(a<0)a=dbt(PD[0]||D[0],last)+1;
 return{a,ld}}
function naMode(L,key,lb,co,fix,c){const n=L.length,tt=o=>o.v.reduce((a,b)=>a+b,0),cnt=Array(lb.length).fill(0);L.forEach(x=>cnt[key(x)]++);
 const ks=lb.map((_,i)=>i).filter(i=>i<fix||cnt[i]),m=Object.fromEntries(ks.map((i,j)=>[i,j])),nl=ks.map(i=>lb[i]),nc=ks.map(i=>co[i]);
 const rg=grp(L,x=>short(x.r.rg),x=>m[key(x)],ks.length).sort((a,b)=>tt(b)-tt(a)),
 kpis=[...c.lead,...ks.map(i=>[`${lb[i]} (meters)`,cnt[i]]),...ks.map(i=>[`${lb[i]} (% of ${c.bl})`,pc(cnt[i],n)])];
 const hd=['Region',...nl,`Total ${c.bl}`,`% of ${c.bl}`],raw=[...rg.map(o=>[o.k,...o.v,tt(o),pc(tt(o),n)]),['Total',...ks.map(i=>cnt[i]),n,n?'100.0%':'0.0%']],tbh=tbl(hd,raw.map(r=>r.map((v,j)=>j?v:esc(v))));
 return{lb:nl,co:nc,rg,tbh,ct:c.ct,spec:{fn:c.fn,title:c.title,sub:fsub(1),kpis,tabs:[{t:c.ct,h:['Region',...nl],r:rg.map(o=>[o.k,...o.v]),c:nc},...(c.tb?[{t:'Region-wise table',h:hd,r:raw,nc:1}]:[])],head:hd,rows:raw,
  html:`<p class="sub">${esc(c.note)}</p><div class="card"><h3>${esc(c.ct)}</h3><div class="chart">${stack(rg,nl,nc.map(v=>'#'+v),1)}</div></div>`+(c.tb?`<div class="card"><h3>Region-wise table</h3><div class="scroll">${tbh}</div></div>`:'')}}}
function naBuild(){const lo=loI(),hi=hiI(),N=hi-lo+1,all=amrL(),L=all.filter(x=>!x.ok),tot=all.length,n=L.length,last=D[hi],first=PD[0]||D[0],S=all.filter(x=>!(x.r.v[hi]>0)),ns=S.length;
 for(const x of S){const o=ageOf(x);x.a=o.a;x.ld=o.ld}
 const ab=a=>a<=3?0:a<=7?1:a<=15?2:a<=30?3:a<=60?4:5,
 dn=`${N} date(s) selected (${fd(D[lo])} to ${fd(last)}). Each meter is counted by the number of these days on which it has data. 0 days means Non AMR (no data on any selected date). 1 or more days means AMR.`,
 an=`Ageing is calculated for meters with no data on the Last date (${fd(last)}). Ageing = whole days from the meter's most recent day with data to the Last date. The search starts at the Last date and goes back through the current file, then through the previous month file if one is uploaded (${fd(first)} to ${fd(last)}, ${dbt(first,last)+1} days in total); nothing after the Last date is used. If no data is found on any of these days, ageing is counted from the first date, so it equals the number of days from ${fd(first)} up to and including the Last date. This list is separate from the Non AMR count, which needs no data on any selected day. 0-3 means 0 to 3 days, 4-7 means 4 to 7 days, and so on.`,
 dl2=[...Array(N+1)].map((_,d)=>d?`${d} of ${N} days`:`Non AMR: 0 of ${N} days`);
 return{N,lo,hi,dn,an,ah:['Region','Circle','Substation','Meter','AMR status','Meter status','Gateway','Last data date','Ageing (days)','Ageing bucket'],ar:S.map(x=>[x.r.rg,x.r.ci,x.r.sb,x.r.mt,x.ok?'AMR':'Non AMR',x.r.ms,x.r.gs,x.ld?fd(x.ld):'No data in period',x.a,AL[ab(x.a)]]),
  day:naMode(all,x=>x.dd,dl2,dl2.map((_,d)=>hx(d,N+1)),N+1,{lead:[['Total meters',tot],['AMR meters',tot-n],['Non AMR meters',n],['AMR %',pc(tot-n,tot)],['Non AMR %',pc(n,tot)]],bl:'meters',ct:'Region-wise meters by days with data',title:`Day-wise reporting status (${fd(D[lo])} to ${fd(last)})`,fn:'meters_daywise',note:dn}),
  age:naMode(S,x=>ab(x.a),AL,AC,5,{lead:[['Total meters',tot],['Meters with no data on Last date',ns],['% of total meters',pc(ns,tot)],['Non AMR meters (no data in whole range)',n]],bl:'meters with no Last-date data',ct:'Region-wise meters by ageing',title:`Ageing of meters with no data on the Last date (as on ${fd(last)})`,fn:'non_amr_ageing',note:an,tb:1})}}
function rNA(){const B2=naBuild(),M2=nm?B2.age:B2.day;
 XD={fn:'daywise_and_ageing',title:'Day-wise reporting status and Non AMR ageing',sub:fsub(1),multi:[B2.day.spec,B2.age.spec],sn:['Day-wise','Ageing'],ds:['Day-wise Data','Ageing Data']};
 $('#nh').textContent=nm?`Ageing as on ${fd(D[B2.hi])}: meters with no data on the Last date`:`Day-wise reporting status: ${fd(D[B2.lo])} to ${fd(D[B2.hi])}`;$('#ns').textContent=nm?B2.an:B2.dn;
 document.querySelectorAll('#np [data-m]').forEach(b=>b.className='btn'+(+b.dataset.m===nm?'':' alt'));
 $('#nrh').textContent=M2.ct;$('#nrb').innerHTML=stack(M2.rg,M2.lb,M2.co.map(c=>'#'+c),1);$('#nrtc').classList.toggle('hide',!nm);$('#nrt').innerHTML=nm?M2.tbh:''}
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
function chart(pi,title,cat,ss,co,pp){const DL=pp?'<c:dLbls><c:numFmt formatCode="0.0%;-0.0%;;" sourceLinked="0"/><c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="800"/></a:pPr><a:endParaRPr lang="en-US"/></a:p></c:txPr><c:dLblPos val="ctr"/><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls>':'',fl=c=>`<c:spPr><a:solidFill><a:srgbClr val="${c}"/></a:solidFill></c:spPr>`;
 const se=ss.map((s,i)=>`<c:ser><c:idx val="${i}"/><c:order val="${i}"/><c:tx><c:strRef><c:f>${s.n}</c:f></c:strRef></c:tx>`+(pi?co.map((c,k)=>`<c:dPt><c:idx val="${k}"/><c:bubble3D val="0"/>${fl(c)}</c:dPt>`).join('')+'<c:dLbls><c:numFmt formatCode="0.0%" sourceLinked="0"/><c:showLegendKey val="0"/><c:showVal val="0"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="1"/><c:showBubbleSize val="0"/><c:showLeaderLines val="1"/></c:dLbls>':fl(co[i%co.length])+'<c:invertIfNegative val="0"/>'+DL)+`<c:cat><c:strRef><c:f>${cat}</c:f></c:strRef></c:cat><c:val><c:numRef><c:f>${s.v}</c:f></c:numRef></c:val></c:ser>`).join('');
 return XH+`<c:chartSpace xmlns:c="${CN}" xmlns:a="${DN}" xmlns:r="${RT}"><c:chart><c:title><c:tx><c:rich><a:bodyPr/><a:p><a:r><a:t>${X(title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/><c:plotArea><c:layout/>`+(pi?`<c:pieChart><c:varyColors val="1"/>${se}<c:firstSliceAng val="0"/></c:pieChart>`:`<c:barChart><c:barDir val="bar"/><c:grouping val="stacked"/><c:varyColors val="0"/>${se}<c:gapWidth val="40"/><c:overlap val="100"/><c:axId val="1"/><c:axId val="2"/></c:barChart><c:catAx><c:axId val="1"/><c:scaling><c:orientation val="maxMin"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:crossAx val="2"/></c:catAx><c:valAx><c:axId val="2"/><c:scaling><c:orientation val="minMax"/>${pp&&ss.length>1?'<c:max val="1"/><c:min val="0"/>':''}</c:scaling><c:delete val="0"/><c:axPos val="t"/><c:majorGridlines/><c:numFmt formatCode="${pp?'0%':'General'}" sourceLinked="0"/><c:crossAx val="1"/></c:valAx>`)+'</c:plotArea><c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend><c:plotVisOnly val="1"/></c:chart></c:chartSpace>'}
const rel=a=>XH+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+a.map(([i,t,g])=>`<Relationship Id="${i}" Type="${RT}/${t}" Target="${g}"/>`).join('')+'</Relationships>';
const anc=(i,c0,r0,c1,r1)=>`<xdr:twoCellAnchor><xdr:from><xdr:col>${c0}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${r0}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>${c1}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${r1}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${i+1}" name="Chart ${i}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="${CN}"><c:chart xmlns:c="${CN}" r:id="rId${i}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`;
async function xl(){if(!XS)return;const ds=XS.multi||XS.xm||[XS],SN=XS.sn||(XS.multi?['Non AMR','BIS Not Available']:['Dashboard']),DS=XS.ds||(XS.multi?['Non AMR Data','BIS NA Data']:['Data']),H=a=>a.map(v=>({v,s:1})),CT='<Override PartName="/xl/',all=[],dr=[],sheets=[];
 ds.forEach((S,d)=>{if(S.tabs){const rows=[[{v:S.title,s:2}],[S.sub],[],H(['Metric','Value']),...S.kpis,[]],ch=[],k0=all.length;
   S.tabs.forEach(t=>{const k=t.h.length-1,pp=!t.nc&&!t.pie&&(k>1||t.pt),y0=rows.length,n=t.r.length,h=y0+2,hg=t.nc?n+2:Math.max(n+3,18),R=(c,a,b)=>`'${SN[d]}'!$${CL(c)}$${a}`+(b?`:$${CL(c)}$${b}`:'');
    let th=t.h,tr=t.r;if(pp){th=[...t.h,...t.h.slice(1).map(x=>x+' %')];tr=t.r.map(a=>{const sm=k>1?a.slice(1).reduce((p,q)=>p+(+q||0),0):t.pt;return[...a,...a.slice(1).map(q=>({v:sm?(+q||0)/sm:0,s:3}))]})}
    rows.push([t.t],H(th),...tr);
    if(!t.nc){ch.push({y0,hg,c0:pp?2*k+2:6});all.push(chart(!!t.pie,t.t,R(0,h+1,h+n),t.pie?[{n:R(1,h),v:R(1,h+1,h+n)}]:t.h.slice(1).map((_,j)=>({n:R(j+1,h),v:R(pp?j+1+k:j+1,h+1,h+n)})),t.c,pp))}
    for(let i=0;i<hg-n-1;i++)rows.push([])});
   sheets.push({n:SN[d],x:sheet(rows,[38,14,14,14,14,14],1),dr:dr.length});
   dr.push({a:ch.map((c,i)=>anc(i+1,c.c0,c.y0,c.c0+9,c.y0+c.hg)).join(''),r:ch.map((_,i)=>['rId'+(i+1),'chart','../charts/chart'+(k0+i+1)+'.xml'])})}
  {const sd=S.side,hl=S.head.length,pad=r=>[...r,...Array(hl-r.length).fill('')],rows=[[...H(S.head),...(sd?['',...H(sd.head)]:[])]];
   for(let i=0;i<S.rows.length||(sd&&i<sd.rows.length);i++)rows.push([...pad(S.rows[i]||[]),...(sd&&sd.rows[i]?['',...sd.rows[i]]:[])]);
   sheets.push({n:DS[d],x:sheet(rows,[...S.head.map(()=>22),...(sd?[4,...sd.head.map((_,j)=>j?14:22)]:[])],0)})}});
 const ws=sheets.map((_,i)=>['rId'+(i+1),'worksheet',`worksheets/sheet${i+1}.xml`]),
 files=[['[Content_Types].xml',XH+`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${CT}workbook.xml" ContentType="${OD}spreadsheetml.sheet.main+xml"/>${CT}styles.xml" ContentType="${OD}spreadsheetml.styles+xml"/>${ws.map((_,i)=>`${CT}worksheets/sheet${i+1}.xml" ContentType="${OD}spreadsheetml.worksheet+xml"/>`).join('')}${dr.map((_,i)=>`${CT}drawings/drawing${i+1}.xml" ContentType="${OD}drawing+xml"/>`).join('')}${all.map((_,i)=>`${CT}charts/chart${i+1}.xml" ContentType="${OD}drawingml.chart+xml"/>`).join('')}</Types>`],
  ['_rels/.rels',rel([['rId1','officeDocument','xl/workbook.xml']])],
  ['xl/workbook.xml',XH+`<workbook xmlns="${NS}" xmlns:r="${RT}"><sheets>`+sheets.map((s,i)=>`<sheet name="${s.n}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')+'</sheets></workbook>'],
  ['xl/_rels/workbook.xml.rels',rel([...ws,['rId'+(sheets.length+1),'styles','styles.xml']])],
  ['xl/styles.xml',XH+`<styleSheet xmlns="${NS}"><numFmts count="1"><numFmt numFmtId="164" formatCode="0.0%"/></numFmts><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="16"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF12263F"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>`],
  ...sheets.map((s,i)=>[`xl/worksheets/sheet${i+1}.xml`,s.x]),
  ...sheets.flatMap((s,i)=>s.dr==null?[]:[[`xl/worksheets/_rels/sheet${i+1}.xml.rels`,rel([['rId1','drawing',`../drawings/drawing${s.dr+1}.xml`]])]]),
  ...dr.map((x,i)=>[`xl/drawings/drawing${i+1}.xml`,XH+`<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="${DN}" xmlns:r="${RT}">${x.a}</xdr:wsDr>`]),
  ...dr.map((x,i)=>[`xl/drawings/_rels/drawing${i+1}.xml.rels`,rel(x.r)]),...all.map((x,i)=>[`xl/charts/chart${i+1}.xml`,x])];
 save(XS.fn+'_'+new Date().toISOString().slice(0,10)+'.xlsx',zip(files))}
/* ---------- HTML report export ---------- */
async function hr(){if(!XS)return;const CSSX=await getCSS();const el=$('#b'+pg).cloneNode(true);el.querySelectorAll('button,.noexp').forEach(b=>b.remove());el.classList.remove('hide');if(XS.multi){el.querySelector('#sn').remove();el.querySelector('#v0').remove();['#v1'].forEach((q,i)=>{const v=el.querySelector(q);v.classList.remove('hide');v.insertAdjacentHTML('afterbegin',`<h2 style="margin:18px 0 10px">${esc((XS.tt||[])[i]||'')}</h2>`)});(XS.extra||[]).forEach(s=>el.querySelector('#v1').insertAdjacentHTML('beforeend',`<h2 style='margin:18px 0 10px'>${esc(s.title)}</h2>`+(s.gen?s.gen():s.html)));if(XS.htmlRows)XS.multi.forEach((S,i)=>el.querySelector('#v1').insertAdjacentHTML('beforeend',`<h2 style='margin:18px 0 10px'>${esc(XS.ds[i])}</h2><div class="card"><div class="scroll" style="max-height:600px">${tbl(S.head,S.rows.map(a=>a.map(c=>esc(c))))}</div></div>`))}
 save(XS.fn+'_report.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(XS.title)}</title><style>${CSSX}</style></head><body><header><h1>Meter Data Hub: ${esc(XS.title)}</h1><p>${esc(XS.sub)}</p></header><main>${el.outerHTML}</main></body></html>`)}
/* ---------- navigation and render ---------- */
function render(){XS=null;const hm=M.length>0,hi4=MI.length>0;
 $('#fb').classList.toggle('hide',pg==0||!([0,hm,hi4,hm||hi4][pg]));$('#ac').classList.toggle('hide',pg!=1&&pg!=3||!hm);
 [[1,hm],[2,hi4],[3,hm&&hi4]].forEach(([p,ok])=>{$('#e'+p).classList.toggle('hide',ok);$('#b'+p).classList.toggle('hide',!ok)});
 $('#nd').classList.toggle('hide',!(hm&&pg==1));if(hm&&pg==1){rAMR();if(!$('#np').classList.contains('hide'))rNA()}if(hi4&&pg==2)rInv();if(hm&&hi4&&pg==3)rCmb()}
function go(p){pg=p;document.querySelectorAll('.pg').forEach((e,i)=>e.classList.toggle('hide',i!=p));document.querySelectorAll('#nav button').forEach((b,i)=>b.classList.toggle('on',i==p));p?ready():render();scrollTo(0,0)}
$('#nav').onclick=e=>{const p=e.target.dataset.p;if(p!=null)go(+p)};$('#chg').onclick=()=>go(1);$('#bn').onclick=()=>{const h=$('#np').classList.toggle('hide');$('#bn').textContent=(h?'Show':'Hide')+' day-wise and ageing dashboard';if(!h)rNA()};
document.addEventListener('click',e=>{const x=e.target.dataset&&e.target.dataset.x;if(!x)return;
 if(x==='i4'||x==='i5')return dlInv(x==='i4');if(x==='nx'){const o=XS;XS=XD;xl();XS=o;return}if(x==='nc')return dl(nm?'non_amr_ageing.csv':'meters_daywise.csv',[XD.multi[nm].head,...XD.multi[nm].rows]);if(x==='xl')return xl();if(x==='hr')return hr();if(x[0]==='c')return dl(['','non_amr_meters.csv','bis_not_available_meters.csv'][+x[1]],CSVS[+x[1]]);if(x==='1')dl('non_amr_meters.csv',[NH,...amrL().filter(o=>!o.ok).map(x=>naRow(x))]);
 if(x==='3')dl('problem_meters.csv',[['Region','Circle','Substation','Meter','Issue','BIS result','Meter status','Gateway'],...W])});

/* ---------- Monthly invoice: weekly BIS files, Ready for Invoice rule ---------- */
const RDY='Ready for Invoice',NRD='Not Ready',IW={};let IMIN=1,INVX=null;
const wkNums=()=>Object.keys(IW).sort((a,b)=>a-b),pos=(ix,n,f)=>n in ix?ix[n]:f;
async function getCSS(){const l=document.querySelector('link[href$="style.css"]');try{const r=await fetch(l.href);if(!r.ok)throw 0;return await r.text()}catch(e){try{return[...l.sheet.cssRules].map(r=>r.cssText).join('')}catch(e2){return EXPORT_CSS}}}
async function loadW(files){const fl=files.filter(f=>/\.csv$/i.test(f.name));if(!fl.length){msg('sw','Choose .csv files.',1);return}
 msg('sw','Reading files...');await tk();const bad=[];
 for(const f of fl){const a=parse((await f.text()).replace(/^\uFEFF/,'')),h=(a[0]||[]).map(x=>x.trim()),ix={};h.forEach((x,i)=>ix[x]=i);
  const c={rg:0,zn:1,ci:2,dv:3,sd:4,wk:5,dt:6,sb:7,lc:8,mt:10,st:11};
  const rows=a.slice(1).filter(r=>r.length>=12).map(r=>({rg:r[c.rg],zn:r[c.zn],ci:r[c.ci],dv:r[c.dv],sd:r[c.sd],wk:String(r[c.wk]).trim(),dt:r[c.dt],sb:r[c.sb],lc:r[c.lc],mt:r[c.mt],st:normSt(r[c.st])}));
  if(!rows.length){bad.push(f.name);continue}IW[rows[0].wk]={name:f.name,dt:rows[0].dt,rows}}
 const ws=wkNums();if(!ws.length){msg('sw','No usable rows. Expected the BIS summary layout (meter in column K, overall status in column L).',1);return}
 aggInv();link();msg('sw',`${ws.length} week file(s): ${ws.map(w=>'Week '+w+' ('+IW[w].rows.length.toLocaleString('en-IN')+' rows)').join(', ')}.`+(bad.length?' Skipped: '+bad.join(', ')+'.':'')+(ws.length<4?' Add the remaining weeks to complete the month.':''),bad.length&&0);ready()}
function aggInv(){const m=new Map();wkNums().forEach(w=>IW[w].rows.forEach(r=>{let o=m.get(r.mt);if(!o)m.set(r.mt,o={mt:r.mt,wk:{}});
  o.rg=r.rg;o.zn=r.zn;o.ci=r.ci;o.dv=r.dv;o.sd=r.sd;o.sb=r.sb;o.lc=r.lc;o.wk[w]=r.st}));MI=[...m.values()];setInv()}
function setInv(){const ws=wkNums();MI.forEach(o=>{o.valid=ws.filter(w=>o.wk[w]==='Pass'||o.wk[w]==='Fail').length;o.inv=o.valid>=IMIN?RDY:NRD})}
const cnt3=rs=>{const c=[0,0,0];rs.forEach(r=>c[r.st==='Pass'?0:r.st==='Fail'?1:2]++);return c};
function invModel(){const ws=wkNums(),L=MI.filter(flt),n=L.length,r=L.filter(o=>o.inv===RDY).length,tot=cnt3(ws.flatMap(w=>IW[w].rows).filter(flt)),ts=tot[0]+tot[1]+tot[2],
  G=kf=>grp(L,kf,o=>o.inv===RDY?0:1,2).sort((a,b)=>sh(a)-sh(b)),
  wr=ws.map(w=>{const rr=IW[w].rows.filter(flt);return{k:'Week '+w,dt:IW[w].dt,v:cnt3(rr),t:rr.length}});
 return{ws,L,n,r,x:n-r,tot,ts,gr:G(o=>short(o.rg)),gz:G(o=>short(o.rg)+' / '+o.zn),wr,
  WHd:['Week','Start date','Total meters','Pass','Fail','Not available','Data available %'],
  wk:[...wr.map(o=>[o.k,o.dt,o.t,...o.v,pc(o.v[0]+o.v[1],o.t)]),['Month','',ts,...tot,pc(tot[0]+tot[1],ts)]],
  hd:['Region','Zone','Circle','Division','Sub-division','Substation','Metering location','Meter serial',...ws.map(w=>'Week '+w),'Weeks with Pass/Fail','Invoice status'],
  row:o=>[o.rg,o.zn,o.ci,o.dv,o.sd,o.sb,o.lc,o.mt,...ws.map(w=>o.wk[w]||''),o.valid,o.inv]}}
const invKpi=m=>kp([['Ready for Invoice (meters)',m.r,'ok'],['Total meters',m.n],['Not Ready (meters)',m.x,'na'],['Ready %',pc(m.r,m.n),'ok']]);
function invSpec(m,full){const bc=[XC[0],XC[3]],rw=o=>[o.k,...o.v],IN=[RDY,NRD];
 return{fn:'bis_monthly_invoice',title:'BIS monthly invoice status',sub:fsub(0)+` | Ready for Invoice = Pass or Fail in at least ${IMIN} week(s)`,
  kpis:[[RDY+' (meters)',m.r],['Total meters',m.n],[NRD+' (meters)',m.x],['Ready %',pc(m.r,m.n)]],
  tabs:full?[{t:'Invoice status',h:['Status','Meters','Share %'],r:[[RDY,m.r,pc(m.r,m.n)],[NRD,m.x,pc(m.x,m.n)]],pie:1,c:bc},{t:'By region',h:['Region',...IN],r:m.gr.map(rw),c:bc},{t:'By zone',h:['Region / Zone',...IN],r:m.gz.map(rw),c:bc},{t:'Readings by week',h:['Week','Pass','Fail','Not available'],r:m.wr.map(rw),c:[XC[0],XC[1],XC[3]]},{t:'Weekly summary',h:m.WHd,r:m.wk,nc:1}]:[],
  head:m.hd,rows:m.L.map(m.row)}}
function invHtml(m){const IN=[RDY,NRD],IC=[OK,NA],S3=['Pass','Fail','Not available'];
 return `<p class="sub">Rule: a meter is Ready for Invoice when it has Pass or Fail in at least ${IMIN} week(s).</p><div class="kpis">${invKpi(m)}</div>
<div class="two"><div class="card"><h3>Invoice status</h3>${pieBox([m.r,m.x],IN,IC,pc(m.r,m.n))}</div><div class="card"><h3>By region</h3>${stack(m.gr,IN,IC)}</div><div class="card"><h3>Readings by week</h3>${stack(m.wr,S3,[OK,BAD,NA])}</div></div>
<div class="card"><h3>By zone (lowest ready share first)</h3><div class="chart">${stack(m.gz,IN,IC)}</div></div><div class="card"><h3>Weekly summary</h3><div class="scroll">${tbl(m.WHd,m.wk.map(a=>a.map(nf)))}</div></div>`}
function rInv(){const m=invModel(),IN=[RDY,NRD],IC=[OK,NA],S3=['Pass','Fail','Not available'],q=$('#iq').value.toLowerCase(),f=$('#is').value;
 $('#ir').textContent=`Rule: a meter is Ready for Invoice when it has Pass or Fail in at least ${IMIN} week(s).`;$('#k4').innerHTML=invKpi(m);
 $('#pi').innerHTML=pieBox([m.r,m.x],IN,IC,pc(m.r,m.n));$('#g1').innerHTML=stack(m.gr,IN,IC);$('#g2').innerHTML=stack(m.wr,S3,[OK,BAD,NA]);$('#g3').innerHTML=stack(m.gz,IN,IC);
 $('#g4').innerHTML=tbl(m.WHd,m.wk.map(a=>a.map(nf)));
 const T=m.L.filter(o=>(f==='all'||o.inv===f)&&(!q||(o.sb+o.lc+o.mt+o.zn+o.ci).toLowerCase().includes(q)));
 $('#g5').innerHTML=tbl(['Zone','Circle','Substation','Metering location','Meter serial',...m.ws.map(w=>'Wk '+w),'Weeks valid','Invoice status'],T.slice(0,200).map(o=>[esc(o.zn),esc(o.ci),esc(o.sb),esc(o.lc),esc(o.mt),...m.ws.map(w=>o.wk[w]?tag(o.wk[w]==='Not available'?'N/A':o.wk[w]):'-'),o.valid,`<span class="tg ${o.inv===RDY?'t-ok':'t-na'}">${o.inv}</span>`]));
 $('#g6').textContent=T.length>200?`Showing the first 200 of ${nf(T.length)} meters. The Excel and CSV exports contain all of them.`:`${nf(T.length)} meter(s).`;
 INVX={hd:m.hd,row:m.row,R:m.L.filter(o=>o.inv===RDY),L:m.L};XS=invXlsx(m)}
function invXlsx(m){const S=invSpec(m,1),Z=new Map();
 m.L.forEach(o=>{const k=o.rg+'|'+o.zn;let z=Z.get(k);if(!z)Z.set(k,z={rg:o.rg,zn:o.zn,r:0,n:0});o.inv===RDY?z.r++:z.n++});
 const zr=[...Z.values()].sort((a,b)=>(a.rg+a.zn).localeCompare(b.rg+b.zn)).map(z=>[z.rg,z.zn,z.r+z.n,z.r,z.n,pc(z.r,z.r+z.n)]),im=new Map(m.L.map(o=>[o.mt,o.inv])),
  raw=m.ws.flatMap(w=>IW[w].rows.filter(flt).map(r=>[r.rg,r.zn,r.ci,r.dv,r.sd,r.wk,r.dt,r.sb,r.lc,r.mt,r.st,im.get(r.mt)]));
 return{...S,xm:[{...S,head:['Region','Zone','Total meters',RDY,NRD,'Ready for Invoice %'],rows:zr},{head:m.hd,rows:m.L.map(m.row)},{head:m.hd,rows:m.L.filter(o=>o.inv===RDY).map(m.row)},
  {head:['Region','Zone','Circle','Division','Sub-division','Week','Start date','Substation','Metering location','Meter serial','Overall status','Meter invoice status'],rows:raw}],
  sn:['Dashboard','','',''],ds:['By zone','Meter status','Ready for Invoice','All data']}}
function dlInv(ready){if(!INVX)return;dl(ready?'ready_for_invoice_meters.csv':'monthly_meter_status.csv',[INVX.hd,...(ready?INVX.R:INVX.L).map(INVX.row)])}
$('#is').onchange=rInv;$('#iq').oninput=rInv;
$('#im').onchange=()=>{IMIN=+$('#im').value;setInv();rInv()};
/* Copy of style.css used by the HTML export when the browser blocks reading the file (for example when index.html is opened from disk). Re-generate it if style.css changes. */
const EXPORT_CSS=":root{--bg:#eef1f5;--card:#fff;--ink:#14202e;--mut:#5d6b7c;--line:#dde3ea;--pri:#2f5fd0;--ok:#087a68;--bad:#d94f30;--warn:#e3a008;--na:#66768a;--head:#12263f;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)} @media (prefers-color-scheme:dark){:root:not([data-theme=\"light\"]){--bg:#0d141d;--card:#16212e;--ink:#e5ebf2;--mut:#93a3b6;--line:#263647;--pri:#6c93f0;--ok:#2fc4a6;--bad:#f0735a;--warn:#f0b83a;--na:#6f7e90;--head:#0a1a2e}} :root[data-theme=\"dark\"]{--bg:#0d141d;--card:#16212e;--ink:#e5ebf2;--mut:#93a3b6;--line:#263647;--pri:#6c93f0;--ok:#2fc4a6;--bad:#f0735a;--warn:#f0b83a;--na:#6f7e90;--head:#0a1a2e} html{scroll-padding-top:env(safe-area-inset-top,0px)}*{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.45 \"Segoe UI\",system-ui,-apple-system,Roboto,Arial,sans-serif;font-variant-numeric:tabular-nums} .hide{display:none!important} header{background:var(--head);color:#fff;padding:16px 20px 0} header h1{margin:0;font-size:21px;letter-spacing:.2px}header p{margin:2px 0 12px;font-size:12.5px;opacity:.75} nav{display:flex;gap:4px;overflow-x:auto} nav button{background:none;border:0;color:#fff;opacity:.7;padding:10px 16px;font:inherit;font-weight:600;cursor:pointer;border-bottom:3px solid transparent;white-space:nowrap} nav button.on{opacity:1;border-color:var(--warn)}nav button:focus-visible{outline:2px solid #fff;outline-offset:-2px} main{max-width:1280px;margin:0 auto;padding:18px 14px 40px} .card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px;margin-bottom:14px} h2{margin:0 0 4px;font-size:17px}h3{margin:0 0 10px;font-size:14px}.sub{color:var(--mut);margin:0 0 14px;font-size:13px} .two{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px} .drop{display:block;border:2px dashed var(--line);border-radius:10px;padding:34px 16px;text-align:center;cursor:pointer} .drop:hover,.drop.on{border-color:var(--pri)}.drop b{display:block;font-size:15px}.drop span{color:var(--mut);font-size:12.5px} .mg{margin-top:8px;font-size:13px;color:var(--ok)}.mg.er{color:var(--bad)} .bar{display:flex;gap:10px;flex-wrap:wrap;align-items:end} label.f{font-size:12px;font-weight:600;color:var(--mut);display:block} select{display:block;margin-top:3px;min-width:170px;max-width:100%;padding:8px;border-radius:7px;border:1px solid var(--line);background:var(--card);color:var(--ink);font:inherit} .btn{background:var(--pri);color:#fff;border:0;border-radius:7px;padding:9px 14px;font:inherit;font-weight:600;cursor:pointer}.btn.alt{background:none;color:var(--ink);border:1px solid var(--line)} .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:14px} .kp{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--pri);border-radius:8px;padding:10px 12px} .kp b{display:block;font-size:25px;line-height:1.15}.kp span{font-size:12px;color:var(--mut)} .kp.ok{border-left-color:var(--ok)}.kp.bad{border-left-color:var(--bad)}.kp.warn{border-left-color:var(--warn)}.kp.na{border-left-color:var(--na)} .lg{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--mut);margin-bottom:8px}.lg i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px} .sr{display:grid;grid-template-columns:minmax(80px,170px) 1fr auto;gap:8px;align-items:center;margin:4px 0;font-size:12.5px} .sl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sb{display:flex;height:16px;background:var(--line);border-radius:3px;overflow:hidden}.sb b{display:block;height:100%}.sn{color:var(--mut);min-width:90px;text-align:right;white-space:nowrap}.sn small{font-size:11px;opacity:.85} .scroll{overflow:auto;max-height:430px}.chart{max-height:460px;overflow:auto} table{border-collapse:collapse;width:100%;font-size:12.5px} th{position:sticky;top:0;background:var(--card);text-align:left;color:var(--mut);font-size:11.5px;padding:7px 8px;border-bottom:2px solid var(--line);white-space:nowrap} td{padding:6px 8px;border-bottom:1px solid var(--line);white-space:nowrap} .tg{padding:1px 8px;border-radius:99px;font-size:11.5px;font-weight:700;color:#fff}.t-ok{background:var(--ok)}.t-bad{background:var(--bad)}.t-na{background:var(--na)}.t-warn{background:var(--warn);color:#222} .tr{display:flex;gap:3px;align-items:flex-end;height:150px}.tr div{flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;font-size:10px;color:var(--mut)}.tr b{display:block;width:100%;background:var(--pri);border-radius:2px 2px 0 0;min-height:1px} .empty{text-align:center;padding:40px 10px;color:var(--mut)}.note{color:var(--mut);font-size:12px;margin-top:8px} .ins{border-left:4px solid var(--warn);padding:8px 12px;background:var(--card);border-radius:6px;margin-bottom:14px;font-size:13.5px} @media print{.scroll,.chart{max-height:none!important}} .ms{position:relative}.ms summary{list-style:none;cursor:pointer;min-width:190px;max-width:260px;padding:8px 10px;margin-top:3px;border:1px solid var(--line);border-radius:7px;background:var(--card);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ms summary::-webkit-details-marker{display:none} .mp{position:absolute;z-index:20;top:100%;left:0;width:290px;margin-top:4px;padding:8px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.2)} .mp input[type=search]{width:100%;padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--ink);font:inherit} .mb{display:flex;gap:6px;margin:6px 0}.mb button{border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:5px;padding:3px 9px;font-size:12px;cursor:pointer} .ml{max-height:200px;overflow:auto;font-size:13px}.ml label{display:flex;gap:6px;padding:2px 0;cursor:pointer} .tr{height:190px}.tr em{font-style:normal;writing-mode:vertical-rl;transform:rotate(180deg);font-size:9.5px;line-height:1;margin-bottom:3px;white-space:nowrap;color:var(--ink)} .drop:focus-visible{border-color:var(--pri);outline:2px solid var(--pri);outline-offset:2px} @media (prefers-color-scheme:dark){:root:not([data-theme=\"light\"]) .tg{color:#0d141d}} :root[data-theme=\"dark\"] .tg{color:#0d141d}";
