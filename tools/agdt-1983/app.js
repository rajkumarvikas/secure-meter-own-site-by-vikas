/* ---------- core (no DOM) ---------- */
const SHEET='Old Uninv';
const ci=s=>[...s].reduce((a,c)=>a*26+c.charCodeAt(0)-64,0)-1;
const EP=Date.UTC(1899,11,30);
const S=v=>String(v==null?'':v).trim();
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const unesc=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
const xa=(tag,n)=>{const m=tag.match(new RegExp('\\b'+n+'="([^"]*)"'));return m?m[1]:null};

function parseCSV(t){
  /* Lenient CSV: a quote closes a quoted field only when it is followed by , / newline / end of text, so stray
     quotes inside a field (e.g. <a href="https://..."> image links in the FFS exports) cannot swallow later rows. */
  if(t.charCodeAt(0)===65279)t=t.slice(1);
  const out=[];let r=[],f='',q=false;
  for(let i=0;i<t.length;i++){const c=t[i];
    if(q){
      if(c==='"'){const n=t[i+1];
        if(n==='"'){f+='"';i++}
        else if(n===undefined||n===','||n==='\n'||n==='\r')q=false;
        else f+='"'}
      else f+=c}
    else if(c==='"'&&f==='')q=true;
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
  if(m=v.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})(?:[ T,]+(\d{1,2}):(\d\d)(?::(\d\d))?)?/))
    return(Date.UTC(+m[3],m[2]-1,+m[1],+(m[4]||0),+(m[5]||0),+(m[6]||0))-EP)/864e5;
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

function updatePlan(planXml,ouXml,sis,oc){
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
    const ab=cellVal(row,oc.ab,rn);if(typeof ab!=='string'||!ab)return row;
    const ae=cellVal(row,oc.ae,rn);const d=typeof ae==='number'?Math.floor(ae):null;if(d&&d>maxD)maxD=d;
    visits.push({ab:words(ab),circ:circKey(cellVal(row,oc.h,rn)),d});return row});
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

/* Sheets in which #N/A cells are filled. Columns are found by HEADER NAME (row 1), so
   Old Uninv and New Installation may have the same headers at different column letters.
   Header text is compared ignoring case, spaces and punctuation; if a header repeats, the first one is used. */
const nk=t=>String(t||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const HEAD={
  m:['metersrno','metersr','meterno','meterserialno'],
  u:['revisitedbysupervisor'],
  s:['ffsremsrk','ffsremark'],
  t:['subremark'],
  d:['visitdate'],
  ew:['ewatchamrstatus'],
  md:['mdasamrdate'],
  ms:['mdassource'],
  circ:['circlename']
};
const FILL=[{name:'Old Uninv',req:1},{name:'New Installation',req:0}];
function headerMap(xml,sis){
  const hm={};
  const r1=(xml.match(/<row r="1"[^>]*?(?:\/>|>[\s\S]*?<\/row>)/)||[''])[0];
  r1.replace(/<c r="([A-Z]+)1"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g,(m,col,a,b)=>{
    b=b||'';let v=null;
    if(/ t="s"/.test(a)){const x=b.match(/<v>([^<]*)<\/v>/);if(x)v=sis[+x[1]]}
    else if(/ t="inlineStr"/.test(a))v=unesc(b.replace(/<[^>]+>/g,''));
    else{const x=b.match(/<v>([^<]*)<\/v>/);if(x)v=x[1]}
    const k=nk(v);if(k)(hm[k]=hm[k]||[]).push(col);return m});
  return hm;
}
function resolveCols(hm){
  const C={},miss=[];
  for(const f in HEAD){
    const hit=HEAD[f].map(h=>hm[h]&&hm[h][0]).filter(Boolean).sort((a,b)=>ci(a)-ci(b))[0];
    if(hit)C[f]=hit;else miss.push(f);
  }
  return{C,miss};
}
const FNAME={m:'Meter',u:'Revisited by supervisor',s:'FFS remsrk',t:'sub remark',d:'Visit date',ew:'E watch AMR status',md:'MDAS AMR date',ms:'Mdas Source',circ:'Circle Name'};
const sheetPath=(wbx,rels,name)=>{
  const sh=(wbx.match(/<sheet\b[^>]*>/g)||[]).find(t=>unesc(xa(t,'name')||'').trim()===name);
  if(!sh)return null;
  const rt=(rels.match(/<Relationship\b[^>]*>/g)||[]).find(t=>xa(t,'Id')===xa(sh,'r:id'));
  return rt?'xl/'+xa(rt,'Target').replace(/^\/?(xl\/)?/,''):null;
};
function fillSheet(xml,C,rel,ew,md,sis,label){
  const cols=['u','s','t','d','ew','md','ms'].map(k=>C[k]).filter(Boolean);
  const naRe=new RegExp('<c r="(?:'+cols.join('|')+')\\d+"[^>]*t="e"[^>]*><v>#N/A</v></c>','g');
  const before=(xml.match(naRe)||[]).length;
  const changes=[];let total=0,mdHit=0;
  xml=xml.replace(/<row r="(\d+)"[^>]*?(?:\/>|>[\s\S]*?<\/row>)/g,(row,rn)=>{
    rn=+rn;if(rn===1)return row;
    const b=C.m&&row.match(new RegExp('<c r="'+C.m+rn+'"[^>]*>(?:<v>([^<]*)</v>)?'));
    if(!b||b[1]==null)return row;
    const meter=S(/ t="s"/.test(b[0])?sis[+b[1]]:b[1]);if(!meter||meter[0]==='#')return row;total++;
    const put=(col,val,num,src)=>{
      if(!col)return;
      const re=new RegExp('<c r="'+col+rn+'"((?: s="\\d+")?) t="e"><v>#N/A</v></c>');
      if(!re.test(row))return;
      row=row.replace(re,(m,st)=>num?'<c r="'+col+rn+'"'+st+'><v>'+val+'</v></c>':'<c r="'+col+rn+'"'+st+' t="inlineStr"><is><t>'+esc(val)+'</t></is></c>');
      changes.push([label,rn,meter,col,num?fmt(val):val,src]);
    };
    const upd=(col,val,num)=>{
      if(!col)return;
      const re=new RegExp('<c r="'+col+rn+'"([^>]*?)(?:/>|>([\\s\\S]*?)</c>)');
      const m=row.match(re);if(!m)return;
      const at=m[1],inner=m[2]||'',st=(at.match(/ s="\d+"/)||[''])[0];
      let o=null;const vv=inner.match(/<v>([^<]*)<\/v>/);
      if(/ t="e"/.test(at))o='#N/A';
      else if(/ t="s"/.test(at)&&vv)o=sis[+vv[1]];
      else if(/ t="inlineStr"/.test(at))o=unesc(inner.replace(/<[^>]+>/g,''));
      else if(/ t="str"/.test(at)&&vv)o=unesc(vv[1]);
      else if(vv&&!/ t="/.test(at))o=+vv[1];
      if(num?(typeof o==='number'&&o===val):((o==null?'':String(o))===val))return;
      const cell=num?'<c r="'+col+rn+'"'+st+'><v>'+val+'</v></c>'
        :val===''?'<c r="'+col+rn+'"'+st+'/>'
        :'<c r="'+col+rn+'"'+st+' t="inlineStr"><is><t>'+esc(val)+'</t></is></c>';
      row=row.replace(re,()=>cell);
      changes.push([label,rn,meter,col,num?(val>20000?fmt(val):String(val)):(val===''?'(blank)':val),(col===C.ew?'ewatch':'mdas'),o==null?'':(typeof o==='number'?(o>20000?fmt(o):String(o)):o)]);
    };
    const src=['inst','brk','rep'].find(k=>rel[k]&&rel[k][meter]);
    if(src){const v=rel[src][meter];
      put(C.u,v[0],0,src);put(C.s,v[1],0,src);put(C.t,v[2],0,src);
      if(v[3]!=null)put(C.d,v[3],1,src)}
    /* E watch AMR status: VLOOKUP on the meter against ewatch column A - the cell is replaced with that meter number. */
    if(ew.has(meter))upd(C.ew,meter,0);
    /* MDAS date / source: like a VLOOKUP on the meter, the cell is REPLACED with the MDAS value
       (Energy Reading Date -> whole day, blank -> 0; Reading Source), whatever it held before.
       Meters that are not in the MDAS file are left untouched. */
    if(md[meter]){mdHit++;const v=md[meter];
      upd(C.md,v[0]==null?0:v[0],1);upd(C.ms,v[1]||'',0)}
    return row;
  });
  return{xml,changes,total,mdHit,before,after:(xml.match(naRe)||[]).length};
}

/* Columns of the Installation / Breakdown / Repair CSVs are found by header name (letters are only a fallback). */
const HN={
  inst:{m:['oldmeterserialno'],u:['taskdoneby'],s:['servicename'],t:['jobtype'],d:['taskenddate']},
  brk:{m:['meterserialno'],u:['fieldusername'],s:['finalremarksfornonamr'],t:['remark'],d:['smtaskendtime']}
};
HN.rep=HN.inst;
const LET={inst:{m:'AV',u:'V',s:'E',t:'F',d:'AN'},brk:{m:'J',u:'U',s:'AY',t:'AK',d:'R'},rep:{m:'AV',u:'V',s:'E',t:'F',d:'AN'}};
const SFN={m:'Meter',u:'Supervisor',s:'FFS remark',t:'Sub remark',d:'Date'};
const colL=n=>{let t='';n++;while(n>0){const m=(n-1)%26;t=String.fromCharCode(65+m)+t;n=Math.floor((n-1)/26)}return t};

async function runJob(F,say){
  const rel={},cnt={hdr:[],src:[]};
  const load=async(k)=>{
    if(!F[k])return;
    say('Reading '+F[k].name+' …');
    const c=LET[k],hn=HN[k],idx={};let rows;
    if(/\.csv$/i.test(F[k].name)){
      const all=parseCSV(new TextDecoder('utf-8').decode(await F[k].arrayBuffer()));
      const hm={};(all[0]||[]).forEach((h,i)=>{const z=nk(h);if(z&&!(z in hm))hm[z]=i});
      for(const f in c){const hit=hn[f].map(z=>hm[z]).find(i=>i!=null);
        if(hit!=null)idx[f]=hit;
        else{idx[f]=ci(c[f]);cnt.hdr.push(F[k].name+': header for "'+SFN[f]+'" not found, used column '+c[f])}}
      rows=all.slice(1);
    }else{
      for(const f in c)idx[f]=ci(c[f]);
      rows=await tableRows(F[k],new Set(Object.values(idx)));
    }
    cnt.src.push(F[k].name+': '+Object.keys(c).map(f=>SFN[f]+' = '+colL(idx[f])).join(' · '));
    let n=0;
    rows.forEach(x=>{const m=S(x[idx.m]);if(!m)return;n++;
      const d=serial(x[idx.d]);
      (rel[k]=rel[k]||{})[m]=[S(x[idx.u]),S(x[idx.s]),S(x[idx.t]),d==null?null:Math.floor(d)]});
    cnt[k]=n;
  };
  await load('inst');
  await load('brk');
  await load('rep');
  say('Reading '+F.ew.name+' …');
  const ew=new Set();(await tableRows(F.ew,new Set([0]))).forEach(x=>{const m=S(x[0]);if(m)ew.add(m)});cnt.ew=ew.size;
  say('Reading '+F.md.name+' (large file, please wait) …');
  const md={};cnt.mdBad=0;cnt.mdRaw=[];
  (await tableRows(F.md,new Set([ci('J'),ci('V'),ci('W')]))).forEach(x=>{
    const m=S(x[ci('J')]);if(!m)return;
    const raw=x[ci('V')],d=serial(raw);
    if(d==null&&S(raw)!==''){cnt.mdBad++;if(cnt.mdRaw.length<3)cnt.mdRaw.push(S(raw))}
    const cur=md[m];
    if(!cur||(d!=null&&(cur[0]==null||d>cur[0])))md[m]=[d==null?null:Math.floor(d),S(x[ci('W')])]});
  cnt.md=Object.keys(md).length;

  say('Opening the 1983 workbook …');
  const zip=await JSZip.loadAsync(await F.main.arrayBuffer());
  const wbx=await zip.file('xl/workbook.xml').async('string');
  const rels=await zip.file('xl/_rels/workbook.xml.rels').async('string');
  const sst=await zip.file('xl/sharedStrings.xml').async('string');
  const sis=(sst.match(/<si>[\s\S]*?<\/si>|<si\/>/g)||[]).map(x=>unesc(x.replace(/<[^>]+>/g,'')));
  const sheets=[],warn=cnt.hdr.slice();let xml=null,oc=null;
  if(cnt.mdBad)warn.push('MDAS file: '+cnt.mdBad+' date value(s) could not be read, e.g. '+cnt.mdRaw.map(v=>'"'+v+'"').join(', ')+' (date left blank for those)');
  for(const cfg of FILL){
    const path=sheetPath(wbx,rels,cfg.name);
    if(!path){if(cfg.req)throw new Error('Sheet "'+cfg.name+'" was not found in the 1983 file');sheets.push({label:cfg.name,missing:1,changes:[],total:0,before:0,after:0,map:''});continue}
    say('Filling #N/A cells in '+cfg.name+' …');await tick();
    const x0=await zip.file(path).async('string');
    const {C,miss}=resolveCols(headerMap(x0,sis));
    if(!C.m){if(cfg.req)throw new Error('"'+cfg.name+'": meter column header (e.g. "Meter Sr. No.") not found in row 1');warn.push(cfg.name+': meter column not found, sheet skipped');sheets.push({label:cfg.name,missing:1,changes:[],total:0,before:0,after:0,map:''});continue}
    if(miss.filter(f=>f!=='circ').length)warn.push(cfg.name+': header not found for '+miss.filter(f=>f!=='circ').map(f=>FNAME[f]).join(', ')+' (those columns are not filled)');
    const r=fillSheet(x0,C,rel,ew,md,sis,cfg.name);
    zip.file(path,r.xml);
    sheets.push({label:cfg.name,changes:r.changes,total:r.total,mdHit:r.mdHit,before:r.before,after:r.after,
      map:Object.keys(HEAD).filter(f=>C[f]).map(f=>FNAME[f]+' = '+C[f]).join(' · ')});
    if(cfg.name===SHEET){xml=r.xml;
      oc={ab:C.u,ae:C.d,h:C.circ};
      if(!oc.ab||!oc.ae||!oc.h)warn.push('Old Uninv: supervisor / visit date / circle header missing, Rectification Plan may be wrong')}
  }
  say('Updating the Rectification Plan …');
  const prt=(wbx.match(/<sheet\b[^>]*>/g)||[]).find(t=>unesc(xa(t,'name')||'').trim()==='Rectification Plan');
  let plan=null;
  if(prt){
    const pr=(rels.match(/<Relationship\b[^>]*>/g)||[]).find(t=>xa(t,'Id')===xa(prt,'r:id'));
    const pp='xl/'+xa(pr,'Target').replace(/^\/?(xl\/)?/,'');
    plan=updatePlan(await zip.file(pp).async('string'),xml,sis,{ab:oc.ab||'AB',ae:oc.ae||'AE',h:oc.h||'H'});
    zip.file(pp,plan.xml);
  }
  say('Building the updated .xlsx …');
  const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE'});
  return{blob,sheets,cnt,plan,warn};
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
    const c=r.cnt,all=[].concat(...r.sheets.map(x=>x.changes));
    const st=[];
    r.sheets.forEach(x=>{
      if(x.missing){st.push([x.label+': sheet not found',0]);return}
      st.push([x.label+': meters',x.total],[x.label+': found in MDAS',x.mdHit],[x.label+': #N/A before',x.before],[x.label+': cells changed',x.changes.length],[x.label+': #N/A remaining',x.after])});
    st.push(['Installation rows',c.inst==null?'skipped':c.inst],['Breakdown rows',c.brk==null?'skipped':c.brk],['Repair rows',c.rep==null?'skipped':c.rep],['Ewatch meters',c.ew],['MDAS meters',c.md]);
    $('stats').innerHTML=st.map(s=>'<div class="st"><div>'+s[1]+'</div><small>'+s[0]+'</small></div>').join('');
    $('tbl').innerHTML='<tr><th>Sheet</th><th>Row</th><th>Meter</th><th>Column</th><th>New value</th><th>Source</th><th>Old value</th></tr>'+
      (all.length?all.slice(0,300).map(x=>'<tr>'+x.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join(''):'<tr><td colspan="7">Nothing changed.</td></tr>');
    const P=r.plan;
    if(P){
      $('pnote').textContent='Report date = latest visit date in Old Uninv ('+fmt(P.maxD)+'). '+P.assigned+' of '+P.visited+' supervisor visits were assigned to a plan row'+(Object.keys(P.un).length?'; not assigned: '+Object.entries(P.un).map(e=>e[0]+' ('+e[1]+')').join(', '):'')+'.';
      $('ptbl').innerHTML='<tr><th>Supervisor</th><th>Circle</th><th>Cumulative (old)</th><th>Cumulative (new)</th><th>Visited on report date</th><th>Target pending</th></tr>'+
        P.out.map(x=>'<tr>'+x.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('');
    }else{$('pnote').textContent='Sheet “Rectification Plan” was not found, so it was not updated.';$('ptbl').innerHTML=''}
    $('mapnote').textContent=r.cnt.src.concat(r.sheets.filter(x=>x.map).map(x=>x.label+': '+x.map)).join('\n')+(r.warn.length?'\n⚠ '+r.warn.join('\n⚠ '):'');
    $('res').hidden=false;log('Done ✓'+(r.warn.length?' (see warnings below)':''));
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
