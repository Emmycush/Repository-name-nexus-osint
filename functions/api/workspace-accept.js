import { json, body } from '../_utils.js';
import { requireUser, requireSameOrigin, sha256 } from '../_auth.js';
export async function onRequestPost(ctx){
 const blocked=requireSameOrigin(ctx.request); if(blocked)return blocked; const user=await requireUser(ctx); if(!user)return json({error:'Authentication required'},401);
 const b=await body(ctx.request); const token=String(b.token||''); if(!token)return json({error:'Invite token required'},400);
 const hash=await sha256(token); const inv=await ctx.env.DB.prepare("SELECT id,workspace_id,email,role FROM workspace_invites WHERE token_hash=? AND status='pending' AND expires_at>CURRENT_TIMESTAMP").bind(hash).first();
 if(!inv)return json({error:'Invite is invalid or expired'},400); if(inv.email!==user.email)return json({error:'Invite email does not match the signed-in account'},403);
 await ctx.env.DB.batch([
   ctx.env.DB.prepare("INSERT OR REPLACE INTO workspace_members(workspace_id,user_id,role,status) VALUES(?,?,?,'active')").bind(inv.workspace_id,user.id,inv.role),
   ctx.env.DB.prepare("UPDATE workspace_invites SET status='accepted' WHERE id=?").bind(inv.id)
 ]);
 return json({ok:true,workspaceId:inv.workspace_id,role:inv.role});
}
