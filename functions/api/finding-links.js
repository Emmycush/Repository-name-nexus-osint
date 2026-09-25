
import {json,body} from "../_utils.js";
import {requireUser} from "../_auth.js";

export async function onRequestPost(context){
  const user=await requireUser(context);
  if(!user) return json({error:"Authentication required"},401);
  if(!context.env?.DB) return json({error:"Database is not configured."},503);
  const {findingId,linkedFindingId,relation}=await body(context.request);
  const a=await context.env.DB.prepare(`
    SELECT f.id,i.case_id FROM findings f JOIN investigations i ON i.id=f.investigation_id
    WHERE f.id=? AND i.user_id=?
  `).bind(findingId,user.id).first();
  const b=await context.env.DB.prepare(`
    SELECT f.id,i.case_id FROM findings f JOIN investigations i ON i.id=f.investigation_id
    WHERE f.id=? AND i.user_id=?
  `).bind(linkedFindingId,user.id).first();
  if(!a||!b||!a.case_id||a.case_id!==b.case_id) return json({error:"Findings must belong to the same case"},400);
  const id=crypto.randomUUID();
  await context.env.DB.prepare(
    "INSERT INTO finding_links(id,finding_id,linked_finding_id,relation) VALUES(?,?,?,?)"
  ).bind(id,findingId,linkedFindingId,String(relation||"related").slice(0,80)).run();
  return json({ok:true,id});
}
