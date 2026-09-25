import { json } from '../_utils.js';
import { requireUser } from '../_auth.js';
export async function onRequestGet(ctx){
  const user=await requireUser(ctx); if(!user) return json({error:"Authentication required"},401);
  const row=await ctx.env.DB.prepare('SELECT id,email,display_name,role,onboarding_complete FROM users WHERE id=?').bind(user.id).first();
  return json({user:row||null});
}
export async function onRequestPost(ctx){
  const user=await requireUser(ctx); if(!user) return json({error:"Authentication required"},401);
  const body=await ctx.request.json().catch(()=>({}));
  const displayName=String(body.displayName||'').trim().slice(0,80);
  const accepted=body.acceptedPublicSourcePolicy===true;
  if(!displayName || !accepted) return json({error:'Display name and public-source policy acknowledgement are required'},400);
  await ctx.env.DB.prepare("UPDATE users SET display_name=?, onboarding_complete=1 WHERE id=?").bind(displayName,user.id).run();
  return json({ok:true});
}
