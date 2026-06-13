const STORAGE_KEY = "stationAssetReminderPWA.v1";
let assets = [];
let selectedId = null;
let deferredPrompt = null;
let lastNotifyKey = "";

const $ = (id) => document.getElementById(id);
const today = () => new Date().toISOString().slice(0,10);
const uid = () => crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random());

const sample = [{
  id: uid(), station:"範例站", assetNo:"MOTO-SR400-001", name:"SR400", category:"車輛", location:"站外停放區", responsible:"副站長", currentMeter:50000, unit:"km", notes:"示範資料，可刪除",
  items:[
    {id:uid(), name:"機油更換", cycleMeter:3000, cycleDays:90, lastMeter:47000, lastDate:"2026-03-01", cost:1200},
    {id:uid(), name:"鏈條保養", cycleMeter:1000, cycleDays:30, lastMeter:49000, lastDate:"2026-05-01", cost:300},
    {id:uid(), name:"火星塞", cycleMeter:12000, cycleDays:365, lastMeter:40000, lastDate:"2025-06-01", cost:450}
  ]
},{
  id: uid(), station:"範例站", assetNo:"GEN-001", name:"緊急發電機", category:"機電設備", location:"機房", responsible:"值班主管", currentMeter:120, unit:"hr", notes:"以運轉小時計算",
  items:[
    {id:uid(), name:"試運轉檢查", cycleMeter:10, cycleDays:30, lastMeter:110, lastDate:"2026-05-15", cost:0},
    {id:uid(), name:"機油/濾芯", cycleMeter:100, cycleDays:365, lastMeter:50, lastDate:"2025-08-01", cost:2500}
  ]
}];

function load(){
  const raw = localStorage.getItem(STORAGE_KEY);
  assets = raw ? JSON.parse(raw) : sample;
  selectedId = assets[0]?.id || null;
}
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(assets)); }
function selected(){ return assets.find(a=>a.id===selectedId); }
function daysBetween(d){ return Math.floor((new Date()-new Date(d))/(1000*60*60*24)); }
function statusOf(asset,item){
  const meterDue = Number(item.lastMeter)+Number(item.cycleMeter);
  const meterRemaining = meterDue-Number(asset.currentMeter);
  const dayRemaining = Number(item.cycleDays)-daysBetween(item.lastDate);
  if(meterRemaining<=0 || dayRemaining<=0) return {label:"逾期", level:"danger", meterDue, meterRemaining, dayRemaining};
  if(meterRemaining<=Number(item.cycleMeter)*0.1 || dayRemaining<=7) return {label:"即將到期", level:"warning", meterDue, meterRemaining, dayRemaining};
  return {label:"正常", level:"ok", meterDue, meterRemaining, dayRemaining};
}

function render(){
  let overdue=0, warning=0, ok=0;
  assets.forEach(a=>a.items.forEach(i=>{ const s=statusOf(a,i); if(s.level==='danger') overdue++; else if(s.level==='warning') warning++; else ok++; }));
  $('assetCount').textContent=assets.length; $('overdueCount').textContent=overdue; $('warningCount').textContent=warning; $('okCount').textContent=ok;

  $('assetList').innerHTML = assets.map(a=>`<button class="asset-btn ${a.id===selectedId?'active':''}" data-id="${a.id}"><div class="asset-title">${escapeHtml(a.name)}</div><div class="asset-meta">${escapeHtml(a.assetNo)}｜${escapeHtml(a.category)}｜${escapeHtml(a.location||'未填位置')}</div></button>`).join('');
  document.querySelectorAll('.asset-btn').forEach(btn=>btn.onclick=()=>{selectedId=btn.dataset.id; render();});

  const a = selected();
  if(!a){ $('emptyState').classList.remove('hidden'); $('detailView').classList.add('hidden'); return; }
  $('emptyState').classList.add('hidden'); $('detailView').classList.remove('hidden');
  $('detailTitle').textContent = a.name;
  ['station','assetNo','category','location','responsible','unit','notes'].forEach(id=>$(id).value=a[id]||'');
  $('assetName').value=a.name||''; $('currentMeter').value=a.currentMeter||0;

  $('itemList').innerHTML = a.items.map(item=>{
    const s=statusOf(a,item);
    return `<div class="item">
      <div class="item-head"><div><strong>${escapeHtml(item.name)}</strong><small>上次：${item.lastMeter} ${escapeHtml(a.unit)} / ${item.lastDate}</small><small>下次：${s.meterDue} ${escapeHtml(a.unit)}｜剩餘 ${s.meterRemaining} ${escapeHtml(a.unit)}｜剩餘 ${s.dayRemaining} 天</small></div><div class="badge ${s.level}">${s.label}</div></div>
      <div class="toolbar" style="margin-top:10px"><button data-complete="${item.id}">完成/更新</button><button class="secondary" data-delitem="${item.id}">刪除項目</button></div>
    </div>`;
  }).join('');
  document.querySelectorAll('[data-complete]').forEach(b=>b.onclick=()=>completeItem(b.dataset.complete));
  document.querySelectorAll('[data-delitem]').forEach(b=>b.onclick=()=>deleteItem(b.dataset.delitem));
}

function bindFields(){
  const map = {station:'station',assetNo:'assetNo',assetName:'name',category:'category',location:'location',responsible:'responsible',currentMeter:'currentMeter',unit:'unit',notes:'notes'};
  Object.keys(map).forEach(id=>$(id).addEventListener('input',e=>{
    const a=selected(); if(!a) return;
    a[map[id]] = id==='currentMeter' ? Number(e.target.value) : e.target.value;
    save(); render();
  }));
}
function completeItem(itemId){
  const a=selected(); const item=a.items.find(i=>i.id===itemId); if(!item) return;
  item.lastMeter = Number(a.currentMeter); item.lastDate=today(); save(); render(); notify(`✅ 已更新：${a.name} - ${item.name}`, `目前 ${a.currentMeter} ${a.unit}`);
}
function deleteItem(itemId){
  if(!confirm('確定刪除此保養項目？')) return;
  const a=selected(); a.items=a.items.filter(i=>i.id!==itemId); save(); render();
}
function notify(title, body){
  if(!('Notification' in window)) return;
  if(Notification.permission==='granted') new Notification(title,{body, icon:'icon-192.png'});
}
function checkDueAndNotify(){
  const due=[];
  assets.forEach(a=>a.items.forEach(i=>{ const s=statusOf(a,i); if(s.level!=='ok') due.push({a,i,s}); }));
  const key = due.map(x=>`${x.a.id}:${x.i.id}:${x.s.label}`).join('|');
  if(due.length && key!==lastNotifyKey){
    lastNotifyKey=key;
    const top=due[0];
    notify(`🔔 ${due.length}項資產需注意`, `${top.a.name} - ${top.i.name}：${top.s.label}`);
  }
}
function escapeHtml(str){ return String(str??'').replace(/[&<>"]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }

$('enableNotifyBtn').onclick=async()=>{ if('Notification'in window){ const p=await Notification.requestPermission(); alert(p==='granted'?'已啟用通知':'通知未啟用，請到瀏覽器/手機設定允許通知'); }};
$('testNotifyBtn').onclick=()=>notify('🔔 測試通知','車站資產提醒功能正常');
$('addAssetBtn').onclick=()=>$('assetDialog').showModal();
$('saveAssetBtn').onclick=(e)=>{ e.preventDefault(); const name=$('newAssetName').value.trim(); if(!name) return; const a={id:uid(),station:'',assetNo:$('newAssetNo').value||`ASSET-${Date.now()}`,name,category:$('newAssetCategory').value||'一般設備',location:'',responsible:'',currentMeter:0,unit:'km/hr/次',notes:'',items:[]}; assets.push(a); selectedId=a.id; save(); $('assetDialog').close(); $('newAssetName').value=''; render(); };
$('addItemBtn').onclick=()=>$('itemDialog').showModal();
$('saveItemBtn').onclick=(e)=>{ e.preventDefault(); const a=selected(); if(!a) return; const name=$('newItemName').value.trim(); if(!name) return; a.items.push({id:uid(),name,cycleMeter:Number($('newCycleMeter').value)||0,cycleDays:Number($('newCycleDays').value)||30,lastMeter:Number($('newLastMeter').value)||0,lastDate:today(),cost:Number($('newCost').value)||0}); save(); $('itemDialog').close(); $('newItemName').value=''; render(); };
$('deleteAssetBtn').onclick=()=>{ if(confirm('確定刪除此資產？')){ assets=assets.filter(a=>a.id!==selectedId); selectedId=assets[0]?.id||null; save(); render(); }};
$('exportBtn').onclick=()=>{
  const rows=[["車站","資產編號","資產名稱","類別","位置","負責人","目前數值","單位","項目","上次數值","上次日期","週期數值","週期天數","狀態"]];
  assets.forEach(a=>a.items.forEach(i=>{const s=statusOf(a,i); rows.push([a.station,a.assetNo,a.name,a.category,a.location,a.responsible,a.currentMeter,a.unit,i.name,i.lastMeter,i.lastDate,i.cycleMeter,i.cycleDays,s.label]);}));
  const csv='\ufeff'+rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})); const a=document.createElement('a'); a.href=url; a.download='車站資產保養清冊.csv'; a.click(); URL.revokeObjectURL(url);
};
$('importFile').onchange=(e)=>alert('匯入功能預留：建議先用匯出CSV備份；若要我可再幫你做完整CSV匯入解析。');

window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); deferredPrompt=e; $('installBtn').classList.remove('hidden'); });
$('installBtn').onclick=async()=>{ if(deferredPrompt){ deferredPrompt.prompt(); deferredPrompt=null; $('installBtn').classList.add('hidden'); }};

if('serviceWorker' in navigator){ navigator.serviceWorker.register('./service-worker.js'); }
load(); bindFields(); render(); setInterval(checkDueAndNotify,60000); setTimeout(checkDueAndNotify,3000);
