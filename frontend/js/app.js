let u=null,$=x=>document.getElementById(x),refreshTimer=null,activeMap=null,currentDetailId=null;

function esc(s){if(s===null||s===undefined)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}

async function api(url,opt){let r=await fetch(url,opt),d=await r.json();if(!r.ok)throw Error(d.error||"Request failed");return d}
function relativeTime(v){
  if(!v) return '';
  const date = new Date(v);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if(diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if(diffMin < 60) return `${diffMin} min${diffMin>1?'s':''} ago`;
  const diffHours = Math.floor(diffMin / 60);
  if(diffHours < 24) return `${diffHours} hr${diffHours>1?'s':''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if(diffDays === 1) return 'Yesterday';
  if(diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} month${diffMonths>1?'s':''} ago`;
}

function fmtDate(v){
  if(!v) return '—';
  const d = new Date(v);
  const formatted = d.toLocaleString([],{dateStyle:'medium',timeStyle:'short'});
  const rel = relativeTime(v);
  return rel ? `${rel} (${formatted})` : formatted;
}
function prettyStatus(s){return s}

function toast(msg, type='info'){
  let c=$('toast-container');
  if(!c){
    c=document.createElement('div');
    c.id='toast-container';
    document.body.appendChild(c);
  }
  const t=document.createElement('div');
  t.className=`toast ${type}`;
  
  const svgSuccess = `<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
  const svgError   = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
  const svgInfo    = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
  
  const icon = type === 'success' ? svgSuccess : type === 'error' ? svgError : svgInfo;
  
  t.innerHTML=`<div class="toast-icon">${icon}</div><div class="toast-msg">${esc(msg)}</div><div class="toast-progress"></div>`;
  c.appendChild(t);
  
  setTimeout(()=>{
    t.classList.add('toast-out');
    setTimeout(()=>t.remove(), 350);
  }, 3500);
}

// ── Auth ──────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = $("togglePwd");
  if (toggleBtn) {
    toggleBtn.onclick = () => {
      const p = $("password");
      const eye = $("eyeIcon");
      if (p.type === "password") {
        p.type = "text";
        eye.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`;
      } else {
        p.type = "password";
        eye.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
      }
    };
  }
});

$("loginForm").onsubmit=async e=>{e.preventDefault();try{u=await api("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:$("email").value,password:$("password").value})});localStorage.user=JSON.stringify(u);init()}catch(e){toast(e.message,'error')}};
$("logout").onclick=()=>{localStorage.removeItem("user");clearInterval(refreshTimer);destroyMap();location.reload()};
$("refresh").onclick=()=>render(currentView||"dashboard");
let currentView="dashboard";
function renderNav(){
  const nav=$("nav");
  if(u.role === "retailer"){
    nav.innerHTML=`
      <button data-v="dashboard" class="navactive">⌂ <span>Dashboard</span></button>
      <button data-v="deliveries">▣ <span>My Deliveries</span></button>
      <button data-v="create">＋ <span>New Delivery</span></button>`;
  } else if(u.role === "dispatcher"){
    nav.innerHTML=`
      <button data-v="dashboard" class="navactive">⌂ <span>Dashboard</span></button>
      <button data-v="deliveries">▣ <span>All Deliveries</span></button>
      <button data-v="map">🗺 <span>Live Map</span></button>
      <button data-v="riders">♙ <span>Rider Directory</span></button>`;
  } else if(u.role === "rider"){
    nav.innerHTML=`
      <button data-v="dashboard" class="navactive">⌂ <span>Dashboard</span></button>
      <button data-v="deliveries">▣ <span>My Jobs</span></button>`;
  }
  
  nav.querySelectorAll("button").forEach(b=>b.onclick=()=>{
    nav.querySelectorAll("button").forEach(x=>x.classList.remove("navactive"));
    b.classList.add("navactive");
    render(b.dataset.v);
  });
}

function init(){
  if(!u)return;
  localStorage.user=JSON.stringify(u);
  $("login").classList.add("hidden");
  $("app").classList.remove("hidden");
  $("nav").classList.remove("hidden");
  $("logout").classList.remove("hidden");
  $("user").classList.remove("hidden");
  $("user").innerHTML=`<b>${esc(u.name)}</b><small>${esc(roleLabel(u.role))}</small>`;
  $("role").textContent=roleLabel(u.role).toUpperCase();
  renderNav();
  render("dashboard");
  clearInterval(refreshTimer);
  refreshTimer=setInterval(()=>{
    if(!document.hidden && currentView!=="map" && currentView!=="create"){
      if(currentView==="details" && currentDetailId){
        details(currentDetailId, true);
      } else {
        render(currentView, true);
      }
    }
  },5000);
}

function roleLabel(r){return r==="retailer"?"Business Owner":r==="dispatcher"?"Dispatcher":"Rider"}
async function get(){return api(`/api/deliveries?role=${encodeURIComponent(u.role)}&userId=${encodeURIComponent(u.id)}`)}
function badge(s, payStatus){
  let b = `<span class="badge ${s.replaceAll(' ','-')}">${esc(prettyStatus(s))}</span>`;
  if (payStatus === 'PAID') {
    b += ` <span class="badge" style="background:#ecfdf3;color:#087443;border:1px solid #a9efc5">PAID</span>`;
  } else {
    b += ` <span class="badge" style="background:#fef3f2;color:#b42318;border:1px solid #fda29b">UNPAID</span>`;
  }
  return b;
}

// ── Map helpers ──────────────────────────────────────────────────────────
function destroyMap(){if(activeMap){activeMap.remove();activeMap=null}}

async function geocode(address){
  if(!address) return null;
  const clean = address.replace(/,\s*Kenya/gi, '').trim();
  try{
    // Try 1: Exact full address
    const r=await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(clean+", Kenya")}&limit=1`,{headers:{'Accept-Language':'en'}});
    const d=await r.json();
    if(d.length)return{lat:parseFloat(d[0].lat),lng:parseFloat(d[0].lon),display:d[0].display_name};

    // Try 2: Broader area/suburb fallback if specific house or landmark was not found
    const parts = clean.split(',').map(s=>s.trim()).filter(Boolean);
    if(parts.length > 1){
      const broader = parts.slice(-2).join(', ');
      const r2=await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(broader+", Kenya")}&limit=1`,{headers:{'Accept-Language':'en'}});
      const d2=await r2.json();
      if(d2.length)return{lat:parseFloat(d2[0].lat),lng:parseFloat(d2[0].lon),display:d2[0].display_name};
    }
  }catch(e){}
  // Default fallback center (Nairobi central) if location text is completely unknown
  return {lat:-1.286389, lng:36.817223, display: address + " (Approximate area)"};
}

function statusColor(s){
  return{Open:'#a15c00',Assigned:'#5b3b9b','Picked Up':'#633d7a','Out for Delivery':'#245b91',Delivered:'#087443',Failed:'#a51d2d',Cancelled:'#a51d2d'}[s]||'#7a1f3d';
}

// ── Live Map view (dispatcher) ───────────────────────────────────────────
async function mapView(){
  destroyMap();
  $("title").textContent="Live Delivery Map";
  $("content").innerHTML=`
    <div class="panel" style="padding:14px">
      <p class="helper" style="margin:0 0 10px">📍 Showing all active deliveries on the map. Geocoding addresses via OpenStreetMap — free &amp; no API key needed.</p>
      <div id="mainMap" style="height:520px;border-radius:10px;overflow:hidden;border:1px solid #e7e2e4"></div>
      <div id="mapLegend" class="map-legend"></div>
    </div>`;

  activeMap=L.map("mainMap").setView([-1.286389,36.817223],10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
    attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',maxZoom:19
  }).addTo(activeMap);

  const deliveries=await get();
  const active=deliveries.filter(d=>!["Delivered","Cancelled","Failed"].includes(d.status));
  const legend=$("mapLegend");

  if(!active.length){
    legend.innerHTML=`<p class="helper" style="text-align:center;padding:14px">No active deliveries to show on the map.</p>`;
    return;
  }

  legend.innerHTML=`<p class="helper" style="margin:10px 0 6px"><b>Geocoding ${active.length} deliveries…</b></p>`;
  const bounds=[];
  let done=0;

  for(const d of active){
    const geo=await geocode(d.address);
    done++;
    legend.innerHTML=`<p class="helper" style="margin:10px 0 6px">Locating ${done}/${active.length} addresses…</p>`;
    if(!geo)continue;
    bounds.push([geo.lat,geo.lng]);
    const color=statusColor(d.status);
    const marker=L.circleMarker([geo.lat,geo.lng],{radius:10,fillColor:color,color:'#fff',weight:2,opacity:1,fillOpacity:0.9}).addTo(activeMap);
    marker.bindPopup(`
      <div style="min-width:200px">
        <b>${esc(d.id)}</b> ${badge(d.status)}<br>
        <small><b>Customer:</b> ${esc(d.customerName)}</small><br>
        <small><b>Item:</b> ${esc(d.item)}</small><br>
        <small><b>Rider:</b> ${esc(d.riderName||"Unassigned")}</small><br>
        <small><b>Address:</b> ${esc(d.address)}</small>
      </div>`);
  }

  if(bounds.length)activeMap.fitBounds(bounds,{padding:[40,40]});
  legend.innerHTML=`<div style="display:flex;gap:12px;flex-wrap:wrap;padding:10px 0;font-size:12px">
    ${Object.entries({Open:'#a15c00',Assigned:'#5b3b9b',"Out for Delivery":'#245b91'}).map(([s,c])=>
      `<span style="display:flex;align-items:center;gap:5px"><span style="width:12px;height:12px;border-radius:50%;background:${c};display:inline-block"></span>${s}</span>`
    ).join("")}
  </div>`;
}

// ── Jumia-Style Order Tracker Stepper Helper ─────────────────────────────
function renderJumiaTracker(d){
  const stages = [
    { key: 'Open', label: 'Order Placed', desc: 'Delivery requested & registered in system', icon: `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>` },
    { key: 'Assigned', label: 'Rider Assigned', desc: 'Rider accepted & confirmed order', icon: `<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>` },
    { key: 'Picked Up', label: 'Package Picked Up', desc: 'Collected from vendor & in transit', icon: `<svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>` },
    { key: 'Out for Delivery', label: 'Out for Delivery', desc: 'Rider en-route to customer address', icon: `<svg viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>` },
    { key: 'Delivered', label: 'Package Delivered', desc: 'Handed over successfully to customer', icon: `<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>` }
  ];

  const stageOrder = { 'Open': 0, 'Assigned': 1, 'Picked Up': 2, 'Out for Delivery': 3, 'Delivered': 4 };
  const isFailed = d.status === 'Failed' || d.status === 'Cancelled';
  const curIdx = stageOrder[d.status] !== undefined ? stageOrder[d.status] : (d.status === 'Delivered' ? 4 : 0);
  const pct = isFailed ? 100 : Math.round(((curIdx + 1) / stages.length) * 100);

  let estText = '';
  if (d.status === 'Delivered') estText = `Delivered`;
  else if (d.status === 'Out for Delivery') estText = `Expected Today within 1–2 hours`;
  else if (d.status === 'Picked Up' || d.status === 'Assigned') estText = `Expected Today by 5:00 PM`;
  else if (d.status === 'Open') estText = `Expected within 24–48 hours`;
  else estText = `Status: ${d.status}`;

  const historyMap = {};
  (d.history || []).forEach(h => {
    historyMap[h.status] = h;
  });

  const clockIcon = `<svg style="width:13px;height:13px;display:inline-block;vertical-align:-1px;margin-right:4px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

  const stepsHtml = stages.map((st, idx) => {
    let stateClass = '';
    let badgeContent = '';
    const histEntry = historyMap[st.key];

    if (isFailed) {
      stateClass = 'completed';
      badgeContent = `<svg viewBox="0 0 24 24" class="svg-check"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (idx < curIdx) {
      stateClass = 'completed';
      badgeContent = `<svg viewBox="0 0 24 24" class="svg-check"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (idx === curIdx) {
      stateClass = 'active';
      badgeContent = `<div class="active-pulse"></div>${st.icon}`;
    } else {
      stateClass = 'pending';
      badgeContent = `<span class="step-num">${idx + 1}</span>`;
    }

    const timeStr = histEntry ? fmtDate(histEntry.at) : (idx <= curIdx ? fmtDate(d.updatedAt) : 'Pending milestone');
    const noteStr = histEntry?.note || st.desc;

    return `
      <div class="jumia-step ${stateClass}">
        <div class="step-left">
          <div class="step-icon-box">${badgeContent}</div>
          ${idx < stages.length - 1 ? `<div class="step-line"></div>` : ''}
        </div>
        <div class="step-content">
          <div class="step-header">
            <h4 class="step-title">${esc(st.label)}</h4>
            ${stateClass === 'active' ? `<span class="current-badge">CURRENT STAGE</span>` : ''}
          </div>
          <p class="step-desc">${esc(noteStr)}</p>
          <div class="step-time">${clockIcon}${esc(timeStr)}</div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="jumia-tracker">
      <div class="tracker-header">
        <div class="tracker-header-info">
          <span class="est-tag">DELIVERY PROGRESS & MILESTONES</span>
          <h3 class="est-title">${esc(estText)}</h3>
          <p class="est-sub">Order status tracking pipeline for ${esc(d.id)}</p>
        </div>
        <div class="tracker-pct-ring">
          <div class="pct-val">${pct}%</div>
          <small>Completed</small>
        </div>
      </div>

      <div class="tracker-bar-bg">
        <div class="tracker-bar-fill" style="width: ${pct}%"></div>
      </div>

      <div class="jumia-stepper">
        ${stepsHtml}
      </div>
    </div>
  `;
}

// ── Delivery detail with mini-map ────────────────────────────────────────
async function details(id, silent=false){
  try{
    currentDetailId = id;
    if(silent){
      const d = await api(`/api/deliveries/${id}`);
      const trackerEl = document.querySelector('.jumia-tracker');
      if (trackerEl) {
        trackerEl.outerHTML = renderJumiaTracker(d);
      }
      return;
    }
    currentView="details";
    destroyMap();
    const d=await api(`/api/deliveries/${id}`);
    $("title").textContent="Delivery details";
    $("content").innerHTML=`
      <div class="panel">
        <button class="back" onclick="render('deliveries')">← Back to deliveries</button>
        <h2>${esc(d.id)}</h2>
        <div class="detail-grid">
          <div class="detail"><small>Customer</small><b>${esc(d.customerName)}</b><br>${esc(d.customerPhone)}</div>
          <div class="detail"><small>Rider</small><b>${esc(d.riderName||"Waiting for a rider")}</b></div>
          <div class="detail"><small>Package</small><b>${esc(d.item)}</b></div>
          <div class="detail"><small>Current status</small>${badge(d.status)}</div>
          <div class="detail"><small>Created</small><b>${fmtDate(d.createdAt)}</b></div>
          <div class="detail"><small>Est. Delivery Window</small><b style="color:var(--burgundy)">Same Day / 1-2 Days</b></div>
          <div class="detail wide"><small>Delivery address</small><b>${esc(d.address)}</b></div>
        </div>

        <h2 style="margin-top:20px">Drop-off Location</h2>
        <div id="miniMap" style="height:300px;border-radius:10px;overflow:hidden;border:1px solid #e7e2e4;margin-bottom:6px">
          <div style="display:grid;place-items:center;height:100%;color:#667085;font-size:13px">Locating address on map…</div>
        </div>
        <p class="helper" id="mapAddr" style="margin:4px 0 18px"></p>

        ${renderJumiaTracker(d)}
        <div class="actions-row">
          ${u.role==="rider"?riderAction(d):""}
          ${(u.role==="retailer"||u.role==="dispatcher")?`<button class="danger" onclick="deleteDelivery('${d.id}')">Delete Delivery</button>`:""}
        </div>
      </div>`;

    // Geocode and render mini-map
    const geo=await geocode(d.address);
    if(geo){
      activeMap=L.map("miniMap").setView([geo.lat,geo.lng],15);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
        attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',maxZoom:19
      }).addTo(activeMap);
      const color=statusColor(d.status);
      L.circleMarker([geo.lat,geo.lng],{radius:14,fillColor:color,color:'#fff',weight:3,fillOpacity:0.95})
        .addTo(activeMap)
        .bindPopup(`<b>${esc(d.address)}</b><br><small>${esc(d.customerName)}</small>`)
        .openPopup();
      $("mapAddr").textContent=geo.display;
    }else{
      $("miniMap").innerHTML=`<div style="display:grid;place-items:center;height:100%;color:#a51d2d;font-size:13px">Could not locate address on map</div>`;
    }
  }catch(e){toast(e.message, 'error')}
}

// ── Table & actions ───────────────────────────────────────────────────────
function table(ds,actions=true){
  if(!ds.length)return `<div class="empty">No deliveries yet.</div>`;
  return `<table class="table"><thead><tr><th>ID</th><th>Customer</th><th>Item</th><th>Rider</th><th>Status & Payment</th><th>Created</th><th>Actions</th></tr></thead><tbody>${ds.map(d=>`<tr><td><b>${esc(d.id)}</b></td><td>${esc(d.customerName)}<br><small>${esc(d.customerPhone)}</small></td><td>${esc(d.item)}</td><td>${esc(d.riderName||"Waiting for rider")}</td><td>${badge(d.status, d.paymentStatus)}</td><td><small>${fmtDate(d.createdAt)}</small></td><td>${actions?act(d):""}</td></tr>`).join("")}</tbody></table>`;
}
function act(d){
  if(u.role==="rider")return riderAction(d);
  let btns = `<button class="secondary" style="font-size:11px;padding:6px 10px" onclick="details('${d.id}')">View</button>`;
  const isPaid = d.paymentStatus === 'PAID';

  if(u.role==="retailer") {
    if(!isPaid) {
      btns = `<button class="secondary" style="font-size:11px;padding:6px 10px;background:#087443;color:#fff;border:none" onclick="payMpesaModal('${d.id}','${esc(d.customerPhone||"")}')">Pay M-Pesa</button> ` + btns;
    }
    if (d.status === "Pending Confirmation") {
      btns = `<button class="primary" style="font-size:11px;padding:6px 10px;background:#087443;border-color:#087443" onclick="confirmDelivery('${d.id}')">Confirm Receipt</button> ` + btns;
    }
  }

  if(u.role==="dispatcher") {
    if(d.status === "Claimed"){
      if (isPaid) {
        btns = `<button class="primary" style="font-size:11px;padding:6px 10px;background:#087443;border-color:#087443" onclick="approveClaim('${d.id}','${d.riderId}')">Approve Claim</button> ` +
               `<button class="secondary" style="font-size:11px;padding:6px 10px" onclick="assign('${d.id}')">Reassign</button> ` + btns;
      } else {
        btns = `<button class="secondary" style="font-size:11px;padding:6px 10px;opacity:0.6;cursor:not-allowed;background:#fee4e2;color:#b42318;border:1px solid #fda29b" onclick="toast('Cannot approve: Business owner has not paid Ksh 2 fee yet','error')">Claim (Unpaid)</button> ` + btns;
      }
    } else if(d.status === "Open"){
      if (isPaid) {
        btns = `<button class="primary" style="font-size:11px;padding:6px 10px" onclick="assign('${d.id}')">Assign</button> ` + btns;
      } else {
        btns = `<button class="secondary" style="font-size:11px;padding:6px 10px;opacity:0.6;cursor:not-allowed;background:#fee4e2;color:#b42318;border:1px solid #fda29b" onclick="toast('Cannot assign rider: Business owner has not paid Ksh 2 fee yet','error')">Assign (Unpaid)</button> ` + btns;
      }
    } else if(d.status === "Assigned"){
      btns = `<button class="secondary" style="font-size:11px;padding:6px 10px" onclick="assign('${d.id}')">Reassign</button> ` + btns;
    }
    btns += ` <button class="secondary" style="font-size:11px;padding:6px 10px" onclick="notifyOwnerModal('${d.id}','${esc(d.retailerEmail||"")}')">Notify Owner</button>`;
  }

  if(u.role==="retailer"||u.role==="dispatcher") {
    btns += ` <button class="danger" style="font-size:11px;padding:6px 10px" onclick="deleteDelivery('${d.id}')">Delete</button>`;
  }
  return btns;
}
function deleteDelivery(id){
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-card">
      <div class="success-icon-badge" style="background:#fdeaea;color:#a51d2d">
        <svg viewBox="0 0 24 24" style="stroke:#a51d2d"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
      </div>
      <div class="order-id-tag" style="background:#a51d2d">${esc(id)}</div>
      <h2>Delete Delivery?</h2>
      <p>Are you sure you want to permanently delete order <b>${esc(id)}</b>? This action cannot be undone.</p>
      <div class="modal-actions">
        <button class="secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="danger" id="confirmDeleteBtn">Delete Order</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('#confirmDeleteBtn').onclick = async () => {
    modal.remove();
    try {
      await api(`/api/deliveries/${id}`, { method: 'DELETE' });
      toast(`Delivery ${id} deleted successfully`, 'success');
      render(currentView === 'details' ? 'deliveries' : currentView);
    } catch(e) {
      toast(e.message, 'error');
    }
  };
}
function riderAction(d){
  if(d.status==="Open")return `<button class="primary" onclick="claim('${d.id}')">Claim job</button>`;
  if(d.riderId!==u.id)return "";
  if(d.status==="Claimed")return `<span style="font-size:12px;font-weight:600;color:#a15c00;padding:4px 8px;background:#fef6e7;border-radius:4px">Claim Pending Approval</span>`;
  if(d.status==="Assigned")return `<button class="primary" onclick="status('${d.id}','Picked Up')">Package picked up</button>`;
  if(d.status==="Picked Up")return `<button class="primary" onclick="status('${d.id}','Out for Delivery')">Start delivery</button>`;
  if(d.status==="Out for Delivery")return `<button class="primary" onclick="status('${d.id}','Pending Confirmation')">Mark Delivered</button>`;
  if(d.status==="Pending Confirmation")return `<span style="font-size:12px;font-weight:600;color:#027a48;padding:4px 8px;background:#ecfdf3;border-radius:4px">Waiting for Business Owner Confirmation</span>`;
  return "";
}

// ── Views ─────────────────────────────────────────────────────────────────
async function render(v,silent=false){
  if(v==="create" && u.role!=="retailer"){if(!silent)toast("Access denied: Business Owners only",'error');return;}
  if((v==="map"||v==="riders") && u.role!=="dispatcher"){if(!silent)toast("Access denied: Dispatchers only",'error');return;}
  if(v!=="map"&&v!==currentView)destroyMap();
  currentView=v;
  try{
    if(v==="dashboard")await dashboard(silent);
    if(v==="deliveries")await list(silent);
    if(v==="create")create();
    if(v==="riders")await riders();
    if(v==="map")await mapView();
  }catch(e){if(!silent)toast(e.message, 'error')}
}

async function dashboard(){
  let d=await get();
  $("title").textContent="Dashboard";
  if(u.role==="rider")return riderDashboard(d);

  let c={Open:0,Assigned:0,"Picked Up":0,"Out for Delivery":0,"Pending Confirmation":0,Delivered:0};
  d.forEach(x=>{if(c[x.status]!==undefined)c[x.status]++});

  const pendingConfirm = d.filter(x => x.status === "Pending Confirmation");
  if(u.role === "retailer" && pendingConfirm.length > 0) {
    toast(`Action Required: ${pendingConfirm.length} delivery is awaiting your receipt confirmation!`, 'info');
  }

  $("content").innerHTML=`
    ${u.role === "retailer" && pendingConfirm.length ? `
      <div class="panel" style="border: 2px solid #087443; background: #edfcf2; margin-bottom: 16px">
        <h2 style="color: #087443; display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px">
          <span>Receipt Confirmation Required (${pendingConfirm.length})</span>
          <span style="font-size: 11px; font-weight: 600; padding: 4px 8px; background: #087443; color: #fff; border-radius: 4px">Action Required</span>
        </h2>
        <p class="helper" style="color: #087443">Riders have marked these package(s) as delivered. Please confirm receipt below once verified.</p>
        ${table(pendingConfirm)}
      </div>
    ` : ''}
    <div class="cards">
      <div class="card"><div class="label">Open</div><div class="metric">${c.Open}</div></div>
      <div class="card"><div class="label">On the way</div><div class="metric">${c["Out for Delivery"]+c["Picked Up"]+c["Pending Confirmation"]}</div></div>
      <div class="card"><div class="label">Delivered</div><div class="metric">${c.Delivered}</div></div>
    </div>
    <div class="panel"><h2>My deliveries</h2>
    <p class="helper">You can see where each order is. The rider updates the delivery as they pick it up and take it to the customer.</p>
    ${table(d)}</div>`;
}

async function riderDashboard(d){
  const claimed = d.filter(x => x.riderId === u.id && x.status === "Claimed");
  const assigned = d.filter(x => x.riderId === u.id && x.status === "Assigned");
  const inProgress = d.filter(x => x.riderId === u.id && ["Picked Up", "Out for Delivery"].includes(x.status));
  const completed = d.filter(x => x.riderId === u.id && x.status === "Delivered");
  const open = d.filter(x => x.status === "Open");

  // Load earnings
  let earningsHtml = '';
  try {
    const earnings = await api(`/api/earnings/${u.id}`);
    const totalKsh = Number(earnings.total || 0).toFixed(2);
    earningsHtml = `
      <div class="panel" style="border-left: 4px solid #087443">
        <h2 style="color:#087443">My Earnings</h2>
        <p class="helper">Payments received for completed deliveries via Mpesa.</p>
        <div style="font-size:28px;font-weight:800;color:#087443;margin:8px 0">Ksh ${totalKsh}</div>
        ${earnings.payments.length ? `
          <table class="table"><thead><tr><th>Order</th><th>Amount</th><th>Mpesa Ref</th><th>Date</th></tr></thead><tbody>
          ${earnings.payments.map(p=>`<tr>
            <td><b>${esc(p.deliveryId)}</b></td>
            <td>Ksh ${Number(p.amount).toFixed(2)}</td>
            <td><small>${esc(p.mpesaRef||'—')}</small></td>
            <td><small>${esc(p.paidAt||'—')}</small></td>
          </tr>`).join('')}
          </tbody></table>
        ` : '<div class="empty">No payments received yet.</div>'}
      </div>
    `;
  } catch(e) { earningsHtml = ''; }

  $('content').innerHTML = `
    ${earningsHtml}

    ${claimed.length ? `
      <div class="panel" style="border: 2px solid #a15c00; background: #fffcf5">
        <h2 style="color: #a15c00; display: flex; align-items: center; justify-content: space-between">
          <span>Claimed Jobs Pending Approval (${claimed.length})</span>
          <span style="font-size: 11px; font-weight: 600; padding: 4px 8px; background: #a15c00; color: #fff; border-radius: 4px">Awaiting Dispatcher</span>
        </h2>
        <p class="helper">You claimed these orders. The dispatcher must approve your claim before you pick them up.</p>
        ${table(claimed)}
      </div>
    ` : ''}

    ${assigned.length ? `
      <div class="panel" style="border: 2px solid var(--burgundy); background: #fdf6f8">
        <h2 style="color: var(--burgundy); display: flex; align-items: center; justify-content: space-between">
          <span>Assigned to You (${assigned.length})</span>
          <span style="font-size: 11px; font-weight: 600; padding: 4px 8px; background: var(--burgundy); color: #fff; border-radius: 4px">Ready for Pick up</span>
        </h2>
        <p class="helper">These orders were assigned to you by the dispatcher. Pick up the package when ready.</p>
        ${table(assigned)}
      </div>
    ` : ''}

    ${inProgress.length ? `
      <div class="panel">
        <h2>In-Progress Deliveries (${inProgress.length})</h2>
        ${table(inProgress)}
      </div>
    ` : ''}

    <div class="panel">
      <h2>Available Unclaimed Deliveries (${open.length})</h2>
      <p class="helper">Unclaimed delivery requests created by business owners available to claim.</p>
      ${open.length ? open.map(jobCard).join("") : "<div class='empty'>No unclaimed deliveries right now.</div>"}
    </div>

    ${completed.length ? `
      <div class="panel">
        <h2>Completed Deliveries (${completed.length})</h2>
        ${table(completed)}
      </div>
    ` : ''}
  `;
}


function jobCard(d){
  return `<div class="job-card"><div class="job-top"><div>
    <div class="job-title">${esc(d.id)} · ${esc(d.item)}</div>
    <div class="job-meta"><b>Customer:</b> ${esc(d.customerName)}<br><b>Phone:</b> ${esc(d.customerPhone)}<br><b>Deliver to:</b> ${esc(d.address)}</div>
  </div>${badge(d.status)}</div>
  <div class="job-actions">
    <button class="primary" onclick="claim('${d.id}')">Claim Job</button>
    <button class="secondary" onclick="details('${d.id}')">View + Map</button>
  </div></div>`;
}

async function list(){
  let d=await get();
  $("title").textContent=u.role==="rider"?"My Jobs":"Deliveries";
  if(u.role==="rider"){
    let myJobs = d.filter(x=>x.riderId===u.id);
    $("content").innerHTML=`
      <div class="panel">
        <h2>My Assigned & Claimed Jobs</h2>
        <p class="helper">Deliveries assigned to you by a dispatcher or claimed by you.</p>
        ${myJobs.length ? table(myJobs) : "<div class='empty'>You do not have any assigned or claimed jobs yet.</div>"}
      </div>`;
    return;
  }
  $("content").innerHTML=`<div class="panel"><h2>Delivery list</h2>${table(d)}</div>`;
}

let createMapInstance=null,geocodeTimer=null,acTimer=null;

function create(){
  destroyMap();
  $("title").textContent="New Delivery";
  $("content").innerHTML=`
  <div class="panel form">
    <h2>Create a delivery</h2>
    <p class="helper">Enter the customer's details. Once you create it, riders will see the order as <b>Open</b> and can accept it.</p>
    <form id="f" class="grid">
      <label>Customer name<input id="cf_name" name="customerName" placeholder="e.g. Mary Wanjiku" required></label>
      <label>Phone<input id="cf_phone" name="customerPhone" placeholder="e.g. 0712345678" required></label>

      <div class="wide ac-wrap" style="position:relative">
        <label style="display:grid;gap:6px;font-size:13px;font-weight:700">Suburb, City *
          <input id="cf_suburb_city" autocomplete="off" placeholder="e.g. Westlands, Nairobi" required style="padding:12px;border:1px solid #d3cdd0;border-radius:8px;font:inherit">
        </label>
        <ul id="ac_list" style="display:none;position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #d3cdd0;border-radius:8px;margin:2px 0 0;padding:4px 0;z-index:9999;box-shadow:0 8px 24px #0002;list-style:none;max-height:220px;overflow-y:auto"></ul>
      </div>

      <div class="wide">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <small style="font-weight:700;color:#667085">📍 Map Location — click to pin exact spot</small>
          <small id="mapStatus" style="color:#667085">Search suburb above or click map</small>
        </div>
        <div id="createMap" style="height:280px;border-radius:10px;overflow:hidden;border:1px solid #e7e2e4;cursor:crosshair"></div>
      </div>

      <div class="wide ac-wrap" style="position:relative">
        <label style="display:grid;gap:6px;font-size:13px;font-weight:700">Street Address
          <input id="cf_street" name="street" autocomplete="off" placeholder="e.g. Moi Avenue or click map" required style="padding:12px;border:1px solid #d3cdd0;border-radius:8px;font:inherit">
        </label>
        <ul id="ac_street_list" style="display:none;position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #d3cdd0;border-radius:8px;margin:2px 0 0;padding:4px 0;z-index:9999;box-shadow:0 8px 24px #0002;list-style:none;max-height:200px;overflow-y:auto"></ul>
      </div>

      <label class="wide">Package / item<input id="cf_item" name="item" placeholder="What is being delivered?" required></label>

      <input type="hidden" id="cf_address" name="address">

      <div class="wide actions">
        <button class="primary" type="submit">Create delivery</button>
      </div>
    </form>
  </div>`;

  // ── Map init ──────────────────────────────────────────────────────────
  createMapInstance = L.map("createMap").setView([-1.286389, 36.817223], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
    attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',maxZoom:19
  }).addTo(createMapInstance);

  let pinMarker = null;

  function dropPin(lat,lng,label){
    if(pinMarker) pinMarker.remove();
    pinMarker = L.circleMarker([lat,lng],{radius:13,fillColor:"#7a1f3d",color:"#fff",weight:3,fillOpacity:0.95})
      .addTo(createMapInstance).bindPopup(`<b>${label}</b>`).openPopup();
  }

  // GPS: fly to user location on open
  if(navigator.geolocation){
    $("mapStatus").textContent="📡 Getting your location…";
    navigator.geolocation.getCurrentPosition(
      pos=>{createMapInstance.flyTo([pos.coords.latitude,pos.coords.longitude],14,{duration:1});$("mapStatus").textContent="Search suburb above or click map";},
      ()=>{$("mapStatus").textContent="Search suburb above or click map";},
      {timeout:6000,maximumAge:30000}
    );
  }

  // Map click → reverse geocode → fill Street Address
  createMapInstance.on("click", async e=>{
    const {lat,lng}=e.latlng;
    $("mapStatus").textContent="📍 Locating…";
    try{
      const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,{headers:{'Accept-Language':'en'}});
      const d=await r.json();
      const a=d.address||{};
      const street=[a.house_number,a.road||a.street].filter(Boolean).join(" ") || d.display_name.split(",")[0];
      const subCity=[a.suburb||a.neighbourhood||a.quarter,a.city||a.town||a.village].filter(Boolean).join(", ");
      $("cf_street").value=street;
      if(subCity&&!$("cf_suburb_city").value) $("cf_suburb_city").value=subCity;
      buildAndStoreAddress();
      dropPin(lat,lng,street||"Selected location");
      $("mapStatus").textContent="✅ Location pinned";
      $("mapStatus").style.color="#087443";
    }catch(e){$("mapStatus").textContent="⚠️ Could not reverse geocode";}
  });

  // ── Autocomplete for Suburb/City ──────────────────────────────────────
  const acInput=$("cf_suburb_city"), acList=$("ac_list");
  let selectedAreaGeo = null;

  acInput.addEventListener("input",()=>{
    clearTimeout(acTimer);
    selectedAreaGeo = null;
    const q=acInput.value.trim();
    if(q.length<2){acList.style.display="none";return;}
    acTimer=setTimeout(async()=>{
      try{
        const r=await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q+", Kenya")}&limit=6&addressdetails=1`,{headers:{'Accept-Language':'en'}});
        const results=await r.json();
        if(!results.length){acList.style.display="none";return;}
        acList.innerHTML=results.map((x,i)=>{
          const a=x.address||{};
          const title=[a.suburb||a.neighbourhood||a.quarter||x.display_name.split(",")[0], a.city||a.town||a.county||"Nairobi"].filter(Boolean).join(", ");
          const sub=x.display_name.split(",").slice(2,4).join(",").trim();
          return `
          <li data-i="${i}" style="padding:10px 14px;cursor:pointer;font-size:13px;border-bottom:1px solid #f0edf0">
            <b>${esc(title)}</b><br>
            <small style="color:#667085">${esc(sub||"Kenya")}</small>
          </li>`;
        }).join("");
        acList.style.display="block";

        acList._results=results;
        acList.querySelectorAll("li").forEach(li=>{
          li.onmousedown=e=>{
            e.preventDefault();
            const res=acList._results[+li.dataset.i];
            const a=res.address||{};
            const subCity=[a.suburb||a.neighbourhood||a.quarter||res.display_name.split(",")[0], a.city||a.town||a.county||"Nairobi"].filter(Boolean).join(", ");
            acInput.value=subCity;
            acList.style.display="none";
            
            const lat=parseFloat(res.lat), lng=parseFloat(res.lon);
            selectedAreaGeo = { lat, lng, bbox: res.boundingbox };
            
            createMapInstance.flyTo([lat,lng],15,{duration:1});
            dropPin(lat,lng,acInput.value);
            buildAndStoreAddress();
            $("mapStatus").textContent="✅ Area selected — now type street address below";
            $("mapStatus").style.color="#087443";
          };
          li.onmouseover=()=>li.style.background="#f7eaf0";
          li.onmouseout=()=>li.style.background="";
        });
      }catch(e){}
    },350);
  });

  acInput.addEventListener("blur",()=>setTimeout(()=>acList.style.display="none",200));
  acInput.addEventListener("change",buildAndStoreAddress);

  // ── Street Address autocomplete (tailored to Suburb/City) ─────────────
  const stInput=$("cf_street"), stList=$("ac_street_list");
  let stTimer=null;

  stInput.addEventListener("input",()=>{
    clearTimeout(stTimer);
    buildAndStoreAddress();
    const q=stInput.value.trim();
    if(q.length<2){stList.style.display="none";return;}
    const context=$("cf_suburb_city").value.trim()||"Kenya";
    
    stTimer=setTimeout(async()=>{
      try{
        let url=`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q+", "+context)}&limit=6&addressdetails=1&countrycodes=ke`;
        if(selectedAreaGeo){
          // Geographically restrict or prioritize near selected Suburb/City
          url+=`&lat=${selectedAreaGeo.lat}&lon=${selectedAreaGeo.lng}`;
        }
        const r=await fetch(url,{headers:{'Accept-Language':'en'}});
        const results=await r.json();
        if(!results.length){stList.style.display="none";return;}
        
        stList.innerHTML=results.map((x,i)=>{
          const a=x.address||{};
          const streetName=a.road||a.pedestrian||a.street||a.building||a.amenity||x.display_name.split(",")[0];
          const fullStreet=[a.house_number, streetName].filter(Boolean).join(" ");
          const subLoc=[a.suburb||a.neighbourhood||a.quarter, a.city||a.town].filter(Boolean).join(", ");
          return `<li data-i="${i}" style="padding:10px 14px;cursor:pointer;font-size:13px;border-bottom:1px solid #f0edf0">
            <b>${esc(fullStreet)}</b><br>
            <small style="color:#667085">${esc(subLoc||context)}</small>
          </li>`;
        }).join("");
        stList.style.display="block";
        
        stList._results=results;
        stList.querySelectorAll("li").forEach(li=>{
          li.onmousedown=e=>{
            e.preventDefault();
            const res=stList._results[+li.dataset.i];
            const a=res.address||{};
            const streetName=a.road||a.pedestrian||a.street||a.building||a.amenity||res.display_name.split(",")[0];
            const fullStreet=[a.house_number, streetName].filter(Boolean).join(" ");
            
            stInput.value=fullStreet;
            stList.style.display="none";
            
            const lat=parseFloat(res.lat), lng=parseFloat(res.lon);
            createMapInstance.flyTo([lat,lng],17,{duration:1});
            dropPin(lat,lng,stInput.value);
            buildAndStoreAddress();
            $('mapStatus').textContent="✅ Exact location pinned on map";
            $('mapStatus').style.color="#087443";
          };
          li.onmouseover=()=>li.style.background="#f7eaf0";
          li.onmouseout=()=>li.style.background="";
        });
      }catch(e){}
    },350);
  });
  stInput.addEventListener("blur",()=>setTimeout(()=>stList.style.display="none",200));

  function buildAndStoreAddress(){
    const street=$("cf_street").value.trim();
    const subCity=$("cf_suburb_city").value.trim();
    $("cf_address").value=[street,subCity,"Kenya"].filter(Boolean).join(", ");
  }

  // ── Submit ────────────────────────────────────────────────────────────
  $("f").onsubmit=async e=>{
    e.preventDefault();
    buildAndStoreAddress();
    const addr=$("cf_address").value;
    if(!addr) return toast("Please enter the suburb/city and street address.", 'error');
    const b={
      customerName:  $("cf_name").value.trim(),
      customerPhone: $("cf_phone").value.trim(),
      address:       addr,
      item:          $("cf_item").value.trim(),
      retailerId:    u.id
    };
    try{
      const x=await api("/api/deliveries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)});
      if(createMapInstance){createMapInstance.remove();createMapInstance=null;}
      showSuccessModal(x, b);
    }catch(e){toast(e.message, 'error');}
  };
}

function showSuccessModal(d, b){
  const modal=document.createElement('div');
  modal.className='modal-overlay';
  modal.innerHTML=`
    <div class="modal-card">
      <div class="success-icon-badge">
        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div class="order-id-tag">${esc(d.id)}</div>
      <h2>Delivery Created Successfully!</h2>
      <p>Your order has been registered and broadcasted to available riders.</p>
      
      <div style="background:#ecfdf3;border:1px solid #a9efc5;border-radius:8px;padding:14px 16px;margin:16px 0;text-align:left">
        <div style="font-weight:700;font-size:14px;color:#087443;margin-bottom:4px">
          Rider Fee Payment (Ksh 2.00)
        </div>
        <p style="font-size:12px;margin:0;color:#667085">
          Click the <b>Pay Ksh 2 via M-Pesa</b> button below to enter your phone number and trigger the STK push prompt.
        </p>
      </div>

      <div class="summary-mini-grid">
        <div><small>Customer</small> <strong>${esc(b.customerName)} (${esc(b.customerPhone)})</strong></div>
        <div><small>Package / Item</small> <strong>${esc(b.item)}</strong></div>
        <div><small>Drop-off Location</small> <strong>${esc(b.address)}</strong></div>
      </div>

      <div class="modal-actions" style="flex-direction:column;gap:8px">
        <button type="button" class="primary" style="background:#087443;border-color:#087443;width:100%" onclick="this.closest('.modal-overlay').remove(); payMpesaModal('${esc(d.id)}','${esc(b.customerPhone)}')">
          Pay Ksh 2 via M-Pesa
        </button>
        <div style="display:flex;gap:8px;width:100%">
          <button class="secondary" style="flex:1" onclick="this.closest('.modal-overlay').remove(); create()">+ Add Another</button>
          <button class="secondary" style="flex:1" onclick="this.closest('.modal-overlay').remove(); render('deliveries')">View Deliveries</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function payMpesaModal(deliveryId, phone){
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-card" style="max-width:440px;text-align:center">
      <div class="order-id-tag">${esc(deliveryId)}</div>
      <h2 style="margin-top:4px">M-Pesa Payment Gateway</h2>
      <p style="margin-bottom:16px;color:#667085;font-size:13px">Pay <b>Ksh 2.00</b> delivery fee via Safaricom M-Pesa STK Push.</p>
      <form id="payMpesaForm" style="text-align:left">
        <label style="display:block;margin-bottom:14px;font-size:13px;font-weight:600">M-Pesa Phone Number
          <input id="mp_phone" type="tel" value="${esc(phone||'')}" placeholder="e.g. 0712345678" required style="width:100%;margin-top:6px;padding:10px 12px;font-size:14px;border:1px solid #d0d5dd;border-radius:8px">
        </label>
        <div style="background:#ecfdf3;border:1px solid #a9efc5;border-radius:8px;padding:12px 14px;margin-bottom:18px;font-size:13px;color:#087443">
          <b>Amount:</b> Ksh 2.00 &nbsp;|&nbsp; <b>Ref:</b> ${esc(deliveryId)}
        </div>
        <div class="modal-actions">
          <button type="button" class="secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button type="submit" class="primary" style="background:#087443;border-color:#087443;flex:1">Send M-Pesa Prompt</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#payMpesaForm').onsubmit = async (e) => {
    e.preventDefault();
    const ph = modal.querySelector('#mp_phone').value.trim();
    const card = modal.querySelector('.modal-card');
    
    // Trigger STK Push
    try {
      await api('/api/mpesa/stk-push', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ phone: ph, deliveryId })
      });
    } catch(err) {
      toast(err.message || 'STK Push initialization failed', 'error');
    }

    // Render Modern Gateway Loader
    let timeLeft = 60;
    card.innerHTML = `
      <div style="padding:10px 0">
        <div style="width:64px;height:64px;margin:0 auto 16px;border:4px solid #eaecf0;border-top:4px solid #087443;border-radius:50%;animation:spin 1s linear infinite"></div>
        <div class="order-id-tag">${esc(deliveryId)}</div>
        <h2 style="color:#087443;margin:8px 0 4px">Waiting for M-Pesa PIN...</h2>
        <p style="font-size:13px;color:#667085;margin:0 0 16px">An M-Pesa prompt was sent to <b>${esc(ph)}</b>.<br>Please enter your PIN on your phone to complete payment.</p>

        <div style="background:#f9fafb;border:1px solid #eaecf0;border-radius:8px;padding:12px;margin-bottom:16px;font-size:12px;color:#344054">
          <div style="font-weight:600;margin-bottom:2px">Verifying with Safaricom Callback...</div>
          <div id="mpTimer" style="color:#087443;font-weight:700;font-size:14px">Time remaining: 60s</div>
        </div>

        <button type="button" class="secondary" style="width:100%" onclick="clearInterval(window.mpPollInterval);this.closest('.modal-overlay').remove()">Cancel Gateway</button>
      </div>
      <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
    `;

    // Start Polling Loop
    if (window.mpPollInterval) clearInterval(window.mpPollInterval);
    
    window.mpPollInterval = setInterval(async () => {
      timeLeft -= 2.5;
      const timerEl = card.querySelector('#mpTimer');
      if (timerEl) timerEl.textContent = `Time remaining: ${Math.max(0, Math.ceil(timeLeft))}s`;

      try {
        const st = await api(`/api/mpesa/status/${deliveryId}`);
        if (st.paid) {
          clearInterval(window.mpPollInterval);
          // Show Large Success Screen
          card.innerHTML = `
            <div style="padding:10px 0">
              <div style="width:72px;height:72px;background:#ecfdf3;border:2px solid #a9efc5;border-radius:50%;display:grid;place-items:center;margin:0 auto 16px;color:#087443">
                <svg viewBox="0 0 24 24" style="width:40px;height:40px;stroke:#087443;stroke-width:3;fill:none;stroke-linecap:round;stroke-linejoin:round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div style="font-size:11px;font-weight:800;letter-spacing:1px;color:#087443;text-transform:uppercase;margin-bottom:4px">Verified via Safaricom Daraja</div>
              <h1 style="color:#087443;font-size:26px;font-weight:900;margin:0 0 12px">PAYMENT CONFIRMED!</h1>
              
              <div style="background:#f4fbf7;border:1px solid #a9efc5;border-radius:10px;padding:16px;margin-bottom:20px;text-align:left">
                <div style="font-size:11px;color:#667085;text-transform:uppercase;font-weight:700">PAID BY</div>
                <div style="font-size:22px;font-weight:800;color:#12263f;margin-bottom:10px">${esc(st.payerName || u.name || 'Business Owner')}</div>
                
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;border-top:1px solid #d0f4de;padding-top:10px">
                  <div><small style="color:#667085">M-Pesa Ref:</small><br><b style="font-size:14px;color:#087443">${esc(st.mpesaRef || 'CONFIRMED')}</b></div>
                  <div><small style="color:#667085">Amount Paid:</small><br><b style="font-size:14px;color:#087443">Ksh 2.00</b></div>
                </div>
              </div>

              <button type="button" class="primary" style="background:#087443;border-color:#087443;width:100%;padding:12px;font-size:14px" onclick="this.closest('.modal-overlay').remove(); render(currentView)">
                Done &amp; Refresh Deliveries
              </button>
            </div>
          `;
          render(currentView, true);
        }
      } catch(e) {}

      if (timeLeft <= 0) {
        clearInterval(window.mpPollInterval);
        card.innerHTML = `
          <div style="padding:10px 0">
            <div style="width:64px;height:64px;background:#fff8f0;border:2px solid #ffd88a;border-radius:50%;display:grid;place-items:center;margin:0 auto 16px;color:#a15c00">
              <svg viewBox="0 0 24 24" style="width:36px;height:36px;stroke:#a15c00;stroke-width:2.5;fill:none;stroke-linecap:round;stroke-linejoin:round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h2 style="color:#a15c00;margin:0 0 6px">Payment Pending Confirmation</h2>
            <p style="font-size:13px;color:#667085;margin:0 0 14px">Safaricom callback has not been received yet. Note: In Safaricom Sandbox mode, prompts only display on test number <b>254708374149</b>.</p>
            <div style="display:flex;flex-direction:column;gap:8px">
              <button type="button" class="primary" style="background:#087443;border-color:#087443;width:100%" onclick="this.closest('.modal-overlay').remove(); payMpesaModal('${esc(deliveryId)}','${esc(ph)}')">
                Re-check / Retry M-Pesa
              </button>
              <button type="button" class="secondary" style="width:100%" onclick="this.closest('.modal-overlay').remove()">Close Window</button>
            </div>
          </div>
        `;
      }
    }, 2500);
  };
}


async function riders(){
  let r=await api(`/api/riders?role=${encodeURIComponent(u.role)}`);
  $("title").textContent="Riders";
  $("content").innerHTML=`
    <div class="panel">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h2 style="margin:0">Rider directory</h2>
        ${u.role==="dispatcher"?`<button class="primary" style="font-size:12px;padding:8px 14px" onclick="createRiderModal()">+ Add New Rider</button>`:""}
      </div>
      <p class="helper">Active delivery riders registered in the system. Dispatchers can assign orders or riders can self-accept open jobs.</p>
      <table class="table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th></tr></thead>
      <tbody>${r.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.email)}</td><td>${esc(x.phone||"—")}</td></tr>`).join("")}</tbody></table>
    </div>`;
}

function createRiderModal(){
  const modal=document.createElement('div');
  modal.className='modal-overlay';
  modal.innerHTML=`
    <div class="modal-card" style="max-width:440px">
      <h2>Create Rider Account</h2>
      <p style="margin-bottom:14px;color:#667085;font-size:13px">Add a new rider to the fleet. They can log in immediately with these credentials.</p>
      <form id="newRiderForm" style="text-align:left">
        <label style="display:block;margin-bottom:10px;font-size:13px;font-weight:600">Full Name
          <input id="rf_name" type="text" placeholder="e.g. Samuel Rider" required style="width:100%;margin-top:4px;padding:8px 10px">
        </label>
        <label style="display:block;margin-bottom:10px;font-size:13px;font-weight:600">Email Address
          <input id="rf_email" type="email" placeholder="e.g. samuel@gmail.com" required style="width:100%;margin-top:4px;padding:8px 10px">
        </label>
        <label style="display:block;margin-bottom:10px;font-size:13px;font-weight:600">Password
          <input id="rf_password" type="password" placeholder="••••••••" required style="width:100%;margin-top:4px;padding:8px 10px">
        </label>
        <label style="display:block;margin-bottom:16px;font-size:13px;font-weight:600">Phone Number (Optional)
          <input id="rf_phone" type="tel" placeholder="e.g. 0712345678" style="width:100%;margin-top:4px;padding:8px 10px">
        </label>
        <div class="modal-actions">
          <button type="button" class="secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button type="submit" class="primary">Create Rider Account</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('#newRiderForm').onsubmit = async e => {
    e.preventDefault();
    const name = modal.querySelector('#rf_name').value.trim();
    const email = modal.querySelector('#rf_email').value.trim();
    const password = modal.querySelector('#rf_password').value;
    const phone = modal.querySelector('#rf_phone').value.trim();
    try {
      await api('/api/riders', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ role: u.role, name, email, password, phone })
      });
      modal.remove();
      toast(`Rider account created for ${name}`, 'success');
      riders();
    } catch(err) {
      toast(err.message, 'error');
    }
  };
}

async function claim(id){
  try {
    await api(`/api/deliveries/${id}/accept`, {
      method: "PATCH",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ riderId: u.id })
    });
    toast("Job claimed! Awaiting dispatcher approval.", 'success');
    render(currentView || "dashboard");
  } catch(e) {
    toast(e.message, 'error');
  }
}

async function approveClaim(id, riderId){
  try {
    await api(`/api/deliveries/${id}/assign`, {
      method: "PATCH",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ riderId })
    });
    toast(`Claim approved for delivery ${id}!`, 'success');
    render(currentView || "deliveries");
  } catch(e) {
    toast(e.message, 'error');
  }
}

async function accept(id){return claim(id);}

async function confirmDelivery(id){
  try {
    await api(`/api/deliveries/${id}/status`, {
      method: "PATCH",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ status: "Delivered" })
    });
    toast(`Delivery ${id} confirmed as received!`, 'success');
    render(currentView || "dashboard");
  } catch(e) {
    toast(e.message, 'error');
  }
}

function notifyOwnerModal(id, prefillEmail){
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-card" style="max-width:440px">
      <div class="order-id-tag">${esc(id)}</div>
      <h2>Notify Business Owner</h2>
      <p style="margin-bottom:12px;color:#667085;font-size:13px">Send a branded email notification directly to the business owner's inbox regarding this delivery.</p>
      <form id="notifyOwnerForm" style="text-align:left">
        <label style="display:block;margin-bottom:10px;font-size:13px;font-weight:600">Recipient Email Address
          <input id="no_email" type="email" value="${esc(prefillEmail||'')}" placeholder="e.g. owner@business.com" required style="width:100%;margin-top:4px;padding:8px 10px">
        </label>
        <label style="display:block;margin-bottom:10px;font-size:13px;font-weight:600">Subject
          <input id="no_subject" type="text" value="Reflex Deliveries — Order ${esc(id)} Update" required style="width:100%;margin-top:4px;padding:8px 10px">
        </label>
        <label style="display:block;margin-bottom:16px;font-size:13px;font-weight:600">Message
          <textarea id="no_msg" rows="4" required style="width:100%;margin-top:4px;padding:8px 10px;font-family:inherit">Reflex Deliveries Notice: Order ${esc(id)} has been updated. Please log into your Reflex dashboard to confirm receipt.</textarea>
        </label>
        <div class="modal-actions">
          <button type="button" class="secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button type="submit" class="primary">Send Email Notification</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('#notifyOwnerForm').onsubmit = async (e) => {
    e.preventDefault();
    const toEmail  = modal.querySelector('#no_email').value.trim();
    const subject  = modal.querySelector('#no_subject').value.trim();
    const message  = modal.querySelector('#no_msg').value.trim();
    try {
      const res = await api(`/api/deliveries/${id}/notify-owner`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ toEmail, subject, message })
      });
      modal.remove();
      toast(res.message || `Email notification sent to ${toEmail}`, 'success');
    } catch(err) {
      toast(err.message, 'error');
    }
  };
}
async function status(id,s){try{await api(`/api/deliveries/${id}/status`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:s,riderId:u.id})});toast(`Delivery status updated to ${s}!`, 'success');render("dashboard")}catch(e){toast(e.message, 'error')}}

if(localStorage.user){
  try{ u=JSON.parse(localStorage.user); }catch(e){ localStorage.removeItem("user"); u=null; }
}
if(u){
  init();
}else{
  $("login").classList.remove("hidden");
  $("app").classList.add("hidden");
  $("nav").classList.add("hidden");
  $("logout").classList.add("hidden");
  $("user").classList.add("hidden");
}
