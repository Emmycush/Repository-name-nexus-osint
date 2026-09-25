import { json } from '../_utils.js';
import { requireUser } from '../_auth.js';
export async function onRequestGet(ctx){
 const user=await requireUser(ctx); if(!user) return json({error:"Authentication required"},401);
 const today=new Date().toISOString().slice(0,10);
 const row=await ctx.env.DB.prepare('SELECT * FROM usage_daily WHERE user_id=? AND usage_date=?').bind(user.id,today).first();
 return json({date:today,usage:row||{investigations:0,reports:0,provider_checks:0}});
}
