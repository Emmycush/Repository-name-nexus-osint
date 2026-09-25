import {json,body} from "../_utils.js";
import {hashPassword,legacyHashPassword,setSessionCookie,sha256,randomSalt,requireSameOrigin} from "../_auth.js";
import {loginRateLimit} from "../_login-rate.js";
function sessionToken(){return crypto.randomUUID()+crypto.randomUUID();}
export async function onRequestPost(context){
  const blocked=requireSameOrigin(context.request); if(blocked) return blocked;
  const {email,password}=await body(context.request); const e=String(email||"").trim().toLowerCase();
  if(!context.env?.DB) return json({error:"Database is not configured."},503);
  const gate=await loginRateLimit(context,`login:${e}`,8,900); if(!gate.ok) return new Response(JSON.stringify({error:"Too many login attempts. Try again later."}),{status:429,headers:{"content-type":"application/json","retry-after":String(gate.retryAfter)}});
  const row=await context.env.DB.prepare("SELECT id,email,display_name,role,credits,password_hash,password_salt,COALESCE(password_algo,'legacy-sha256') password_algo,onboarding_complete FROM users WHERE email=?").bind(e).first();
  if(!row) return json({error:"Invalid email or password."},401);
  let supplied="";
  if(row.password_algo==="pbkdf2-sha256-120000") supplied=await hashPassword(String(password||""),row.password_salt);
  else supplied=await legacyHashPassword(String(password||""),row.password_salt);
  if(supplied!==row.password_hash) return json({error:"Invalid email or password."},401);
  if(row.password_algo!=="pbkdf2-sha256-120000"){
    const salt=randomSalt(), upgraded=await hashPassword(String(password||""),salt);
    await context.env.DB.prepare("UPDATE users SET password_hash=?,password_salt=?,password_algo=? WHERE id=?").bind(upgraded,salt,"pbkdf2-sha256-120000",row.id).run();
  }
  const token=sessionToken();
  await context.env.DB.prepare("INSERT INTO sessions(id,user_id,token_hash,expires_at,last_seen_at) VALUES(?,?,?,datetime('now','+7 days'),CURRENT_TIMESTAMP)").bind(crypto.randomUUID(),row.id,await sha256(token)).run();
  return new Response(JSON.stringify({user:{id:row.id,email:row.email,display_name:row.display_name,role:row.role,credits:row.credits,onboarding_complete:Number(row.onboarding_complete||0)}}),{status:200,headers:{"content-type":"application/json","set-cookie":setSessionCookie(token)}});
}
