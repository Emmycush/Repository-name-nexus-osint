import {json} from "../_utils.js";
import {requireUser} from "../_auth.js";
import {getCaseAccess} from "../_workspace.js";

export async function onRequestGet(context){
  const user=await requireUser(context); if(!user) return json({error:"Authentication required"},401);
  if(!context.env?.DB) return json({nodes:[],links:[]});
  const caseId=context.params?.id;
  const access=await getCaseAccess(context.env.DB,user.id,caseId);
  if(!access) return json({error:"Case not found"},404);
  const rows=await context.env.DB.prepare(`
    SELECT f.id,f.label,f.value,f.source,f.source_url,f.confidence,f.analyst_note
    FROM findings f JOIN investigations i ON i.id=f.investigation_id
    WHERE i.case_id=?
  `).bind(caseId).all();
  const links=await context.env.DB.prepare(`
    SELECT fl.id,fl.finding_id,fl.linked_finding_id,fl.relation
    FROM finding_links fl
    JOIN findings a ON a.id=fl.finding_id
    JOIN investigations i ON i.id=a.investigation_id
    WHERE i.case_id=?
  `).bind(caseId).all();
  return json({nodes:rows.results||[],links:links.results||[]});
}
