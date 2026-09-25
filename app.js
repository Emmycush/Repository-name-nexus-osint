const modules = [
  {id:"domain", icon:"◉", name:"Domain Recon", tag:"DNS / WHOIS", desc:"Review public domain metadata, DNS records, nameservers and registration signals.", example:"example.com"},
  {id:"ip", icon:"◈", name:"IP Intelligence", tag:"NETWORK", desc:"Structure public IP information, ASN context, reverse DNS and reputation signals.", example:"8.8.8.8"},
  {id:"dns", icon:"⌁", name:"DNS Explorer", tag:"INFRASTRUCTURE", desc:"Inspect common DNS record types and map visible domain infrastructure.", example:"example.com"},
  {id:"url", icon:"↗", name:"URL Analyzer", tag:"WEB SECURITY", desc:"Break down a URL, inspect its structure and prepare security-analysis notes.", example:"https://example.com"},
  {id:"username", icon:"◎", name:"Username Research", tag:"IDENTITY", desc:"Organize public-profile discovery across approved sources without bypassing access controls.", example:"security"},
  {id:"email", icon:"✉", name:"Email Signals", tag:"VERIFICATION", desc:"Analyze public email/domain signals and prepare a verification checklist.", example:"analyst@example.com"},
  {id:"headers", icon:"▣", name:"Header Inspector", tag:"WEB SECURITY", desc:"Review HTTP security headers and identify missing defensive controls.", example:"example.com"},
  {id:"subdomain", icon:"⌘", name:"Subdomain Map", tag:"DISCOVERY", desc:"Organize publicly discoverable subdomains from authorized/public sources.", example:"example.com"},
  {id:"ssl", icon:"◇", name:"TLS Inspector", tag:"CERTIFICATES", desc:"Review certificate metadata, validity and visible certificate relationships.", example:"example.com"},
  {id:"tech", icon:"▤", name:"Technology Profile", tag:"WEB STACK", desc:"Identify publicly observable technologies and create an infrastructure profile.", example:"example.com"},
  {id:"ports", icon:"⊙", name:"Port Surface", tag:"NETWORK", desc:"Present authorized/public scan findings and document exposed services.", example:"example.com"},
  {id:"report", icon:"▥", name:"Case Builder", tag:"REPORTING", desc:"Turn verified findings into structured analyst notes and evidence-ready reports.", example:"Case Alpha"}
];

const state = {
  credits: 25,
  type: "domain",
  target: "",
  history: [],
  lastInvestigationId: null
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function moduleCard(m){
  return `<article class="module-card">
    <div class="module-icon">${m.icon}</div>
    <h3>${m.name}</h3>
    <p>${m.desc}</p>
    <div class="module-foot"><span>${m.tag}</span><a data-module="${m.id}">OPEN →</a></div>
  </article>`;
}
$("#quickModules").innerHTML = modules.slice(0,4).map(moduleCard).join("");
$("#allModules").innerHTML = modules.map(moduleCard).join("");

function renderActivity(){
  $("#recentList").innerHTML = state.history.slice(0,4).map(x => `
    <div class="activity"><div class="activity-icon">⌕</div>
      <div><strong>${x[0]}</strong><small>${x[1]} · ${x[2]}</small></div>
      <span class="state">${x[3]}</span>
    </div>`).join("");
}
function renderHistory(){
  $("#historyList").innerHTML = `<div class="history-row head"><span>TARGET</span><span>MODULE</span><span>TIME</span><span>STATUS</span></div>` +
    state.history.map(x => `<div class="history-row"><span>${x[0]}</span><span>${x[1]}</span><span>${x[2]}</span><span>${x[3]}</span></div>`).join("");
}
renderActivity(); renderHistory();

function go(view){
  $$(".view").forEach(v => v.classList.remove("active"));
  $(`#${view}`).classList.add("active");
  $$(".nav-item").forEach(n => n.classList.toggle("active", n.dataset.view===view));
  $("#viewTitle").textContent = view.replace("-", " ").toUpperCase();
  window.scrollTo({top:0,behavior:"smooth"});
  if(innerWidth<761) $("#sidebar").classList.remove("open");
}
$$("[data-go]").forEach(b => b.addEventListener("click",()=>go(b.dataset.go)));
$$(".nav-item").forEach(b => b.addEventListener("click",()=>go(b.dataset.view)));
$("#menuBtn").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));

$$(".target-tab").forEach(tab=>{
  tab.addEventListener("click",()=>{
    $$(".target-tab").forEach(x=>x.classList.remove("active"));
    tab.classList.add("active");
    state.type=tab.dataset.type;
    const placeholders={domain:"example.com",ip:"8.8.8.8",username:"security",email:"analyst@example.com",url:"https://example.com"};
    $("#targetInput").placeholder=placeholders[state.type];
  });
});
$$(".query-hints button").forEach(b=>b.addEventListener("click",()=>$("#targetInput").value=b.dataset.example));

document.addEventListener("click",e=>{
  const m=e.target.closest("[data-module]");
  if(m){
    go("investigate");
    const target=modules.find(x=>x.id===m.dataset.module);
    $("#targetInput").value=target?.example || "";
  }
});

function safeTarget(v){
  return v.trim().replace(/[<>]/g,"");
}

async function fetchIntelligence(type, target){
  const endpoint = type === "domain" || type === "dns" ? "/api/domain" :
                   type === "ip" ? "/api/ip" :
                   type === "url" ? "/api/url" :
                   type === "email" ? "/api/email" :
                   type === "username" ? "/api/username" : "/api/domain";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({target, type})
  });
  if(!response.ok) throw new Error("API request failed");
  return response.json();
}

function renderLiveResult(data, target, type){
  const rows = (data.findings || []).map((f,i)=>`
    <div class="finding">
      <span>FINDING 0${i+1} · ${String(f.source || "PUBLIC SOURCE").toUpperCase()}</span>
      <strong>${escapeHtml(f.label || "Signal")}</strong>
      <small style="display:block;color:#596f83;margin-top:4px">${escapeHtml(f.value || "No value returned")}</small>
    </div>`).join("");
  $("#results").innerHTML = `
    <div class="result-summary">
      <div class="result-stat"><small>TARGET TYPE</small><strong>${escapeHtml(type.toUpperCase())}</strong></div>
      <div class="result-stat"><small>SIGNALS</small><strong>${data.findings?.length || 0}</strong></div>
      <div class="result-stat"><small>MODE</small><strong>LIVE API</strong></div>
    </div>
    ${rows || `<div class="results-empty"><strong>No public signals returned</strong><p>Try another target.</p></div>`}
    <div class="notice" style="margin-top:15px">Sources are public-service responses. Verify important findings independently and record the collection time before using them in a report.</div>`;
}

function escapeHtml(value){
  return String(value).replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));
}
async function run(){
  const target=safeTarget($("#targetInput").value);
  if(!target){ $("#targetInput").focus(); return; }
  
  $("#resultBadge").textContent="ANALYZING";
  $("#resultBadge").style.color="#ffd447";
  $("#resultTitle").textContent=target;
  $("#results").innerHTML=`<div class="results-empty"><div class="empty-icon">◌</div><strong>Querying public intelligence service…</strong><p>Collecting structured signals.</p></div>`;
  try{
    const data = await runInvestigation(target,state.type);
    $("#resultBadge").textContent="COMPLETE";
    $("#resultBadge").style.color="#00e59a";
    renderLiveResult(data,target,state.type);
    state.lastInvestigationId=data.investigation.id;
    await loadInvestigations();
  }catch(err){
    $("#resultBadge").textContent="ERROR";
    $("#resultBadge").style.color="#ff557d";
    $("#results").innerHTML=`<div class="results-empty"><div class="empty-icon">!</div><strong>Live service unavailable</strong><p>${escapeHtml(err.message)}. The interface is ready for production providers.</p></div>`;
  }
}
$("#runInvestigation").addEventListener("click",run);
$("#targetInput").addEventListener("keydown",e=>{if(e.key==="Enter")run()});

$("#generateReport").addEventListener("click",()=>{
  const last=state.history[0];
  if(!state.lastInvestigationId){ alert("Run an investigation first."); return; }
  window.open(`/api/report-advanced/${encodeURIComponent(state.lastInvestigationId)}`,"_blank","noopener,noreferrer");
});


// NEXUS V3 workspace layer
const v3State = {
  cases: JSON.parse(localStorage.getItem("nexus_cases") || "[]"),
  notes: localStorage.getItem("nexus_notes") || "",
  reports: JSON.parse(localStorage.getItem("nexus_reports") || "[]")
};

function saveV3(){
  localStorage.setItem("nexus_cases", JSON.stringify(v3State.cases));
  localStorage.setItem("nexus_notes", v3State.notes);
  localStorage.setItem("nexus_reports", JSON.stringify(v3State.reports));
}

function addV3Nav(){
  const nav=document.querySelector(".sidebar nav");
  if(!nav || document.querySelector('[data-view="cases"]')) return;
  const label=document.createElement("p"); label.className="nav-label"; label.textContent="CASEWORK";
  const cases=document.createElement("button"); cases.className="nav-item"; cases.dataset.view="cases"; cases.innerHTML="<span>▣</span> Cases";
  const admin=document.createElement("button"); admin.className="nav-item"; admin.dataset.view="admin"; admin.innerHTML="<span>◆</span> Admin Console";
  nav.append(label,cases,admin);
  [cases,admin].forEach(b=>b.addEventListener("click",()=>go(b.dataset.view)));
}

function addV3Views(){
  const content=document.querySelector(".content");
  if(document.querySelector("#cases")) return;
  content.insertAdjacentHTML("beforeend",`
  <div id="cases" class="view">
    <div class="page-title"><span class="eyebrow">CASE MANAGEMENT</span><h1>Investigation cases</h1><p>Group targets, findings and analyst notes into reviewable cases.</p></div>
    <div class="case-toolbar">
      <button class="primary-btn" id="newCase">+ New case</button>
      <span class="case-count" id="caseCount">0 active cases</span>
    </div>
    <div class="case-grid" id="caseGrid"></div>
  </div>
  <div id="admin" class="view">
    <div class="page-title"><span class="eyebrow">CONTROL PLANE</span><h1>Admin console</h1><p>Operational metrics and provider health. Access is authenticated server-side.</p></div>
    <div class="metrics admin-metrics">
      <div class="metric"><span>ACTIVE CASES</span><strong id="adminCases">0</strong><small>Server workspace</small></div>
      <div class="metric"><span>REPORTS</span><strong id="adminReports">0</strong><small>Server-generated reports</small></div>
      <div class="metric"><span>API ROUTES</span><strong>5</strong><small>Cloudflare Functions</small></div>
      <div class="metric"><span>PROVIDER STATUS</span><strong class="online">READY</strong><small>Route health</small></div>
    </div>
    <div class="panel provider-panel">
      <div class="panel-head"><div><span class="eyebrow">PROVIDER HEALTH</span><h3>Service matrix</h3></div><span class="badge">OPERATIONAL</span></div>
      <div class="provider-row"><span>RDAP</span><b>AVAILABLE</b><small>Domain registration metadata</small></div>
      <div class="provider-row"><span>Cloudflare DNS</span><b>AVAILABLE</b><small>Public DNS-over-HTTPS</small></div>
      <div class="provider-row"><span>IP metadata</span><b>AVAILABLE</b><small>Public IPv4 metadata provider</small></div>
      <div class="provider-row"><span>Auth / database</span><b>CONNECTED</b><small>Authenticated D1 environment</small></div>
    </div>
  </div>
  `);
  $("#newCase").addEventListener("click",createCase);
}

function renderCases(){
  const grid=$("#caseGrid"); if(!grid) return;
  $("#caseCount").textContent=`${v3State.cases.length} active case${v3State.cases.length===1?"":"s"}`;
  $("#adminCases").textContent=v3State.cases.length;
  $("#adminReports").textContent=v3State.reports.length;
  grid.innerHTML=v3State.cases.length ? v3State.cases.map((c,i)=>`
    <article class="case-card">
      <div class="case-top"><span class="case-id">${escapeHtml(c.id)}</span><span class="case-status">${escapeHtml(c.status)}</span></div>
      <h3>${escapeHtml(c.title)}</h3>
      <p>${escapeHtml(c.target || "No target assigned")}</p>
      <textarea data-note="${i}" placeholder="Analyst notes…">${escapeHtml(c.notes||"")}</textarea>
      <div class="case-foot"><small>Created ${escapeHtml(c.created)}</small><button class="text-btn" data-close="${i}">Close case →</button></div>
    </article>`).join("") :
    `<div class="panel empty-case"><div class="empty-icon">▣</div><strong>No cases yet</strong><p>Create a case from an investigation result or start a blank case.</p></div>`;
  $$("[data-note]").forEach(t=>t.addEventListener("input",e=>{
    v3State.cases[+e.target.dataset.note].notes=e.target.value; saveV3();
  }));
  $$("[data-close]").forEach(b=>b.addEventListener("click",()=>{
    v3State.cases.splice(+b.dataset.close,1); saveV3(); renderCases();
  }));
}

function createCase(){
  const target=($("#targetInput")?.value || "").trim();
  const id="NX-"+Math.random().toString(36).slice(2,7).toUpperCase();
  v3State.cases.unshift({id,title:target?`Investigation: ${target}`:"Untitled investigation",target,status:"OPEN",notes:"",created:new Date().toLocaleDateString()});
  saveV3(); renderCases(); go("cases");
}



// V5 authentication client
let authMode="login";
const authGate=document.querySelector("#authGate");
function authTab(mode){
  authMode=mode;
  document.querySelectorAll(".auth-tab").forEach(b=>b.classList.toggle("active",b.dataset.auth===mode));
  const reg=mode==="register";
  document.querySelector("#nameLabel").style.display=reg?"block":"none";
  document.querySelector("#authName").style.display=reg?"block":"none";
  document.querySelector(".auth-submit").textContent=reg?"CREATE ACCOUNT":"ACCESS WORKSPACE";
  document.querySelector("#authMessage").textContent="";
}
document.querySelectorAll(".auth-tab").forEach(b=>b.addEventListener("click",()=>authTab(b.dataset.auth)));

function setUserIdentity(user){
  const name=user?.display_name||"Operator";
  document.querySelectorAll(".profile-btn span:last-of-type").forEach(el=>{el.textContent=name;});
  const card=document.querySelector(".user-card strong"); if(card)card.textContent=name;
  const avatar=document.querySelector(".user-card .avatar"); if(avatar)avatar.textContent=name.charAt(0).toUpperCase();
  const topAvatar=document.querySelector(".profile-btn .avatar"); if(topAvatar)topAvatar.textContent=name.charAt(0).toUpperCase();
}
function showOnboarding(name){
  const modal=document.querySelector("#onboardingModal"); if(!modal)return;
  const input=document.querySelector("#onboardingName"); if(input && name)input.value=name;
  modal.classList.add("show");
}
async function completeOnboarding(){
  const msg=document.querySelector("#onboardingMessage"), name=document.querySelector("#onboardingName").value.trim(), accepted=document.querySelector("#onboardingPolicy").checked;
  if(!name||!accepted){msg.textContent="Enter your display name and accept the public-source research policy.";return;}
  try{
    const r=await fetch("/api/onboarding",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({displayName:name,acceptedPublicSourcePolicy:true})});
    const d=await r.json(); if(!r.ok)throw new Error(d.error||"Onboarding failed");
    document.querySelector("#onboardingModal").classList.remove("show"); setUserIdentity({display_name:name});
  }catch(e){msg.textContent=e.message;}
}
document.querySelector("#onboardingContinue")?.addEventListener("click",completeOnboarding);

async function checkAuth(){
  try{
    const r=await fetch("/api/me",{credentials:"include"});
    if(r.ok){
      const d=await r.json();
      authGate.classList.add("hidden");
      if(d.user){
        if(d.user.credits!=null){
          state.credits=d.user.credits;
          document.querySelector("#creditCount").textContent=state.credits;
          document.querySelector("#metricCredits").textContent=state.credits;
        }
        setUserIdentity(d.user);
        if(!Number(d.user.onboarding_complete)) showOnboarding(d.user.display_name||"");
      }
    }
  }catch{}
}
document.querySelector("#authForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const message=document.querySelector("#authMessage");
  message.style.color="#ffd447"; message.textContent="Authenticating…";
  const payload={email:document.querySelector("#authEmail").value,password:document.querySelector("#authPassword").value};
  if(authMode==="register") payload.displayName=document.querySelector("#authName").value;
  try{
    const r=await fetch(authMode==="register"?"/api/auth-register":"/api/auth-login",{
      method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)
    });
    const d=await r.json();
    if(!r.ok) throw new Error(d.error||"Authentication failed");
    authGate.classList.add("hidden");
    state.credits=d.user.credits;
    document.querySelector("#creditCount").textContent=state.credits;
    document.querySelector("#metricCredits").textContent=state.credits;
    setUserIdentity(d.user);
    message.textContent="";
    if(authMode==="register") showOnboarding(d.user.display_name||"");
    await loadInvestigations();
  }catch(err){message.style.color="#ff7896";message.textContent=err.message;}
});
checkAuth();

// V6 intelligence engine client
async function runInvestigation(target,targetType,caseId=null){
  const r=await fetch("/api/investigations",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({target,targetType,caseId})});
  const d=await r.json();
  if(!r.ok) throw new Error(d.error||"Investigation failed");
  if(d.credits!=null){
    state.credits=d.credits;
    const c=document.querySelector("#creditCount"),m=document.querySelector("#metricCredits");
    if(c)c.textContent=d.credits;if(m)m.textContent=d.credits;
  }
  return d;
}

async function loadInvestigations(){
  try{
    const r=await fetch("/api/investigations",{credentials:"include"});
    if(!r.ok)return;
    const d=await r.json();
    window.nexusInvestigations=d.investigations||[];
    state.history=(d.investigations||[]).slice(0,20).map(x=>[x.target,`${String(x.target_type||"target").toUpperCase()} Intelligence`,new Date(x.created_at).toLocaleString(),String(x.status||"completed").toUpperCase()]);
    if(!state.lastInvestigationId && d.investigations?.[0]) state.lastInvestigationId=d.investigations[0].id;
    const count=$("#investigationCount"); if(count)count.textContent=d.investigations?.length||0;
    renderActivity(); renderHistory();
  }catch{}
}

async function openInvestigationReport(id){
  window.open(`/api/report/${encodeURIComponent(id)}`,"_blank","noopener,noreferrer");
}
window.runInvestigation=runInvestigation;
window.loadInvestigations=loadInvestigations;
window.openInvestigationReport=openInvestigationReport;
loadInvestigations();

const v6Run=document.querySelector("#v6Run");
if(v6Run)v6Run.addEventListener("click",async()=>{
  const out=document.querySelector("#v6Output"), target=document.querySelector("#v6Target").value.trim(), type=document.querySelector("#v6Type").value;
  if(!target){out.textContent="Enter a target first.";return}
  out.textContent="Collecting public-source intelligence…";
  try{
    const d=await runInvestigation(target,type);
    out.textContent=JSON.stringify(d.investigation,null,2)+"\n\nREPORT: /api/report/"+d.investigation.id;
    await loadInvestigations();
  }catch(e){out.textContent="ERROR: "+e.message;}
});

// V7 operations center
async function refreshDashboard(){
  try{
    const r=await fetch("/api/dashboard",{credentials:"include"});
    if(!r.ok)return;
    const d=await r.json(), m=d.metrics||{};
    ["Cases","Investigations","Findings","Credits"].forEach(k=>{
      const el=document.querySelector("#v7"+k); if(el)el.textContent=m[k.toLowerCase()]??"—";
    });
    const box=document.querySelector("#v7Timeline");
    if(box){
      const rows=d.timeline||[];
      box.innerHTML=rows.length?rows.map(x=>`<div class="timeline-item">${x.type.toUpperCase()} · ${String(x.label).replace(/[<>&"]/g,"")}<small>${x.created_at}</small></div>`).join(""):'<div class="timeline-empty">No activity yet.</div>';
    }
  }catch{}
}
const r7=document.querySelector("#v7Refresh"); if(r7)r7.addEventListener("click",refreshDashboard);
const cc7=document.querySelector("#v7CreateCase");
if(cc7)cc7.addEventListener("click",async()=>{
  const msg=document.querySelector("#v7CaseMessage");
  const title=document.querySelector("#v7CaseTitle").value.trim();
  if(!title){msg.textContent="Enter a case title.";return}
  msg.style.color="#ffd447";msg.textContent="Creating…";
  try{
    const r=await fetch("/api/cases",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      title,target:document.querySelector("#v7CaseTarget").value.trim(),notes:document.querySelector("#v7CaseNotes").value
    })});
    const d=await r.json(); if(!r.ok)throw new Error(d.error||"Could not create case");
    msg.style.color="#7dffbf";msg.textContent=`Case ${d.case.id} created.`;
    document.querySelector("#v7CaseTitle").value="";document.querySelector("#v7CaseTarget").value="";document.querySelector("#v7CaseNotes").value="";
    refreshDashboard();
  }catch(e){msg.style.color="#ff7896";msg.textContent=e.message}
});
refreshDashboard();

// V8 evidence workbench
const v8Confidence=document.querySelector("#v8Confidence");
if(v8Confidence)v8Confidence.addEventListener("input",()=>document.querySelector("#v8ConfidenceValue").textContent=v8Confidence.value);

async function loadEvidenceGraph(){
  const caseId=document.querySelector("#v8CaseId").value.trim(), box=document.querySelector("#v8Graph");
  if(!caseId){box.innerHTML='<div class="timeline-empty">Enter a case ID.</div>';return}
  box.innerHTML='<div class="timeline-empty">Loading evidence…</div>';
  try{
    const r=await fetch(`/api/evidence-graph/${encodeURIComponent(caseId)}`,{credentials:"include"});
    const d=await r.json(); if(!r.ok)throw new Error(d.error||"Could not load graph");
    box.innerHTML=(d.nodes||[]).length?(d.nodes.map(n=>`<div class="evidence-item" data-finding="${n.id}"><strong>${String(n.label).replace(/[<>&"]/g,"")}</strong><p>${String(n.value).replace(/[<>&"]/g,"")}</p><p>${String(n.source||"")}</p><div class="confidence-bar"><div class="confidence-fill" style="width:${n.confidence||0}%"></div></div><p>Confidence ${n.confidence||0}% · ${n.id}</p></div>`).join("")):'<div class="timeline-empty">No findings in this case yet.</div>';
    box.querySelectorAll(".evidence-item").forEach(el=>el.addEventListener("click",()=>document.querySelector("#v8FindingId").value=el.dataset.finding));
  }catch(e){box.innerHTML=`<div class="timeline-empty">${e.message}</div>`}
}
document.querySelector("#v8LoadGraph")?.addEventListener("click",loadEvidenceGraph);

document.querySelector("#v8SaveFinding")?.addEventListener("click",async()=>{
  const msg=document.querySelector("#v8Message");
  try{
    const r=await fetch(`/api/finding/${encodeURIComponent(document.querySelector("#v8FindingId").value.trim())}`,{
      method:"PATCH",credentials:"include",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({confidence:Number(document.querySelector("#v8Confidence").value),analystNote:document.querySelector("#v8Note").value})
    });
    const d=await r.json();if(!r.ok)throw new Error(d.error||"Save failed");
    msg.style.color="#7dffbf";msg.textContent="Finding review saved.";
    loadEvidenceGraph();
  }catch(e){msg.style.color="#ff7896";msg.textContent=e.message}
});

document.querySelector("#v8AddMember")?.addEventListener("click",async()=>{
  const msg=document.querySelector("#v8CollabMessage");
  try{
    const caseId=document.querySelector("#v8MemberCase").value.trim();
    const r=await fetch(`/api/case-members/${encodeURIComponent(caseId)}`,{
      method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({email:document.querySelector("#v8MemberEmail").value,memberRole:document.querySelector("#v8MemberRole").value})
    });
    const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not add member");
    msg.style.color="#7dffbf";msg.textContent=`Added ${d.member.email} as ${d.member.role}.`;
  }catch(e){msg.style.color="#ff7896";msg.textContent=e.message}
});

// V9 provider health and evidence normalization
document.querySelector("#v9Health")?.addEventListener("click",async()=>{
  const box=document.querySelector("#v9Providers");box.innerHTML='<div class="timeline-empty">Checking providers…</div>';
  try{
    const r=await fetch("/api/providers",{credentials:"include"}),d=await r.json();
    if(!r.ok)throw new Error(d.error||"Provider check failed");
    box.innerHTML=(d.providers||[]).map(p=>`<div class="provider-card"><strong>${p.name}</strong><span class="${p.ok?"provider-ok":"provider-bad"}">${p.ok?"● ONLINE":"● DEGRADED"} · HTTP ${p.status}</span><span>${p.latencyMs} ms</span></div>`).join("");
  }catch(e){box.innerHTML=`<div class="timeline-empty">${e.message}</div>`}
});
document.querySelector("#v9Normalize")?.addEventListener("click",async()=>{
  const msg=document.querySelector("#v9NormalizeMsg");
  try{
    const r=await fetch("/api/normalize",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({caseId:document.querySelector("#v9CaseId").value.trim()})});
    const d=await r.json();if(!r.ok)throw new Error(d.error||"Normalization failed");
    msg.style.color="#7dffbf";msg.textContent=`Normalized ${d.findings.length} findings; removed ${d.duplicatesRemoved} duplicates.`;
  }catch(e){msg.style.color="#ff7896";msg.textContent=e.message}
});

// V11 account security center
async function loadAccountSecurity(){
  try{
    const [me,plan,sessions]=await Promise.all([
      fetch('/api/me',{credentials:'include'}),
      fetch('/api/plan',{credentials:'include'}),
      fetch('/api/sessions',{credentials:'include'})
    ]);
    if(me.ok){const d=await me.json(); const u=d.user; if(u){
      const n=document.querySelector('#accountName'),m=document.querySelector('#accountMeta');
      if(n)n.textContent=u.display_name||'Operator'; if(m)m.textContent=u.email||'Authenticated workspace';
    }}
    if(plan.ok){const d=await plan.json(),p=d.plan; if(p){
      document.querySelector('#accountPlan').textContent=p.name;
      document.querySelector('#accountQuota').textContent=`${p.monthly_credits} investigation credits · ${p.max_cases} cases · ${p.max_members_per_case} members/case`;
    }}
    if(sessions.ok){const d=await sessions.json(); document.querySelector('#sessionCount').textContent=(d.sessions||[]).length;}
  }catch{}
}
async function signOut(){
  try{await fetch('/api/auth-logout',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:'{}'});}catch{}
  location.reload();
}
async function revokeAllSessions(){
  const msg=document.querySelector('#securityMessage');
  try{const r=await fetch('/api/sessions',{method:'DELETE',credentials:'include',headers:{'Content-Type':'application/json'},body:'{}'}); const d=await r.json(); if(!r.ok)throw new Error(d.error||'Unable to revoke sessions'); msg.textContent='All sessions revoked. Sign in again on this device.'; msg.style.color='#ffd447';}catch(e){msg.textContent=e.message;msg.style.color='#ff7896';}
}
document.querySelector('#logoutBtn')?.addEventListener('click',signOut);
document.querySelector('#revokeSessionsBtn')?.addEventListener('click',revokeAllSessions);
loadAccountSecurity();

// V12 workspace & team operations
async function loadWorkspace(){
  const members=document.querySelector('#wsMembers'), invites=document.querySelector('#wsInvites'); if(!members)return;
  members.innerHTML='<div class="timeline-empty">Loading workspace…</div>'; invites.innerHTML='';
  try{
    const r=await fetch('/api/workspace',{credentials:'include'}),d=await r.json(); if(!r.ok)throw new Error(d.error||'Unable to load workspace');
    if(!d.workspace){members.innerHTML='<div class="timeline-empty">No workspace yet. Sign out and register a fresh development account, or create one through the API.</div>';return}
    document.querySelector('#wsName').textContent=d.workspace.name; document.querySelector('#wsMeta').textContent=`${d.workspace.slug} · ${d.workspace.role.toUpperCase()} · ${d.members.length} member(s)`;
    members.innerHTML=(d.members||[]).map(m=>`<div class="member-row"><div><strong>${escapeHtml(m.display_name||'Analyst')}</strong><small>${escapeHtml(m.email)}</small></div><span class="role-chip">${escapeHtml(m.role)}</span></div>`).join('')||'<div class="timeline-empty">No members.</div>';
    invites.innerHTML=(d.invites||[]).map(i=>`<div class="invite-row"><div><strong>${escapeHtml(i.email)}</strong><small>${escapeHtml(i.role)} · expires ${escapeHtml(i.expires_at)}</small></div><span class="invite-token">PENDING</span></div>`).join('');
  }catch(e){members.innerHTML=`<div class="timeline-empty">${escapeHtml(e.message)}</div>`}
}
document.querySelector('#wsRefresh')?.addEventListener('click',loadWorkspace);
document.querySelector('#wsInviteBtn')?.addEventListener('click',async()=>{
  const msg=document.querySelector('#wsInviteMsg'); msg.textContent='Generating…';
  try{const r=await fetch('/api/workspace-invite',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:document.querySelector('#wsInviteEmail').value,role:document.querySelector('#wsInviteRole').value})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Invite failed');msg.style.color='#7dffbf';msg.innerHTML=`Invite created for ${escapeHtml(d.invite.email)}. Token: <span class="invite-token">${escapeHtml(d.acceptToken)}</span>`;loadWorkspace();}catch(e){msg.style.color='#ff7896';msg.textContent=e.message}
});
loadWorkspace();

// V12 workspace invitation acceptance
document.querySelector("#wsAcceptBtn")?.addEventListener("click",async()=>{
  const msg=document.querySelector("#wsAcceptMsg"),token=document.querySelector("#wsAcceptToken").value.trim();
  if(!token){msg.textContent="Enter an invitation token.";return;}
  try{const r=await fetch("/api/workspace-accept",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not accept invite");msg.style.color="#7dffbf";msg.textContent="Invitation accepted.";document.querySelector("#wsAcceptToken").value="";loadWorkspace();}catch(e){msg.style.color="#ff7896";msg.textContent=e.message;}
});

// Canonical server-backed case list
async function loadServerCases(){
  const grid=document.querySelector('#serverCaseGrid'); if(!grid)return;
  try{
    const r=await fetch('/api/cases',{credentials:'include'}); const d=await r.json(); if(!r.ok)throw new Error(d.error||'Unable to load cases');
    const cases=d.cases||[]; document.querySelector('#serverCaseCount').textContent=`${cases.length} case${cases.length===1?'':'s'}`;
    grid.innerHTML=cases.length?cases.map(c=>`<article class="case-card"><div class="case-top"><span class="case-id">${escapeHtml(c.id)}</span><span class="case-status">${escapeHtml(c.status)}</span></div><h3>${escapeHtml(c.title)}</h3><p>${escapeHtml(c.target||'No target assigned')}</p><small>Updated ${escapeHtml(c.updated_at||c.created_at||'')}</small></article>`).join(''):'<div class="panel empty-case"><strong>No cases yet</strong><p>Create a case from the Operations Center.</p></div>';
  }catch(e){grid.innerHTML=`<div class="panel empty-case"><strong>Unable to load cases</strong><p>${escapeHtml(e.message)}</p></div>`}
}
document.querySelector('#caseCreateFromView')?.addEventListener('click',async()=>{
  const title=prompt('Case title'); if(!title?.trim())return;
  try{const r=await fetch('/api/cases',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:title.trim()})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Could not create case');await loadServerCases();await refreshDashboard();}catch(e){alert(e.message)}
});
document.querySelector('[data-view="cases"]')?.addEventListener('click',loadServerCases);
