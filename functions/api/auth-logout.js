import {json} from "../_utils.js";
import {cookieToken,sha256,clearSessionCookie,requireSameOrigin} from "../_auth.js";
export async function onRequestPost(context){
  const blocked=requireSameOrigin(context.request); if(blocked) return blocked;
  const token=cookieToken(context.request);
  if(token && context.env?.DB) await context.env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await sha256(token)).run();
  return new Response(JSON.stringify({ok:true}),{headers:{"content-type":"application/json","set-cookie":clearSessionCookie()}});
}
