
import {json,body} from "../_utils.js";
import {requireUser} from "../_auth.js";

export async function onRequestPatch(context){
  const user=await requireUser(context);
  if(!user) return json({error:"Authentication required"},401);
  if(!context.env?.DB) return json({error:"Database is not configured."},503);
  const id=context.params?.id;
  const data=await body(context.request);
  const confidence=Math.max(0,Math.min(100,Number(data.confidence??50)));
  const note=String(data.analystNote??"").slice(0,4000);

  const owner=await context.env.DB.prepare(`
    SELECT f.id FROM findings f
    JOIN investigations i ON i.id=f.investigation_id
    WHERE f.id=? AND i.user_id=?
  `).bind(id,user.id).first();
  if(!owner) return json({error:"Finding not found"},404);

  await context.env.DB.prepare(
    "UPDATE findings SET confidence=?,analyst_note=? WHERE id=?"
  ).bind(confidence,note,id).run();

  await context.env.DB.prepare(
    "INSERT INTO audit_logs(id,user_id,action,resource_type,resource_id,metadata) VALUES(?,?,?,?,?,?)"
  ).bind(crypto.randomUUID(),user.id,"finding.annotated","finding",id,JSON.stringify({confidence})).run();

  return json({ok:true,confidence,analystNote:note});
}
