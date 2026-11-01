var NA='Not available',RD='Ready for Invoice',NR='Not Ready',MINW=2,data={},ch={},meters=[];
var $=function(i){return document.getElementById(i)};
function css(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim()}
function col(){return {Pass:css('--pass'),Fail:css('--fail'),'Not available':'#9aa7b2','Ready for Invoice':css('--rdy'),'Not Ready':css('--mut')}}
function norm(s){s=(s||'').trim().toLowerCase();return s==='pass'?'Pass':s==='fail'?'Fail':NA}
function esc(s){var d=document.createElement('div');d.textContent=s==null?'':s;return d.innerHTML}
function fmt(n){return n.toLocaleString('en-IN')}
function pct(a,b){return b?(a*100/b).toFixed(1)+'%':'0%'}
function parse(f){return new Promise(function(ok){Papa.parse(f,{skipEmptyLines:true,complete:function(r){
 var out=[],a=r.data;for(var i=1;i<a.length;i++){var x=a[i];if(x.length<12)continue;
 out.push({region:x[0],zone:x[1],circle:x[2],division:x[3],sub:x[4],week:String(x[5]).trim(),date:x[6],ss:x[7],loc:x[8],meter:x[10],st:norm(x[11]),row:x})}
 ok({name:f.name,hdr:a[0],rows:out})}})})}
function load(list){var fs=[].slice.call(list).filter(function(f){return /\.csv$/i.test(f.name)});
 if(!fs.length){$('msg').textContent='Choose .csv files.';return}
 Promise.all(fs.map(parse)).then(function(rs){rs.forEach(function(r){if(!r.rows.length)return;data[r.rows[0].week]={name:r.name,hdr:r.hdr,rows:r.rows}});
 $('msg').textContent='';init()})}
function weeks(){return Object.keys(data).sort(function(a,b){return a-b})}
function all(){var o=[];weeks().forEach(function(w){o=o.concat(data[w].rows)});return o}
function agg(){var m={},ws=weeks();ws.forEach(function(w){data[w].rows.forEach(function(r){var o=m[r.meter]||(m[r.meter]={meter:r.meter,wk:{}});o.region=r.region;o.zone=r.zone;o.circle=r.circle;o.division=r.division;o.sub=r.sub;o.ss=r.ss;o.loc=r.loc;o.wk[w]=r.st})});
 meters=Object.keys(m).map(function(k){var o=m[k];o.valid=0;ws.forEach(function(w){if(o.wk[w]==='Pass'||o.wk[w]==='Fail')o.valid++});o.inv=o.valid>=MINW?RD:NR;return o});
 all().forEach(function(r){r.inv=m[r.meter].inv})}
function init(){agg();var ws=weeks(),regs={};all().forEach(function(r){regs[r.region]=1});
 $('files').textContent='Loaded '+ws.length+' week file(s): '+ws.map(function(w){return 'Week '+w+' ('+fmt(data[w].rows.length)+' meters)'}).join(', ')+(ws.length<4?'. Add the remaining files to complete the month.':'')+(ws.length<MINW?' At least 2 weeks are needed before any meter can be Ready for Invoice.':'');
 var fw=$('fw'),fr=$('fr'),cw=fw.value,cr=fr.value;
 fw.innerHTML='<option value="all">Whole month</option>'+ws.map(function(w){return '<option value="'+w+'">Week '+w+'</option>'}).join('');
 fr.innerHTML='<option value="all">All regions</option>'+Object.keys(regs).sort().map(function(r){return '<option>'+esc(r)+'</option>'}).join('');
 if(cw&&data[cw])fw.value=cw;if(cr&&regs[cr])fr.value=cr;
 $('dash').style.display='block';render()}
function inReg(){var g=$('fr').value;return meters.filter(function(m){return g==='all'||m.region===g})}
function sel(){var w=$('fw').value,g=$('fr').value;return all().filter(function(r){return (w==='all'||r.week===w)&&(g==='all'||r.region===g)})}
function cnt(rs){var c={Pass:0,Fail:0,'Not available':0,t:rs.length};rs.forEach(function(r){c[r.st]++});return c}
function mc(ms){var n=0;ms.forEach(function(m){if(m.inv===RD)n++});return {t:ms.length,r:n,n:ms.length-n}}
function mk(id,cfg){if(ch[id])ch[id].destroy();ch[id]=new Chart($(id),cfg)}
var WH=['Week','Start date','Total meters','Pass','Fail',NA,'Data available %'],ZH=['Region','Zone','Total meters',RD,NR,'Ready for Invoice %'];
function TT(h,rows){return '<tr>'+h.map(function(x){return '<th>'+esc(x)+'</th>'}).join('')+'</tr>'+rows.map(function(r){return '<tr>'+r.map(function(x){return '<td'+(typeof x==='number'?' class="r"':'')+'>'+(x===RD?'<span class="tag">'+RD+'</span>':x===NR?'<span class="tag n">'+NR+'</span>':esc(x))+'</td>'}).join('')+'</tr>'}).join('')}
function T(h,rows){return '<div class="tw"><table>'+TT(h,rows)+'</table></div>'}
function wkRows(){var g=$('fr').value,b=all().filter(function(r){return g==='all'||r.region===g}),o=weeks().map(function(w){var x=cnt(b.filter(function(r){return r.week===w}));return [+w,data[w].rows[0].date,x.t,x.Pass,x.Fail,x[NA],pct(x.Pass+x.Fail,x.t)]});
 var m=cnt(b);o.push(['Month','',m.t,m.Pass,m.Fail,m[NA],pct(m.Pass+m.Fail,m.t)]);return o}
function render(){var ms=inReg(),M=mc(ms),c=cnt(sel()),C=col(),ln=css('--line'),w=$('fw').value,ws=weeks(),g=$('fr').value;
 $('kpis').innerHTML='<div class="k hero"><small>Ready for Invoice</small><div class="n">'+fmt(M.r)+'</div><small>'+pct(M.r,M.t)+' of '+fmt(M.t)+' meters</small></div><div class="k"><small>Total meters</small><div class="n">'+fmt(M.t)+'</div></div><div class="k"><small>Not Ready</small><div class="n">'+fmt(M.n)+'</div><small>'+pct(M.n,M.t)+'</small></div>';
 var lb=w==='all'?'whole month':'week '+w;
 $('kpis2').innerHTML=['Pass','Fail',NA].map(function(s,i){return '<div class="k '+['p','f','na'][i]+'"><small>'+s+' readings, '+lb+'</small><div class="n">'+fmt(c[s])+'</div><small>'+pct(c[s],c.t)+'</small></div>'}).join('');
 Chart.defaults.color=css('--mut');Chart.defaults.font.family='Manrope,system-ui,sans-serif';
 var b=all().filter(function(r){return g==='all'||r.region===g}),S=['Pass','Fail',NA],wc={};
 ws.forEach(function(k){wc[k]=cnt(b.filter(function(r){return r.week===k}))});
 mk('c1',{type:'bar',data:{labels:ws.map(function(k){return 'Week '+k}),datasets:S.map(function(s){return {label:s,data:ws.map(function(k){return wc[k][s]}),backgroundColor:C[s]}})},
  options:{maintainAspectRatio:false,scales:{x:{stacked:true,grid:{display:false}},y:{stacked:true,grid:{color:ln}}},plugins:{legend:{position:'bottom'}}}});
 mk('c2',{type:'pie',data:{labels:[RD,NR],datasets:[{data:[M.r,M.n],backgroundColor:[C[RD],C[NR]],borderColor:css('--card'),borderWidth:2}]},
  options:{maintainAspectRatio:false,plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:function(x){return x.label+': '+fmt(x.raw)+' ('+pct(x.raw,M.t)+')'}}}}}});
 var z={};ms.forEach(function(m){var o=z[m.zone]||(z[m.zone]={r:0,n:0});m.inv===RD?o.r++:o.n++});var zk=Object.keys(z).sort(function(a,b){return z[b].r-z[a].r});
 mk('c3',{type:'bar',data:{labels:zk,datasets:[{label:RD,data:zk.map(function(k){return z[k].r}),backgroundColor:C[RD]},{label:NR,data:zk.map(function(k){return z[k].n}),backgroundColor:C[NR]}]},
  options:{indexAxis:'y',maintainAspectRatio:false,scales:{x:{stacked:true,grid:{color:ln}},y:{stacked:true,grid:{display:false}}},plugins:{legend:{position:'bottom'}}}});
 $('wt').innerHTML=TT(WH,wkRows());table()}
function sh(s){return s===NA?'N/A':s||'-'}
function table(){var q=$('q').value.toLowerCase(),f=$('fs').value,ws=weeks(),ms=inReg().filter(function(m){return (f==='all'||m.inv===f)&&(!q||(m.ss+m.loc+m.meter+m.zone+m.circle).toLowerCase().indexOf(q)>-1)});
 var h='<tr><th>Zone</th><th>Circle</th><th>Substation</th><th>Metering location</th><th>Meter serial</th>'+ws.map(function(w){return '<th>Wk '+w+'</th>'}).join('')+'<th class="r">Weeks with data</th><th>Invoice status</th></tr>';
 ms.slice(0,300).forEach(function(m){h+='<tr><td>'+esc(m.zone)+'</td><td>'+esc(m.circle)+'</td><td>'+esc(m.ss)+'</td><td>'+esc(m.loc)+'</td><td>'+esc(m.meter)+'</td>'+ws.map(function(w){return '<td>'+sh(m.wk[w])+'</td>'}).join('')+'<td class="r">'+m.valid+'</td><td><span class="tag'+(m.inv===RD?'':' n')+'">'+m.inv+'</span></td></tr>'});
 $('rt').innerHTML=h;$('rn').textContent=ms.length>300?'Showing the first 300 of '+fmt(ms.length)+' meters. The exports contain all of them.':fmt(ms.length)+' meter(s).'}
function snap(){var w=$('fw').value,g=$('fr').value,ms=inReg(),Z={};
 ms.forEach(function(m){var k=m.region+'|'+m.zone,z=Z[k]||(Z[k]={r:0,n:0});m.inv===RD?z.r++:z.n++});
 return {view:(w==='all'?'Whole month':'Week '+w)+' | '+(g==='all'?'All regions':g),M:mc(ms),c:cnt(sel()),wk:wkRows(),ms:ms,tag:w==='all'?'month':'week'+w,
  zn:Object.keys(Z).sort().map(function(k){var z=Z[k],p=k.split('|');return [p[0],p[1],z.r+z.n,z.r,z.n,pct(z.r,z.r+z.n)]})}}
function MH(){return ['Region','Zone','Circle','Division','Sub-division','Substation','Metering location','Meter serial'].concat(weeks().map(function(w){return 'Week '+w})).concat(['Weeks with Pass/Fail','Invoice status'])}
function mrow(m){return [m.region,m.zone,m.circle,m.division,m.sub,m.ss,m.loc,m.meter].concat(weeks().map(function(w){return m.wk[w]||''})).concat([m.valid,m.inv])}
function img(id){var c=$(id),t=document.createElement('canvas');t.width=c.width;t.height=c.height;var x=t.getContext('2d');x.fillStyle=css('--card');x.fillRect(0,0,t.width,t.height);x.drawImage(c,0,0);return t.toDataURL('image/png')}
function saveFile(name,blob){var u=window.claude&&window.claude.use?window.claude.use('downloads'):Promise.resolve(null);
 return u.then(function(d){if(d)return d.save({filename:name,data:blob}).catch(function(e){if(e&&e.code!=='declined')$('msg').textContent='Could not save the file: '+(e.message||e.code)});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click()}).catch(function(){$('msg').textContent='Could not save the file.'})}
function exportXls(){if(!weeks().length)return;var s=snap(),wb=new ExcelJS.Workbook(),hf={bold:true,color:{argb:'FFFFFFFF'}},hfill={type:'pattern',pattern:'solid',fgColor:{argb:'FF16405A'}};
 function hdr(r){r.eachCell(function(c){c.font=hf;c.fill=hfill})}
 function sheet(n,h,rows){var w=wb.addWorksheet(n);hdr(w.addRow(h));w.addRows(rows);w.columns.forEach(function(c){c.width=22});w.views=[{state:'frozen',ySplit:1}]}
 var d=wb.addWorksheet('Dashboard',{views:[{showGridLines:false}]}),M=s.M,c=s.c;
 d.columns=[{width:30},{width:16},{width:16},{width:14},{width:14},{width:20},{width:22}];
 d.addRow(['BIS monthly status dashboard']).font={bold:true,size:16};d.addRow(['View: '+s.view]);
 d.addRow(['Rule: a meter is Ready for Invoice when it has Pass or Fail in at least '+MINW+' weeks.']);d.addRow([]);
 hdr(d.addRow(['KPI','Count','Share']));
 d.addRow([RD+' (meters)',M.r,pct(M.r,M.t)]).font={bold:true,color:{argb:'FFB26B00'}};
 d.addRow(['Total meters',M.t,'']);d.addRow([NR+' (meters)',M.n,pct(M.n,M.t)]);
 d.addRow(['Pass readings',c.Pass,pct(c.Pass,c.t)]);d.addRow(['Fail readings',c.Fail,pct(c.Fail,c.t)]);d.addRow(['Not available readings',c[NA],pct(c[NA],c.t)]);d.addRow([]);
 d.addRow(['Weekly summary']).font={bold:true};hdr(d.addRow(WH));s.wk.forEach(function(r){d.addRow(r)});d.addRow([]);
 d.addRow(['Charts']).font={bold:true};
 ['c1','c2','c3'].forEach(function(id){var cv=$(id),wd=560,ht=Math.round(wd*cv.height/cv.width),im=wb.addImage({base64:img(id),extension:'png'});
  d.addImage(im,{tl:{col:0,row:d.rowCount},ext:{width:wd,height:ht}});for(var i=0;i<Math.ceil(ht/20)+1;i++)d.addRow([])});
 sheet('By zone',ZH,s.zn);
 sheet('Meter status',MH(),s.ms.map(mrow));
 sheet('Ready for Invoice',MH(),s.ms.filter(function(m){return m.inv===RD}).map(mrow));
 sheet('All data',data[weeks()[0]].hdr.concat(['Meter invoice status']),all().map(function(r){return r.row.concat([r.inv])}));
 wb.xlsx.writeBuffer().then(function(b){return saveFile('BIS_dashboard_'+s.tag+'.xlsx',new Blob([b]))}).catch(function(e){$('msg').textContent='Excel export failed: '+e.message})}
var FALLBACK_CSS='body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,Arial,sans-serif}.wrap{max-width:1180px;margin:0 auto;padding:20px 16px}.card,.k{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px}.kpis{display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px;margin-bottom:12px}.kpis2{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:12px}.grid{display:grid;grid-template-columns:3fr 2fr;gap:12px;margin-bottom:12px}.k small{color:var(--mut);display:block}.k .n{font-size:30px;font-weight:800}.k.hero{background:var(--rdybg);border-color:var(--rdy)}.k.hero .n{font-size:48px;color:var(--rdy)}.k.p .n{color:var(--pass)}.k.f .n{color:var(--fail)}.tw{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:13px}th,td{text-align:left;padding:6px 10px;border-bottom:1px solid var(--line);white-space:nowrap}td.r{text-align:right}.tag{padding:1px 8px;border-radius:99px;background:var(--rdybg);color:var(--rdy);font-weight:700}.tag.n{background:var(--line);color:var(--mut)}';
function getCss(cb){var l=document.querySelector('link[href$="style.css"]');fetch(l.href).then(function(r){return r.text()}).then(cb).catch(function(){try{var t='';[].forEach.call(l.sheet.cssRules,function(r){t+=r.cssText});cb(t)}catch(e){cb(FALLBACK_CSS)}})}
function exportHtml(){if(weeks().length)getCss(buildHtml)}
function buildHtml(CSS){var s=snap(),im=['c1','c2','c3'].map(img);
 function P(t,i){return '<div class="card"><h2>'+t+'</h2><img src="'+im[i]+'" alt="'+t+'"></div>'}
 var v=['--bg','--card','--ink','--mut','--line','--pass','--fail','--rdy','--rdybg','--acc'].map(function(k){return k+':'+css(k)}).join(';');
 var R=s.ms.filter(function(m){return m.inv===RD}),N=s.ms.filter(function(m){return m.inv!==RD});
 var h='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BIS monthly status report</title><style>'+CSS+':root:root{'+v+'}img{max-width:100%;height:auto}.cv,.bar{display:none}</style></head><body><div class="wrap"><h1>BIS monthly status report</h1><p class="sub">View: '+esc(s.view)+' | Generated '+new Date().toLocaleDateString('en-GB')+'<br>Rule: a meter is Ready for Invoice when it has Pass or Fail in at least '+MINW+' weeks.</p><div class="kpis">'+$('kpis').innerHTML+'</div><div class="kpis2">'+$('kpis2').innerHTML+'</div>'+
 '<div class="grid">'+P('Readings by week',0)+P('Meter invoice status',1)+'</div><div class="grid">'+P('Meters by zone',2)+'<div class="card"><h2>Weekly summary</h2>'+T(WH,s.wk)+'</div></div>'+
 '<div class="card" style="margin-bottom:12px"><h2>Status by zone</h2>'+T(ZH,s.zn)+'</div><div class="card" style="margin-bottom:12px"><h2>Ready for Invoice meters ('+R.length+')</h2>'+T(MH(),R.map(mrow))+'</div><div class="card"><h2>Not Ready meters ('+N.length+')</h2>'+T(MH(),N.map(mrow))+'</div></div></body></html>';
 saveFile('BIS_dashboard_'+s.tag+'.html',new Blob([h],{type:'text/html'}))}
var dr=$('drop'),fi=$('fi');
dr.onclick=function(){fi.click()};dr.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();fi.click()}};
fi.onchange=function(){load(fi.files);fi.value=''};
['dragover','dragenter'].forEach(function(t){dr.addEventListener(t,function(e){e.preventDefault();dr.classList.add('over')})});
['dragleave','drop'].forEach(function(t){dr.addEventListener(t,function(e){e.preventDefault();dr.classList.remove('over')})});
dr.addEventListener('drop',function(e){load(e.dataTransfer.files)});
$('fw').onchange=$('fr').onchange=render;$('q').oninput=table;$('fs').onchange=table;$('ex').onclick=exportXls;$('eh').onclick=exportHtml;
