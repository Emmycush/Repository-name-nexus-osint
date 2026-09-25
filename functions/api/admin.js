
import {json} from "../_utils.js";
import {requireAdmin} from "../_auth.js";

export async function onRequestGet(context){
  const auth=requireAdmin(context);
  if(auth.error) return auth.error;
  if(!context.env?.DB) return json({users:0,cases:0,investigations:0,findings:0,mode:"prototype"});
  const db=context.env.DB;
  const [users,cases,investigations,findings]=await Promise.all([
    db.prepare("SELECT COUNT(*) n FROM users").first(),
    db.prepare("SELECT COUNT(*) n FROM cases").first(),
    db.prepare("SELECT COUNT(*) n FROM investigations").first(),
    db.prepare("SELECT COUNT(*) n FROM findings").first()
  ]);
  return json({users:users?.n||0,cases:cases?.n||0,investigations:investigations?.n||0,findings:findings?.n||0,mode:"production"});
}
