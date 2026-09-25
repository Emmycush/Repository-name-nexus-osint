import {json,body} from "../_utils.js";
import {hashPassword,randomSalt,setSessionCookie,sha256,requireSameOrigin} from "../_auth.js";
import {loginRateLimit} from "../_login-rate.js";
function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);}
function sessionToken(){return crypto.randomUUID()+crypto.randomUUID();}
export async function onRequestPost(context){
  const blocked=requireSameOrigin(context.request); if(blocked) return blocked;
  const {email,password,displayName}=await body(context.request);
  const e=String(email||"").trim().toLowerCase(), p=String(password||"");
  const n=String(displayName||"Analyst").trim().slice(0,80)||"Analyst";
  if(!validEmail(e)) return json({error:"Enter a valid email address."},400);
  if(p.length<12) return json({error:"Password must be at least 12 characters."},400);
  if(!context.env?.DB) return json({error:"Database is not configured."},503);
  const gate=await loginRateLimit(context,`register:${e}`,5,3600); if(!gate.ok) return new Response(JSON.stringify({error:"Too many account attempts. Try again later."}),{status:429,headers:{"content-type":"application/json","retry-after":String(gate.retryAfter)}});
  const existing=await context.env.DB.prepare("SELECT id FROM users WHERE email=?").bind(e).first();
  if(existing) return json({error:"An account with that email already exists."},409);
  const id=crypto.randomUUID(), salt=randomSalt(), passwordHash=await hashPassword(p,salt);
  await context.env.DB.prepare("INSERT INTO users(id,email,display_name,role,credits,password_hash,password_salt,password_algo) VALUES(?,?,?,?,25,?,?,?)").bind(id,e,n,"analyst",passwordHash,salt,"pbkdf2-sha256-120000").run();
  const workspaceId=crypto.randomUUID();
  const slugBase=(n.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,42)||'workspace');
  let workspaceSlug=slugBase;
  const slugCollision=await context.env.DB.prepare('SELECT id FROM workspaces WHERE slug=?').bind(workspaceSlug).first();
  if(slugCollision) workspaceSlug += '-' + crypto.randomUUID().slice(0,6);
  await context.env.DB.batch([
    context.env.DB.prepare('INSERT INTO workspaces(id,name,slug,owner_user_id) VALUES(?,?,?,?)').bind(workspaceId,`${n} Workspace`,workspaceSlug,id),
    context.env.DB.prepare("INSERT INTO workspace_members(workspace_id,user_id,role,status) VALUES(?,?, 'owner','active')").bind(workspaceId,id)
  ]);
  const token=sessionToken();
  await context.env.DB.prepare("INSERT INTO sessions(id,user_id,token_hash,expires_at,last_seen_at) VALUES(?,?,?,datetime('now','+7 days'),CURRENT_TIMESTAMP)").bind(crypto.randomUUID(),id,await sha256(token)).run();
  return new Response(JSON.stringify({user:{id,email:e,display_name:n,role:"analyst",credits:25,onboarding_complete:0}}),{status:201,headers:{"content-type":"application/json","set-cookie":setSessionCookie(token)}});
}
