
import {json} from "../_utils.js";
import {requireUser} from "../_auth.js";

function esc(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}

export async function onRequestGet(context){
  const user=await requireUser(context);
  if(!user) return json({error:"Authentication required"},401);
  const id=context.params?.id;
  if(!context.env?.DB) return json({error:"Database is not configured."},503);
  const inv=await context.env.DB.prepare(
    "SELECT id,target,target_type,status,created_at FROM investigations WHERE id=? AND user_id=?"
  ).bind(id,user.id).first();
  if(!inv) return json({error:"Investigation not found"},404);
  const rows=await context.env.DB.prepare(
    "SELECT label,value,source,source_url,collected_at FROM findings WHERE investigation_id=? ORDER BY collected_at"
  ).bind(id).all();

  const findings=rows.results||[];
  const cards=findings.map(f=>`<tr><td>${esc(f.label)}</td><td>${esc(f.value)}</td><td>${esc(f.source||"")}</td><td>${f.source_url?`<a href="${esc(f.source_url)}" rel="noreferrer">${esc(f.source_url)}</a>`:""}</td></tr>`).join("");
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>NEXUS Investigation ${esc(inv.id)}</title><style>
  body{font:14px Arial,sans-serif;background:#070b11;color:#dce7f2;padding:40px}main{max-width:1100px;margin:auto}h1{color:#39d9ff}table{width:100%;border-collapse:collapse}th,td{border:1px solid #243442;padding:10px;text-align:left;vertical-align:top}th{color:#39d9ff}a{color:#7de7ff;word-break:break-all}.meta{background:#0d151e;padding:16px;border-radius:10px;margin-bottom:22px}button{padding:10px 16px}</style></head><body><main><h1>NEXUS // OSINT Investigation Report</h1><div class="meta"><b>Target:</b> ${esc(inv.target)}<br><b>Type:</b> ${esc(inv.target_type)}<br><b>Status:</b> ${esc(inv.status)}<br><b>Investigation ID:</b> ${esc(inv.id)}<br><b>Created:</b> ${esc(inv.created_at)}</div><table><thead><tr><th>Finding</th><th>Value</th><th>Source</th><th>Source URL</th></tr></thead><tbody>${cards||"<tr><td colspan=4>No findings</td></tr>"}</tbody></table><p>Generated from public-source research. Verify findings independently before relying on them.</p><script>window.print()</script></main></body></html>`;
  return new Response(html,{headers:{"content-type":"text/html;charset=UTF-8"}});
}
