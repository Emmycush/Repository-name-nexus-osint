
import {json,body} from "../_utils.js";
import {requireUser} from "../_auth.js";
import {getCaseAccess} from "../_workspace.js";

function normalizeValue(label,value){
  const s=String(value??"").trim();
  if(!s) return "";
  if(/ip/i.test(label) && /^[0-9a-f:.]+$/i.test(s)) return s.toLowerCase();
  if(/domain|hostname/i.test(label)) return s.toLowerCase().replace(/\.$/,"");
  return s;
}

export async function onRequestPost(context){
  const user=await requireUser(context);
  if(!user) return json({error:"Authentication required"},401);
  if(!context.env?.DB) return json({error:"Database is not configured."},503);
  const {caseId}=await body(context.request);
  if(!caseId) return json({error:"caseId is required"},400);
  const owned=await getCaseAccess(context.env.DB,user.id,caseId);
  if(!owned) return json({error:"Case not found"},404);

  const rows=await context.env.DB.prepare(`
    SELECT f.id,f.label,f.value,f.source,f.source_url,f.confidence,f.analyst_note
    FROM findings f JOIN investigations i ON i.id=f.investigation_id
    WHERE i.case_id=?
  `).bind(caseId).all();

  const seen=new Set(), normalized=[];
  for(const f of rows.results||[]){
    const value=normalizeValue(f.label,f.value);
    const key=(f.label.toLowerCase()+"|"+value.toLowerCase());
    if(!value || seen.has(key)) continue;
    seen.add(key);
    normalized.push({...f,value});
  }
  return json({caseId,findings:normalized,duplicatesRemoved:(rows.results||[]).length-normalized.length});
}
