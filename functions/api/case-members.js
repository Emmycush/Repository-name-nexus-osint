
import {json,body} from "../_utils.js";
import {requireUser} from "../_auth.js";

async function ownsCase(db,caseId,userId){
  return !!await db.prepare("SELECT id FROM cases WHERE id=? AND user_id=?").bind(caseId,userId).first();
}

export async function onRequestGet(context){
  const user=await requireUser(context);
  if(!user) return json({error:"Authentication required"},401);
  if(!context.env?.DB) return json({members:[]});
  const id=context.params?.id;
  if(!await ownsCase(context.env.DB,id,user.id)) return json({error:"Case not found"},404);
  const rows=await context.env.DB.prepare(`
    SELECT cm.user_id,cm.member_role,cm.created_at,u.email,u.display_name
    FROM case_members cm JOIN users u ON u.id=cm.user_id
    WHERE cm.case_id=? ORDER BY cm.created_at
  `).bind(id).all();
  return json({members:rows.results||[]});
}

export async function onRequestPost(context){
  const user=await requireUser(context);
  if(!user) return json({error:"Authentication required"},401);
  if(!context.env?.DB) return json({error:"Database is not configured."},503);
  const id=context.params?.id;
  if(!await ownsCase(context.env.DB,id,user.id)) return json({error:"Case not found"},404);
  const {email,memberRole}=await body(context.request);
  const e=String(email||"").trim().toLowerCase();
  const role=["viewer","analyst"].includes(memberRole)?memberRole:"viewer";
  const member=await context.env.DB.prepare("SELECT id,email,display_name FROM users WHERE email=?").bind(e).first();
  if(!member) return json({error:"User account not found. They must register first."},404);
  await context.env.DB.prepare(
    "INSERT OR REPLACE INTO case_members(case_id,user_id,member_role) VALUES(?,?,?)"
  ).bind(id,member.id,role).run();
  await context.env.DB.prepare(
    "INSERT INTO audit_logs(id,user_id,action,resource_type,resource_id,metadata) VALUES(?,?,?,?,?,?)"
  ).bind(crypto.randomUUID(),user.id,"case.member_added","case",id,JSON.stringify({member:member.email,role})).run();
  return json({ok:true,member:{id:member.id,email:member.email,display_name:member.display_name,role}});
}
