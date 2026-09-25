import {json,body} from "../_utils.js";
import {requireUser,requireSameOrigin} from "../_auth.js";
import {rateLimit} from "../_rate.js";
import {getCaseAccess,canWriteCase,deny} from "../_workspace.js";

function clean(v,n=500){return String(v??"").trim().slice(0,n);}
function id(){return crypto.randomUUID();}

async function collect(target,type){
  if(type==="domain"){
    const domain=target.replace(/^https?:\/\//,"").split("/")[0].toLowerCase();
    const rdap=await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`);
    const dns=await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`,{headers:{accept:"application/dns-json"}});
    const findings=[];
    if(rdap.ok){const d=await rdap.json(); findings.push({id:id(),label:"RDAP domain",value:d.ldhName||domain,source:"RDAP",source_url:`https://rdap.org/domain/${encodeURIComponent(domain)}`}); if(d.events?.length)findings.push({id:id(),label:"RDAP events",value:JSON.stringify(d.events),source:"RDAP",source_url:`https://rdap.org/domain/${encodeURIComponent(domain)}`}); if(d.status?.length)findings.push({id:id(),label:"Domain status",value:d.status.join(", "),source:"RDAP",source_url:`https://rdap.org/domain/${encodeURIComponent(domain)}`});}
    if(dns.ok){const d=await dns.json(); for(const a of(d.Answer||[]))findings.push({id:id(),label:"A record",value:a.data,source:"Cloudflare DNS",source_url:`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`});}
    return {normalized:domain,findings};
  }
  if(type==="ip"){
    const ip=target.trim(); const r=await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`); if(!r.ok)throw new Error("IP provider request failed"); const d=await r.json(); const fields=["ip","type","continent","country","region","city","latitude","longitude","org","isp","asn"]; return {normalized:ip,findings:fields.filter(k=>d[k]!==undefined&&d[k]!==null).map(k=>({id:id(),label:k.toUpperCase(),value:String(d[k]),source:"ipwho.is",source_url:`https://ipwho.is/${encodeURIComponent(ip)}`}))};
  }
  if(type==="url"){
    let u; try{u=new URL(target);}catch{throw new Error("Invalid URL");} return {normalized:u.href,findings:[{id:id(),label:"Protocol",value:u.protocol,source:"URL parser"},{id:id(),label:"Hostname",value:u.hostname,source:"URL parser"},{id:id(),label:"Port",value:u.port||"(default)",source:"URL parser"},{id:id(),label:"Path",value:u.pathname||"/",source:"URL parser"}]};
  }
  if(type==="username"){
    const username=target.replace(/^@/,"").trim(); const sites=[["GitHub",`https://github.com/${encodeURIComponent(username)}`],["GitLab",`https://gitlab.com/${encodeURIComponent(username)}`],["Reddit",`https://www.reddit.com/user/${encodeURIComponent(username)}/`],["X",`https://x.com/${encodeURIComponent(username)}`]]; const findings=[]; for(const [site,url] of sites){try{const r=await fetch(url,{redirect:"manual"}); findings.push({id:id(),label:`${site} HTTP status`,value:String(r.status),source:site,source_url:url});}catch{findings.push({id:id(),label:`${site} check`,value:"Request failed",source:site,source_url:url});}} return {normalized:username,findings};
  }
  if(type==="email"){
    const email=target.toLowerCase().trim(); if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Invalid email address");
    const domain=email.split("@")[1]; return {normalized:email,findings:[{id:id(),label:"Email syntax",value:"Valid format",source:"NEXUS validator"},{id:id(),label:"Domain",value:domain,source:"NEXUS validator"},{id:id(),label:"Private-data lookup",value:"Not performed",source:"NEXUS safety boundary"},{id:id(),label:"Verification",value:"Use an authorized public verification service",source:"NEXUS guidance"}]};
  }
  throw new Error("Unsupported target type");
}

async function quota(db,userId){
  const plan=await db.prepare(`SELECT p.monthly_credits FROM users u LEFT JOIN subscriptions s ON s.user_id=u.id LEFT JOIN plans p ON p.id=COALESCE(s.plan_id,'free') WHERE u.id=?`).bind(userId).first();
  const today=new Date().toISOString().slice(0,7);
  const usage=await db.prepare(`SELECT COALESCE(SUM(investigations),0) n FROM usage_daily WHERE user_id=? AND usage_date LIKE ?`).bind(userId,`${today}%`).first();
  return {limit:Number(plan?.monthly_credits??25),used:Number(usage?.n??0)};
}

export async function onRequestPost(context){
  const blocked=requireSameOrigin(context.request); if(blocked)return blocked;
  const user=await requireUser(context); if(!user)return json({error:"Authentication required"},401);
  const rl=await rateLimit(context,`investigations:${user.id}`,20,60); if(!rl.ok)return json({error:"Investigation rate limit exceeded. Try again shortly."},429);
  const {target,targetType,caseId}=await body(context.request); const t=clean(target,300),type=clean(targetType,30).toLowerCase();
  if(!t||!["domain","ip","url","username","email"].includes(type))return json({error:"Supported types: domain, ip, url, username, email"},400);
  if(!context.env?.DB)return json({error:"Database is not configured."},503);
  if(caseId){const access=await getCaseAccess(context.env.DB,user.id,caseId); if(!access)return json({error:"Case not found"},404); if(!canWriteCase(access))return deny('Viewer access cannot create investigations.');}
  const q=await quota(context.env.DB,user.id); if(q.used>=q.limit)return json({error:`Monthly investigation quota reached (${q.limit}).`},402);
  let result; try{result=await collect(t,type);}catch(e){return json({error:e.message||"Collection failed"},502);}
  const investigationId=id();
  await context.env.DB.prepare("UPDATE users SET credits=CASE WHEN credits>0 THEN credits-1 ELSE 0 END WHERE id=?").bind(user.id).run();
  await context.env.DB.prepare("INSERT INTO investigations(id,user_id,case_id,target,target_type,status) VALUES(?,?,?,?,?,'completed')").bind(investigationId,user.id,caseId||null,result.normalized,type).run();
  const statements=result.findings.map(f=>context.env.DB.prepare("INSERT INTO findings(id,investigation_id,label,value,source,source_url,confidence,analyst_note) VALUES(?,?,?,?,?,?,?,?)").bind(f.id,investigationId,clean(f.label,100),clean(f.value,2000),clean(f.source,100),f.source_url||null,f.confidence??70,f.analyst_note||''));
  if(statements.length)await context.env.DB.batch(statements);
  const month=new Date().toISOString().slice(0,7); const day=new Date().toISOString().slice(0,10);
  await context.env.DB.prepare(`INSERT INTO usage_daily(user_id,usage_date,investigations,reports,provider_checks) VALUES(?,?,1,0,0) ON CONFLICT(user_id,usage_date) DO UPDATE SET investigations=investigations+1`).bind(user.id,day).run();
  await context.env.DB.prepare("INSERT INTO audit_logs(id,user_id,action,resource_type,resource_id,metadata) VALUES(?,?,?,?,?,?)").bind(id(),user.id,"investigation.created","investigation",investigationId,JSON.stringify({targetType:type,month})).run();
  const balance=await context.env.DB.prepare("SELECT credits FROM users WHERE id=?").bind(user.id).first();
  return json({investigation:{id:investigationId,target:result.normalized,targetType:type,status:"completed",findings:result.findings},credits:balance?.credits??0});
}

export async function onRequestGet(context){
  const user=await requireUser(context); if(!user)return json({error:"Authentication required"},401); if(!context.env?.DB)return json({investigations:[]});
  const rows=await context.env.DB.prepare(`SELECT i.id,i.case_id,i.target,i.target_type,i.status,i.created_at FROM investigations i WHERE i.user_id=? OR EXISTS(SELECT 1 FROM workspace_members wm JOIN cases c ON c.id=i.case_id JOIN workspace_members ownerwm ON ownerwm.workspace_id=wm.workspace_id WHERE wm.user_id=? AND wm.status='active' AND ownerwm.user_id=c.user_id AND ownerwm.status='active') ORDER BY i.created_at DESC LIMIT 100`).bind(user.id,user.id).all();
  return json({investigations:rows.results||[]});
}
