import {json} from "./_utils.js";

const encoder=new TextEncoder();
const PBKDF2_ITERATIONS=120000;

async function digestHex(data){
  const digest=await crypto.subtle.digest("SHA-256",data);
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");
}

export async function sha256(value){return digestHex(encoder.encode(value));}

function hexToBytes(hex){
  const out=new Uint8Array(hex.length/2);
  for(let i=0;i<out.length;i++) out[i]=parseInt(hex.slice(i*2,i*2+2),16);
  return out;
}

export async function hashPassword(password,saltHex){
  const key=await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt:hexToBytes(saltHex),iterations:PBKDF2_ITERATIONS,hash:"SHA-256"},key,256);
  return [...new Uint8Array(bits)].map(x=>x.toString(16).padStart(2,"0")).join("");
}

export async function legacyHashPassword(password,salt){
  let digest=await crypto.subtle.digest("SHA-256",encoder.encode(password+salt));
  for(let i=0;i<10000;i++) digest=await crypto.subtle.digest("SHA-256",digest);
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");
}

export function randomSalt(){
  const b=new Uint8Array(16); crypto.getRandomValues(b);
  return [...b].map(x=>x.toString(16).padStart(2,"0")).join("");
}

export function cookieToken(request){
  const cookie=request.headers.get("Cookie")||"";
  const match=cookie.match(/(?:^|;\s*)nexus_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function setSessionCookie(token,maxAge=604800){
  return `nexus_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
export function clearSessionCookie(){return setSessionCookie("",0);}

export function sameOrigin(request){
  const origin=request.headers.get("Origin");
  if(!origin) return true;
  const url=new URL(request.url);
  try{return new URL(origin).origin===url.origin;}catch{return false;}
}
export function requireSameOrigin(request){
  if(!sameOrigin(request)) return json({error:"Cross-origin request blocked."},403);
  return null;
}

export async function requireUser(context){
  if(!context.env?.DB) return null;
  const token=cookieToken(context.request);
  if(!token) return null;
  const tokenHash=await sha256(token);
  const row=await context.env.DB.prepare(`
    SELECT u.id,u.email,u.display_name,u.role,u.credits,u.onboarding_complete
    FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.expires_at > CURRENT_TIMESTAMP
  `).bind(tokenHash).first();
  return row || null;
}

export async function requireAdmin(context){
  const user=await requireUser(context);
  if(!user) return {error:json({error:"Authentication required"},401)};
  if(user.role!=="admin") return {error:json({error:"Admin access required"},403)};
  return {user};
}
