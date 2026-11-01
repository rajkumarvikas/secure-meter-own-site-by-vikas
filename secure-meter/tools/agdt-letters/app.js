const REM=["X'mer Faulty","X'mer Not at Site","DO Open","AB Switch Open","11Kv Jumper Cut","Meter Missing","Cable Missing","Cable Bypass","Black Zone","Pole Fallen"];
const TOS=["The SDO,","The Executive Engineer,","The Superintending Engineer,","The Section Engineer,"];
const TF=["X'mer Faulty","X'mer Not at Site"],AB=["DO Open","AB Switch Open","11Kv Jumper Cut"];
let zip,sheetPath,sdoc,sNS,stylesDoc,wbDoc,dateStyle=null,SS=[],rows=new Map(),C={},mx=0,done=[],fname='';
const $=id=>document.getElementById(id);
const norm=s=>String(s==null?'':s).toLowerCase().replace(/[^a-z0-9]/g,'');
const S=v=>v==null?'':String(v).trim();
const msg=(t,k)=>{$('msg').textContent=t;$('msg').className='m '+(k||'')};
const cn=n=>{let s='';for(n++;n>0;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s};
const ci=ref=>{let n=0;for(const ch of ref){const k=ch.charCodeAt(0);if(k<65||k>90)break;n=n*26+k-64}return n-1};
$('rem').innerHTML='<option value="">-- select --</option>'+REM.map(x=>`<option>${x}</option>`).join('');
$('to').innerHTML='<option value="">-- select --</option>'+TOS.map(x=>`<option>${x}</option>`).join('');

function today(){const n=new Date(),p=v=>String(v).padStart(2,'0');
 return{y:n.getFullYear(),s:`${p(n.getDate())}-${p(n.getMonth()+1)}-${n.getFullYear()}`,n:Math.floor((Date.UTC(n.getFullYear(),n.getMonth(),n.getDate())-Date.UTC(1899,11,30))/864e5)}}
function dl(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},5000)}

/* ---------- xlsx helpers (direct XML, original formatting preserved) ---------- */
function cval(c){const t=c.getAttribute('t');if(t==='inlineStr')return c.textContent;const v=c.getElementsByTagName('v')[0];if(!v)return'';return t==='s'?(SS[+v.textContent]||''):v.textContent}
function rv(row,col){if(col===undefined)return'';for(const c of row.children){const k=ci(c.getAttribute('r'));if(k===col)return S(cval(c));if(k>col)break}return''}
function setCell(row,col,val,num){
 let cell=null,before=null;
 for(const c of row.children){const k=ci(c.getAttribute('r'));if(k===col){cell=c;break}if(k>col){before=c;break}}
 if(!cell){cell=sdoc.createElementNS(sNS,'c');cell.setAttribute('r',cn(col)+row.getAttribute('r'));row.insertBefore(cell,before)}
 while(cell.firstChild)cell.removeChild(cell.firstChild);
 if(num){cell.removeAttribute('t');const v=sdoc.createElementNS(sNS,'v');v.textContent=val;cell.appendChild(v);if(dateStyle!==null)cell.setAttribute('s',dateStyle)}
 else{cell.setAttribute('t','inlineStr');const is=sdoc.createElementNS(sNS,'is'),t=sdoc.createElementNS(sNS,'t');t.textContent=val;is.appendChild(t);cell.appendChild(is)}
}

$('file').onchange=e=>{const f=e.target.files[0];if(!f)return;fname=f.name;
 $('st').className='m';$('st').textContent='Reading the sheet, this may take 10-30 seconds…';
 const fr=new FileReader();
 fr.onload=()=>setTimeout(async()=>{try{await load(fr.result)}catch(x){$('st').className='m er';$('st').textContent='Error: '+x.message}},60);
 fr.readAsArrayBuffer(f)};

async function load(buf){
 zip=await JSZip.loadAsync(buf);
 const P=s=>new DOMParser().parseFromString(s,'application/xml');
 const rd=async p=>{const f=zip.file(p);return f?await f.async('string'):null};
 wbDoc=P(await rd('xl/workbook.xml'));
 const shs=[...wbDoc.getElementsByTagName('sheet')];
 const sh=shs.find(x=>x.getAttribute('name').trim().toLowerCase()==='list')||shs[0];
 const rid=sh.getAttribute('r:id');
 const rels=P(await rd('xl/_rels/workbook.xml.rels'));
 const rel=[...rels.getElementsByTagName('Relationship')].find(x=>x.getAttribute('Id')===rid);
 const tg=rel.getAttribute('Target');sheetPath=tg.startsWith('/')?tg.slice(1):'xl/'+tg;
 const ssx=await rd('xl/sharedStrings.xml');
 SS=ssx?[...P(ssx).getElementsByTagName('si')].map(x=>x.textContent):[];
 sdoc=P(await rd(sheetPath));sNS=sdoc.documentElement.namespaceURI;
 const rs=sdoc.getElementsByTagName('row');
 const H={};for(const c of rs[0].children){const k=norm(cval(c));if(k&&!(k in H))H[k]=ci(c.getAttribute('r'))}
 const f=p=>{const k=Object.keys(H).find(k=>k.startsWith(p));return k===undefined?undefined:H[k]};
 C={m:f('meterserial'),o:f('outwardno'),d:f('dateofinspection'),r:f('selectsiteremark'),t:f('lettersubmittedto'),
  reg:f('regionname'),cir:f('circlename'),div:f('divisionname'),sub:f('subdiv'),fn:f('feedername'),dc:f('dtcode'),dn:f('dtname')};
 const need=['m','o','d','r','t'].filter(k=>C[k]===undefined);
 if(need.length)throw new Error('The sheet is missing these columns: '+need.join(', '));
 rows=new Map();mx=0;done=[];
 for(let i=1;i<rs.length;i++){const r=rs[i];
  const m=rv(r,C.m).toUpperCase();if(m)rows.set(m,r);
  const mt=/(PR|NR)\s*\/?\s*(\d+)\s*$/i.exec(rv(r,C.o));
  if(mt)mx=Math.max(mx,+mt[2])}
 const sx=await rd('xl/styles.xml');
 if(sx){stylesDoc=P(sx);const xfs=stylesDoc.getElementsByTagName('cellXfs')[0];
  const xf=stylesDoc.createElementNS(stylesDoc.documentElement.namespaceURI,'xf');
  [['numFmtId',14],['fontId',0],['fillId',0],['borderId',0],['xfId',0],['applyNumberFormat',1]].forEach(([a,b])=>xf.setAttribute(a,b));
  xfs.appendChild(xf);dateStyle=xfs.children.length-1;xfs.setAttribute('count',xfs.children.length)}
 $('st').className='m ok';
 $('st').textContent=`"${sh.getAttribute('name')}" sheet loaded: ${rows.size} meters. Last outward number so far: ${mx} (PR and NR share one counter), next: ${mx+1}.`;
 $('f2').hidden=false;render();
}

/* ---------- form ---------- */
$('mt').oninput=()=>{
 const r=rows.get($('mt').value.trim().toUpperCase());
 if(!r){$('pv').textContent=$('mt').value?'Meter not found':'';$('dt').textContent='';return}
 const v=c=>rv(r,c);
 $('pv').textContent=`${v(C.cir)} / ${v(C.div)} / ${v(C.sub)} / ${v(C.fn)}`;
 const o=v(C.o),mt=/(PR|NR)/i.exec(o),reg=v(C.reg).toUpperCase();
 const code=mt?mt[1].toUpperCase():(reg.includes('PUNE')?'PR':reg.includes('NAGPUR')?'NR':'');
 document.querySelectorAll('input[name=code]').forEach(x=>x.checked=x.value===code);
 $('dt').textContent=o?`Outward no. already exists: ${o}. Only the date will be updated to today.`:'A new outward no. will be generated (next serial).';
};
$('add').onclick=()=>{
 const r=rows.get($('mt').value.trim().toUpperCase());
 if(!r)return msg('This meter was not found in the sheet.','er');
 const rem=$('rem').value,to=$('to').value;
 if(!rem||!to)return msg('Please select both Site Remark and Letter Submitted TO.','er');
 const T=today();let out=rv(r,C.o),st='Existing outward no., date set to today';
 if(!out){
  const code=(document.querySelector('input[name=code]:checked')||{}).value;
  if(!code)return msg('Please select PR or NR.','er');
  out=`SML/${T.y}/MSEDCL/${code}/${++mx}`;st='New outward no.';
 }
 setCell(r,C.o,out);setCell(r,C.d,T.n,true);setCell(r,C.r,rem);setCell(r,C.t,to);
 const v=c=>rv(r,c);
 const d={meter:v(C.m),out,date:T.s,rem,to,cir:v(C.cir),div:v(C.div),sub:v(C.sub),feeder:v(C.fn),dtc:v(C.dc),dtn:v(C.dn),st};
 const i=done.findIndex(x=>x.meter===d.meter);if(i>=0)done[i]=d;else done.push(d);
 render();msg(`Done: ${out} (${T.s})`,'ok');$('mt').value='';$('pv').textContent='';$('dt').textContent='';$('mt').focus();
};
function render(){
 $('tb').innerHTML=done.map((d,i)=>`<tr><td>${d.meter}</td><td>${d.out}</td><td>${d.date}</td><td>${d.rem}</td><td>${d.st}</td><td><button class="s" data-i="${i}">PDF</button></td></tr>`).join('');
 $('res').hidden=!done.length}

/* ---------- PDF (pdf-lib, A4, mm layout) ---------- */
/* IMG (logo, footer, signatures) is defined in data/images.js */
const san=s=>String(s==null?'':s).replace(/\s+/g,' ').replace(/[^\x20-\x7E\xA0-\xFF]/g,'?');
function letter(pg,d,F,B,I){
 const H=841.89,K=2.8346,L=20,R=190,W=170;let y=27;
 const tf=TF.includes(d.rem),ab=AB.includes(d.rem);
 const tw=(t,s,f)=>f.widthOfTextAtSize(t,s)/K;
 const T=(t,x,yy,o)=>{o=o||{};t=san(t);const s=o.s||12,f=o.b?B:F;pg.drawText(t,{x:(o.r?x-tw(t,s,f):x)*K,y:H-yy*K,size:s,font:f})};
 const img=(m,x,yy,w)=>{const h=w*m.height/m.width;pg.drawImage(m,{x:x*K,y:H-(yy+h)*K,width:w*K,height:h*K})};
 img(I.logo,R-38,8,38);img(I.foot,L,267,W);
 const wrap=(t,w,s,f)=>{const ls=[];let c='';for(let x of san(t).split(' ')){
  if(tw(x,s,f)>w){if(c){ls.push(c);c=''}while(tw(x,s,f)>w&&x.length>1){let k=x.length-1;while(k>1&&tw(x.slice(0,k),s,f)>w)k--;ls.push(x.slice(0,k));x=x.slice(k)}c=x;continue}
  const n=c?c+' '+x:x;if(c&&tw(n,s,f)>w){ls.push(c);c=x}else c=n}ls.push(c);return ls};
 const wr=(t,x,w,o)=>{o=o||{};const ls=wrap(t,w,o.s||12,o.b?B:F);ls.forEach((s,i)=>T(s,x,y+i*5.4,o));y+=ls.length*5.4};
 T(d.out,L,y,{b:1});T('Date:- '+d.date,R,y,{r:1});y+=12;
 T('To,',L,y,{b:1});y+=6;T(d.to,L,y,{b:1});y+=6;
 T('Circle:- '+d.cir,L,y);y+=6;T('Division :- '+d.div,L,y);y+=6;T('Sub-Division:- '+d.sub,L,y);y+=6;
 T('Maharashtra State Electricity Distribution Co. Ltd.,',L,y);y+=6;T('Maharashtra.',L,y);y+=10;
 const subj=tf?'Regarding Transformer Faulty/Not at Site cases on MERC AG feeder per periodic site verification process of Non-AMR AGDT Project'
  :`Regarding ${ab?'DO Open/AB Open/11Kv Jumper Cut':d.rem} cases on AG feeder in division as per periodic site verification process of Non-AMR AGDT Project`;
 T('Sub:-',L,y,{b:1});wr(subj,L+14,W-14,{b:1});y+=4;
 T('Ref:',L,y,{b:1});T('1 .',L+14,y);T('PO. No. MMD/L-37/T-NSC-09/1221/E.O.-2/37453 dated 27-Dec-2023.',L+22,y);y+=6;
 T('2 .',L+14,y);T('PO No. MMD/L-19/T-NSC-09/1221/28421 dated 2-Nov-2022.',L+22,y);pg.drawRectangle({x:L*K,y:H-(y+4.4)*K,width:W*K,height:.9*K,color:PDFLib.rgb(0,0,0)});y+=11;
 T(tf?'Respected Sir,':'Dear Sir,',L,y);y+=8;
 const what=tf?'TF faulty/ TF not at site':ab?'DO Open/AB switch open/ 11KV Jumper cut  pole fallen':d.rem;
 wr(`This is in regard to the above-mentioned LOA and subject issue; we would like to bring to your attention that during our site visit to the non-AMR case for FMS activity along with the area lineman, we discovered the DT's with meter serial number have ${what} from the installed site in the following sub-division.`,L,W);
 y+=5;T('The details are as follows:',L,y);T('Inspection date: '+d.date,R,y,{r:1});y+=5;
 const cw=[10,26,26,30,17,27,18,16],hd=['Sr.No','Division','Subdivision','Feeder Name','DT Code','DT Name','Meter No.','Remark'];
 const vs=['1',d.div,d.sub,d.feeder,d.dtc,d.dtn,d.meter,d.rem];
 const cl=vs.map((v,i)=>wrap(v,cw[i]-2,8.5,B));
 const C=(t,x,w,yy,o)=>T(t,x+(w-tw(san(t),o.s,B))/2,yy,o);
 const rh=Math.max(10,Math.max(...cl.map(c=>c.length))*4+3);
 const box=(x,yy,w,h)=>pg.drawRectangle({x:x*K,y:H-(yy+h)*K,width:w*K,height:h*K,borderWidth:.7,borderColor:PDFLib.rgb(0,0,0)});
 let x=L;hd.forEach((h,i)=>{box(x,y,cw[i],9);C(h,x,cw[i],y+5.8,{s:8.5,b:1});x+=cw[i]});
 y+=9;x=L;cl.forEach((c,i)=>{box(x,y,cw[i],rh);c.forEach((s,j)=>C(s,x,cw[i],y+(rh-c.length*4)/2+3+j*4,{s:8.5,b:1}));x+=cw[i]});
 y+=rh+6;
 wr(tf?'This is for your information and necessary action, requesting you to restore the DT power supply to get the above secure meters active on MDAS.':'This is for your information and necessary action.',L,W);
 y+=4;wr('Thanking you and looking forward to your valuable support and assuring of our best services always.',L,W);
 y+=3;T('For Secure Meters Limited',L,y,{b:1});{const n=/NR/i.test(d.out);img(n?I.ngp:I.pune,L+2,y+(n?1:2),n?17:31)}y+=22;T('Service Delivery Manager',L,y,{b:1});y+=6;T(' (Authorized Signatory)',L,y,{b:1,s:10});y+=8;
 T(`Copy To: Executive Engineer Division office, ${tf?'AE Sub Division':'SE Circle'} office`,L,y,{b:1,s:10});
}
async function pdf(list,name){
 const doc=await PDFLib.PDFDocument.create();
 const F=await doc.embedFont(PDFLib.StandardFonts.TimesRoman),B=await doc.embedFont(PDFLib.StandardFonts.TimesRomanBold);
 const u8=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
 const I={logo:await doc.embedJpg(u8(IMG.logo)),foot:await doc.embedJpg(u8(IMG.foot)),pune:await doc.embedPng(u8(IMG.pune)),ngp:await doc.embedPng(u8(IMG.ngp))};
 for(const d of list)letter(doc.addPage([595.28,841.89]),d,F,B,I);
 dl(new Blob([await doc.save()],{type:'application/pdf'}),name)}
function one(i){pdf([done[i]],done[i].out.replace(/[\/\\]/g,'-')+'.pdf')}
$('tb').addEventListener('click',e=>{const b=e.target.closest('button[data-i]');if(b)one(+b.dataset.i)});
$('pall').onclick=()=>pdf(done,`Letters_${today().s}.pdf`);

/* ---------- Excel export ---------- */
$('xl').onclick=()=>{$('xm').className='m';$('xm').textContent='Creating Excel, please wait a moment…';
 setTimeout(async()=>{try{
  const XS=new XMLSerializer(),h='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n',ser=d=>h+XS.serializeToString(d).replace(/^<\?xml[^>]*\?>\s*/,'');
  zip.file(sheetPath,ser(sdoc));
  if(stylesDoc)zip.file('xl/styles.xml',ser(stylesDoc));
  const cp=wbDoc.getElementsByTagName('calcPr')[0];
  if(cp){cp.setAttribute('fullCalcOnLoad','1');zip.file('xl/workbook.xml',ser(wbDoc))}
  const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  dl(blob,fname.replace(/\.[^.]+$/,'')+'_updated.xlsx');
  $('xm').className='m ok';$('xm').textContent='Updated Excel downloaded.'
 }catch(x){$('xm').className='m er';$('xm').textContent='Error: '+x.message}},50)};
