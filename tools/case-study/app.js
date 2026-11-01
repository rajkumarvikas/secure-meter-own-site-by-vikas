const $=s=>document.querySelector(s);

const XLSB_KEEP=['Meter Sr. No.','DT Name','DT Code','Circle Name','Feeder name','New Meter Installation Date','SES','AMR Reading Date'];
async function xlsbInflate(u8){const s=new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate-raw'));return new Uint8Array(await new Response(s).arrayBuffer())}
function xlsbZip(d){
 const v=new DataView(d.buffer,d.byteOffset,d.byteLength);let e=-1;
 for(let i=d.length-22;i>=Math.max(0,d.length-70000);i--){if(v.getUint32(i,true)===0x06054b50){e=i;break}}
 if(e<0)throw new Error('This is not a valid .xlsb file');
 const n=v.getUint16(e+10,true);let p=v.getUint32(e+16,true);const m={};
 for(let i=0;i<n;i++){
  if(v.getUint32(p,true)!==0x02014b50)break;
  const meth=v.getUint16(p+10,true),cs=v.getUint32(p+20,true),nl=v.getUint16(p+28,true),el=v.getUint16(p+30,true),cl=v.getUint16(p+32,true),lo=v.getUint32(p+42,true);
  const name=new TextDecoder().decode(d.subarray(p+46,p+46+nl));m[name]={meth,cs,lo};p+=46+nl+el+cl}
 m.get=async nm=>{const x=m[nm];if(!x)return null;const o=x.lo+30+v.getUint16(x.lo+26,true)+v.getUint16(x.lo+28,true);
  const raw=d.subarray(o,o+x.cs);return x.meth===0?raw:await xlsbInflate(raw)};
 return m}
function* xlsbRecs(d){
 let p=0;const n=d.length;
 while(p<n){let t=d[p++];if(t&0x80)t=(t&0x7F)|((d[p++]&0x7F)<<7);
  let sz=0,sh=0;for(let i=0;i<4;i++){const b=d[p++];sz|=(b&0x7F)<<sh;sh+=7;if(!(b&0x80))break}
  yield [t,p,sz];p+=sz}}
function xlsbWStr(d,p){const v=new DataView(d.buffer,d.byteOffset+p,4);const l=v.getUint32(0,true);
 return [new TextDecoder('utf-16le').decode(d.subarray(p+4,p+4+l*2)),l]}
function xlsbDate(s){const dt=new Date(Math.round((s-25569)*864e5)),q=x=>String(x).padStart(2,'0');return q(dt.getUTCDate())+'-'+q(dt.getUTCMonth()+1)+'-'+dt.getUTCFullYear()}
async function readXlsbTracker(buf,onStatus){
 const z=xlsbZip(new Uint8Array(buf));
 const wb=await z.get('xl/workbook.bin');if(!wb)throw new Error('workbook.bin not found (is this an .xlsb file?)');
 let sheets=[];for(const [t,p] of xlsbRecs(wb)){if(t===156){const [rid,l]=xlsbWStr(wb,p+8);const [nm]=xlsbWStr(wb,p+8+4+l*2);sheets.push([nm,rid])}}
 let pick=sheets.find(s=>/Tracking_MDAS/i.test(s[0]))||sheets.find(s=>/^Database$/i.test(s[0]));
 if(!pick)throw new Error('Tracking sheet not found. Sheets: '+sheets.map(s=>s[0]).join(', '));
 const rels=new TextDecoder().decode(await z.get('xl/_rels/workbook.bin.rels'));
 let target=null;for(const m of rels.matchAll(/<Relationship\b[^>]*>/g)){const a=m[0];if(a.includes('Id="'+pick[1]+'"')){target=(a.match(/Target="([^"]+)"/)||[])[1]}}
 if(!target)throw new Error('Sheet path not found');
 target=target.replace(/^\//,'').replace(/^xl\//,'');
 onStatus&&onStatus('Opening sheet "'+pick[0]+'"...');
 // shared strings (offsets only)
 const ss=await z.get('xl/sharedStrings.bin');const sst=[];
 if(ss)for(const [t,p] of xlsbRecs(ss)){if(t===19)sst.push(p+1)}
 const str=i=>xlsbWStr(ss,sst[i])[0];
 const sh=await z.get('xl/'+target);if(!sh)throw new Error('Sheet data not found: '+target);
 onStatus&&onStatus('Reading rows...');
 const v=new DataView(sh.buffer,sh.byteOffset,sh.byteLength);
 let hdr=null,keepIdx=null,row=-1,cur=null;const out=new Map();
 const flush=()=>{if(cur&&cur[XLSB_KEEP[0]]!=null){const k=String(cur[XLSB_KEEP[0]]).trim().toUpperCase();if(k)out.set(k,cur)}cur=null};
 const dateCols=new Set(['New Meter Installation Date','AMR Reading Date']);
 for(const [t,p,sz] of xlsbRecs(sh)){
  if(t===0){const r=v.getUint32(p,true);if(r!==row){if(row>0)flush();row=r;cur=row>0?{}:null}continue}
  if(t<5&&t!==2&&t!==1)continue;
  if(t>11||t===0)continue;
  const c=v.getUint32(p,true);
  if(row===0){
   if(t===7||t===6){const s=t===7?str(v.getUint32(p+8,true)):xlsbWStr(sh,p+8)[0];if(!hdr)hdr={};hdr[c]=s.trim()}
   continue}
  if(!hdr)continue;
  if(!keepIdx){keepIdx={};for(const c2 in hdr){if(XLSB_KEEP.includes(hdr[c2]))keepIdx[c2]=hdr[c2]}
   if(!Object.values(keepIdx).includes(XLSB_KEEP[0]))throw new Error('Column "Meter Sr. No." not found')}
  const name=keepIdx[c];if(!name||!cur)continue;
  let val;
  if(t===7)val=str(v.getUint32(p+8,true));
  else if(t===6||t===8)val=xlsbWStr(sh,p+8)[0];
  else if(t===5||t===9)val=v.getFloat64(p+8,true);
  else if(t===2){const rk=v.getUint32(p+8,true);if(rk&2){val=rk>>2}else{const b=new DataView(new ArrayBuffer(8));b.setUint32(4,rk&0xFFFFFFFC,true);val=b.getFloat64(0,true)}if(rk&1)val/=100}
  else continue;
  if(typeof val==='number'){val=dateCols.has(name)?xlsbDate(val):String(val)}
  cur[name]=val}
 flush();return out}

function parseCSV(t){
 t=t.replace(/^\uFEFF/,'');if(!t.trim())throw new Error('File is empty. Close it in Excel and try again');const fl=t.split('\n')[0];const D=(fl.split(';').length>fl.split(',').length)?';':(fl.split('\t').length>fl.split(',').length)?'\t':',';const rows=[];let r=[],f='',q=false;
 for(let i=0;i<t.length;i++){const c=t[i];
  if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++}else q=false}else f+=c}
  else if(c==='"')q=true;
  else if(c===D){r.push(f);f=''}
  else if(c==='\n'){r.push(f);rows.push(r);r=[];f=''}
  else if(c!=='\r')f+=c}
 if(f!==''||r.length){r.push(f);rows.push(r)}
 if(!rows.length)throw new Error('No header/data found in the file');const h=rows.shift().map(x=>x.trim());
 return rows.filter(x=>x.length>1||x[0]).map(x=>{const o={};h.forEach((k,i)=>o[k]=x[i]==null?'':x[i]);return o});
}


const norm=s=>String(s==null?'':s).trim().toUpperCase();
let tracker=new Map(),jobs=new Map();
const TK=['DT Name','DT Code','Circle Name','Feeder name','New Meter Installation Date','SES','AMR Reading Date'];
(function(){const m=new Map();for(const r of parseCSV(window.TRK_CSV)){const k=norm(r['Meter Sr. No.']);if(!k)continue;const o={};TK.forEach(c=>o[c]=r[c]);m.set(k,o)}
 tracker=m;$('#s1').textContent='Built-in tracker: '+m.size+' meters (5-Oct-26)'})();
async function loadTracker(file){
  const st=$('#s1');st.textContent='Reading…';
  try{
    let m;
    if(/\.csv$/i.test(file.name)){
      const rows=parseCSV(await file.text());
      if(!rows.length||!('Meter Sr. No.' in rows[0]))throw new Error('Column “Meter Sr. No.” not found');
      m=new Map();for(const r of rows){const k=norm(r['Meter Sr. No.']);if(!k)continue;const o={};XLSB_KEEP.forEach(c=>o[c]=r[c]);m.set(k,o)}
    }else if(/\.xlsb$/i.test(file.name))m=await readXlsbTracker(await file.arrayBuffer(),x=>{st.textContent=x});
    else throw new Error('Only .xlsb or .csv files are supported');
    if(!m.size)throw new Error('No meters found');
    tracker=m;st.textContent=`Tracker: ${m.size} meters (${file.name})`;if(days.length)show();
  }catch(e){st.textContent='Error: '+e.message}
}
async function loadJobs(file){
  try{const rows=parseCSV(await file.text());jobs=new Map();rows.forEach(r=>{const k=norm(r['Meter Serial no.']);if(k)jobs.set(k,r)});
    $('#s2').textContent='OK: '+jobs.size+' jobs';if(days.length)show()}
  catch(e){$('#s2').textContent='Error: '+e.message}
}
$('#f1').onchange=e=>e.target.files[0]&&loadTracker(e.target.files[0]);
$('#f2').onchange=e=>e.target.files[0]&&loadJobs(e.target.files[0]);

function split(rem){
  const ph=[];
  const t=rem.replace(/(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/g,m=>{ph.push(m.replace(/\D/g,'').slice(-10));return ''});
  const parts=t.split('|').map(s=>s.replace(/[\s,]+$/,'').trim()).filter(s=>s&&!/lain?man|lineman/i.test(s));
  return{prob:parts.join(', '),lm:ph[0]||''};
}

function front(d){
  const PW=1240,PH=1754,W=700,S=(PW-120)/W,t=d.t,j=d.j;
  const c=document.createElement('canvas');c.width=PW;c.height=PH;
  const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,PW,PH);
  x.translate(60,100);x.scale(S,S);x.fillStyle='#000';x.textAlign='center';
  x.font='bold 22px Arial';x.fillText('Case Study : '+(d.cs||'_'),W/2,42);
  x.font='bold 18px Arial';x.fillText('Problem Statement: '+d.prob,W/2,80);
  const rows=[['DT Name',t?(t['DT Name']||'N/A'):(j?(j['Consumer Name']||'N/A'):'N/A')],['DT Code:',t?t['DT Code']:''],['Meter No',d.meter],
    ['Circle Name',t?t['Circle Name']:''],['Feeder Name',t?t['Feeder name']:''],['Meter Installation Date',t?t['New Meter Installation Date']:''],
    ['Installation Invoice',t?t['SES']:''],['Last date of AMR received',(t&&t['AMR Reading Date'])||'00-01-1900']];
  const L=88,M=341,R=629,T=100,rh=38;x.textAlign='left';x.lineWidth=1;x.strokeStyle='#000';
  rows.forEach((r,i)=>{const y=T+i*rh;x.strokeRect(L,y,R-L,rh);x.beginPath();x.moveTo(M,y);x.lineTo(M,y+rh);x.stroke();
    x.font='bold 14px Arial';x.fillText(r[0],L+3,y+rh/2+5);x.font='14px Arial';x.fillText(String(r[1]==null?'':r[1]),M+4,y+rh/2+5)});
  const lm=(d.lm||'').trim();
  if(lm){const tx=(d.prob?d.prob+' ':'')+'confirm by lineman '+lm;x.textAlign='center';let fs=18;x.font='bold '+fs+'px Arial';
    while(fs>10&&x.measureText(tx).width>W-40){fs--;x.font='bold '+fs+'px Arial'}x.fillText(tx,W/2,T+rows.length*rh+34)}
  return c.toDataURL('image/jpeg',.9);
}

async function allPages(d,g,i){
  const im=await pages(g,nm(g,i),d.key);
  if(!im.length)return [];
  const k=g.meter||'';
  return [front({cs:g.cs,prob:g.prob||'',lm:g.lm||'',meter:k,t:tracker.get(k),j:jobs.get(k)}),...im];
}

function inp(lab,g,key,cls){
  const w=document.createElement('div');const l=document.createElement('label');l.textContent=lab;
  const i=document.createElement('input');i.type='text';i.value=g[key]||'';i.oninput=()=>{g[key]=i.value};
  w.append(l,i);return[w,i];
}

const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const HDR=/^\[?(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::\d{2})?[\s\u202f]*([ap]m)?\]?\s?-?\s?([^:]+?):\s?(.*)$/i;
const ATT=[/([^\s()<>]+\.(?:jpe?g|png|webp))\s*\(file attached\)/i,/<attached:\s*([^>\s]+\.(?:jpe?g|png|webp))>/i];
const MNO=/\b[Xx]\d{6,8}\b/;
let imgs={},days=[];

function remarkOf(t,m){
  const seen=[];
  for(let l of t.split('\n')){
    l=l.replace(/([^\s()<>]+\.(?:jpe?g|png|webp))\s*\(file attached\)/gi,'').replace(/<Media omitted>|<attached:[^>]*>/gi,'');
    if(m)l=l.replace(new RegExp(m,'ig'),'');
    l=l.replace(/\s+/g,' ').replace(/^[\s:,\-–.]+|[\s:,\-–.]+$/g,'');
    if(l&&!seen.includes(l))seen.push(l);
  }
  return seen.join(' | ');
}
function wrap(x,t,w,max){
  const L=[];let cur='';
  for(const wd of t.split(' ')){const n=cur?cur+' '+wd:wd;if(x.measureText(n).width>w&&cur){L.push(cur);cur=wd}else cur=n}
  if(cur)L.push(cur);
  if(L.length>max){L.length=max;L[max-1]=L[max-1].replace(/.{0,3}$/,'…')}
  return L;
}
function msg(t,err){const m=$('#msg');m.textContent=t;m.className=err?'err':''}
function pad(n){return String(n).padStart(2,'0')}
function label(k){const[y,m,d]=k.split('-');return `${+d} ${MON[+m-1]} ${y}`}
function fname(k){const[y,m,d]=k.split('-');return `${d}-${m}-${y}`}
function safe(s){return s.replace(/[^\w\-]+/g,'_')}

function parse(text){
  const rows=[];
  for(const raw of text.split(/\r?\n/)){
    const line=raw.replace(/[\u200e\u200f]/g,'');
    const m=HDR.exec(line);
    if(m)rows.push({a:+m[1],b:+m[2],y:+m[3],h:+m[4],mi:+m[5],ap:(m[6]||'').toLowerCase(),who:m[7].trim(),text:m[8]});
    else if(rows.length)rows[rows.length-1].text+='\n'+line;
  }
  const swap=rows.some(r=>r.b>12)&&!rows.some(r=>r.a>12);
  for(const r of rows){
    const d=swap?r.b:r.a,mo=swap?r.a:r.b,y=r.y<100?2000+r.y:r.y;
    let h=r.h;if(r.ap==='pm'&&h<12)h+=12;if(r.ap==='am'&&h===12)h=0;
    r.key=`${y}-${pad(mo)}-${pad(d)}`;r.ts=Date.UTC(y,mo-1,d,h,r.mi);
  }
  const groups=[];
  rows.forEach((r,i)=>{
    let f=null;for(const re of ATT){const x=re.exec(r.text);if(x){f=x[1];break}}
    if(!f)return;
    const g=groups[groups.length-1];
    if(g&&g.who===r.who&&g.key===r.key&&r.ts-g.last<=120000){g.files.push(f);g.last=r.ts;g.text+='\n'+r.text}
    else groups.push({who:r.who,key:r.key,first:r.ts,last:r.ts,files:[f],text:r.text,i});
  });
  for(const g of groups){
    let f=g.text.match(MNO),extra='';
    if(!f)for(const r of rows.slice(g.i+1,g.i+8)){
      if(r.who===g.who&&r.ts-g.last<=600000){f=r.text.match(MNO);if(f){extra=r.text;break}}
    }
    g.meter=f?f[0].toUpperCase():null;
    const pre=rows.slice(Math.max(0,g.i-2),g.i).filter(p=>p.who===g.who&&!/file attached|<attached:/i.test(p.text)&&g.first-p.ts<=60000).map(p=>p.text).join('\n');
    g.remark=remarkOf([pre,g.text,extra].join('\n'),g.meter);
  }
  const by={};
  for(const g of groups)(by[g.key]=by[g.key]||[]).push(g);
  return Object.keys(by).sort().reverse().map(k=>({key:k,groups:by[k]}));
}

async function load(file){
  if(!file)return;
  $('#out').innerHTML='';
  try{
    msg('Reading ZIP…');
    const zip=await JSZip.loadAsync(file);
    const names=Object.keys(zip.files).filter(n=>!zip.files[n].dir);
    const chat=names.find(n=>/\.txt$/i.test(n));
    if(!chat)return msg('No chat .txt file found in the ZIP. Choose the ZIP exported from WhatsApp.',true);
    imgs={};
    names.forEach(n=>{if(/\.(jpe?g|png|webp)$/i.test(n))imgs[n.split('/').pop().toLowerCase()]=zip.files[n]});
    days=parse(await zip.files[chat].async('string'));
    if(!days.length)return msg('No meter albums with images found in the chat. Export again with “Include media”.',true);
    show();
  }catch(e){msg('Could not open the ZIP: '+e.message,true)}
}

function show(){
  const t=new Date(),today=`${t.getFullYear()}-${pad(t.getMonth()+1)}-${pad(t.getDate())}`;
  const out=$('#out');out.innerHTML='';
  const total=days.reduce((s,d)=>s+d.groups.length,0);
  msg(`${days.length} days, ${total} meter albums found. Images in ZIP: ${Object.keys(imgs).length}.`);
  if(!days.some(d=>d.key===today)){
    const n=document.createElement('div');n.className='info';
    n.textContent=`Today’s (${label(today)}) meters are not in this ZIP. The latest date is ${label(days[0].key)}. Export again after today’s meters arrive.`;
    out.appendChild(n);
  }
  days.forEach(d=>{
    const nimg=d.groups.reduce((s,g)=>s+g.files.length,0);
    const el=document.createElement('section');el.className='day';
    const h=document.createElement('div');h.className='dh';
    h.innerHTML=`<div><h2></h2><small>${d.groups.length} meters · ${nimg} images</small></div><div class="btns"></div>`;
    h.querySelector('h2').textContent=label(d.key);
    if(d.key===today){const s=document.createElement('span');s.className='today';s.textContent='Today';h.querySelector('h2').appendChild(s)}
    const b=h.querySelector('.btns');
    b.append(btn('Date PDF',()=>dayPdf(d)),btn('Meter-wise ZIP',()=>dayZip(d),'alt'));
    el.appendChild(h);
    if(d.start===undefined)d.start=1;
    const si=document.createElement('label');si.className='st0';si.append('Starting Case No.');
    const sn=document.createElement('input');sn.type='number';sn.min='0';sn.value=d.start;si.appendChild(sn);
    h.insertBefore(si,h.querySelector('.btns'));
    d.groups.forEach((g,i)=>{
      const miss=g.files.filter(f=>!imgs[f.toLowerCase()]).length;
      if(g.cs===undefined){
        const s=split(g.remark||''),j=jobs.get(g.meter||'');
        g.cs=String(d.start+i);g.prob=s.prob||(j&&j['Final remarks for non-AMR'])||'';g.lm=s.lm;
      }
      const r=document.createElement('div');r.className='row';
      const l=document.createElement('div');
      const n=document.createElement('div');n.className='n';n.textContent=g.meter||'Meter number not found';
      const s=document.createElement('div');s.className='i';s.textContent=`${g.files.length-miss} images · ${g.who}`;
      l.append(n,s);
      const k=g.meter||'';
      const fl=[!g.meter&&'Meter number not found in chat',miss&&`${miss} image(s) missing from ZIP`,g.meter&&!tracker.has(k)&&!jobs.has(k)&&'Not found in tracker (DT details will be blank on the front page)'].filter(Boolean);
      if(fl.length){const w=document.createElement('div');w.className='flag';w.textContent=fl.join(' · ');l.appendChild(w)}
      const f=document.createElement('div');f.className='fields';
      const [c1,ci]=inp('Case No.',g,'cs');g.csEl=ci;
      f.append(c1,inp('Problem Statement',g,'prob')[0],inp('Lineman no.',g,'lm')[0]);
      r.append(l,btn('PDF',()=>onePdf(d,g,i),'alt sm'),f);
      el.appendChild(r);
    });
    sn.oninput=()=>{d.start=+sn.value||0;d.groups.forEach((g,i)=>{g.cs=String(d.start+i);g.csEl.value=g.cs})};
    out.appendChild(el);
  });
}

function btn(t,fn,cls){
  const b=document.createElement('button');b.textContent=t;b.className=cls||'';
  b.onclick=async()=>{const all=[...document.querySelectorAll('button')];all.forEach(x=>x.disabled=true);
    try{await fn()}catch(e){if(e&&e.code==='declined')msg('Save cancelled.');else msg('Error: '+(e.message||e),true)}
    all.forEach(x=>x.disabled=false)};
  return b;
}

async function bitmap(blob){
  try{return await createImageBitmap(blob,{imageOrientation:'from-image'})}
  catch(e){return await createImageBitmap(blob)}
}

async function pages(g,name,dateKey){
  const W=1240,H=1754,M=50,out=[];
  const files=g.files.filter(f=>imgs[f.toLowerCase()]);
  for(let i=0;i<files.length;i++){
    const bmp=await bitmap(await imgs[files[i].toLowerCase()].async('blob'));
    const c=document.createElement('canvas');c.width=W;c.height=H;
    const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,W,H);
    x.fillStyle='#000';x.textBaseline='top';
    x.font='bold 46px sans-serif';x.fillText(name,M,M-10);
    x.font='28px sans-serif';x.textAlign='right';x.fillText(`${label(dateKey)}  ·  ${i+1}/${files.length}`,W-M,M);x.textAlign='left';
    x.font='30px sans-serif';const L=g.remark?wrap(x,'Remark: '+g.remark,W-2*M,3):[];const HD=100+L.length*40;L.forEach((t,k)=>x.fillText(t,M,92+k*40));
    const s=Math.min((W-2*M)/bmp.width,(H-HD-M)/bmp.height,1.5);
    const w=bmp.width*s,h=bmp.height*s;
    x.drawImage(bmp,(W-w)/2,HD,w,h);
    out.push(c.toDataURL('image/jpeg',.85));
    if(bmp.close)bmp.close();
  }
  return out;
}

function pdfBlob(list){
  const pdf=new jspdf.jsPDF({unit:'pt',format:'a4',compress:true});
  list.forEach((d,i)=>{if(i)pdf.addPage();pdf.addImage(d,'JPEG',0,0,595.28,841.89)});
  return pdf.output('blob');
}

const nm=(g,i)=>g.meter||`NO-METER-${i+1}`;

async function save(filename,data){
  const dl=window.claude&&claude.use?await claude.use('downloads'):null;
  if(dl)await dl.save({filename,data});
  else{const a=document.createElement('a');a.href=URL.createObjectURL(data);a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}
  msg(`Saved: ${filename}`);
}

async function dayPdf(d){
  const all=[];
  for(let i=0;i<d.groups.length;i++){msg(`Building PDF… meter ${i+1}/${d.groups.length}`);all.push(...await allPages(d,d.groups[i],i))}
  if(!all.length)return msg('No images for this date were found in the ZIP.',true);
  await save(`Meters_${fname(d.key)}.pdf`,pdfBlob(all));
}

async function onePdf(d,g,i){
  msg('Building PDF…');
  const p=await allPages(d,g,i);
  if(!p.length)return msg('No images for this meter were found in the ZIP.',true);
  await save(`${safe(nm(g,i))}_${fname(d.key)}.pdf`,pdfBlob(p));
}

async function dayZip(d){
  const z=new JSZip(),used={};
  for(let i=0;i<d.groups.length;i++){
    msg(`Building PDF… meter ${i+1}/${d.groups.length}`);
    const g=d.groups[i],p=await allPages(d,g,i);
    if(!p.length)continue;
    let n=safe(nm(g,i));used[n]=(used[n]||0)+1;if(used[n]>1)n+='_'+used[n];
    z.file(`${n}.pdf`,pdfBlob(p));
  }
  if(!Object.keys(z.files).length)return msg('No images for this date were found in the ZIP.',true);
  msg('Building ZIP…');
  await save(`Meter_PDFs_${fname(d.key)}.zip`,await z.generateAsync({type:'blob'}));
}

const drop=$('#drop');
$('#f').addEventListener('change',e=>load(e.target.files[0]));
['dragover','dragenter'].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.add('on')}));
['dragleave','drop'].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.remove('on')}));
drop.addEventListener('drop',e=>load(e.dataTransfer.files[0]));
