import { json } from '../_utils.js';
import { requireUser } from '../_auth.js';
export async function onRequestGet(ctx){
  const user=await requireUser(ctx); if(!user) return json({error:"Authentication required"},401);
  let row=await ctx.env.DB.prepare(`SELECT p.id,p.name,p.monthly_credits,p.max_cases,p.max_members_per_case,COALESCE(s.status,'active') status FROM users u LEFT JOIN subscriptions s ON s.user_id=u.id LEFT JOIN plans p ON p.id=COALESCE(s.plan_id,'free') WHERE u.id=?`).bind(user.id).first();
  if(!row) return json({error:'User not found'},404);
  return json({plan:row});
}
