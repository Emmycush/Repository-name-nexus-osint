
import {json} from "../_utils.js";
import {requireUser} from "../_auth.js";

export async function onRequestGet(context){
  const user=await requireUser(context);
  if(!user) return json({error:"Authentication required"},401);
  const id=context.params?.id;
  if(!context.env?.DB) return json({error:"Database is not configured."},503);
  const inv=await context.env.DB.prepare(
    "SELECT id,case_id,target,target_type,status,created_at FROM investigations WHERE id=? AND user_id=?"
  ).bind(id,user.id).first();
  if(!inv) return json({error:"Investigation not found"},404);
  const rows=await context.env.DB.prepare(
    "SELECT label,value,source,source_url,collected_at FROM findings WHERE investigation_id=? ORDER BY collected_at"
  ).bind(id).all();
  return json({investigation:inv,findings:rows.results||[]});
}
