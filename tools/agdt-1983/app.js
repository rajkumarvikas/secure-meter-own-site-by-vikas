/* ---------- core (no DOM) ---------- */
const SHEET='Old Uninv';
const ci=s=>[...s].reduce((a,c)=>a*26+c.charCodeAt(0)-64,0)-1;
const EP=Date.UTC(1899,11,30);
const S=v=>String(v==null?'':v).trim();
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const unesc=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
const xa=(tag,n)=>{const m=tag.match(new RegExp('\\b'+n+'="([^"]*)"'));return m?m[1]:null};

function parseCSV(t){
  if(t.charCodeAt(0)===65279)t=t.slice(1);
  const out=[];let r=[],f='',q=false;
  for(let i=0;i<t.length;i++){const c=t[i];
    if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++}else q=false}else f+=c}
    else if(c==='"')q=true;
    else if(c===','){r.push(f);f=''}
    else if(c==='\n'||c==='\r'){if(c==='\r'&&t[i+1]==='\n')i++;r.push(f);f='';out.push(r);r=[]}
    else f+=c}
  if(f!==''||r.length){r.push(f);out.push(r)}
  return out;
}

function readXLS(buf,want){
  const u8=new Uint8Array(buf),dv=new DataView(buf);
  if(u8[0]!==0xD0||u8[1]!==0xCF||u8[2]!==0x11||u8[3]!==0xE0)throw new Error('This is not a valid .xls file');
  const ssz=1<<dv.getUint16(30,true),off=id=>(id+1)*ssz,END=0xFFFFFFFA;
  const difat=[];
  for(let i=0;i<109;i++){const v=dv.getUint32(76+i*4,true);if(v<END)difat.push(v)}
  let nd=dv.getUint32(72,true),d=dv.getUint32(68,true);
  while(nd-->0&&d<END){const o=off(d);for(let i=0;i<ssz/4-1;i++){const v=dv.getUint32(o+i*4,true);if(v<END)difat.push(v)}d=dv.getUint32(o+ssz-4,true)}
  const fat=[];
  difat.forEach(s=>{const o=off(s);for(let i=0;i<ssz/4;i++)fat.push(dv.getUint32(o+i*4,true))});
  const stream=(s,size)=>{const c=[];while(s<END&&c.length<1e6){c.push(s);s=fat[s]}
    const o=new Uint8Array(c.length*ssz);c.forEach((x,i)=>o.set(u8.subarray(off(x),off(x)+ssz),i*ssz));
    return size==null?o:o.subarray(0,size)};
  const dir=stream(dv.getUint32(48,true)),dd=new DataView(dir.buffer,dir.byteOffset,dir.byteLength);
  let ws=null,wsz=0;
  for(let i=0;i+128<=dir.length;i+=128){
    const nl=dd.getUint16(i+64,true);let nm='';
    for(let k=0;k<nl/2-1;k++)nm+=String.fromCharCode(dd.getUint16(i+k*2,true));
    if(nm==='Workbook'||nm==='Book'){ws=dd.getUint32(i+116,true);wsz=dd.getUint32(i+120,true);break}
  }
  if(ws==null)throw new Error('Workbook stream not found in .xls');
  const wb=stream(ws,wsz),wv=new DataView(wb.buffer,wb.byteOffset,wb.byteLength);
  // globals
  let p=0,sheetOff=null,chunks=null,inSST=false;
  while(p+4<=wb.length){
    const id=wv.getUint16(p,true),len=wv.getUint16(p+2,true),b=p+4;
    if(id===0x0085&&sheetOff==null&&wb[b+5]===0)sheetOff=wv.getUint32(b,true);
    if(id===0x00FC){chunks=[wb.subarray(b,b+len)];inSST=true}
    else if(id===0x003C&&inSST)chunks.push(wb.subarray(b,b+len));
    else inSST=false;
    if(id===0x000A)break;
    p=b+len;
  }
  if(sheetOff==null)throw new Error('No worksheet found in .xls');
  const sst=[];
  if(chunks){
    let c=0,pos=0;
    const nx=()=>{if(pos>=chunks[c].length){c++;pos=0}};
    const u8f=()=>{nx();return chunks[c][pos++]};
    const u16=()=>u8f()|(u8f()<<8),u32=()=>(u16()|(u16()<<16))>>>0;
    u32();const n=u32();
    for(let i=0;i<n&&c<chunks.length;i++){
      const cch=u16(),fl=u8f();let runs=0,ext=0;
      if(fl&8)runs=u16();if(fl&4)ext=u32();
      let wide=fl&1,s='';
      for(let k=0;k<cch;k++){
        if(pos>=chunks[c].length){c++;pos=0;if(c>=chunks.length)break;wide=chunks[c][pos++]&1}
        if(wide){const lo=chunks[c][pos++],hi=chunks[c][pos++];s+=String.fromCharCode(lo|(hi<<8))}
        else s+=String.fromCharCode(chunks[c][pos++]);
      }
      let sk=runs*4+ext;
      while(sk>0&&c<chunks.length){nx();if(c>=chunks.length)break;const t=Math.min(sk,chunks[c].length-pos);pos+=t;sk-=t}
      sst.push(s);
    }
  }
  const tmp=new DataView(new ArrayBuffer(8));
  const rk=v=>{let x;if(v&2)x=v>>2;else{tmp.setUint32(0,0,true);tmp.setUint32(4,(v&0xFFFFFFFC)>>>0,true);x=tmp.getFloat64(0,true)}return (v&1)?x/100:x};
  const rows={};
  const put=(r,c,v)=>{if(want.has(c))(rows[r]||(rows[r]=[]))[c]=v};
  p=sheetOff;
  while(p+4<=wb.length){
    const id=wv.getUint16(p,true),len=wv.getUint16(p+2,true),b=p+4;
    if(id===0x000A)break;
    if(id===0x00FD)put(wv.getUint16(b,true),wv.getUint16(b+2,true),sst[wv.getUint32(b+6,true)]);
    else if(id===0x0203)put(wv.getUint16(b,true),wv.getUint16(b+2,true),wv.getFloat64(b+6,true));
    else if(id===0x027E)put(wv.getUint16(b,true),wv.getUint16(b+2,true),rk(wv.getUint32(b+6,true)));
    else if(id===0x00BD){const r=wv.getUint16(b,true),c1=wv.getUint16(b+2,true),n=(len-6)/6;
      for(let i=0;i<n;i++)put(r,c1+i,rk(wv.getUint32(b+4+i*6+2,true)))}
    else if(id===0x0204){const r=wv.getUint16(b,true),c=wv.getUint16(b+2,true),cch=wv.getUint16(b+6,true),fl=wb[b+8];let s='';
      for(let k=0;k<cch;k++)s+=(fl&1)?String.fromCharCode(wv.getUint16(b+9+k*2,true)):String.fromCharCode(wb[b+9+k]);put(r,c,s)}
    p=b+len;
  }
  return Object.keys(rows).map(Number).filter(r=>r>0).sort((a,b)=>a-b).map(r=>rows[r]);
}

function serial(v){
  if(typeof v==='number')return v>20000?v:null;
  v=S(v);let m;
  if(m=v.match(/^(\d{4})-(\d\d)-(\d\d)(?:[ T](\d\d):(\d\d)(?::(\d\d))?)?/))return(Date.UTC(+m[1],m[2]-1,+m[3],+(m[4]||0),+(m[5]||0),+(m[6]||0))-EP)/864e5;
  if(m=v.match(/^(\d{1,2})-([A-Za-z]{3})[a-z]*-(\d{4})/)){
    const mo='jan feb mar apr may jun jul aug sep oct nov dec'.split(' ').indexOf(m[2].toLowerCase());
    if(mo>=0)return(Date.UTC(+m[3],mo,+m[1])-EP)/864e5}
  return null;
}
const fmt=n=>new Date(EP+n*864e5).toISOString().slice(0,n%1?16:10).replace('T',' ');

async function tableRows(file,want){
  const buf=await file.arrayBuffer();
  if(/\.xls$/i.test(file.name))return readXLS(buf,want);
  if(/\.csv$/i.test(file.name))return parseCSV(new TextDecoder('utf-8').decode(buf)).slice(1);
  throw new Error(file.name+': only .csv and .xls are supported here');
}


/* ---------- Rectification Plan update ---------- */
function lev(a,b){const d=[];for(let i=0;i<=a.length;i++){d[i]=[i];for(let j=1;j<=b.length;j++)d[i][j]=i?0:j}
  for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[a.length][b.length]}
const words=s=>String(s||'').toLowerCase().replace(/[^a-z ]/g,' ').split(/\s+/).filter(Boolean);
const simW=(a,b)=>a===b||(Math.min(a.length,b.length)>=4&&(a.startsWith(b)||b.startsWith(a)))||(Math.min(a.length,b.length)>=5&&lev(a,b)<=2);
const circKey=h=>words(h).filter(w=>w!=='circle'&&w!=='r'&&w!=='division').join(' ');

function updatePlan(planXml,ouXml,sis){
  const cellVal=(row,col,rn)=>{
    const m=row.match(new RegExp('<c r="'+col+rn+'"([^>]*?)(?:/>|>([\\s\\S]*?)</c>)'));
    if(!m||!m[2])return null;const a=m[1];
    if(/ t="e"/.test(a))return null;
    const v=m[2].match(/<v>([^<]*)<\/v>/);
    if(/ t="s"/.test(a))return v?S(sis[+v[1]]):null;
    if(/ t="inlineStr"/.test(a))return unesc(S(m[2].replace(/<[^>]+>/g,'')));
    return v?+v[1]:null;
  };
  // plan rows
  const prow={};
  planXml.replace(/<row r="(\d+)"[^>]*>[\s\S]*?<\/row>/g,(row,rn)=>{rn=+rn;if(rn>1){const d=cellVal(row,'D',rn);
    if(d)prow[rn]={rn,sup:d,circ:S(cellVal(row,'C',rn)),oldH:cellVal(row,'H',rn),F:cellVal(row,'F',rn)||0,
      tok:String(d).split(',').map(words).filter(t=>t.length),ckey:words(cellVal(row,'C',rn)).join(' '),n:0,day:{}}}return row});
  const hdr={};
  (planXml.match(/<row r="1"[^>]*>[\s\S]*?<\/row>/)||[''])[0].replace(/<c r="([A-Z]+)1"[^>]*><v>([^<]*)<\/v>/g,(m,c,v)=>{if(ci(c)>=12)hdr[c]=+v;return m});
  const plist=Object.values(prow);
  // visits from Old Uninv
  const visits=[];let maxD=0;
  ouXml.replace(/<row r="(\d+)"[^>]*?(?:\/>|>[\s\S]*?<\/row>)/g,(row,rn)=>{rn=+rn;if(rn===1)return row;
    const ab=cellVal(row,'AB',rn);if(typeof ab!=='string'||!ab)return row;
    const ae=cellVal(row,'AE',rn);const d=typeof ae==='number'?Math.floor(ae):null;if(d&&d>maxD)maxD=d;
    visits.push({ab:words(ab),circ:circKey(cellVal(row,'H',rn)),d});return row});
  const un={};
  visits.forEach(v=>{
    let c=plist.filter(p=>p.tok.some(t=>t.every(w=>v.ab.some(x=>simW(w,x)))));
    if(c.length>1){const k=c.filter(p=>v.circ&&p.ckey.includes(v.circ.split(' ')[0]));if(k.length)c=k}
    if(!c.length){c=plist.filter(p=>v.circ&&p.ckey.includes(v.circ.split(' ')[0]))}
    if(!c.length){const k=v.ab.join(' ');un[k]=(un[k]||0)+1;return}
    const p=c[0];p.n++;if(v.d)p.day[v.d]=(p.day[v.d]||0)+1;
  });
  // write cells
  const setC=(row,rn,col,val,f)=>{
    const ref=col+rn,body=f?'<f>'+f+'</f><v>'+val+'</v>':'<v>'+val+'</v>';
    const re=new RegExp('<c r="'+ref+'"([^>]*?)(?:/>|>[\\s\\S]*?</c>)');
    const g=row.match(new RegExp('<c r="G'+rn+'"[^>]*? s="(\\d+)"'));
    const m=row.match(re);
    if(m){const st=(m[1].match(/ s="\d+"/)||[''])[0];return row.replace(re,()=>'<c r="'+ref+'"'+st+'>'+body+'</c>')}
    const mk='<c r="'+ref+'"'+(g?' s="'+g[1]+'"':'')+'>'+body+'</c>';
    const nxt=[...row.matchAll(/<c r="([A-Z]+)\d+"/g)].find(x=>ci(x[1])>ci(col));
    return nxt?row.replace('<c r="'+nxt[1]+rn+'"',()=>mk+'<c r="'+nxt[1]+rn+'"'):row.replace('</row>',()=>mk+'</row>');
  };
  const dcols=Object.keys(hdr).filter(c=>hdr[c]<=maxD);
  const out=[];
  const xml=planXml.replace(/<row r="(\d+)"[^>]*>[\s\S]*?<\/row>/g,(row,rn)=>{
    rn=+rn;const p=prow[rn];if(!p)return row;
    row=row.replace(/ spans="[^"]*"/,'');
    const y=p.day[maxD]||0;
    row=setC(row,rn,'G',y);row=setC(row,rn,'H',p.n);row=setC(row,rn,'I',p.F-p.n,'F'+rn+'-H'+rn);
    dcols.forEach(c=>{row=setC(row,rn,c,p.day[hdr[c]]||0)});
    out.push([p.sup,p.ckey,p.oldH==null?'':p.oldH,p.n,y,p.F-p.n]);
    return row;
  });
  return{xml,out,maxD,un,assigned:visits.length-Object.values(un).reduce((a,b)=>a+b,0),visited:visits.length};
}

async function runJob(F,say){
  const rel={},cnt={};
  const load=async(k,c)=>{
    if(!F[k])return;
    say('Reading '+F[k].name+' …');
    const want=new Set(Object.values(c));
    const r=await tableRows(F[k],want);let n=0;
    r.forEach(x=>{const m=S(x[c.m]);if(!m)return;n++;
      const d=serial(x[c.d]);
      (rel[k]=rel[k]||{})[m]=[S(x[c.u]),S(x[c.s]),S(x[c.t]),d==null?null:Math.floor(d)]});
    cnt[k]=n;
  };
  await load('inst',{m:ci('AV'),u:ci('V'),s:ci('E'),t:ci('F'),d:ci('AN')});
  await load('brk',{m:ci('J'),u:ci('U'),s:ci('AX'),t:ci('AK'),d:ci('R')});
  await load('rep',{m:ci('AV'),u:ci('V'),s:ci('E'),t:ci('F'),d:ci('AN')});
  say('Reading '+F.ew.name+' …');
  const ew=new Set();(await tableRows(F.ew,new Set([0]))).forEach(x=>{const m=S(x[0]);if(m)ew.add(m)});cnt.ew=ew.size;
  say('Reading '+F.md.name+' (large file, please wait) …');
  const md={};
  (await tableRows(F.md,new Set([ci('J'),ci('V'),ci('W')]))).forEach(x=>{
    const m=S(x[ci('J')]);if(m&&!(m in md))md[m]=[serial(x[ci('V')]),S(x[ci('W')])]});
  cnt.md=Object.keys(md).length;

  say('Opening the 1983 workbook …');
  const zip=await JSZip.loadAsync(await F.main.arrayBuffer());
  const wbx=await zip.file('xl/workbook.xml').async('string');
  const sh=(wbx.match(/<sheet\b[^>]*>/g)||[]).find(t=>unesc(xa(t,'name')||'').trim()===SHEET);
  if(!sh)throw new Error('Sheet "'+SHEET+'" was not found in the 1983 file');
  const rid=xa(sh,'r:id');
  const rels=await zip.file('xl/_rels/workbook.xml.rels').async('string');
  const rt=(rels.match(/<Relationship\b[^>]*>/g)||[]).find(t=>xa(t,'Id')===rid);
  const path='xl/'+xa(rt,'Target').replace(/^\/?(xl\/)?/,'');
  const sst=await zip.file('xl/sharedStrings.xml').async('string');
  const sis=(sst.match(/<si>[\s\S]*?<\/si>|<si\/>/g)||[]).map(x=>unesc(x.replace(/<[^>]+>/g,'')));
  let xml=await zip.file(path).async('string');
  const naRe=/<c r="A[B-I]\d+"[^>]*t="e"[^>]*><v>#N\/A<\/v><\/c>/g;
  const before=(xml.match(naRe)||[]).length;
  const changes=[];let total=0;
  say('Filling #N/A cells …');
  xml=xml.replace(/<row r="(\d+)"[^>]*?(?:\/>|>[\s\S]*?<\/row>)/g,(row,rn)=>{
    rn=+rn;if(rn===1)return row;
    const b=row.match(new RegExp('<c r="B'+rn+'"[^>]*>(?:<v>([^<]*)</v>)?'));
    if(!b||b[1]==null)return row;
    const meter=S(/ t="s"/.test(b[0])?sis[+b[1]]:b[1]);if(!meter)return row;total++;
    const put=(col,val,num,src)=>{
      const re=new RegExp('<c r="'+col+rn+'"((?: s="\\d+")?) t="e"><v>#N/A</v></c>');
      if(!re.test(row))return;
      row=row.replace(re,(m,st)=>num?'<c r="'+col+rn+'"'+st+'><v>'+val+'</v></c>':'<c r="'+col+rn+'"'+st+' t="inlineStr"><is><t>'+esc(val)+'</t></is></c>');
      changes.push([rn,meter,col,num?fmt(val):val,src]);
    };
    const src=['inst','brk','rep'].find(k=>rel[k]&&rel[k][meter]);
    if(src){const v=rel[src][meter];
      put('AB',v[0],0,src);put('AC',v[1],0,src);put('AD',v[2],0,src);
      if(v[3]!=null)put('AE',v[3],1,src)}
    if(ew.has(meter))put('AF',meter,0,'ewatch');
    if(md[meter]){const v=md[meter];put('AG',meter,0,'mdas');
      if(v[0]!=null)put('AH',v[0],1,'mdas');put('AI',v[1],0,'mdas')}
    return row;
  });
  const after=(xml.match(naRe)||[]).length;
  zip.file(path,xml);
  say('Updating the Rectification Plan …');
  const prt=(wbx.match(/<sheet\b[^>]*>/g)||[]).find(t=>unesc(xa(t,'name')||'').trim()==='Rectification Plan');
  let plan=null;
  if(prt){
    const pr=(rels.match(/<Relationship\b[^>]*>/g)||[]).find(t=>xa(t,'Id')===xa(prt,'r:id'));
    const pp='xl/'+xa(pr,'Target').replace(/^\/?(xl\/)?/,'');
    plan=updatePlan(await zip.file(pp).async('string'),xml,sis);
    zip.file(pp,plan.xml);
  }
  say('Building the updated .xlsx …');
  const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE'});
  return{blob,changes,cnt,total,before,after,plan};
}

const SLOTS=[
 {k:'main',l:'1. 1983 AGDT Rectification Plan',h:'.xlsx',m:/1983|agdt|rectif/i,x:/\.xlsx$/i},
 {k:'inst',l:'2. installation',h:'.csv',o:1,m:/install/i},
 {k:'brk',l:'3. breakdown',h:'.csv',o:1,m:/break/i},
 {k:'rep',l:'4. repair',h:'.csv',o:1,m:/repair/i},
 {k:'ew',l:'5. ewatch',h:'.csv',m:/ewatch/i},
 {k:'md',l:'6. getMdasDataAvailability',h:'.xls',m:/mdas/i}
];
const F={};let outBlob=null;
const $=id=>document.getElementById(id);
const log=t=>{$('log').textContent=t};
const tick=()=>new Promise(r=>setTimeout(r,30));
const ready=()=>SLOTS.every(s=>s.o||F[s.k]);

function drawSlots(){
  $('slots').innerHTML='';
  SLOTS.forEach(s=>{
    const d=document.createElement('div');d.className='slot'+(F[s.k]?' ok':'');
    const b=document.createElement('b');b.textContent=s.l+' ('+s.h+')';
    const t=document.createElement('i');t.textContent=s.o?'optional':'required';b.appendChild(t);
    const sp=document.createElement('span');sp.textContent=F[s.k]?'✓ '+F[s.k].name:(s.o?'Not uploaded (optional)':'Not uploaded yet');
    const lb=document.createElement('label');lb.className='b';lb.textContent='Choose';
    const inp=document.createElement('input');inp.type='file';inp.hidden=true;
    inp.onchange=()=>{if(inp.files[0]){F[s.k]=inp.files[0];drawSlots()}};
    lb.appendChild(inp);d.append(b,sp,lb);$('slots').appendChild(d);
  });
  $('go').disabled=!ready();
}
function assign(files){
  [...files].forEach(f=>{const s=SLOTS.find(s=>s.m.test(f.name)&&(!s.x||s.x.test(f.name)));if(s)F[s.k]=f});
  drawSlots();
}
$('drop').onclick=()=>$('multi').click();
$('multi').onchange=e=>assign(e.target.files);
['dragover','dragenter'].forEach(ev=>$('drop').addEventListener(ev,e=>{e.preventDefault();$('drop').classList.add('on')}));
['dragleave','drop'].forEach(ev=>$('drop').addEventListener(ev,e=>{e.preventDefault();$('drop').classList.remove('on')}));
$('drop').addEventListener('drop',e=>assign(e.dataTransfer.files));
$('reset').onclick=()=>{for(const k in F)delete F[k];outBlob=null;$('res').hidden=true;log('');drawSlots()};

$('go').onclick=async()=>{
  $('go').disabled=true;$('res').hidden=true;outBlob=null;
  try{
    const r=await runJob(F,t=>{log(t);return tick()});
    outBlob=r.blob;
    const c=r.cnt,st=[['Meters in sheet',r.total],['#N/A before (AB:AI)',r.before],['Cells filled',r.changes.length],['#N/A remaining',r.after],
      ['Installation rows',c.inst==null?'skipped':c.inst],['Breakdown rows',c.brk==null?'skipped':c.brk],['Repair rows',c.rep==null?'skipped':c.rep],['Ewatch meters',c.ew],['MDAS meters',c.md]];
    $('stats').innerHTML=st.map(s=>'<div class="st"><div>'+s[1]+'</div><small>'+s[0]+'</small></div>').join('');
    $('tbl').innerHTML='<tr><th>Row</th><th>Meter</th><th>Column</th><th>New value</th><th>Source</th></tr>'+
      (r.changes.length?r.changes.slice(0,300).map(x=>'<tr>'+x.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join(''):'<tr><td colspan="5">No #N/A cell matched.</td></tr>');
    const P=r.plan;
    if(P){
      $('pnote').textContent='Report date = latest visit date in Old Uninv ('+fmt(P.maxD)+'). '+P.assigned+' of '+P.visited+' supervisor visits were assigned to a plan row'+(Object.keys(P.un).length?'; not assigned: '+Object.entries(P.un).map(e=>e[0]+' ('+e[1]+')').join(', '):'')+'.';
      $('ptbl').innerHTML='<tr><th>Supervisor</th><th>Circle</th><th>Cumulative (old)</th><th>Cumulative (new)</th><th>Visited on report date</th><th>Target pending</th></tr>'+
        P.out.map(x=>'<tr>'+x.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('');
    }else{$('pnote').textContent='Sheet “Rectification Plan” was not found, so it was not updated.';$('ptbl').innerHTML=''}
    $('res').hidden=false;log('Done ✓');
  }catch(e){log('Error: '+(e&&e.message||e))}
  $('go').disabled=!ready();
};

const NAME='1983_AGDT_Rectification_Plan_26_updated.xlsx';
$('dl').onclick=async()=>{
  if(!outBlob)return;const m=$('dlmsg');m.textContent='';
  try{
    let d=null;
    if(window.claude&&claude.use){try{d=await claude.use('downloads')}catch(_){}}
    if(d){await d.save({filename:NAME,data:outBlob});m.textContent='File saved ✓';return}
    const a=document.createElement('a');a.href=URL.createObjectURL(outBlob);a.download=NAME;
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
    m.textContent='Download started ✓';
  }catch(e){m.textContent=(e&&e.code==='declined')?'Save cancelled.':'Could not save: '+(e&&e.message||e)}
};
drawSlots();
