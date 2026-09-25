import { json, body } from '../_utils.js';
import { requireUser, requireSameOrigin, sha256 } from '../_auth.js';

function slugify(v){ return String(v||'workspace').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48) || 'workspace'; }
async function getWorkspace(db,user){
  return db.prepare(`SELECT w.id,w.name,w.slug,wm.role,wm.status,w.created_at FROM workspace_members wm JOIN workspaces w ON w.id=wm.workspace_id WHERE wm.user_id=? AND wm.status='active' ORDER BY w.created_at LIMIT 1`).bind(user.id).first();
}
export async function onRequestGet(ctx){
  const user=await requireUser(ctx); if(!user) return json({error:'Authentication required'},401);
  const ws=await getWorkspace(ctx.env.DB,user); if(!ws) return json({workspace:null,members:[],invites:[]});
  const members=await ctx.env.DB.prepare(`SELECT u.id,u.email,u.display_name,wm.role,wm.status,wm.joined_at FROM workspace_members wm JOIN users u ON u.id=wm.user_id WHERE wm.workspace_id=? ORDER BY wm.joined_at`).bind(ws.id).all();
  const invites=await ctx.env.DB.prepare(`SELECT id,email,role,status,expires_at,created_at FROM workspace_invites WHERE workspace_id=? AND status='pending' ORDER BY created_at DESC`).bind(ws.id).all();
  return json({workspace:ws,members:members.results||[],invites:invites.results||[]});
}
export async function onRequestPost(ctx){
  const blocked=requireSameOrigin(ctx.request); if(blocked) return blocked;
  const user=await requireUser(ctx); if(!user) return json({error:'Authentication required'},401);
  const b=await body(ctx.request); const name=String(b.name||'').trim().slice(0,80);
  if(!name) return json({error:'Workspace name is required'},400);
  const existing=await getWorkspace(ctx.env.DB,user); if(existing) return json({error:'You already have a workspace'},409);
  let slug=slugify(name); const collision=await ctx.env.DB.prepare('SELECT id FROM workspaces WHERE slug=?').bind(slug).first(); if(collision) slug += '-' + crypto.randomUUID().slice(0,6);
  const id=crypto.randomUUID();
  await ctx.env.DB.batch([
    ctx.env.DB.prepare('INSERT INTO workspaces(id,name,slug,owner_user_id) VALUES(?,?,?,?)').bind(id,name,slug,user.id),
    ctx.env.DB.prepare("INSERT INTO workspace_members(workspace_id,user_id,role,status) VALUES(?,?, 'owner','active')").bind(id,user.id)
  ]);
  return json({workspace:{id,name,slug,role:'owner',status:'active'}},201);
}
