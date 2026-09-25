import {json, body, cleanTarget} from "../_utils.js";
import {requireUser, requireSameOrigin} from "../_auth.js";
import {getWorkspaceForUser} from "../_workspace.js";

function newId(prefix="NX"){return `${prefix}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;}

export async function onRequestGet(context){
  const user=await requireUser(context); if(!user) return json({error:"Authentication required"},401);
  if(!context.env?.DB) return json({error:"Database is not configured."},503);
  const rows=await context.env.DB.prepare(`
    SELECT DISTINCT c.id,c.title,c.status,c.target,c.notes,c.created_at,c.updated_at
    FROM cases c
    LEFT JOIN workspace_members wm ON wm.user_id=? AND wm.status='active'
    LEFT JOIN workspace_members ownerwm ON ownerwm.user_id=c.user_id AND ownerwm.status='active' AND ownerwm.workspace_id=wm.workspace_id
    WHERE c.user_id=? OR ownerwm.user_id IS NOT NULL
    ORDER BY c.updated_at DESC
  `).bind(user.id,user.id).all();
  return json({cases:rows.results||[]});
}

export async function onRequestPost(context){
  const blocked=requireSameOrigin(context); if(blocked)return blocked;
  const user=await requireUser(context); if(!user)return json({error:"Authentication required"},401);
  if(!context.env?.DB)return json({error:"Database is not configured."},503);
  const data=await body(context.request);
  const title=cleanTarget(data.title)||"Untitled investigation";
  const target=cleanTarget(data.target);
  const plan=await context.env.DB.prepare(`SELECT p.max_cases FROM users u LEFT JOIN subscriptions s ON s.user_id=u.id LEFT JOIN plans p ON p.id=COALESCE(s.plan_id,'free') WHERE u.id=?`).bind(user.id).first();
  const current=await context.env.DB.prepare("SELECT COUNT(*) n FROM cases WHERE user_id=?").bind(user.id).first();
  if(Number(current?.n||0)>=Number(plan?.max_cases||5))return json({error:`Case limit reached for your current plan (${plan?.max_cases||5}).`},402);
  const id=newId();
  await context.env.DB.prepare("INSERT INTO cases(id,user_id,title,target,notes) VALUES(?,?,?,?,?)").bind(id,user.id,title,target,String(data.notes||'').slice(0,4000)).run();
  await context.env.DB.prepare("INSERT INTO audit_logs(id,user_id,action,resource_type,resource_id,metadata) VALUES(?,?,?,?,?,?)").bind(crypto.randomUUID(),user.id,"case.created","case",id,JSON.stringify({title})).run();
  return json({case:{id,title,target,status:"open"}},201);
}
