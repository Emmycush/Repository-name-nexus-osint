import { json, body } from '../_utils.js';
import { requireUser, requireSameOrigin, sha256 } from '../_auth.js';
async function workspaceFor(db,user){ return db.prepare(`SELECT w.id,w.name,w.owner_user_id,wm.role FROM workspace_members wm JOIN workspaces w ON w.id=wm.workspace_id WHERE wm.user_id=? AND wm.status='active' LIMIT 1`).bind(user.id).first(); }
function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
export async function onRequestPost(ctx){
 const blocked=requireSameOrigin(ctx.request); if(blocked)return blocked; const user=await requireUser(ctx); if(!user)return json({error:'Authentication required'},401);
 const ws=await workspaceFor(ctx.env.DB,user); if(!ws)return json({error:'Workspace not found'},404); if(!['owner','admin'].includes(ws.role))return json({error:'Workspace admin access required'},403);
 const b=await body(ctx.request); const email=String(b.email||'').trim().toLowerCase(); const role=['member','analyst','viewer'].includes(b.role)?b.role:'member';
 if(!validEmail(email))return json({error:'Enter a valid email address'},400); if(email===user.email)return json({error:'You are already a workspace member'},409);
 const existing=await ctx.env.DB.prepare(`SELECT u.id FROM users u JOIN workspace_members wm ON wm.user_id=u.id WHERE wm.workspace_id=? AND u.email=?`).bind(ws.id,email).first(); if(existing)return json({error:'That user is already a member'},409);
 const pending=await ctx.env.DB.prepare("SELECT id FROM workspace_invites WHERE workspace_id=? AND email=? AND status='pending' AND expires_at>CURRENT_TIMESTAMP").bind(ws.id,email).first(); if(pending)return json({error:'A pending invite already exists'},409);
 const raw=crypto.randomUUID()+crypto.randomUUID(); const tokenHash=await sha256(raw); const id=crypto.randomUUID();
 await ctx.env.DB.prepare("INSERT INTO workspace_invites(id,workspace_id,email,role,token_hash,status,expires_at,invited_by) VALUES(?,?,?,?,?,'pending',datetime('now','+7 days'),?)").bind(id,ws.id,email,role,tokenHash,user.id).run();
 return json({invite:{id,email,role,expires_in_days:7},acceptToken:raw,delivery:'manual'} ,201);
}
export async function onRequestDelete(ctx){
 const blocked=requireSameOrigin(ctx.request); if(blocked)return blocked; const user=await requireUser(ctx); if(!user)return json({error:'Authentication required'},401); const ws=await workspaceFor(ctx.env.DB,user); if(!ws||!['owner','admin'].includes(ws.role))return json({error:'Workspace admin access required'},403); const b=await body(ctx.request); const id=String(b.id||''); await ctx.env.DB.prepare("UPDATE workspace_invites SET status='revoked' WHERE id=? AND workspace_id=? AND status='pending'").bind(id,ws.id).run(); return json({ok:true});
}
