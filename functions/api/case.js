import {json,body} from "../_utils.js";
import {requireUser,requireSameOrigin} from "../_auth.js";
import {getCaseAccess,canReadCase,canManageCase,deny} from "../_workspace.js";

export async function onRequestGet(context){
  const user=await requireUser(context); if(!user) return json({error:"Authentication required"},401);
  if(!context.env?.DB) return json({error:"Database is not configured."},503);
  const id=context.params?.id;
  const c=await getCaseAccess(context.env.DB,user.id,id);
  if(!canReadCase(c)) return json({error:"Case not found"},404);
  const investigations=await context.env.DB.prepare(
    `SELECT id,target,target_type,status,created_at FROM investigations WHERE case_id=? ORDER BY created_at DESC`
  ).bind(id).all();
  return json({case:c,investigations:investigations.results||[]});
}

export async function onRequestPatch(context){
  const blocked=requireSameOrigin(context); if(blocked) return blocked;
  const user=await requireUser(context); if(!user) return json({error:"Authentication required"},401);
  if(!context.env?.DB) return json({error:"Database is not configured."},503);
  const id=context.params?.id;
  const access=await getCaseAccess(context.env.DB,user.id,id);
  if(!access) return json({error:"Case not found"},404);
  if(!canManageCase(access)) return deny('Only the case owner or workspace admin can change case status.');
  const data=await body(context.request);
  const allowedStatus=["open","closed","archived"];
  const status=String(data.status||"").toLowerCase();
  if(!allowedStatus.includes(status)) return json({error:"Invalid case status"},400);
  await context.env.DB.prepare("UPDATE cases SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(status,id).run();
  await context.env.DB.prepare(
    "INSERT INTO audit_logs(id,user_id,action,resource_type,resource_id,metadata) VALUES(?,?,?,?,?,?)"
  ).bind(crypto.randomUUID(),user.id,"case.updated","case",id,JSON.stringify({status})).run();
  return json({ok:true,status});
}
