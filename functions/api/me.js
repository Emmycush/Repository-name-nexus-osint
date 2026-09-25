import {json} from "../_utils.js";
import {requireUser} from "../_auth.js";
export async function onRequestGet(context){
  const user=await requireUser(context);
  if(!user) return json({error:"Authentication required"},401);
  return json({user:{id:user.id,email:user.email,display_name:user.display_name||"Analyst",role:user.role,credits:user.credits,onboarding_complete:Number(user.onboarding_complete||0)}});
}
