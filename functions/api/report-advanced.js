
import {requireUser} from "../_auth.js";

function esc(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}

export async function onRequestGet(context){
  const user=await requireUser(context);
  if(!user) return new Response("Authentication required",{status:401});
  if(!context.env?.DB) return new Response("Database is not configured.",{status:503});
  const id=context.params?.id;
  const inv=await context.env.DB.prepare(`
    SELECT i.id,i.case_id,i.target,i.target_type,i.status,i.created_at,c.title AS case_title
    FROM investigations i LEFT JOIN cases c ON c.id=i.case_id
    WHERE i.id=? AND i.user_id=?
  `).bind(id,user.id).first();
  if(!inv) return new Response("Investigation not found",{status:404});
  const rows=await context.env.DB.prepare(`
    SELECT label,value,source,source_url,confidence,analyst_note,collected_at
    FROM findings WHERE investigation_id=? ORDER BY confidence DESC,collected_at
  `).bind(id).all();
  const findings=rows.results||[];
  const body=findings.map(f=>`<article class="finding"><header><strong>${esc(f.label)}</strong><span>${Number(f.confidence||0)}% confidence</span></header><p>${esc(f.value)}</p><small>Source: ${esc(f.source||"Unknown")} · ${esc(f.collected_at||"")}</small>${f.analyst_note?`<blockquote>${esc(f.analyst_note)}</blockquote>`:""}${f.source_url?`<a href="${esc(f.source_url)}" rel="noreferrer">${esc(f.source_url)}</a>`:""}</article>`).join("");
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>NEXUS Report ${esc(inv.id)}</title><style>
body{margin:0;background:#080c12;color:#dce8f1;font:14px system-ui,Arial}main{max-width:980px;margin:auto;padding:40px}.hero{border:1px solid #22394a;background:#0c151e;padding:25px;border-radius:14px}h1{margin:0;color:#49dfff}.meta{color:#7890a1;line-height:1.8;margin-top:12px}.finding{border:1px solid #1d3445;background:#0a121a;padding:16px;border-radius:10px;margin:12px 0}.finding header{display:flex;justify-content:space-between;gap:15px}.finding header strong{color:#e8f8ff}.finding header span{color:#6ce6a0;font-size:12px}.finding p{word-break:break-word}.finding small{color:#718697}.finding a{display:block;color:#66dfff;word-break:break-all;margin-top:8px}.finding blockquote{border-left:3px solid #39d9ff;padding-left:12px;color:#a8bccb}.print{margin:15px 0;padding:10px 15px}@media print{body{background:white;color:#111}.hero,.finding{background:white;color:#111;border-color:#ccc}.print{display:none}}</style></head><body><main><section class="hero"><h1>NEXUS // OSINT — Advanced Investigation Report</h1><div class="meta"><b>Case:</b> ${esc(inv.case_title||"Unassigned")}<br><b>Target:</b> ${esc(inv.target)}<br><b>Type:</b> ${esc(inv.target_type)}<br><b>Status:</b> ${esc(inv.status)}<br><b>Investigation:</b> ${esc(inv.id)}<br><b>Created:</b> ${esc(inv.created_at)}</div></section><button class="print" onclick="print()">Print / Save PDF</button><h2>Evidence</h2>${body||"<p>No findings.</p>"}<p style="color:#718697">Public-source research report. Findings should be independently verified.</p></main></body></html>`;
  return new Response(html,{headers:{"content-type":"text/html;charset=UTF-8"}});
}
