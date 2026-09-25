import {json} from "../_utils.js";
import {requireUser} from "../_auth.js";
export async function onRequestGet(context){
  const user=await requireUser(context);
  if(!user)return json({error:"Authentication required"},401);
  if(!context.env?.DB)return json({error:"Database is not configured."},503);
  const row=await context.env.DB.prepare("SELECT credits FROM users WHERE id=?").bind(user.id).first();
  return json({credits:Number(row?.credits||0)});
}
