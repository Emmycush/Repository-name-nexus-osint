import {json} from "../_utils.js";
import {requireUser,cookieToken,sha256,requireSameOrigin} from "../_auth.js";
export async function onRequestGet(context){
  const user=await requireUser(context); if(!user) return json({error:"Authentication required"},401);
  const rows=await context.env.DB.prepare("SELECT id,created_at,expires_at,last_seen_at,token_hash FROM sessions WHERE user_id=? AND expires_at>CURRENT_TIMESTAMP ORDER BY created_at DESC").bind(user.id).all();
  const currentHash=await sha256(cookieToken(context.request)||"");
  return json({sessions:(rows.results||[]).map(s=>({id:s.id,created_at:s.created_at,expires_at:s.expires_at,last_seen_at:s.last_seen_at,current:s.token_hash===currentHash}))});
}
export async function onRequestDelete(context){
  const blocked=requireSameOrigin(context.request); if(blocked) return blocked;
  const user=await requireUser(context); if(!user) return json({error:"Authentication required"},401);
  await context.env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(user.id).run();
  return json({ok:true});
}
