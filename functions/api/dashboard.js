
import {json} from "../_utils.js";
import {requireUser} from "../_auth.js";

export async function onRequestGet(context){
  const user=await requireUser(context);
  if(!user) return json({error:"Authentication required"},401);
  if(!context.env?.DB) return json({metrics:{credits:user.credits||25,cases:0,investigations:0,findings:0},timeline:[]});
  const [cases,investigations,findings,timeline]=await Promise.all([
    context.env.DB.prepare("SELECT COUNT(*) AS n FROM cases WHERE user_id=?").bind(user.id).first(),
    context.env.DB.prepare("SELECT COUNT(*) AS n FROM investigations WHERE user_id=?").bind(user.id).first(),
    context.env.DB.prepare(`SELECT COUNT(*) AS n FROM findings f JOIN investigations i ON i.id=f.investigation_id WHERE i.user_id=?`).bind(user.id).first(),
    context.env.DB.prepare(`
      SELECT 'investigation' AS type,id,target AS label,created_at FROM investigations WHERE user_id=?
      UNION ALL
      SELECT 'case' AS type,id,title AS label,created_at FROM cases WHERE user_id=?
      ORDER BY created_at DESC LIMIT 20
    `).bind(user.id,user.id).all()
  ]);
  return json({
    metrics:{credits:user.credits,cases:cases?.n||0,investigations:investigations?.n||0,findings:findings?.n||0},
    timeline:timeline.results||[]
  });
}
